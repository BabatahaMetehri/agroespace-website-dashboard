import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Save, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type {
  PresetKind, BankPreset, FooterPreset, ProductPreset, StampPreset,
} from './types';
import { RichTextEditor } from './RichTextEditor';
import { sanitizeRichHtml } from './lib/sanitizeHtml';

const IMGBB_KEY = (import.meta as any).env?.VITE_IMGBB_KEY ?? '';

async function uploadToImgBB(file: File): Promise<string> {
  if (!IMGBB_KEY) throw new Error("Clé d'upload image non configurée");
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json?.success) throw new Error('Échec du téléversement');
  return (json.data?.display_url ?? json.data?.url) as string;
}

const TABS: { kind: PresetKind; label: string }[] = [
  { kind: 'bank', label: 'Banques' },
  { kind: 'identity', label: 'Identifiants' },
  { kind: 'footer', label: 'Pieds de page' },
  { kind: 'product', label: 'Produits' },
  { kind: 'stamp', label: 'Cachets' },
];

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';

export function PresetManager({ docApi, onClose }: { docApi: DocApi; onClose: () => void }) {
  const [tab, setTab] = useState<PresetKind>('bank');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async (kind: PresetKind) => {
    setLoading(true);
    try { setRows(await docApi.listPresets<any>(kind)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(tab); /* eslint-disable-line */ }, [tab]);

  const blank = (kind: PresetKind): any => ({
    bank: { label: '', bankName: '', accountLine: '' },
    identity: { label: '', rc: '', artImp: '', nif: '', nis: '' },
    footer: { label: '', html: '' },
    product: { label: '', ref: '', designationHtml: '', um: 'U', defaultPU: 0 },
    stamp: { label: '', imageUrl: '' },
  }[kind]);

  const addBlank = () => setRows([...rows, { ...blank(tab), _new: true }]);
  const patch = (i: number, p: any) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const save = async (i: number) => {
    const r = rows[i];
    setBusy(true);
    try {
      const body = { ...r };
      delete body._new;
      if (tab === 'product') body.designationHtml = sanitizeRichHtml(body.designationHtml || '');
      if (tab === 'footer') body.html = sanitizeRichHtml(body.html || '');
      if (r._new) await docApi.createPreset(tab, body);
      else await docApi.updatePreset(tab, r.id, body);
      toast.success('Préréglage enregistré');
      await load(tab);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const del = async (i: number) => {
    const r = rows[i];
    if (r._new) { setRows(rows.filter((_, idx) => idx !== i)); return; }
    if (!confirm('Supprimer ce préréglage ?')) return;
    try { await docApi.deletePreset(tab, r.id); await load(tab); }
    catch (e) { toast.error((e as Error).message); }
  };

  const onUpload = async (i: number, file: File) => {
    setBusy(true);
    try { patch(i, { imageUrl: await uploadToImgBB(file) }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl bg-[#0a1c12] border border-white/10 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-white font-semibold">Préréglages</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 border-b border-white/10 px-3">
          {TABS.map((t) => (
            <button key={t.kind} onClick={() => setTab(t.kind)}
              className={`px-3 py-2 text-sm ${tab === t.kind ? 'text-white border-b-2 border-[#87A922]' : 'text-white/50 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#87A922]" /></div>
          ) : (
            rows.map((r, i) => (
              <div key={r.id ?? `new-${i}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <div>
                  <label className={label}>Libellé</label>
                  <input className={field} value={r.label} onChange={(e) => patch(i, { label: e.target.value })} />
                </div>

                {tab === 'bank' && (<>
                  <div><label className={label}>Nom de la banque</label>
                    <input className={field} value={r.bankName} onChange={(e) => patch(i, { bankName: e.target.value })} /></div>
                  <div><label className={label}>N° de compte</label>
                    <input className={field} value={r.accountLine} onChange={(e) => patch(i, { accountLine: e.target.value })} /></div>
                </>)}

                {tab === 'identity' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={label}>R.C</label>
                      <input className={field} value={r.rc} onChange={(e) => patch(i, { rc: e.target.value })} /></div>
                    <div><label className={label}>ART.IMP</label>
                      <input className={field} value={r.artImp} onChange={(e) => patch(i, { artImp: e.target.value })} /></div>
                    <div><label className={label}>NIF</label>
                      <input className={field} value={r.nif} onChange={(e) => patch(i, { nif: e.target.value })} /></div>
                    <div><label className={label}>NIS</label>
                      <input className={field} value={r.nis} onChange={(e) => patch(i, { nis: e.target.value })} /></div>
                  </div>
                )}

                {tab === 'footer' && (
                  <div><label className={label}>Texte du pied de page</label>
                    <RichTextEditor value={r.html} onChange={(html) => patch(i, { html })} /></div>
                )}

                {tab === 'product' && (<>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={label}>Référence</label>
                      <input className={field} value={r.ref} onChange={(e) => patch(i, { ref: e.target.value })} /></div>
                    <div><label className={label}>UM</label>
                      <input className={field} value={r.um} onChange={(e) => patch(i, { um: e.target.value })} /></div>
                    <div><label className={label}>P.U H.T par défaut</label>
                      <input type="number" step="0.01" className={field} value={r.defaultPU}
                        onChange={(e) => patch(i, { defaultPU: Number(e.target.value) })} /></div>
                  </div>
                  <div><label className={label}>Désignation</label>
                    <RichTextEditor value={r.designationHtml} onChange={(html) => patch(i, { designationHtml: html })} /></div>
                </>)}

                {tab === 'stamp' && (
                  <div className="flex items-center gap-3">
                    {r.imageUrl && <img src={r.imageUrl} alt="" className="w-20 h-20 object-contain bg-white rounded" />}
                    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 cursor-pointer hover:bg-white/5">
                      <Upload className="w-4 h-4" /> Téléverser
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(i, f); }} />
                    </label>
                  </div>
                )}

                {tab !== 'product' && (
                  <label className="flex items-center gap-2 text-sm text-white/80 pt-1">
                    <input type="checkbox" checked={!!r.isDefault}
                      onChange={(e) => patch(i, { isDefault: e.target.checked })} />
                    Par défaut (prérempli sur les nouveaux documents)
                  </label>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => del(i)} className="inline-flex items-center gap-1 text-sm text-red-300/70 hover:text-red-300">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                  <button onClick={() => save(i)} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#87A922] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
                    <Save className="w-4 h-4" /> Enregistrer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <button onClick={addBlank}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Plus className="w-4 h-4" /> Ajouter un préréglage
          </button>
        </div>
      </div>
    </div>
  );
}
