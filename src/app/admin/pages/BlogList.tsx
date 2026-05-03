import { useEffect, useMemo, useState } from 'react';
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

export const BlogList = () => {
  const { api } = useAdminAuth();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      const list = await api<AdminPost[]>('/admin/blog');
      list.sort((a, b) => (a.date < b.date ? 1 : -1));
      setPosts(list);
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
    if (!q) return posts;
    return posts.filter((p) =>
      [p.title.fr, p.excerpt.fr, p.category, p.slug]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [posts, query]);

  const remove = async (slug: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      await api(`/admin/blog/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
      toast.success('Article supprimé');
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
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
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-white/40 py-16">Aucun article.</p>
          )}
        </div>
      )}
    </div>
  );
};
