import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Save, X, Tag, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

type Category = {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
};

type Product = {
  id: number | string;
  sku?: string;
  name: string;
  description?: string;
  regular_price?: string;
  sale_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: 'instock' | 'outofstock';
  categories?: { id?: number | string; name: string }[];
  // WooCommerce/Logicom sends images as an array of objects; the plain
  // `image` string is kept for manual admin edits.
  images?: { src: string; alt?: string }[];
  image?: string;
  // 'publish' = active, 'trash' = soft-deleted (hidden from public catalog)
  status?: string;
  date_modified?: string;
};

/** Extract the first available image URL regardless of which field is populated */
function getImageUrl(p: Product): string {
  if (Array.isArray(p.images) && p.images.length > 0 && p.images[0].src) {
    return p.images[0].src;
  }
  return p.image ?? '';
}

const empty: Product = {
  id: '',
  sku: '',
  name: '',
  description: '',
  regular_price: '',
  manage_stock: true,
  stock_quantity: 0,
  stock_status: 'instock',
  categories: [],
  image: '',
};

export const Products = () => {
  const { api } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'trash' | 'all'>('active');
  const [editing, setEditing] = useState<Product | null>(null);
  const [managingCats, setManagingCats] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const [list, cats] = await Promise.all([
        api<Product[]>('/admin/products'),
        api<Category[]>('/admin/categories').catch(() => [] as Category[]),
      ]);
      setProducts(list);
      setCategories(cats);
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

  // Pre-compute counts for the status pills (always based on full product list)
  const counts = useMemo(() => {
    let active = 0, trash = 0;
    for (const p of products) {
      if (p.status === 'trash') trash++;
      else active++;
    }
    return { active, trash, all: products.length };
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      // Status filter (soft-trash awareness)
      const isTrash = p.status === 'trash';
      if (statusFilter === 'active' && isTrash) return false;
      if (statusFilter === 'trash' && !isTrash) return false;
      // Category filter
      if (activeCat !== 'all') {
        const ids = (p.categories ?? []).map((c) => String(c.id ?? c.name));
        if (!ids.includes(activeCat)) return false;
      }
      if (!q) return true;
      return [p.name, p.sku, String(p.id), p.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [products, query, activeCat, statusFilter]);

  // Soft delete (move to trash) — matches the Logicom/WC default
  const remove = async (id: Product['id']) => {
    if (!confirm('Mettre ce produit à la corbeille ? Il disparaîtra du site mais pourra être restauré.')) return;
    try {
      const updated = await api<Product>(`/admin/products/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      // Edge function returns the trashed product (status=trash); update locally
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, ...updated, status: 'trash' } : p))
      );
      toast.success('Produit mis à la corbeille');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Permanent delete — bypasses trash, cannot be undone
  const removeForever = async (id: Product['id']) => {
    if (!confirm('SUPPRIMER DÉFINITIVEMENT ce produit ? Cette action est irréversible.')) return;
    try {
      await api(`/admin/products/${encodeURIComponent(String(id))}?force=true`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      toast.success('Produit supprimé définitivement');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Restore from trash
  const restore = async (id: Product['id']) => {
    try {
      const updated = await api<Product>(`/admin/products/${encodeURIComponent(String(id))}/restore`, { method: 'POST' });
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, ...updated, status: 'publish' } : p))
      );
      toast.success('Produit restauré');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Produits"
        subtitle="Catalogue synchronisable avec Logicom/Delfiv via l'API WooCommerce miroir."
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher SKU ou nom..."
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#87A922] w-64"
              />
            </div>
            <button
              onClick={() => setManagingCats(true)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs uppercase tracking-[0.15em] font-bold px-4 py-2.5 rounded-full border border-white/10 transition-colors"
            >
              <Tag className="w-4 h-4" /> Catégories
            </button>
            <button
              onClick={() => setEditing({ ...empty })}
              className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouveau produit
            </button>
          </>
        }
      />

      {/* Status filter pills (always visible) */}
      <div className="flex flex-wrap gap-2 mb-3">
        {([
          ['active', `Actifs (${counts.active})`],
          ['trash', `Corbeille (${counts.trash})`],
          ['all', `Tous (${counts.all})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              statusFilter === key
                ? key === 'trash'
                  ? 'bg-red-500/80 text-white'
                  : 'bg-[#0f2618] text-white border border-[#87A922]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            {key === 'trash' && <Trash2 className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeCat === 'all'
                ? 'bg-[#87A922] text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            Toutes ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) =>
              (p.categories ?? []).some((c) => String(c.id ?? c.name) === String(cat.id))
            ).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(String(cat.id))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeCat === String(cat.id)
                    ? 'bg-[#87A922] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#0f2618] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider bg-white/[0.02]">
                <th className="px-6 py-4 font-medium">Image</th>
                <th className="px-6 py-4 font-medium">Nom</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Catégorie</th>
                <th className="px-6 py-4 font-medium">Prix</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    Aucun produit. Cliquez « Nouveau produit » ou laissez Logicom/Delfiv synchroniser.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => {
                  const inStock = (p.stock_status ?? 'instock') === 'instock';
                  const isTrashed = p.status === 'trash';
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isTrashed ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-4 w-20">
                        <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden">
                          {(() => {
                            const url = getImageUrl(p);
                            return url ? (
                              <img
                                src={url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-white font-medium">{p.name}</div>
                          {isTrashed && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Corbeille
                            </span>
                          )}
                        </div>
                        {p.description && <div className="text-white/40 text-xs line-clamp-1 max-w-md">{p.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-white/60 font-mono text-xs">{p.sku ?? '—'}</td>
                      <td className="px-6 py-4">
                        {(p.categories ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(p.categories ?? []).slice(0, 2).map((c, i) => (
                              <span
                                key={`${c.id ?? c.name}-${i}`}
                                className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#87A922]/15 text-[#87A922] border border-[#87A922]/25"
                              >
                                {c.name}
                              </span>
                            ))}
                            {(p.categories ?? []).length > 2 && (
                              <span className="text-[10px] text-white/40">+{(p.categories ?? []).length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#87A922] font-medium">
                        {p.regular_price ? `${p.regular_price} DZD` : 'Sur devis'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            inStock
                              ? 'bg-green-500/15 text-green-300 border-green-500/25'
                              : 'bg-red-500/15 text-red-300 border-red-500/25'
                          }`}
                        >
                          {inStock ? `En stock${p.manage_stock ? ` (${p.stock_quantity ?? 0})` : ''}` : 'Rupture'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-1">
                          {isTrashed ? (
                            <>
                              <button
                                onClick={() => restore(p.id)}
                                className="p-2 text-green-300 hover:text-green-200 hover:bg-white/5 rounded-lg"
                                title="Restaurer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeForever(p.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg"
                                title="Supprimer définitivement"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditing({ ...p })}
                                className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => remove(p.id)}
                                className="p-2 text-red-300 hover:text-red-200 hover:bg-white/5 rounded-lg"
                                title="Mettre à la corbeille"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductDrawer
          product={editing}
          allCategories={categories}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setProducts((prev) => {
              const i = prev.findIndex((p) => String(p.id) === String(saved.id));
              if (i === -1) return [saved, ...prev];
              const next = [...prev];
              next[i] = saved;
              return next;
            });
            setEditing(null);
          }}
        />
      )}

      {managingCats && (
        <CategoryManager
          categories={categories}
          onClose={() => setManagingCats(false)}
          onChange={setCategories}
        />
      )}
    </div>
  );
};

const ProductDrawer = ({
  product,
  allCategories,
  onClose,
  onSaved,
}: {
  product: Product;
  allCategories: Category[];
  onClose: () => void;
  onSaved: (p: Product) => void;
}) => {
  const { api } = useAdminAuth();
  const [draft, setDraft] = useState<Product>(product);
  const [saving, setSaving] = useState(false);
  const isNew = !draft.id;

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft };
      if (isNew) delete (payload as Partial<Product>).id;
      const saved = await api<Product>(
        isNew ? '/admin/products' : `/admin/products/${encodeURIComponent(String(draft.id))}`,
        {
          method: isNew ? 'POST' : 'PUT',
          body: JSON.stringify(payload),
        }
      );
      toast.success(isNew ? 'Produit créé' : 'Produit sauvegardé');
      onSaved(saved);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-xl bg-[#0f2618] border-l border-white/10 flex flex-col">
        <header className="flex items-center justify-between gap-4 p-6 border-b border-white/5">
          <div>
            <div className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">{isNew ? 'Nouveau' : 'Édition'}</div>
            <h2 className="text-2xl text-white font-light">{draft.name || 'Nouveau produit'}</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <Row label="Nom *">
            <input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              className="input"
              placeholder="Pivot Central Western 500 m"
            />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="SKU">
              <input value={draft.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className="input font-mono" />
            </Row>
            <Row label="Prix régulier (DZD)">
              <input
                value={draft.regular_price ?? ''}
                onChange={(e) => set('regular_price', e.target.value)}
                className="input"
                placeholder="laisser vide pour 'Sur devis'"
              />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Stock géré">
              <select
                value={draft.manage_stock ? 'yes' : 'no'}
                onChange={(e) => set('manage_stock', e.target.value === 'yes')}
                className="input"
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </select>
            </Row>
            <Row label="Statut stock">
              <select
                value={draft.stock_status ?? 'instock'}
                onChange={(e) => set('stock_status', e.target.value as Product['stock_status'])}
                className="input"
              >
                <option value="instock">En stock</option>
                <option value="outofstock">Rupture</option>
              </select>
            </Row>
          </div>
          {draft.manage_stock && (
            <Row label="Quantité en stock">
              <input
                type="number"
                value={draft.stock_quantity ?? 0}
                onChange={(e) => set('stock_quantity', Number(e.target.value))}
                className="input"
              />
            </Row>
          )}
          <Row label="Description">
            <textarea
              rows={4}
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className="input resize-none"
            />
          </Row>
          <Row label="Catégories">
            {allCategories.length === 0 ? (
              <p className="text-white/40 text-xs italic">
                Aucune catégorie. Cliquez sur « Catégories » en haut pour en créer.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => {
                  const selected = (draft.categories ?? []).some((c) => String(c.id) === String(cat.id));
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => {
                        const current = draft.categories ?? [];
                        const next = selected
                          ? current.filter((c) => String(c.id) !== String(cat.id))
                          : [...current, { id: cat.id, name: cat.name, slug: cat.slug }];
                        set('categories', next);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border ${
                        selected
                          ? 'bg-[#87A922] text-white border-transparent'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Row>
          <Row label="Image (URL)">
            {/* Show the URL from `image` if set manually, otherwise fall back to
                the first item of the WC `images[]` array (sent by Logicom).
                Editing the field clears `images[]` so the manual URL wins. */}
            <input
              value={draft.image ?? draft.images?.[0]?.src ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, image: v, images: v ? [{ src: v }] : [] }));
              }}
              className="input"
              placeholder="https://i.ibb.co/..."
            />
            {(() => {
              const previewUrl = draft.image || draft.images?.[0]?.src || '';
              return previewUrl ? (
                <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black/40">
                  <img
                    src={previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null;
            })()}
          </Row>
        </div>

        <footer className="border-t border-white/5 p-6 flex justify-end gap-3">
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-6 py-2.5 rounded-full transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </footer>
      </aside>

      <style>{`
        .input { width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:0.75rem; padding:0.625rem 1rem; color:white; outline:none; }
        .input:focus { border-color:#87A922; }
      `}</style>
    </div>
  );
};

const CategoryManager = ({
  categories,
  onClose,
  onChange,
}: {
  categories: Category[];
  onClose: () => void;
  onChange: (next: Category[]) => void;
}) => {
  const { api } = useAdminAuth();
  const [list, setList] = useState<Category[]>(categories);
  const [newName, setNewName] = useState('');
  const [working, setWorking] = useState(false);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setWorking(true);
    try {
      const created = await api<Category>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const next = [...list, created];
      setList(next);
      onChange(next);
      setNewName('');
      toast.success('Catégorie créée');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id: Category['id']) => {
    if (!confirm('Supprimer cette catégorie ? Les produits ne seront plus filtrables par celle-ci.')) return;
    try {
      await api(`/admin/categories/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      const next = list.filter((c) => String(c.id) !== String(id));
      setList(next);
      onChange(next);
      toast.success('Catégorie supprimée');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rename = async (cat: Category, name: string) => {
    if (!name.trim() || name === cat.name) return;
    try {
      const updated = await api<Category>(`/admin/categories/${encodeURIComponent(String(cat.id))}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      const next = list.map((c) => (String(c.id) === String(cat.id) ? updated : c));
      setList(next);
      onChange(next);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f2618] border border-white/10 rounded-2xl flex flex-col max-h-[80vh]">
        <header className="flex items-center justify-between gap-4 p-6 border-b border-white/5">
          <div>
            <div className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">Famille d'article</div>
            <h2 className="text-xl text-white font-light">Catégories de produits</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {list.length === 0 && (
            <p className="text-white/40 text-sm italic">Aucune catégorie. Créez-en une ci-dessous.</p>
          )}
          {list.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
              <input
                defaultValue={cat.name}
                onBlur={(e) => rename(cat, e.target.value)}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
              />
              <span className="text-white/30 text-xs font-mono">{cat.slug}</span>
              <button
                onClick={() => remove(cat.id)}
                className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/5 rounded-lg"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <footer className="border-t border-white/5 p-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create();
            }}
            placeholder="Nouvelle catégorie (ex: Pivots)"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#87A922]"
          />
          <button
            onClick={create}
            disabled={working || !newName.trim()}
            className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </footer>
      </div>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-white/50 text-xs uppercase tracking-[0.15em] font-semibold mb-2">
      {label}
    </span>
    {children}
  </label>
);
