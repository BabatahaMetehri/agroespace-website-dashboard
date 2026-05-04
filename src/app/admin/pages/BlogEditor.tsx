import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Trash2, Eye, ExternalLink, Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';

const IMGBB_KEY = (import.meta as any).env?.VITE_IMGBB_KEY ?? '';

type UploadEntry = {
  id: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
};

const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMG_BYTES = 10 * 1024 * 1024; // 10 MB

async function uploadToImgBB(file: File): Promise<string> {
  if (!IMGBB_KEY) throw new Error('Image upload key not configured');
  if (!ALLOWED_IMG_TYPES.includes(file.type)) {
    throw new Error('Format non supporté (JPEG, PNG, WEBP, GIF uniquement)');
  }
  if (file.size > MAX_IMG_BYTES) {
    throw new Error('Image trop volumineuse (max 10 Mo)');
  }
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Upload failed');
  // Prefer display_url (direct link) over url (viewer page)
  return (json.data?.display_url ?? json.data?.url) as string;
}

type Lang = 'fr' | 'ar' | 'en';

type Editable = {
  slug: string;
  category: string;
  date: string;
  image: string;
  gallery: string[];
  videos: string[];
  published: boolean;
  title: Record<Lang, string>;
  excerpt: Record<Lang, string>;
  body: Record<Lang, string>;
};

const empty: Editable = {
  slug: '',
  category: 'Innovation',
  date: new Date().toISOString().slice(0, 10),
  image: '',
  gallery: [],
  videos: [],
  published: true,
  title: { fr: '', ar: '', en: '' },
  excerpt: { fr: '', ar: '', en: '' },
  body: { fr: '', ar: '', en: '' },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const BlogEditor = () => {
  const { slug } = useParams();
  const isNew = !slug || slug === 'new';
  const { api } = useAdminAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Editable>(empty);
  const [activeLang, setActiveLang] = useState<Lang>('fr');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [galleryDraft, setGalleryDraft] = useState('');
  const [videoDraft, setVideoDraft] = useState('');
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const hasUploading = uploads.some((u) => u.status === 'uploading') || uploadingCover;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingCover(true);
    try {
      const url = await uploadToImgBB(file);
      update('image', url);
      toast.success('Image de couverture téléchargée');
    } catch (err) {
      toast.error(`Échec : ${(err as Error).message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (isNew) return;
    api<Editable>(`/admin/blog/${encodeURIComponent(slug!)}`)
      .then((p) => {
        setPost({
          ...empty,
          ...p,
          gallery: p.gallery ?? [],
          videos: p.videos ?? [],
          title: { fr: '', ar: '', en: '', ...p.title },
          excerpt: { fr: '', ar: '', en: '', ...p.excerpt },
          body: { fr: '', ar: '', en: '', ...p.body },
        });
        setAutoSlug(false);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [slug, isNew, api]);

  const update = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setPost((p) => ({ ...p, [key]: value }));

  const updateLang = (
    field: 'title' | 'excerpt' | 'body',
    lang: Lang,
    value: string
  ) => setPost((p) => ({ ...p, [field]: { ...p[field], [lang]: value } }));

  const onTitleChange = (lang: Lang, value: string) => {
    updateLang('title', lang, value);
    if (autoSlug && lang === 'fr') {
      setPost((p) => ({ ...p, slug: slugify(value) }));
    }
  };

  const addGalleryUrl = () => {
    const v = galleryDraft.trim();
    if (!v) return;
    setPost((p) => ({ ...p, gallery: [...p.gallery, v] }));
    setGalleryDraft('');
  };
  const removeGalleryUrl = (i: number) =>
    setPost((p) => ({ ...p, gallery: p.gallery.filter((_, idx) => idx !== i) }));

  const addVideoUrl = () => {
    const v = videoDraft.trim();
    if (!v) return;
    setPost((p) => ({ ...p, videos: [...p.videos, v] }));
    setVideoDraft('');
  };
  const removeVideoUrl = (i: number) =>
    setPost((p) => ({ ...p, videos: p.videos.filter((_, idx) => idx !== i) }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Reset input so the same file can be re-selected after an error
    e.target.value = '';

    const entries: UploadEntry[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: 'uploading',
    }));
    setUploads((prev) => [...entries, ...prev]);

    await Promise.all(
      files.map(async (file, idx) => {
        const entryId = entries[idx].id;
        try {
          const url = await uploadToImgBB(file);
          setUploads((prev) =>
            prev.map((u) => (u.id === entryId ? { ...u, status: 'done', url } : u))
          );
          setPost((p) => ({ ...p, gallery: [...p.gallery, url] }));
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === entryId
                ? { ...u, status: 'error', error: (err as Error).message }
                : u
            )
          );
          toast.error(`Échec : ${file.name}`);
        }
      })
    );
  };

  const dismissUpload = (id: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  const save = async () => {
    if (!post.slug) {
      toast.error('Le slug est requis.');
      return;
    }
    if (!post.title.fr.trim()) {
      toast.error('Le titre en français est requis.');
      return;
    }
    setSaving(true);
    try {
      const saved = await api<Editable>(
        isNew ? '/admin/blog' : `/admin/blog/${encodeURIComponent(slug!)}`,
        {
          method: isNew ? 'POST' : 'PUT',
          body: JSON.stringify(post),
        }
      );
      toast.success(isNew ? 'Article créé' : 'Article sauvegardé');
      navigate(`/admin/blog/${encodeURIComponent(saved.slug)}`, { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Supprimer définitivement cet article ?')) return;
    try {
      await api(`/admin/blog/${encodeURIComponent(post.slug)}`, { method: 'DELETE' });
      toast.success('Supprimé');
      navigate('/admin/blog');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#87A922] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8" style={{ position: 'relative' }}>
      <Link
        to="/admin/blog"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs uppercase tracking-[0.15em] mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Articles Blog
      </Link>

      <AdminHeader
        title={isNew ? 'Nouvel article' : 'Éditer l’article'}
        subtitle="Saisissez les contenus dans les trois langues. Le français est obligatoire ; les autres langues retombent dessus s'il manque une traduction."
        actions={
          <>
            {!isNew && (
              <Link
                to={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-semibold border border-white/10 hover:bg-white/5 text-white px-5 py-2.5 rounded-full"
              >
                <Eye className="w-4 h-4" /> Aperçu
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {!isNew && (
              <button
                onClick={remove}
                className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] font-semibold border border-red-400/30 text-red-300 hover:bg-red-500/10 px-5 py-2.5 rounded-full"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            )}
            <button
              onClick={save}
              disabled={saving || hasUploading}
              title={hasUploading ? 'Attendre la fin des imports…' : undefined}
              className="flex items-center gap-2 bg-[#87A922] hover:bg-[#6c871b] text-white text-xs uppercase tracking-[0.15em] font-bold px-6 py-2.5 rounded-full transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : hasUploading ? 'Import en cours…' : 'Enregistrer'}
            </button>
          </>
        }
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Language tabs */}
          <div className="flex gap-2">
            {(['fr', 'ar', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.18em] font-semibold border transition-colors ${
                  activeLang === l
                    ? 'bg-[#87A922] text-white border-transparent'
                    : 'bg-transparent text-white/60 border-white/15 hover:text-white'
                }`}
              >
                {l === 'fr' ? 'Français' : l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>

          <div className="bg-[#0f2618] border border-white/5 rounded-2xl p-6 space-y-5">
            <Field label="Titre">
              <input
                value={post.title[activeLang] ?? ''}
                onChange={(e) => onTitleChange(activeLang, e.target.value)}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-[#87A922]"
                placeholder={activeLang === 'fr' ? 'Titre principal de l’article' : 'Traduction'}
              />
            </Field>

            <Field label="Résumé (excerpt)">
              <textarea
                value={post.excerpt[activeLang] ?? ''}
                onChange={(e) => updateLang('excerpt', activeLang, e.target.value)}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#87A922] resize-none"
                placeholder="Phrase courte affichée dans la liste d'articles."
              />
            </Field>

            <Field
              label="Corps de l'article"
              hint="Markdown léger : doubles sauts de ligne pour les paragraphes."
            >
              <textarea
                value={post.body[activeLang] ?? ''}
                onChange={(e) => updateLang('body', activeLang, e.target.value)}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                rows={16}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#87A922] resize-y font-mono text-sm leading-relaxed"
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="bg-[#0f2618] border border-white/5 rounded-2xl p-6 space-y-4">
            <Field label="Slug" hint="URL de l'article : /blog/<slug>">
              <input
                value={post.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  update('slug', slugify(e.target.value));
                }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#87A922]"
                placeholder="exemple-de-slug"
              />
            </Field>

            <Field label="Catégorie">
              <input
                value={post.category}
                onChange={(e) => update('category', e.target.value)}
                list="cms-categories"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#87A922]"
              />
              <datalist id="cms-categories">
                <option value="Innovation" />
                <option value="Irrigation" />
                <option value="Maintenance" />
                <option value="Conseil" />
              </datalist>
            </Field>

            <Field label="Date">
              <input
                type="date"
                value={post.date.slice(0, 10)}
                onChange={(e) => update('date', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#87A922]"
              />
            </Field>

            <Field label="Image de couverture" hint="URL ou upload">
              <div className="flex gap-2 mb-2">
                <input
                  value={post.image}
                  onChange={(e) => update('image', e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                  placeholder="https://i.ibb.co/.../cover.jpg"
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-[0.15em] font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {uploadingCover ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
              </div>
              {post.image && (
                <div className="mt-3 aspect-[16/9] rounded-xl overflow-hidden bg-black/40">
                  <img src={post.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </Field>

            <label className="flex items-center gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={post.published}
                onChange={(e) => update('published', e.target.checked)}
                className="accent-[#87A922] w-4 h-4"
              />
              <span className="text-sm text-white/80">Publier immédiatement</span>
            </label>
          </div>

          <div className="bg-[#0f2618] border border-white/5 rounded-2xl p-6 space-y-3">
            <Field label="Galerie" hint="URL directe ou import depuis l'appareil">
              {/* URL input row */}
              <div className="flex gap-2 mb-2">
                <input
                  value={galleryDraft}
                  onChange={(e) => setGalleryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGalleryUrl();
                    }
                  }}
                  placeholder="https://i.ibb.co/…"
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#87A922]"
                />
                <button
                  type="button"
                  onClick={addGalleryUrl}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-[0.15em] font-semibold rounded-xl"
                >
                  Ajouter
                </button>
              </div>

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={hasUploading}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-[#87A922]/50 hover:bg-[#87A922]/5 text-white/50 hover:text-white/80 text-xs uppercase tracking-[0.15em] font-semibold rounded-xl py-3 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Importer des images
              </button>
            </Field>

            {/* Upload progress list */}
            {uploads.length > 0 && (
              <ul className="space-y-1.5">
                {uploads.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg"
                  >
                    {u.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-[#87A922] animate-spin flex-shrink-0" />
                    )}
                    {u.status === 'done' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                    {u.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-white/60 text-xs truncate flex-1" title={u.name}>
                      {u.name}
                    </span>
                    {u.status === 'uploading' && (
                      <span className="text-[#87A922] text-xs flex-shrink-0">En cours…</span>
                    )}
                    {u.status === 'done' && (
                      <span className="text-green-400 text-xs flex-shrink-0">Ajouté</span>
                    )}
                    {u.status === 'error' && (
                      <span className="text-red-300 text-xs flex-shrink-0 truncate max-w-[8rem]" title={u.error}>
                        {u.error}
                      </span>
                    )}
                    {u.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => dismissUpload(u.id)}
                        className="text-white/25 hover:text-white/60 text-xs flex-shrink-0 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Gallery thumbnail grid */}
            <div className="grid grid-cols-3 gap-2">
              {post.gallery.map((g, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-black/40">
                  <img src={g} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeGalleryUrl(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f2618] border border-white/5 rounded-2xl p-6 space-y-3">
            <Field
              label="Vidéos"
              hint="YouTube, Vimeo ou .mp4 direct."
            >
              <div className="flex gap-2">
                <input
                  value={videoDraft}
                  onChange={(e) => setVideoDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addVideoUrl();
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#87A922]"
                />
                <button
                  type="button"
                  onClick={addVideoUrl}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-[0.15em] font-semibold rounded-xl"
                >
                  Ajouter
                </button>
              </div>
            </Field>

            <ul className="space-y-2">
              {post.videos.map((v, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg"
                >
                  <span className="text-white/70 text-xs font-mono truncate" title={v}>
                    {v}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVideoUrl(i)}
                    className="text-red-300 hover:text-red-200 text-xs uppercase tracking-[0.15em] font-semibold flex-shrink-0"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="flex items-center justify-between mb-2">
      <span className="text-white/50 text-xs uppercase tracking-[0.15em] font-semibold">{label}</span>
      {hint && <span className="text-white/30 text-xs">{hint}</span>}
    </div>
    {children}
  </label>
);
