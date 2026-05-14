import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

const IMGBB_KEY = (import.meta as any).env?.VITE_IMGBB_KEY ?? '';
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMG_BYTES = 10 * 1024 * 1024;

type Translatable = { fr: string; en: string; ar: string };
type FeaturedSpec = { label: Translatable; value: Translatable };
type FeaturedBrochure = { label: Translatable; url: string };

type FeaturedRecord = {
  product_id: number;
  enabled: boolean;
  sort_order: number;
  tagline: Translatable;
  highlight: Translatable;
  specs: FeaturedSpec[];
  gallery: string[];
  brochures: FeaturedBrochure[];
  updated_at?: string;
  product?: {
    id: number;
    name?: string;
    sku?: string;
    images?: { src: string }[];
    image?: string;
    stock_status?: string;
    stock_quantity?: number;
    short_description?: string;
    categories?: { id: number; name: string }[];
  } | null;
};

type PickerProduct = {
  id: number;
  name?: string;
  sku?: string;
  images?: { src: string }[];
  image?: string;
  categories?: { id: number; name: string }[];
};

const emptyTranslatable = (): Translatable => ({ fr: '', en: '', ar: '' });

const emptyRecord = (productId: number): FeaturedRecord => ({
  product_id: productId,
  enabled: true,
  sort_order: 0,
  tagline: emptyTranslatable(),
  highlight: emptyTranslatable(),
  specs: [],
  gallery: [],
  brochures: [],
});

async function uploadToImgBB(file: File): Promise<string> {
  if (!IMGBB_KEY) throw new Error("Clé d'upload image non configurée");
  if (!ALLOWED_IMG_TYPES.includes(file.type)) {
    throw new Error('Format non supporté (JPEG, PNG, WEBP, GIF)');
  }
  if (file.size > MAX_IMG_BYTES) throw new Error('Image trop volumineuse (max 10 Mo)');
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: 'POST',
    body: fd,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Upload failed');
  return (json.data?.display_url ?? json.data?.url) as string;
}

const productThumb = (p: FeaturedRecord['product'] | PickerProduct | null | undefined) =>
  p?.images?.[0]?.src || (p as any)?.image || '';

export const Featured = () => {
  const { api } = useAdminAuth();
  const [items, setItems] = useState<FeaturedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<FeaturedRecord | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await api<FeaturedRecord[]>('/admin/featured');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const toggleEnabled = async (rec: FeaturedRecord) => {
    try {
      await api(`/admin/featured/${rec.product_id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !rec.enabled }),
      });
      toast.success(rec.enabled ? 'Désactivé' : 'Activé');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (rec: FeaturedRecord) => {
    if (!confirm(`Retirer "${rec.product?.name ?? rec.product_id}" des produits phares ?`))
      return;
    try {
      await api(`/admin/featured/${rec.product_id}`, { method: 'DELETE' });
      toast.success('Retiré des produits phares');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const move = async (rec: FeaturedRecord, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((r) => r.product_id === rec.product_id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    // Swap their sort_orders. If equal, give them distinct values first.
    if (a.sort_order === b.sort_order) {
      a.sort_order = idx;
      b.sort_order = swapIdx;
    }
    const tmp = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tmp;
    try {
      await Promise.all([
        api(`/admin/featured/${a.product_id}`, {
          method: 'PUT',
          body: JSON.stringify({ sort_order: a.sort_order }),
        }),
        api(`/admin/featured/${b.product_id}`, {
          method: 'PUT',
          body: JSON.stringify({ sort_order: b.sort_order }),
        }),
      ]);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onPicked = async (p: PickerProduct) => {
    setPickerOpen(false);
    // If already featured, jump straight to editing.
    const existing = items.find((i) => i.product_id === p.id);
    if (existing) {
      setEditing(existing);
      return;
    }
    // Otherwise create a stub entry and open the editor.
    const nextSort = items.length
      ? Math.max(...items.map((i) => i.sort_order)) + 1
      : 0;
    const stub: FeaturedRecord = {
      ...emptyRecord(p.id),
      sort_order: nextSort,
      tagline: { fr: '', en: '', ar: '' },
      highlight: { fr: '', en: '', ar: '' },
      product: p as any,
    };
    setEditing(stub);
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <AdminHeader
        title="Produits Phares"
        subtitle="Mettez en avant les produits stratégiques avec une carte enrichie (specs, galerie, brochures). N'affecte pas les autres produits du catalogue."
        actions={
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un produit phare
          </button>
        }
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#87A922] animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-[#0f2618] border border-white/5 rounded-2xl p-12 text-center">
          <Star className="w-10 h-10 text-[#87A922] mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-2">Aucun produit phare pour l'instant.</p>
          <p className="text-white/40 text-sm mb-6">
            Cliquez sur "Ajouter un produit phare" pour mettre en avant un produit important sur la page catalogue.
          </p>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter un produit phare
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map((rec, idx) => (
            <article
              key={rec.product_id}
              className={`bg-[#0f2618] border rounded-2xl overflow-hidden flex flex-col ${
                rec.enabled ? 'border-[#87A922]/30' : 'border-white/5 opacity-70'
              }`}
            >
              <div className="relative aspect-[16/9] bg-black/40 overflow-hidden">
                {productThumb(rec.product) ? (
                  <img
                    src={productThumb(rec.product)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="bg-[#87A922] text-white text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Phare #{idx + 1}
                  </span>
                  {!rec.enabled && (
                    <span className="bg-yellow-500/80 text-[#0f2618] text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full">
                      Masqué
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                  <button
                    onClick={() => move(rec, -1)}
                    disabled={idx === 0}
                    title="Monter"
                    className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => move(rec, 1)}
                    disabled={idx === sorted.length - 1}
                    title="Descendre"
                    className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-white text-lg font-medium leading-snug line-clamp-2 mb-1">
                  {rec.product?.name ?? `Produit #${rec.product_id}`}
                </h3>
                <p className="text-white/40 text-xs font-mono mb-3">
                  SKU: {rec.product?.sku ?? '—'}
                </p>
                {rec.tagline.fr && (
                  <p className="text-[#87A922] text-sm italic mb-3 line-clamp-2">
                    "{rec.tagline.fr}"
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                  <div className="bg-white/5 rounded-lg py-2">
                    <div className="text-white font-bold text-sm">
                      {rec.specs.length}
                    </div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wider">
                      Specs
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg py-2">
                    <div className="text-white font-bold text-sm">
                      {rec.gallery.length}
                    </div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wider">
                      Photos
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg py-2">
                    <div className="text-white font-bold text-sm">
                      {rec.brochures.length}
                    </div>
                    <div className="text-white/40 text-[10px] uppercase tracking-wider">
                      Brochures
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setEditing(rec)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs uppercase tracking-[0.15em] font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => toggleEnabled(rec)}
                    title={rec.enabled ? 'Masquer' : 'Activer'}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    {rec.enabled ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => remove(rec)}
                    title="Retirer"
                    className="p-2 text-red-300 hover:text-red-200 hover:bg-white/5 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {pickerOpen && (
        <ProductPicker
          onClose={() => setPickerOpen(false)}
          onPick={onPicked}
          existingIds={new Set(items.map((i) => i.product_id))}
        />
      )}

      {editing && (
        <FeaturedEditor
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
};

const ProductPicker = ({
  onClose,
  onPick,
  existingIds,
}: {
  onClose: () => void;
  onPick: (p: PickerProduct) => void;
  existingIds: Set<number>;
}) => {
  const { api } = useAdminAuth();
  const [items, setItems] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          per_page: '40',
          status: 'active',
        });
        if (debounced.trim()) params.set('search', debounced.trim());
        const data = await api<{ items: PickerProduct[] } | PickerProduct[]>(
          `/admin/products?${params.toString()}`,
        );
        const list = Array.isArray(data) ? data : data.items;
        setItems(list ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, debounced]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f2618] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-white text-xl font-medium">Choisir un produit</h2>
            <p className="text-white/50 text-sm">
              Sélectionnez le produit à mettre en avant. Les produits déjà phares sont
              marqués.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-white/5 text-white/60 hover:text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou SKU..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#87A922]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#87A922] animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-white/40 py-12">Aucun produit trouvé.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((p) => {
                const already = existingIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onPick(p)}
                    className={`flex items-center gap-4 p-3 rounded-xl text-left transition-colors border ${
                      already
                        ? 'bg-[#87A922]/10 border-[#87A922]/40 hover:bg-[#87A922]/15'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-black/40 overflow-hidden flex-shrink-0">
                      {productThumb(p) ? (
                        <img
                          src={productThumb(p)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium line-clamp-1">
                        {p.name ?? `Produit #${p.id}`}
                      </div>
                      <div className="text-white/40 text-xs font-mono">
                        SKU: {p.sku ?? '—'}
                      </div>
                    </div>
                    {already && (
                      <span className="text-[#87A922] text-[10px] uppercase tracking-[0.18em] font-bold flex-shrink-0">
                        Déjà phare
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FeaturedEditor = ({
  record,
  onClose,
  onSaved,
}: {
  record: FeaturedRecord;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { api } = useAdminAuth();
  const [draft, setDraft] = useState<FeaturedRecord>(() => ({
    ...record,
    tagline: { fr: '', en: '', ar: '', ...record.tagline },
    highlight: { fr: '', en: '', ar: '', ...record.highlight },
    specs: record.specs ?? [],
    gallery: record.gallery ?? [],
    brochures: record.brochures ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'general' | 'specs' | 'gallery' | 'brochures'>(
    'general',
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setT = (key: 'tagline' | 'highlight', lang: keyof Translatable, val: string) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [lang]: val } }));

  const addSpec = () =>
    setDraft((d) => ({
      ...d,
      specs: [
        ...d.specs,
        { label: emptyTranslatable(), value: emptyTranslatable() },
      ],
    }));
  const updateSpec = (i: number, patch: Partial<FeaturedSpec>) =>
    setDraft((d) => ({
      ...d,
      specs: d.specs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  const removeSpec = (i: number) =>
    setDraft((d) => ({ ...d, specs: d.specs.filter((_, idx) => idx !== i) }));

  const addBrochure = () =>
    setDraft((d) => ({
      ...d,
      brochures: [...d.brochures, { label: emptyTranslatable(), url: '' }],
    }));
  const updateBrochure = (i: number, patch: Partial<FeaturedBrochure>) =>
    setDraft((d) => ({
      ...d,
      brochures: d.brochures.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    }));
  const removeBrochure = (i: number) =>
    setDraft((d) => ({
      ...d,
      brochures: d.brochures.filter((_, idx) => idx !== i),
    }));

  const handleGalleryFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      setDraft((d) => ({ ...d, gallery: [...d.gallery, url] }));
      toast.success('Image ajoutée');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeGalleryImage = (i: number) =>
    setDraft((d) => ({ ...d, gallery: d.gallery.filter((_, idx) => idx !== i) }));

  const moveGalleryImage = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const next = [...d.gallery];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, gallery: next };
    });

  const save = async () => {
    setSaving(true);
    try {
      // Decide POST (new) vs PUT (update) by whether the record already
      // existed on the server. New entries always come with sort_order set
      // by the caller and no updated_at.
      const isNew = !record.updated_at;
      const body = JSON.stringify({
        product_id: draft.product_id,
        enabled: draft.enabled,
        sort_order: draft.sort_order,
        tagline: draft.tagline,
        highlight: draft.highlight,
        specs: draft.specs,
        gallery: draft.gallery,
        brochures: draft.brochures,
      });
      if (isNew) {
        await api('/admin/featured', { method: 'POST', body });
      } else {
        await api(`/admin/featured/${draft.product_id}`, { method: 'PUT', body });
      }
      toast.success('Produit phare enregistré');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const productName = record.product?.name ?? `Produit #${draft.product_id}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f2618] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-black/40 overflow-hidden flex-shrink-0">
              {productThumb(record.product) ? (
                <img
                  src={productThumb(record.product)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-white text-lg font-medium line-clamp-1">
                {productName}
              </h2>
              <p className="text-white/40 text-xs font-mono">
                SKU: {record.product?.sku ?? '—'} · ID: {draft.product_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-white/5 text-white/60 hover:text-white flex items-center justify-center flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex gap-1 px-6 py-3 border-b border-white/5 overflow-x-auto">
          {(
            [
              ['general', 'Général'],
              ['specs', `Caractéristiques (${draft.specs.length})`],
              ['gallery', `Galerie (${draft.gallery.length})`],
              ['brochures', `Brochures (${draft.brochures.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-xs uppercase tracking-[0.15em] font-semibold whitespace-nowrap transition-colors ${
                tab === key
                  ? 'bg-[#87A922] text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'general' && (
            <div className="space-y-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, enabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#87A922]"
                />
                <span className="text-white text-sm">Activer ce produit phare</span>
              </label>

              <TranslatableField
                label="Slogan court (affiché sous le titre)"
                value={draft.tagline}
                onChange={(lang, v) => setT('tagline', lang, v)}
                rows={1}
                hint="Ex: 'Notre best-seller pour les fermes de 30 hectares.'"
              />

              <TranslatableField
                label="Description complète (visible en mode étendu)"
                value={draft.highlight}
                onChange={(lang, v) => setT('highlight', lang, v)}
                rows={6}
                hint="Décrivez les bénéfices, applications et différenciateurs."
              />
            </div>
          )}

          {tab === 'specs' && (
            <div className="space-y-3">
              {draft.specs.length === 0 && (
                <p className="text-center text-white/40 text-sm py-8">
                  Aucune caractéristique. Ajoutez par exemple : "Surface couverte" →
                  "30 ha".
                </p>
              )}
              {draft.specs.map((spec, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs uppercase tracking-[0.18em] font-semibold">
                      Caractéristique #{i + 1}
                    </span>
                    <button
                      onClick={() => removeSpec(i)}
                      className="text-red-300 hover:text-red-200 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                  <TranslatableField
                    label="Libellé"
                    value={spec.label}
                    onChange={(lang, v) =>
                      updateSpec(i, { label: { ...spec.label, [lang]: v } })
                    }
                    rows={1}
                  />
                  <TranslatableField
                    label="Valeur"
                    value={spec.value}
                    onChange={(lang, v) =>
                      updateSpec(i, { value: { ...spec.value, [lang]: v } })
                    }
                    rows={1}
                  />
                </div>
              ))}
              <button
                onClick={addSpec}
                className="w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/15 rounded-2xl py-3 text-white/70 hover:text-white text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter une caractéristique
              </button>
            </div>
          )}

          {tab === 'gallery' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {draft.gallery.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black/40 group"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.opacity = '0.3')
                      }
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => moveGalleryImage(i, -1)}
                        disabled={i === 0}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveGalleryImage(i, 1)}
                        disabled={i === draft.gallery.length - 1}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeGalleryImage(i)}
                        className="w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {i === 0 && (
                      <span className="absolute top-2 left-2 bg-[#87A922] text-white text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full">
                        Couverture
                      </span>
                    )}
                  </div>
                ))}
                <label
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    uploading
                      ? 'border-[#87A922]/50 bg-[#87A922]/10'
                      : 'border-white/10 hover:border-[#87A922]/50 hover:bg-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleGalleryFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#87A922]" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <span className="text-xs uppercase tracking-wider">
                        Ajouter
                      </span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-white/40 text-xs">
                La première image sert de couverture. Glissez pour réorganiser.
                {!IMGBB_KEY && (
                  <span className="block text-yellow-400/80 mt-1">
                    Note : VITE_IMGBB_KEY n'est pas configuré — l'upload échouera.
                    Vous pouvez coller directement des URLs externes via une
                    extension navigateur.
                  </span>
                )}
              </p>
              {/* Manual URL fallback */}
              <UrlPasteAdder
                onAdd={(url) =>
                  setDraft((d) => ({ ...d, gallery: [...d.gallery, url] }))
                }
              />
            </div>
          )}

          {tab === 'brochures' && (
            <div className="space-y-3">
              {draft.brochures.length === 0 && (
                <p className="text-center text-white/40 text-sm py-8">
                  Aucune brochure. Ajoutez l'URL d'un PDF (Dropbox, Google Drive,
                  hébergement web).
                </p>
              )}
              {draft.brochures.map((b, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs uppercase tracking-[0.18em] font-semibold flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Brochure #{i + 1}
                    </span>
                    <button
                      onClick={() => removeBrochure(i)}
                      className="text-red-300 hover:text-red-200 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                  <TranslatableField
                    label="Libellé du bouton"
                    value={b.label}
                    onChange={(lang, v) =>
                      updateBrochure(i, { label: { ...b.label, [lang]: v } })
                    }
                    rows={1}
                  />
                  <div>
                    <label className="text-white/60 text-xs uppercase tracking-[0.15em] font-semibold block mb-1.5">
                      URL du fichier (PDF ou page)
                    </label>
                    <input
                      type="url"
                      value={b.url}
                      onChange={(e) => updateBrochure(i, { url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#87A922]"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addBrochure}
                className="w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/15 rounded-2xl py-3 text-white/70 hover:text-white text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter une brochure
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/5"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-5 py-2.5 rounded-full disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
  );
};

const TranslatableField = ({
  label,
  value,
  onChange,
  rows = 1,
  hint,
}: {
  label: string;
  value: Translatable;
  onChange: (lang: keyof Translatable, v: string) => void;
  rows?: number;
  hint?: string;
}) => (
  <div>
    <label className="text-white/60 text-xs uppercase tracking-[0.15em] font-semibold block mb-1.5">
      {label}
    </label>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {(['fr', 'en', 'ar'] as const).map((lang) => {
        const Comp = rows > 1 ? 'textarea' : 'input';
        return (
          <div key={lang}>
            <div className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">
              {lang}
            </div>
            <Comp
              value={(value as any)[lang] ?? ''}
              onChange={(e: any) => onChange(lang, e.target.value)}
              rows={rows > 1 ? rows : undefined}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#87A922] resize-none"
            />
          </div>
        );
      })}
    </div>
    {hint && <p className="text-white/30 text-xs mt-1">{hint}</p>}
  </div>
);

const UrlPasteAdder = ({ onAdd }: { onAdd: (url: string) => void }) => {
  const [url, setUrl] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Ou collez une URL d'image..."
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#87A922]"
      />
      <button
        onClick={() => {
          const u = url.trim();
          if (!u) return;
          if (!/^https?:\/\//i.test(u)) {
            toast.error('URL invalide (doit commencer par http:// ou https://)');
            return;
          }
          onAdd(u);
          setUrl('');
        }}
        className="bg-white/5 hover:bg-white/10 text-white text-xs uppercase tracking-[0.15em] font-semibold px-4 py-2 rounded-xl"
      >
        Ajouter
      </button>
    </div>
  );
};
