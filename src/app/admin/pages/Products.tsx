import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

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
  image?: string;
  date_modified?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const list = await api<Product[]>('/admin/products');
      setProducts(list);
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
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku, String(p.id), p.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, query]);

  const remove = async (id: Product['id']) => {
    if (!confirm('Supprimer ce produit du catalogue ?')) return;
    try {
      await api(`/admin/products/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      toast.success('Produit supprimé');
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
              onClick={() => setEditing({ ...empty })}
              className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouveau produit
            </button>
          </>
        }
      />

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
                <th className="px-6 py-4 font-medium">Prix</th>
                <th className="px-6 py-4 font-medium">Stock</th>
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
                    Aucun produit. Cliquez « Nouveau produit » ou laissez Logicom/Delfiv synchroniser.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => {
                  const inStock = (p.stock_status ?? 'instock') === 'instock';
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 w-20">
                        <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden">
                          {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{p.name}</div>
                        {p.description && <div className="text-white/40 text-xs line-clamp-1 max-w-md">{p.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-white/60 font-mono text-xs">{p.sku ?? '—'}</td>
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
                          <button
                            onClick={() => setEditing({ ...p })}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="p-2 text-red-300 hover:text-red-200 hover:bg-white/5 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {editing && (
        <ProductDrawer
          product={editing}
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
    </div>
  );
};

const ProductDrawer = ({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
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
          <Row label="Image (URL)">
            <input value={draft.image ?? ''} onChange={(e) => set('image', e.target.value)} className="input" />
            {draft.image && (
              <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black/40">
                <img src={draft.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
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

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-white/50 text-xs uppercase tracking-[0.15em] font-semibold mb-2">
      {label}
    </span>
    {children}
  </label>
);
