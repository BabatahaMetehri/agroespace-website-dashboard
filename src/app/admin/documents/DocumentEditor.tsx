import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Printer, Save, Settings as SettingsIcon, Layers, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type {
  DocumentDraft, DocumentRecord, DocType,
  BankPreset, FooterPreset, ProductPreset, StampPreset, IdentityPreset, CompanySettings,
} from './types';
import { DEFAULT_COMPANY, emptyDraft, addDaysIso, normalizeBanks, pickPresetDefaults } from './defaults';
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

/** Strip HTML tags to plain text (for designation used in the PDF filename). */
function htmlToText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

/**
 * Build the PDF filename (the browser uses document.title as the default
 * "Save as PDF" name). Format, uppercase:
 *   [TYPE] [NUMBER]-[YEAR] [CLIENT] [QTY] [FIRST ARTICLE]
 * e.g. "FACTURE PROFORMA 134-2026 LUSSAIL SERVICES 2 PIVOT 25 HA"
 *
 * The article uses the product preset's short "Libellé" (label) when available
 * so the name stays concise; manual rows fall back to the (capped) designation.
 */
function buildPdfName(draft: DocumentDraft, num: number, fullYear: number): string {
  const typeLabel = draft.type === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE';
  const first = draft.items[0];
  const article = first
    ? (first.label?.trim() || htmlToText(first.designationHtml).slice(0, 40).trim() || first.ref)
    : '';
  const parts = [
    typeLabel,
    `${num}-${fullYear}`,
    draft.client.name,
    first ? String(first.qty) : '',
    article,
  ];
  return parts
    .filter((p) => p != null && String(p).trim() !== '')
    .join(' ')
    .replace(/[\\/:*?"<>|]+/g, ' ') // drop characters illegal in filenames
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function DocumentEditor({
  docApi,
  existing,
  seedDraft,
  onBack,
  onSaved,
  autoPrint,
}: {
  docApi: DocApi;
  existing: DocumentRecord | null;
  seedDraft?: DocumentDraft | null; // for "duplicate": pre-fill a NEW draft
  onBack: () => void;
  onSaved: () => void;
  autoPrint?: boolean;
}) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [draft, setDraft] = useState<DocumentDraft>(() => emptyDraft(DEFAULT_COMPANY));
  const [counters, setCounters] = useState({ proforma_next: 1, facture_next: 1 });
  const [presets, setPresets] = useState<{
    bank: BankPreset[]; footer: FooterPreset[]; product: ProductPreset[]; stamp: StampPreset[]; identity: IdentityPreset[];
  }>({ bank: [], footer: [], product: [], stamp: [], identity: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const manualValidity = useRef(false);
  const didAutoPrint = useRef(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, ct, bank, footer, product, stamp, identity] = await Promise.all([
        docApi.getCompany(),
        docApi.getCounters(),
        docApi.listPresets<BankPreset>('bank'),
        docApi.listPresets<FooterPreset>('footer'),
        docApi.listPresets<ProductPreset>('product'),
        docApi.listPresets<StampPreset>('stamp'),
        docApi.listPresets<IdentityPreset>('identity'),
      ]);
      const comp = (c && Object.keys(c).length ? { ...DEFAULT_COMPANY, ...(c as CompanySettings) } : DEFAULT_COMPANY);
      setCompany(comp);
      setCounters(ct);
      setPresets({ bank, footer, product, stamp, identity });
      if (existing) {
        manualValidity.current = true;
        setDraft({ ...existing, banks: normalizeBanks(existing) });
      } else if (seedDraft) {
        manualValidity.current = false;
        setDraft({
          ...seedDraft,
          banks: normalizeBanks(seedDraft),
          companySnapshot: comp,
          validUntil: addDaysIso(new Date(seedDraft.date), 15),
        });
      } else {
        // Brand-new document — prefill from any presets flagged as default so
        // a common template doesn't have to be picked every time.
        const def = pickPresetDefaults({ bank, footer, stamp, identity });
        const compWithIdentity = def.identity ? { ...comp, ...def.identity } : comp;
        if (def.identity) setCompany(compWithIdentity);
        const base = emptyDraft(compWithIdentity);
        setDraft({
          ...base,
          banks: def.banks ?? base.banks,
          footerHtml: def.footerHtml ?? base.footerHtml,
          stampUrl: def.stampUrl ?? base.stampUrl,
        });
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); /* eslint-disable-line */ }, [existing, seedDraft]);

  // Auto-print: once loading finishes and we have an existing doc, fire the
  // named print once. (printDoc is defined below; it's only called post-commit.)
  useEffect(() => {
    if (!loading && autoPrint && existing && !didAutoPrint.current) {
      didAutoPrint.current = true;
      printDoc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, autoPrint, existing]);

  const set = <K extends keyof DocumentDraft>(k: K, v: DocumentDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const setClient = (k: keyof DocumentDraft['client'], v: string) =>
    setDraft((d) => ({ ...d, client: { ...d.client, [k]: v } }));
  const setExtras = (k: string, v: any) =>
    setDraft((d) => ({ ...d, factureExtras: { ...(d.factureExtras ?? {}), [k]: v } }));

  // ── Banks (multiple) ──
  const updateBank = (i: number, patch: Partial<DocumentDraft['banks'][number]>) =>
    setDraft((d) => ({ ...d, banks: d.banks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) }));
  const addBank = (bank = { bankName: '', accountLine: '' }) =>
    setDraft((d) => ({ ...d, banks: [...d.banks, bank] }));
  const removeBank = (i: number) =>
    setDraft((d) => {
      const next = d.banks.filter((_, idx) => idx !== i);
      return { ...d, banks: next.length ? next : [{ bankName: '', accountLine: '' }] };
    });

  const onDateChange = (iso: string) => {
    setDraft((d) => ({
      ...d,
      date: iso,
      validUntil: manualValidity.current ? d.validUntil : addDaysIso(new Date(iso), 15),
    }));
  };

  // Provisional display id (for new docs) or the real one (when editing).
  const docNumber = existing
    ? existing.number
    : (draft.type === 'proforma' ? counters.proforma_next : counters.facture_next);
  const displayId = existing
    ? existing.displayId
    : buildDisplayId(draft.type, docNumber, draft.date);

  // Print / Save-as-PDF. The browser uses document.title as the suggested
  // filename, so we set it just for the print then restore it afterwards.
  const printDoc = () => {
    const prevTitle = document.title;
    const name = buildPdfName({ ...draft, companySnapshot: company }, docNumber, new Date(draft.date).getFullYear());
    if (name) document.title = name;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const finalize = async () => {
    setSaving(true);
    try {
      const totals = computeTotals(draft.items, draft.remise);
      const amountInWords = numberToFrenchWords(totals.totalTTC);
      const payload: DocumentDraft = {
        ...draft,
        bank: undefined, // drop legacy single-bank field; banks[] is the source of truth
        companySnapshot: company,
        items: draft.items.map((it) => ({ ...it, designationHtml: sanitizeRichHtml(it.designationHtml) })),
        footerHtml: sanitizeRichHtml(draft.footerHtml),
        factureExtras: draft.factureExtras
          ? { ...draft.factureExtras, notesHtml: draft.factureExtras.notesHtml ? sanitizeRichHtml(draft.factureExtras.notesHtml) : undefined }
          : draft.factureExtras,
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
          <button onClick={printDoc} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
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
            <div className="text-white/40 text-xs">N° {displayId}</div>
          </div>

          {/* Company identifiers (preset-switchable) */}
          <div className={section}>
            <div className={h}>Identifiants entreprise</div>
            <select className={field} defaultValue=""
              onChange={(e) => {
                const p = presets.identity.find((x) => x.id === Number(e.target.value));
                if (p) {
                  setCompany((c) => ({ ...c, rc: p.rc, artImp: p.artImp, nif: p.nif, nis: p.nis }));
                  e.target.value = '';
                }
              }}>
              <option value="">Choisir un préréglage d'identifiants…</option>
              {presets.identity.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><label className={label}>R.C</label>
                <input className={field} value={company.rc} onChange={(e) => setCompany((c) => ({ ...c, rc: e.target.value }))} /></div>
              <div><label className={label}>ART.IMP</label>
                <input className={field} value={company.artImp} onChange={(e) => setCompany((c) => ({ ...c, artImp: e.target.value }))} /></div>
              <div><label className={label}>NIF</label>
                <input className={field} value={company.nif} onChange={(e) => setCompany((c) => ({ ...c, nif: e.target.value }))} /></div>
              <div><label className={label}>NIS</label>
                <input className={field} value={company.nis} onChange={(e) => setCompany((c) => ({ ...c, nis: e.target.value }))} /></div>
            </div>
          </div>

          {/* Banks (one or more — printed on a single line separated by " / ") */}
          <div className={section}>
            <div className="flex items-center justify-between">
              <div className={h}>Banque(s)</div>
              <button type="button" onClick={() => addBank()}
                className="text-[#87A922] hover:brightness-110 text-xs font-medium">+ Ajouter une banque</button>
            </div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.bank.find((b) => b.id === Number(e.target.value)); if (p) { addBank({ bankName: p.bankName, accountLine: p.accountLine }); e.target.value = ''; } }}>
              <option value="">Ajouter depuis un préréglage…</option>
              {presets.bank.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            {draft.banks.map((b, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/40">Banque {i + 1}</span>
                  <button type="button" onClick={() => removeBank(i)} className="text-red-300/70 hover:text-red-300" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><label className={label}>Nom de la banque</label>
                    <input className={field} value={b.bankName} onChange={(e) => updateBank(i, { bankName: e.target.value })} /></div>
                  <div><label className={label}>N° de compte</label>
                    <input className={field} value={b.accountLine} onChange={(e) => updateBank(i, { accountLine: e.target.value })} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* Document */}
          <div className={section}>
            <div className={h}>Document</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><label className={label}>Ville (Wilaya)</label>
                <input className={field} value={draft.wilayaCity} onChange={(e) => set('wilayaCity', e.target.value)} /></div>
              <div><label className={label}>Date</label>
                <input type="date" className={field} value={toInputDate(draft.date)}
                  onChange={(e) => { if (e.target.value) onDateChange(new Date(e.target.value + 'T12:00:00').toISOString()); }} /></div>
              {draft.type === 'proforma' && (
                <div><label className={label}>Valable jusqu'au</label>
                  <input type="date" className={field} value={toInputDate(draft.validUntil)}
                    onChange={(e) => { if (e.target.value) { manualValidity.current = true; set('validUntil', new Date(e.target.value + 'T12:00:00').toISOString()); } }} /></div>
              )}
            </div>
          </div>

          {/* Client */}
          <div className={section}>
            <div className={h}>Client</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                ['name', 'Nom'], ['adresse', 'Adresse'], ['wilaya', 'Wilaya'], ['rc', 'R.C'],
                ['nif', 'NIF'], ['nis', 'NIS'], ['art', 'ART'], ['cf', 'CF'],
              ] as Array<[keyof DocumentDraft['client'], string]>).map(([k, l]) => (
                <div key={k}><label className={label}>{l}</label>
                  <input className={field} value={draft.client[k]} onChange={(e) => setClient(k, e.target.value)} /></div>
              ))}
            </div>
          </div>

          {/* Facture extras */}
          {draft.type === 'facture' && (
            <div className={section}>
              <div className={h}>Mentions facture</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><label className={label}>Retenue garantie (%)</label>
                  <input type="number" min={0} className={field} value={draft.factureExtras?.retenueGarantiePct ?? ''}
                    onChange={(e) => setExtras('retenueGarantiePct', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
                <div><label className={label}>Mode de paiement</label>
                  <input className={field} placeholder="Chèque bancaire N° 4095614…"
                    value={draft.factureExtras?.paymentMode ?? ''} onChange={(e) => setExtras('paymentMode', e.target.value)} /></div>
                <div><label className={label}>Date de paiement</label>
                  <input type="date" className={field} value={toInputDate(draft.factureExtras?.paymentDate ?? '')}
                    onChange={(e) => setExtras('paymentDate', e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : undefined)} /></div>
              </div>
              <div><label className={label}>Mentions / notes (sous le titre — N° d'ordre, contrat, etc. si besoin)</label>
                <RichTextEditor value={draft.factureExtras?.notesHtml ?? ''} onChange={(html) => setExtras('notesHtml', html)}
                  placeholder="Texte libre affiché sous le titre du document…" /></div>
              <div><label className={label}>Objet</label>
                <textarea className={field} rows={2} value={draft.factureExtras?.objet ?? ''} onChange={(e) => setExtras('objet', e.target.value)} /></div>
              <div><label className={label}>Franchise / exonération (à côté du cachet)</label>
                <textarea className={field} rows={3}
                  placeholder="Achat exonéré de la TVA avec autorisation acquisition en franchise N° … du … — Direction des impôts de la wilaya d' …"
                  value={draft.factureExtras?.franchise ?? ''} onChange={(e) => setExtras('franchise', e.target.value)} /></div>
            </div>
          )}

          {/* Items */}
          <div className={section}>
            <div className={h}>Articles</div>
            <ItemRowsEditor items={draft.items} onChange={(items) => set('items', items)} productPresets={presets.product} />
            <div className="border-t border-white/10 pt-3">
              <label className={label}>Remise (DA) — montant fixe déduit du total HT (laisser 0 si aucune)</label>
              <input type="number" min={0} step="0.01" className={`${field} sm:max-w-xs`}
                value={draft.remise ?? 0}
                onChange={(e) => set('remise', e.target.value === '' ? 0 : Number(e.target.value))} />
            </div>
          </div>

          {/* Footer + stamp */}
          <div className={section}>
            <div className={h}>Pied de page & cachet</div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.footer.find((f) => f.id === Number(e.target.value)); if (p) { set('footerHtml', p.html); e.target.value = ''; } }}>
              <option value="">Choisir un pied de page…</option>
              {presets.footer.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <RichTextEditor value={draft.footerHtml} onChange={(html) => set('footerHtml', html)} placeholder="Notes de bas de page…" />
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.stamp.find((s) => s.id === Number(e.target.value)); if (p) { set('stampUrl', p.imageUrl); e.target.value = ''; } }}>
              <option value="">Choisir un cachet…</option>
              {presets.stamp.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {draft.stampUrl && (
              <button type="button" onClick={() => set('stampUrl', '')}
                className="text-red-300/70 hover:text-red-300 text-xs">Retirer le cachet sélectionné</button>
            )}
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={!!draft.stampBlank}
                onChange={(e) => set('stampBlank', e.target.checked)} />
              Espace cachet vide (cachet manuel après impression)
            </label>
          </div>
        </div>

        {/* ── Preview (screen, scaled to fit) ── */}
        <div className="xl:sticky xl:top-20 self-start">
          <div className="preview-pane rounded-xl bg-white/5 p-3" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
            <div className="preview-scale">
              <DocumentPreview draft={{ ...draft, companySnapshot: company }} displayId={displayId} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Print copy: a body-level, full-size, normal-flow copy that the print
          stylesheet reveals (and hides #root). Normal flow + @page margins let
          long documents paginate across multiple A4 pages without clipping. ── */}
      {createPortal(
        <div className="print-only">
          <DocumentPreview draft={{ ...draft, companySnapshot: company }} displayId={displayId} />
        </div>,
        document.body,
      )}

      {showPresets && <PresetManager docApi={docApi} onClose={() => { setShowPresets(false); loadAll(); }} />}
      {showSettings && (
        <CompanySettingsModal docApi={docApi} onClose={() => setShowSettings(false)}
          onSaved={(c) => { setCompany(c); loadAll(); }} />
      )}
    </div>
  );
}
