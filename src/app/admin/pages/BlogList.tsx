import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2, Eye, Heart, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

type AdminPost = {
  slug: string;
  title: { fr: string; ar?: string; en?: string };
  excerpt: { fr: string; ar?: string; en?: string };
  category: string;
  date: string;
  image: string;
  views: number;
  likes: number;
  published: boolean;
  source: 'cms' | 'seed';
  updated_at?: string;
};

type BlogPage = {
  items: AdminPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  counts: { all: number; published: number; draft: number };
};

const PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;
const DEFAULT_PER_PAGE = 24;

export const BlogList = () => {
  const { api } = useAdminAuth();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [counts, setCounts] = useState<{ all: number; published: number; draft: number }>({
    all: 0,
    published: 0,
    draft: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search — same 300ms window as the products page so admins
  // typing fast don't trigger one fetch per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const refresh = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        per_page: String(perPage),
      });
      if (debouncedQuery.trim()) params.set('search', debouncedQuery.trim());
      const data = await api<BlogPage>(`/admin/blog?${params.toString()}`);
      setPosts(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setCounts(data.counts);
      setError(null);
      if (data.page !== page) setPage(data.page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 whenever a filter changes; otherwise just re-fetch.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedQuery, perPage]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, statusFilter, debouncedQuery, page, perPage]);

  const remove = async (slug: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      await api(`/admin/blog/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      toast.success('Article supprimé');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Articles Blog"
        subtitle="Créez et publiez des articles dans les trois langues, sans toucher au code."
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher..."
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#87A922] w-64"
              />
            </div>
            <Link
              to="/admin/blog/new"
              className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouvel article
            </Link>
          </>
        }
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ['all', `Tous (${counts.all})`],
          ['published', `Publiés (${counts.published})`],
          ['draft', `Brouillons (${counts.draft})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === key
                ? 'bg-[#0f2618] text-white border border-[#87A922]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#87A922] animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {posts.map((p) => (
              <article
                key={p.slug}
                className="group bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden hover:border-white/15 transition-colors flex flex-col"
              >
                <div className="relative aspect-[16/9] bg-black/40 overflow-hidden">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-white/90 text-[#0f2618] text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full">
                      {p.category}
                    </span>
                    {!p.published && (
                      <span className="bg-yellow-500/80 text-[#0f2618] text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full">
                        Brouillon
                      </span>
                    )}
                    {p.source === 'seed' && (
                      <span className="bg-white/15 text-white text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                        Seed
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="text-[#87A922] text-[10px] uppercase tracking-[0.18em] font-semibold mb-2">
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <h3 className="text-white text-lg font-medium leading-snug line-clamp-2 mb-2">
                    {p.title.fr}
                  </h3>
                  <p className="text-white/50 text-sm line-clamp-2 mb-5">{p.excerpt.fr}</p>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4 text-white/40 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> {p.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" /> {p.likes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Link
                        to={`/admin/blog/${encodeURIComponent(p.slug)}`}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      {p.source === 'cms' && (
                        <button
                          onClick={() => remove(p.slug)}
                          className="p-2 text-red-300 hover:text-red-200 hover:bg-white/5 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {posts.length === 0 && (
              <p className="col-span-full text-center text-white/40 py-16">Aucun article.</p>
            )}
          </div>

          {/* Pagination footer — same pattern as the Products page. */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 px-1">
              <div className="text-white/40 text-xs uppercase tracking-wider">
                {total > 0 && (
                  <>
                    {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} sur {total}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-white/40 text-xs uppercase tracking-wider mr-1">Par page</label>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg text-white/70 text-xs px-2 py-1 focus:outline-none focus:border-[#87A922]"
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n} className="bg-[#0f2618]">
                      {n}
                    </option>
                  ))}
                </select>
                <BlogPaginationControls page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Smart-windowed pagination control (same shape as the Products page so the
// dashboard has a single visual language). Always shows page 1, the last
// page, and the current ±1 — gaps become "…".
const BlogPaginationControls = ({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
}) => {
  const tokens: (number | 'gap')[] = (() => {
    const win = new Set<number>([1, totalPages, page]);
    for (let d = 1; d <= 1; d++) {
      if (page - d >= 1) win.add(page - d);
      if (page + d <= totalPages) win.add(page + d);
    }
    const ordered = Array.from(win).sort((a, b) => a - b);
    const out: (number | 'gap')[] = [];
    for (let i = 0; i < ordered.length; i++) {
      if (i > 0 && ordered[i] - ordered[i - 1] > 1) out.push('gap');
      out.push(ordered[i]);
    }
    return out;
  })();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/60"
        aria-label="Page précédente"
      >
        ‹
      </button>
      {tokens.map((tok, i) =>
        tok === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-white/30 text-xs select-none">
            …
          </span>
        ) : (
          <button
            key={tok}
            onClick={() => onChange(tok)}
            aria-current={tok === page ? 'page' : undefined}
            className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors ${
              tok === page
                ? 'bg-[#87A922] text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            {tok}
          </button>
        )
      )}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/60"
        aria-label="Page suivante"
      >
        ›
      </button>
    </div>
  );
};
