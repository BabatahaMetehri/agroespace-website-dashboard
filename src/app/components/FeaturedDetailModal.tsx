import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Download, FileText, Send, Phone, Check, Star,
  Upload, Loader2, Paperclip, Trash2, Lock, Minus, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n/I18nProvider';
import { publicAnonKey } from '../../../utils/supabase/info';
import { FUNCTIONS_BASE, supabasePublic } from '../admin/auth/supabase';
import { sprinklers, sprinklerById } from '../data/sprinklers';
import type { FeaturedRecord } from './FeaturedProductCard';

type Translatable = { fr?: string; en?: string; ar?: string };

const FALLBACK_IMAGE =
  'https://i.ibb.co/pvjVWRfp/youre-an-expert-designer-create-a-placeh-IM5r1rwm-Wl-Os-Ut-NZCKXG9w-q-We-PUN3x-SZWUFCEKo7rq5-A-cover.jpg';

const WHATSAPP_NUMBER = '213670635013';
const QUOTE_DOCS_BUCKET = 'quote-docs';
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DOC_BYTES = 8 * 1024 * 1024;
const MAX_DOCS = 10;

type StoredDoc = { path: string; name: string; type: string; size: number };

const pick = (t: Translatable | undefined, lang: 'fr' | 'en' | 'ar'): string => {
  if (!t) return '';
  return (t[lang] || t.fr || t.en || t.ar || '').trim();
};

/**
 * Upload the selected files straight to the private Storage bucket using
 * short-lived signed upload tokens minted by the edge function. Uploads run in
 * parallel and send raw binary (no base64), so it stays fast even on mobile.
 * Returns the stored document references to attach to the quote.
 */
async function uploadDocuments(
  files: File[],
  headers: Record<string, string>,
): Promise<StoredDoc[]> {
  const signRes = await fetch(`${FUNCTIONS_BASE}/quote-documents/sign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }),
  });
  if (!signRes.ok) throw new Error('sign failed');
  const { uploads } = await signRes.json();
  if (!Array.isArray(uploads)) throw new Error('bad sign response');

  const results = await Promise.all(
    uploads.map(async (u: any, i: number) => {
      const { error } = await supabasePublic.storage
        .from(QUOTE_DOCS_BUCKET)
        .uploadToSignedUrl(u.path, u.token, files[i], { contentType: files[i].type });
      return error ? null : { path: u.path, name: u.name, type: u.type, size: u.size };
    }),
  );
  return results.filter(Boolean) as StoredDoc[];
}

export const FeaturedDetailModal = ({
  record,
  onClose,
}: {
  record: FeaturedRecord;
  onClose: () => void;
}) => {
  const { t, lang } = useI18n();
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [sprinkler, setSprinkler] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const valid: File[] = [];
    for (const f of incoming) {
      if (!ALLOWED_DOC_TYPES.includes(f.type)) {
        toast.error(`Format non supporté : ${f.name}`, { description: 'PDF, JPG, PNG ou WEBP.' });
        continue;
      }
      if (f.size > MAX_DOC_BYTES) {
        toast.error(`Fichier trop volumineux : ${f.name}`, { description: 'Max 8 Mo par fichier.' });
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_DOCS));
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const product = record.product;
  const productName = product?.name ?? `Produit #${record.product_id}`;
  const sku = product?.sku ?? `#${record.product_id}`;
  const coverImage =
    record.gallery[0] || product?.images?.[0]?.src || product?.image || FALLBACK_IMAGE;
  const tagline = pick(record.tagline, lang as any);
  const highlight = pick(record.highlight, lang as any);
  const coverage = (record.coverage ?? '').trim();
  const gallery = record.gallery.length ? record.gallery : [coverImage];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accepted) {
      toast.error('Veuillez accepter les conditions.');
      return;
    }
    const form = new FormData(e.currentTarget);
    const brand = sprinklerById(sprinkler);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    };

    setSubmitting(true);
    try {
      // 1) Upload any attached legal documents straight to the PRIVATE bucket
      //    first, so the quote stores only their storage references.
      let documents: StoredDoc[] = [];
      if (files.length) {
        try {
          documents = await uploadDocuments(files, headers);
          if (documents.length < files.length) {
            toast.error('Certains documents n\'ont pas pu être envoyés', {
              description: 'La demande continue avec les fichiers réussis.',
            });
          }
        } catch {
          toast.error('Échec du téléversement des documents', {
            description: 'La demande est envoyée sans les fichiers.',
          });
        }
      }

      const payload = {
        product_id: record.product_id,
        product_sku: sku,
        product_title: productName,
        name: form.get('name'),
        phone: form.get('phone'),
        address: form.get('address'),
        wilaya: form.get('wilaya'),
        sprinkler: brand?.name ?? '',
        quantity,
        message: form.get('message') ?? '',
        documents,
      };

      // 2) Save the quote so it lands in "Devis en attente".
      await fetch(`${FUNCTIONS_BASE}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch(() => null);

      const text = `Bonjour AGROESPACE,%0A%0ADemande de proforma :%0AProduit : ${productName}${
        coverage ? ' (' + coverage + ')' : ''
      }%0AQuantité : ${quantity}%0ANom : ${payload.name}%0ATéléphone : ${payload.phone}%0AAdresse : ${payload.address ?? '-'}%0AWilaya : ${payload.wilaya ?? '-'}%0AAsperseur : ${payload.sprinkler || '-'}`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
      toast.success('Demande envoyée', { description: 'Nous vous répondons dans la journée.' });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const specs = record.specs
    .map((s) => ({ label: pick(s.label, lang as any), value: pick(s.value, lang as any) }))
    .filter((s) => s.label || s.value);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-[#0a1c12]/85 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          className="relative bg-[#0f2618] border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden text-white flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="overflow-y-auto">
            {/* Hero */}
            <div className="relative aspect-[21/9] bg-black/50">
              <img src={coverImage} alt={productName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-[#0f2618]/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="bg-[#87A922] text-white text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-3">
                  <Star className="w-3 h-3" fill="currentColor" />
                  {t('catalog.featured', 'Produit Phare')}
                </span>
                <div className="flex flex-wrap items-end gap-4">
                  <h2 className="text-3xl md:text-4xl font-light leading-tight">{productName}</h2>
                  {coverage && (
                    <span className="bg-white/95 text-[#0f2618] text-xl font-bold px-4 py-1 rounded-xl">
                      {coverage}
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs font-mono mt-2">SKU: {sku}</p>
              </div>
            </div>

            <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left: info */}
              <div className="lg:col-span-3 space-y-8">
                {tagline && (
                  <p className="text-[#87A922] text-lg italic font-serif">"{tagline}"</p>
                )}

                {highlight && (
                  <div>
                    <h3 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                      {t('catalog.featured.description', 'Description')}
                    </h3>
                    <p
                      className="text-white/75 leading-relaxed whitespace-pre-wrap"
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {highlight}
                    </p>
                  </div>
                )}

                {specs.length > 0 && (
                  <div>
                    <h3 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                      {t('catalog.featured.specs', 'Caractéristiques techniques')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      {specs.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-4 py-2.5 border-b border-white/5"
                        >
                          <span className="text-white/60 text-sm">{s.label}</span>
                          <span className="text-white text-sm font-medium text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gallery.length > 1 && (
                  <div>
                    <h3 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                      {t('catalog.featured.gallery', 'Galerie')}
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {gallery.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          onClick={() => setActiveImage(url)}
                          className="relative aspect-square rounded-xl overflow-hidden bg-black/40 group"
                        >
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.3')}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {record.brochures.length > 0 && (
                  <div>
                    <h3 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                      {t('catalog.featured.brochures', 'Brochures à télécharger')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {record.brochures.map((b, i) => {
                        const label =
                          pick(b.label, lang as any) || t('catalog.featured.brochure', 'Brochure');
                        if (!b.url) return null;
                        return (
                          <a
                            key={i}
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#87A922]/40 text-white text-sm font-medium px-5 py-3 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-[#87A922]" />
                            {label}
                            <Download className="w-3.5 h-3.5 text-white/40 ml-1" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: proforma request */}
              <div className="lg:col-span-2">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 lg:sticky lg:top-0">
                  <span className="text-[#87A922] uppercase tracking-[0.2em] text-xs font-semibold mb-1 block">
                    {t('catalog.quote', 'Demander un devis')}
                  </span>
                  <h3 className="text-xl font-light mb-5">Demande de proforma</h3>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Nom complet *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                    />
                    <input
                      name="phone"
                      type="tel"
                      required
                      maxLength={30}
                      pattern="[+\d][\d\s().\-]{5,24}"
                      autoComplete="tel"
                      placeholder="Téléphone *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                    />
                    <input
                      name="address"
                      required
                      maxLength={200}
                      placeholder="Adresse *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                    />
                    <input
                      name="wilaya"
                      required
                      maxLength={100}
                      placeholder="Wilaya *"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#87A922]"
                    />

                    {/* Quantity */}
                    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                      <span className="text-white/60 text-sm">Quantité</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-40"
                          disabled={quantity <= 1}
                          aria-label="Diminuer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))
                          }
                          className="w-14 bg-transparent text-center text-white font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(9999, q + 1))}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                          aria-label="Augmenter"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sprinkler brand picker */}
                    <div className="pt-1">
                      <label className="text-white/50 text-[11px] uppercase tracking-[0.15em] font-semibold block mb-2">
                        Asperseur
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {sprinklers.map((s) => {
                          const selected = sprinkler === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSprinkler(selected ? '' : s.id)}
                              className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-colors ${
                                selected
                                  ? 'border-[#87A922] bg-[#87A922]/10'
                                  : 'border-white/10 bg-white/5 hover:border-white/25'
                              }`}
                            >
                              <span className="h-8 w-full flex items-center justify-center">
                                <img
                                  src={s.logo}
                                  alt={s.name}
                                  className="max-h-8 max-w-full object-contain bg-white rounded px-1 py-0.5"
                                />
                              </span>
                              <span className="text-[11px] text-white/80">{s.name}</span>
                              {selected && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#87A922] flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description / notes */}
                    <textarea
                      name="message"
                      rows={3}
                      maxLength={2000}
                      placeholder="Description / notes (surface, débit, contraintes du terrain…)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#87A922] resize-none"
                    />

                    {/* Optional legal documents (private upload) */}
                    <div>
                      <label className="text-white/50 text-[11px] uppercase tracking-[0.15em] font-semibold block mb-2">
                        Documents légaux (RC, NIF, NIS…) — facultatif
                      </label>
                      <label
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/15 hover:border-[#87A922]/50 hover:bg-white/5 cursor-pointer py-5 text-center transition-colors"
                      >
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }}
                        />
                        <Upload className="w-5 h-5 text-white/50" />
                        <span className="text-white/60 text-xs">PDF ou image · 8 Mo max par fichier</span>
                      </label>

                      {files.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {files.map((f, i) => (
                            <li
                              key={`${f.name}-${i}`}
                              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-[#87A922] flex-shrink-0" />
                              <span className="text-white/80 text-xs truncate flex-1">{f.name}</span>
                              <span className="text-white/30 text-[10px] flex-shrink-0">
                                {(f.size / 1024 / 1024).toFixed(1)} Mo
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="text-white/40 hover:text-red-300 flex-shrink-0"
                                aria-label="Retirer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="flex items-start gap-1.5 text-white/35 text-[11px] mt-2 leading-relaxed">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#87A922]" />
                        Vos documents sont stockés de manière sécurisée et privée — visibles uniquement
                        par notre équipe commerciale, jamais publiés.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer py-1">
                      <span className="mt-0.5 relative flex items-center justify-center w-5 h-5 rounded border border-white/30 bg-transparent flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                          className="absolute w-full h-full opacity-0 cursor-pointer peer"
                        />
                        <Check className="w-3 h-3 text-[#87A922] opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </span>
                      <span className="text-white/60 text-xs leading-relaxed">
                        J'accepte les{' '}
                        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                          conditions générales
                        </a>{' '}
                        et la{' '}
                        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                          politique de confidentialité
                        </a>.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting || !accepted}
                      className="w-full bg-[#25D366] hover:bg-[#1fad53] text-white rounded-full px-6 py-3.5 font-bold uppercase tracking-[0.1em] text-sm transition-colors flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submitting ? 'Envoi…' : 'Envoyer la demande'}
                    </button>
                    <a
                      href={`tel:+${WHATSAPP_NUMBER}`}
                      className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full px-6 py-3 font-bold uppercase tracking-[0.1em] text-sm transition-colors"
                    >
                      <Phone className="w-4 h-4" /> Appeler
                    </a>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Image lightbox */}
      {activeImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            onClick={() => setActiveImage(null)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={activeImage}
            alt=""
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
