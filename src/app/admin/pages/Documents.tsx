import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileText, Copy, Ban, Trash2, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';
import { createDocApi } from '../documents/lib/docApi';
import type { DocumentRecord, DocumentDraft, PaginatedDocuments } from '../documents/types';
import { formatMoneyFr } from '../documents/lib/calc';
import { DocumentEditor } from '../documents/DocumentEditor';

type View =
  | { mode: 'list' }
  | { mode: 'edit'; doc: DocumentRecord; autoPrint?: boolean }
  | { mode: 'new'; seed: DocumentDraft | null };

const formatFrDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const Documents = () => {
  const { api } = useAdminAuth();
  const docApi = useMemo(() => createDocApi(api), [api]);

  const [view, setView] = useState<View>({ mode: 'list' });
  const [data, setData] = useState<PaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'all' | 'proforma' | 'facture'>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setData(await docApi.listDocuments({ page, per_page: 25, type, search }));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (view.mode === 'list') load(); /* eslint-disable-line */ }, [view, page, type, search]);

  const openEdit = async (id: number) => {
    try { setView({ mode: 'edit', doc: await docApi.getDocument(id) }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const printDoc = async (id: number) => {
    try { setView({ mode: 'edit', doc: await docApi.getDocument(id), autoPrint: true }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const duplicate = async (id: number) => {
    try {
      const d = await docApi.getDocument(id);
      const { id: _i, number: _n, year: _y, displayId: _d, status: _s, created_at: _c, updated_at: _u, ...rest } = d;
      setView({ mode: 'new', seed: { ...rest, date: new Date().toISOString() } as DocumentDraft });
    } catch (e) { toast.error((e as Error).message); }
  };
  const cancel = async (id: number) => {
    if (!confirm('Annuler ce document ? Son numéro restera réservé.')) return;
    try { await docApi.cancelDocument(id); toast.success('Document annulé'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (id: number) => {
    if (!confirm('Supprimer définitivement ce document ?')) return;
    try { await docApi.deleteDocument(id); toast.success('Supprimé'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (view.mode !== 'list') {
    return (
      <DocumentEditor
        docApi={docApi}
        existing={view.mode === 'edit' ? view.doc : null}
        seedDraft={view.mode === 'new' ? view.seed : null}
        onBack={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
        autoPrint={view.mode === 'edit' ? view.autoPrint : undefined}
      />
    );
  }

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm ${active ? 'bg-[#87A922] text-white' : 'text-white/60 hover:bg-white/5'}`;

  return (
    <div>
      <AdminHeader title="Factures & Proformas" subtitle="Créer et gérer les documents commerciaux" />
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button className={pill(type === 'all')} onClick={() => { setType('all'); setPage(1); }}>Tous {data ? `(${data.counts.all})` : ''}</button>
            <button className={pill(type === 'proforma')} onClick={() => { setType('proforma'); setPage(1); }}>Proformas {data ? `(${data.counts.proforma})` : ''}</button>
            <button className={pill(type === 'facture')} onClick={() => { setType('facture'); setPage(1); }}>Factures {data ? `(${data.counts.facture})` : ''}</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher…"
                className="rounded-lg bg-[#0f2618] border border-white/10 pl-9 pr-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]" />
            </div>
            <button onClick={() => setView({ mode: 'new', seed: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">N°</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Total TTC</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#87A922] mx-auto" /></td></tr>
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/40">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" /> Aucun document
                </td></tr>
              ) : (
                data.items.map((d) => (
                  <tr key={d.id} className={`text-white/80 hover:bg-white/[0.02] ${d.status === 'cancelled' ? 'opacity-50 line-through' : ''}`}>
                    <td className="px-4 py-3 font-medium text-white cursor-pointer" onClick={() => openEdit(d.id)}>{d.displayId}</td>
                    <td className="px-4 py-3">{d.type === 'proforma' ? 'Proforma' : 'Facture'}</td>
                    <td className="px-4 py-3">{d.client?.name || '—'}</td>
                    <td className="px-4 py-3">{formatFrDate(d.date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoneyFr(d.totals?.totalTTC ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Ouvrir" onClick={() => openEdit(d.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><FileText className="w-4 h-4" /></button>
                        <button title="Imprimer" onClick={() => printDoc(d.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Printer className="w-4 h-4" /></button>
                        <button title="Dupliquer" onClick={() => duplicate(d.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Copy className="w-4 h-4" /></button>
                        {d.status !== 'cancelled' && (
                          <button title="Annuler" onClick={() => cancel(d.id)} className="p-1.5 rounded hover:bg-white/10 text-amber-300/70 hover:text-amber-300"><Ban className="w-4 h-4" /></button>
                        )}
                        {d.status === 'cancelled' && (
                          <button title="Supprimer" onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-white/10 text-red-300/70 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-40">Précédent</button>
            <span className="text-white/50 text-sm">Page {data.page} / {data.total_pages}</span>
            <button disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
};
