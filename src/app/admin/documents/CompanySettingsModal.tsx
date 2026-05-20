import { useEffect, useRef, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type { CompanySettings } from './types';
import { DEFAULT_COMPANY } from './defaults';

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';

export function CompanySettingsModal({
  docApi,
  onClose,
  onSaved,
}: {
  docApi: DocApi;
  onClose: () => void;
  onSaved: (c: CompanySettings) => void;
}) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [proformaNext, setProformaNext] = useState(1);
  const [factureNext, setFactureNext] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const loadedProformaNext = useRef(1);
  const loadedFactureNext = useRef(1);

  useEffect(() => {
    (async () => {
      try {
        const [c, counters] = await Promise.all([docApi.getCompany(), docApi.getCounters()]);
        if (c && Object.keys(c).length) setCompany({ ...DEFAULT_COMPANY, ...(c as CompanySettings) });
        setProformaNext(counters.proforma_next);
        setFactureNext(counters.facture_next);
        loadedProformaNext.current = counters.proforma_next;
        loadedFactureNext.current = counters.facture_next;
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [docApi]);

  const set = (k: keyof CompanySettings, v: string) => setCompany({ ...company, [k]: v });

  const save = async () => {
    if (proformaNext < loadedProformaNext.current || factureNext < loadedFactureNext.current) {
      if (!confirm('Un numéro saisi est inférieur au prochain numéro actuel. Des numéros déjà utilisés pourraient être réattribués. Continuer ?')) {
        return; // abort without saving anything
      }
    }
    setBusy(true);
    try {
      const saved = await docApi.saveCompany(company);
      // Counters store the LAST used number; "next" - 1.
      await docApi.setCounter('proforma', Math.max(0, proformaNext - 1));
      await docApi.setCounter('facture', Math.max(0, factureNext - 1));
      toast.success('Paramètres enregistrés');
      onSaved(saved as CompanySettings);
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const fields: Array<[keyof CompanySettings, string]> = [
    ['brandName', 'Nom'], ['tagline', 'Slogan'], ['capital', 'Capital social'],
    ['siege', 'Siège'], ['tel', 'Tél'], ['fax', 'Fax'], ['email', 'Email'],
    ['rc', 'R.C'], ['artImp', 'ART.IMP'], ['nif', 'NIF'], ['nis', 'NIS'],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl bg-[#0a1c12] border border-white/10 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-white font-semibold">Paramètres de l'entreprise</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#87A922]" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {fields.map(([k, l]) => (
                <div key={k}>
                  <label className={label}>{l}</label>
                  <input className={field} value={company[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
              <div className="text-amber-200/80 text-xs uppercase tracking-wide mb-2">
                Numérotation — prochain numéro
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Proforma (P••••/AA)</label>
                  <input type="number" min={1} className={field} value={proformaNext}
                    onChange={(e) => setProformaNext(Number(e.target.value))} />
                </div>
                <div>
                  <label className={label}>Facture (•••••/AA)</label>
                  <input type="number" min={1} className={field} value={factureNext}
                    onChange={(e) => setFactureNext(Number(e.target.value))} />
                </div>
              </div>
              <p className="text-white/40 text-[11px] mt-2">
                Définissez le prochain numéro pour synchroniser la suite avec Logicom.
              </p>
            </div>
          </div>
        )}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button onClick={save} disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
