import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer, Save, Settings as SettingsIcon, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type {
  DocumentDraft, DocumentRecord, DocType,
  BankPreset, FooterPreset, ProductPreset, StampPreset, CompanySettings,
} from './types';
import { DEFAULT_COMPANY, emptyDraft, addDaysIso } from './defaults';
import { computeTotals } from './lib/calc';
import { numberToFrenchWords } from './lib/numberToWords.fr';
import { sanitizeRichHtml } from './lib/sanitizeHtml';
import { DocumentPreview } from './DocumentPreview';
import { ItemRowsEditor } from './ItemRowsEditor';
import { RichTextEditor } from './RichTextEditor';
import { PresetManager } from './PresetManager';
import { CompanySettingsModal } from './CompanySettingsModal';

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';
const section = 'rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3';
const h = 'text-white font-semibold text-sm';

function buildDisplayId(type: DocType, num: number, isoDate: string): string {
  const yy = String(new Date(isoDate).getFullYear() % 100).padStart(2, '0');
  return type === 'proforma'
    ? `P${String(num).padStart(4, '0')}/${yy}`
    : `${String(num).padStart(5, '0')}/${yy}`;
}

export function DocumentEditor({
  docApi,
  existing,
  seedDraft,
  onBack,
  onSaved,
}: {
  docApi: DocApi;
  existing: DocumentRecord | null;
  seedDraft?: DocumentDraft | null; // for "duplicate": pre-fill a NEW draft
  onBack: () => void;
  onSaved: () => void;
}) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [draft, setDraft] = useState<DocumentDraft>(() => emptyDraft(DEFAULT_COMPANY));
  const [counters, setCounters] = useState({ proforma_next: 1, facture_next: 1 });
  const [presets, setPresets] = useState<{
    bank: BankPreset[]; footer: FooterPreset[]; product: ProductPreset[]; stamp: StampPreset[];
  }>({ bank: [], footer: [], product: [], stamp: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const manualValidity = useRef(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, ct, bank, footer, product, stamp] = await Promise.all([
        docApi.getCompany(),
        docApi.getCounters(),
        docApi.listPresets<BankPreset>('bank'),
        docApi.listPresets<FooterPreset>('footer'),
        docApi.listPresets<ProductPreset>('product'),
        docApi.listPresets<StampPreset>('stamp'),
      ]);
      const comp = (c && Object.keys(c).length ? { ...DEFAULT_COMPANY, ...(c as CompanySettings) } : DEFAULT_COMPANY);
      setCompany(comp);
      setCounters(ct);
      setPresets({ bank, footer, product, stamp });
      if (existing) {
        manualValidity.current = true;
        setDraft({ ...existing });
      } else if (seedDraft) {
        manualValidity.current = true;
        setDraft({ ...seedDraft, companySnapshot: comp });
      } else {
        setDraft(emptyDraft(comp));
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); /* eslint-disable-line */ }, [existing, seedDraft]);

  const set = <K extends keyof DocumentDraft>(k: K, v: DocumentDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const setClient = (k: keyof DocumentDraft['client'], v: string) =>
    setDraft((d) => ({ ...d, client: { ...d.client, [k]: v } }));
  const setExtras = (k: string, v: any) =>
    setDraft((d) => ({ ...d, factureExtras: { ...(d.factureExtras ?? {}), [k]: v } }));

  const onDateChange = (iso: string) => {
    setDraft((d) => ({
      ...d,
      date: iso,
      validUntil: manualValidity.current ? d.validUntil : addDaysIso(new Date(iso), 15),
    }));
  };

  // Provisional display id (for new docs) or the real one (when editing).
  const displayId = existing
    ? existing.displayId
    : buildDisplayId(
        draft.type,
        draft.type === 'proforma' ? counters.proforma_next : counters.facture_next,
        draft.date,
      );

  const finalize = async () => {
    setSaving(true);
    try {
      const totals = computeTotals(draft.items);
      const amountInWords = numberToFrenchWords(totals.totalTTC);
      const payload: DocumentDraft = {
        ...draft,
        companySnapshot: company,
        items: draft.items.map((it) => ({ ...it, designationHtml: sanitizeRichHtml(it.designationHtml) })),
        footerHtml: sanitizeRichHtml(draft.footerHtml),
        totals,
        amountInWords,
      };
      if (existing) await docApi.updateDocument(existing.id, payload as Partial<DocumentRecord>);
      else await docApi.createDocument(payload);
      toast.success(existing ? 'Document mis à jour' : 'Document créé');
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const toInputDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#87A922]" /></div>;
  }

  return (
    <div className="min-h-screen">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0a1c12]/90 backdrop-blur px-5 py-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <SettingsIcon className="w-4 h-4" /> Paramètres
          </button>
          <button onClick={() => setShowPresets(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Layers className="w-4 h-4" /> Préréglages
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Printer className="w-4 h-4" /> Imprimer / PDF
          </button>
          <button onClick={finalize} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {existing ? 'Mettre à jour' : 'Finaliser & créer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-5">
        {/* ── Form ── */}
        <div className="no-print space-y-4">
          {/* Type */}
          <div className={section}>
            <div className="flex gap-2">
              {(['proforma', 'facture'] as DocType[]).map((t) => (
                <button key={t} onClick={() => set('type', t)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${draft.type === t ? 'bg-[#87A922] text-white' : 'border border-white/10 text-white/60 hover:bg-white/5'}`}>
                  {t === 'proforma' ? 'Facture Proforma' : 'Facture'}
                </button>
              ))}
            </div>
            <div className="text-white/40 text-xs">N° {displayId}{!existing && ' (provisoire)'}</div>
          </div>

          {/* Document */}
          <div className={section}>
            <div className={h}>Document</div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={label}>Ville (Wilaya)</label>
                <input className={field} value={draft.wilayaCity} onChange={(e) => set('wilayaCity', e.target.value)} /></div>
              <div><label className={label}>Date</label>
                <input type="date" className={field} value={toInputDate(draft.date)}
                  onChange={(e) => onDateChange(new Date(e.target.value).toISOString())} /></div>
              <div><label className={label}>Valable jusqu'au</label>
                <input type="date" className={field} value={toInputDate(draft.validUntil)}
                  onChange={(e) => { manualValidity.current = true; set('validUntil', new Date(e.target.value).toISOString()); }} /></div>
            </div>
          </div>

          {/* Client */}
          <div className={section}>
            <div className={h}>Client</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['name', 'Nom'], ['adresse', 'Adresse'], ['wilaya', 'Wilaya'], ['rc', 'R.C'],
                ['nif', 'NIF'], ['nis', 'NIS'], ['art', 'ART'], ['ia', 'IA'],
              ] as Array<[keyof DocumentDraft['client'], string]>).map(([k, l]) => (
                <div key={k}><label className={label}>{l}</label>
                  <input className={field} value={draft.client[k]} onChange={(e) => setClient(k, e.target.value)} /></div>
              ))}
            </div>
          </div>

          {/* Facture extras */}
          {draft.type === 'facture' && (
            <div className={section}>
              <div className={h}>Mentions facture (bas de page)</div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>N° d'ordre</label>
                  <input className={field} value={draft.factureExtras?.orderNo ?? ''} onChange={(e) => setExtras('orderNo', e.target.value)} /></div>
                <div><label className={label}>Contrat N°</label>
                  <input className={field} value={draft.factureExtras?.contractNo ?? ''} onChange={(e) => setExtras('contractNo', e.target.value)} /></div>
                <div><label className={label}>Retenue garantie (%)</label>
                  <input type="number" min={0} className={field} value={draft.factureExtras?.retenueGarantiePct ?? ''}
                    onChange={(e) => setExtras('retenueGarantiePct', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
              </div>
              <div><label className={label}>Objet</label>
                <textarea className={field} rows={2} value={draft.factureExtras?.objet ?? ''} onChange={(e) => setExtras('objet', e.target.value)} /></div>
            </div>
          )}

          {/* Bank */}
          <div className={section}>
            <div className={h}>Banque</div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.bank.find((b) => b.id === Number(e.target.value)); if (p) set('bank', { bankName: p.bankName, accountLine: p.accountLine }); }}>
              <option value="">Choisir un préréglage…</option>
              {presets.bank.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Nom de la banque</label>
                <input className={field} value={draft.bank.bankName} onChange={(e) => set('bank', { ...draft.bank, bankName: e.target.value })} /></div>
              <div><label className={label}>N° de compte</label>
                <input className={field} value={draft.bank.accountLine} onChange={(e) => set('bank', { ...draft.bank, accountLine: e.target.value })} /></div>
            </div>
          </div>

          {/* Items */}
          <div className={section}>
            <div className={h}>Articles</div>
            <ItemRowsEditor items={draft.items} onChange={(items) => set('items', items)} productPresets={presets.product} />
          </div>

          {/* Footer + stamp */}
          <div className={section}>
            <div className={h}>Pied de page & cachet</div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.footer.find((f) => f.id === Number(e.target.value)); if (p) set('footerHtml', p.html); }}>
              <option value="">Choisir un pied de page…</option>
              {presets.footer.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <RichTextEditor value={draft.footerHtml} onChange={(html) => set('footerHtml', html)} placeholder="Notes de bas de page…" />
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.stamp.find((s) => s.id === Number(e.target.value)); if (p) set('stampUrl', p.imageUrl); }}>
              <option value="">Choisir un cachet…</option>
              {presets.stamp.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="xl:sticky xl:top-20 self-start">
          <div className="preview-pane rounded-xl bg-white/5 p-3" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
            <div className="preview-scale">
              <DocumentPreview draft={{ ...draft, companySnapshot: company }} displayId={displayId} provisional={!existing} />
            </div>
          </div>
        </div>
      </div>

      {showPresets && <PresetManager docApi={docApi} onClose={() => { setShowPresets(false); loadAll(); }} />}
      {showSettings && (
        <CompanySettingsModal docApi={docApi} onClose={() => setShowSettings(false)}
          onSaved={(c) => { setCompany(c); loadAll(); }} />
      )}
    </div>
  );
}
