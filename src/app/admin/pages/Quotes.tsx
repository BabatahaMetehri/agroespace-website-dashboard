import { useEffect, useMemo, useState } from 'react';
import { Search, Phone, MoreHorizontal, X, MessageSquare, Mail, Plus, Trash2, FileText, Download, Lock, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { nameFromEmail } from '../auth/identity';
import { AdminHeader } from './AdminHeader';

type QuoteStatus = 'pending' | 'contacted' | 'quoted' | 'won' | 'lost';

type NoteEntry = { id: string; body: string; created_at: string; author?: string };

type Quote = {
  id: string;
  product_id?: string | number;
  product_sku?: string;
  product_title?: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  wilaya?: string;
  sprinkler?: string;
  agency?: string;
  quantity?: number;
  documents?: { path: string; name: string; type: string; size: number }[];
  message?: string;
  created_at: string;
  status?: QuoteStatus;
  notes?: string | NoteEntry[];
};

type SignedDoc = { name: string; type: string; size: number; url: string };

const statuses: { value: QuoteStatus; label: string; cls: string }[] = [
  { value: 'pending', label: 'En attente', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25' },
  { value: 'contacted', label: 'Contacté', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  { value: 'quoted', label: 'Devis envoyé', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  { value: 'won', label: 'Signé', cls: 'bg-green-500/15 text-green-300 border-green-500/25' },
  { value: 'lost', label: 'Perdu', cls: 'bg-red-500/15 text-red-300 border-red-500/25' },
];

const statusMeta = (s?: QuoteStatus) => statuses.find((x) => x.value === (s ?? 'pending'))!;

/** Parse notes – handles both legacy plain strings and the new array format. */
const parseNotes = (raw: unknown): NoteEntry[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as NoteEntry[];
  if (typeof raw === 'string' && raw.trim()) {
    return [{ id: crypto.randomUUID(), body: raw.trim(), created_at: new Date().toISOString() }];
  }
  return [];
};

export const Quotes = () => {
  const { api } = useAdminAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [active, setActive] = useState<Quote | null>(null);

  const refresh = async () => {
    try {
      const list = await api<Quote[]>('/admin/quotes');
      list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setQuotes(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [api]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((row) => {
      const matchesStatus = statusFilter === 'all' || (row.status ?? 'pending') === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [row.name, row.phone, row.email, row.company, row.product_title, row.product_sku, row.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [quotes, query, statusFilter]);

  const updateQuote = async (id: string, patch: Partial<Quote>) => {
    try {
      const updated = await api<Quote>(`/admin/quotes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      if (active?.id === id) setActive(updated);
      toast.success('Mis à jour');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Supprimer définitivement cette demande ?')) return;
    try {
      await api(`/admin/quotes/${id}`, { method: 'DELETE' });
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setActive(null);
      toast.success('Supprimée');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Devis en attente"
        subtitle="Gérez les demandes commerciales reçues via le site et le bouton WhatsApp."
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Rechercher..."
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#87A922] w-64"
              />
            </div>
            <button
              onClick={refresh}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 hover:bg-white/10 transition-colors text-xs uppercase tracking-[0.15em] text-white/70"
            >
              Rafraîchir
            </button>
          </>
        }
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold border ${
            statusFilter === 'all' ? 'bg-white text-[#0f2618] border-transparent' : 'bg-transparent text-white/60 border-white/15 hover:text-white'
          }`}
        >
          Tous ({quotes.length})
        </button>
        {statuses.map((s) => {
          const count = quotes.filter((q) => (q.status ?? 'pending') === s.value).length;
          const active = statusFilter === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.15em] font-semibold border ${
                active ? s.cls : 'bg-transparent text-white/60 border-white/15 hover:text-white'
              }`}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider bg-white/[0.02]">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Téléphone</th>
                <th className="px-6 py-4 font-medium">Produit</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    Aucune demande.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((q) => {
                  const meta = statusMeta(q.status);
                  return (
                    <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5 text-white/60 font-mono text-xs">
                        {new Date(q.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-white font-medium">{q.name ?? '—'}</div>
                        {q.company && <div className="text-white/40 text-xs">{q.company}</div>}
                      </td>
                      <td className="px-6 py-5 text-white/80">
                        {q.phone ? (
                          <a href={`tel:${q.phone}`} className="hover:text-white">
                            {q.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-5 text-white/80">
                        <div>{q.product_title ?? '—'}</div>
                        {q.product_sku && <div className="text-white/40 text-xs font-mono">{q.product_sku}</div>}
                      </td>
                      <td className="px-6 py-5">
                        <select
                          value={q.status ?? 'pending'}
                          onChange={(e) => updateQuote(q.id, { status: e.target.value as QuoteStatus })}
                          className={`appearance-none px-3 py-1 rounded-full text-xs font-medium tracking-wide border ${meta.cls} cursor-pointer focus:outline-none`}
                        >
                          {statuses.map((s) => (
                            <option key={s.value} value={s.value} className="bg-[#0f2618] text-white">
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {q.phone && (
                            <a
                              href={`https://wa.me/${q.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#25D366] hover:bg-white/5 rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setActive(q)}
                            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg"
                            title="Détails"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <QuoteDrawer
          quote={active}
          onClose={() => setActive(null)}
          onUpdate={updateQuote}
          onDelete={deleteQuote}
        />
      )}
    </div>
  );
};

const QuoteDrawer = ({
  quote,
  onClose,
  onUpdate,
  onDelete,
}: {
  quote: Quote;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Quote>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const { api, user } = useAdminAuth();
  const [notes, setNotes] = useState<NoteEntry[]>(() => parseNotes(quote.notes));
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<SignedDoc[] | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);

  // Fetch short-lived signed URLs for the private documents when the drawer
  // opens. They expire after a few minutes, so we fetch on demand (not on list).
  useEffect(() => {
    if (!quote.documents?.length) {
      setDocs([]);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    api<SignedDoc[]>(`/admin/quotes/${quote.id}/documents`)
      .then((d) => { if (!cancelled) setDocs(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setDocs([]); })
      .finally(() => { if (!cancelled) setDocsLoading(false); });
    return () => { cancelled = true; };
  }, [quote.id, quote.documents, api]);

  const addNote = async () => {
    const body = draftNote.trim();
    if (!body) return;
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      body,
      created_at: new Date().toISOString(),
      author: user?.email ?? undefined,
    };
    const updated = [entry, ...notes];
    setNotes(updated);
    setDraftNote('');
    setSaving(true);
    await onUpdate(quote.id, { notes: updated });
    setSaving(false);
  };

  const removeNote = async (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    await onUpdate(quote.id, { notes: updated });
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-lg bg-[#0f2618] border-l border-white/10 flex flex-col">
        <header className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
          <div>
            <div className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Demande</div>
            <h2 className="text-2xl text-white font-light">{quote.product_title ?? 'Sans produit'}</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">Client</h3>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2 text-sm">
              <div className="text-white">{quote.name ?? '—'}</div>
              {quote.company && <div className="text-white/60">{quote.company}</div>}
              {quote.address && <div className="text-white/60">📍 {quote.address}</div>}
              {quote.wilaya && <div className="text-white/60">🗺️ {quote.wilaya}</div>}
              {quote.agency && (
                <div className="flex items-center gap-2 text-white/80 pt-1">
                  <span className="text-white/40 text-xs uppercase tracking-[0.15em]">Agence :</span>
                  <span className="font-medium">{quote.agency}</span>
                </div>
              )}
              {quote.sprinkler && (
                <div className="flex items-center gap-2 text-white/80 pt-1">
                  <span className="text-white/40 text-xs uppercase tracking-[0.15em]">Asperseur :</span>
                  <span className="font-medium">{quote.sprinkler}</span>
                </div>
              )}
              {quote.quantity != null && quote.quantity > 1 && (
                <div className="flex items-center gap-2 text-white/80">
                  <Package className="w-4 h-4 text-[#87A922]" /> Quantité : <span className="font-medium">{quote.quantity}</span>
                </div>
              )}
              {quote.phone && (
                <div className="flex items-center gap-2 text-white/80">
                  <Phone className="w-4 h-4 text-[#87A922]" /> {quote.phone}
                </div>
              )}
              {quote.email && (
                <div className="flex items-center gap-2 text-white/80">
                  <Mail className="w-4 h-4 text-[#87A922]" /> {quote.email}
                </div>
              )}
            </div>
          </section>

          {quote.message && (
            <section>
              <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">Message / notes</h3>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-sm text-white/80 whitespace-pre-line">
                {quote.message}
              </div>
            </section>
          )}

          {!!quote.documents?.length && (
            <section>
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/40 mb-3">
                <Lock className="w-3.5 h-3.5 text-[#87A922]" /> Documents légaux ({quote.documents.length})
              </h3>
              {docsLoading ? (
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Génération des liens sécurisés…
                </div>
              ) : docs && docs.length > 0 ? (
                <div className="space-y-2">
                  {docs.map((d, i) => (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 transition-colors group"
                    >
                      <FileText className="w-4 h-4 text-[#87A922] flex-shrink-0" />
                      <span className="text-white/80 text-sm truncate flex-1">{d.name}</span>
                      {d.size > 0 && (
                        <span className="text-white/30 text-[10px] flex-shrink-0">
                          {(d.size / 1024 / 1024).toFixed(1)} Mo
                        </span>
                      )}
                      <Download className="w-4 h-4 text-white/40 group-hover:text-white flex-shrink-0" />
                    </a>
                  ))}
                  <p className="text-white/30 text-[11px]">Liens valables 5 minutes — fichiers privés.</p>
                </div>
              ) : (
                <p className="text-white/30 text-xs italic">Impossible de charger les documents.</p>
              )}
            </section>
          )}

          {/* Notes timeline */}
          <section>
            <h3 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">Notes internes</h3>

            {/* Add new note */}
            <div className="flex gap-2 mb-4">
              <textarea
                rows={2}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    addNote();
                  }
                }}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#87A922] resize-none"
                placeholder="Ajouter une note... (Ctrl+Entrée)"
              />
              <button
                onClick={addNote}
                disabled={!draftNote.trim() || saving}
                className="flex-shrink-0 w-10 h-10 bg-[#87A922] hover:bg-[#6c871b] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors self-start mt-0.5"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Timeline */}
            {notes.length === 0 ? (
              <p className="text-white/30 text-xs italic">Aucune note pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group bg-white/[0.03] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="flex items-center gap-2 min-w-0">
                        {note.author && (
                          <span className="text-[#87A922] text-xs font-semibold truncate">
                            {nameFromEmail(note.author)}
                          </span>
                        )}
                        <span className="text-white/30 text-xs font-mono flex-shrink-0">
                          {new Date(note.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-white/80 text-sm whitespace-pre-line leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2 text-xs text-white/40">
            <div>
              <span className="text-white/30 uppercase tracking-[0.15em]">ID :</span> {quote.id}
            </div>
            <div>
              <span className="text-white/30 uppercase tracking-[0.15em]">Reçu :</span>{' '}
              {new Date(quote.created_at).toLocaleString('fr-FR')}
            </div>
            {quote.product_sku && (
              <div>
                <span className="text-white/30 uppercase tracking-[0.15em]">SKU :</span>{' '}
                <span className="font-mono">{quote.product_sku}</span>
              </div>
            )}
          </section>
        </div>

        <footer className="border-t border-white/5 p-6 flex items-center justify-between gap-3">
          <button
            onClick={() => onDelete(quote.id)}
            className="text-red-300 hover:text-red-200 text-xs uppercase tracking-[0.15em] font-semibold"
          >
            Supprimer
          </button>
          {quote.phone && (
            <a
              href={`https://wa.me/${quote.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1fad53] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Ouvrir WhatsApp
            </a>
          )}
        </footer>
      </aside>
    </div>
  );
};
