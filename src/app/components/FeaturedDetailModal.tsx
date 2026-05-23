import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, Send, Phone, Check, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n/I18nProvider';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { sprinklers, sprinklerById } from '../data/sprinklers';
import type { FeaturedRecord } from './FeaturedProductCard';

type Translatable = { fr?: string; en?: string; ar?: string };

const FALLBACK_IMAGE =
  'https://i.ibb.co/pvjVWRfp/youre-an-expert-designer-create-a-placeh-IM5r1rwm-Wl-Os-Ut-NZCKXG9w-q-We-PUN3x-SZWUFCEKo7rq5-A-cover.jpg';

const WHATSAPP_NUMBER = '213670635013';

const pick = (t: Translatable | undefined, lang: 'fr' | 'en' | 'ar'): string => {
  if (!t) return '';
  return (t[lang] || t.fr || t.en || t.ar || '').trim();
};

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
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    const payload = {
      product_id: record.product_id,
      product_sku: sku,
      product_title: productName,
      name: form.get('name'),
      phone: form.get('phone'),
      address: form.get('address'),
      wilaya: form.get('wilaya'),
      sprinkler: brand?.name ?? '',
      created_at: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0c561120/quotes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(payload),
        },
      ).catch(() => null);
    } finally {
      setSubmitting(false);
    }

    const text = `Bonjour AGROESPACE,%0A%0ADemande de proforma :%0AProduit : ${productName}${
      coverage ? ' (' + coverage + ')' : ''
    }%0ANom : ${payload.name}%0ATéléphone : ${payload.phone}%0AAdresse : ${payload.address ?? '-'}%0AWilaya : ${payload.wilaya ?? '-'}%0AAsperseur : ${payload.sprinkler || '-'}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    toast.success('Demande envoyée', { description: 'Nous vous répondons dans la journée.' });
    onClose();
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
                      <Send className="w-4 h-4" />
                      Envoyer la demande
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
