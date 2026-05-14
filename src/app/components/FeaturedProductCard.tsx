import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronDown, Download, Star, FileText, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

type Translatable = { fr?: string; en?: string; ar?: string };

export type FeaturedRecord = {
  product_id: number;
  enabled: boolean;
  sort_order: number;
  tagline: Translatable;
  highlight: Translatable;
  specs: { label: Translatable; value: Translatable }[];
  gallery: string[];
  brochures: { label: Translatable; url: string }[];
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

const FALLBACK_IMAGE =
  'https://i.ibb.co/pvjVWRfp/youre-an-expert-designer-create-a-placeh-IM5r1rwm-Wl-Os-Ut-NZCKXG9w-q-We-PUN3x-SZWUFCEKo7rq5-A-cover.jpg';

const pick = (t: Translatable | undefined, lang: 'fr' | 'en' | 'ar'): string => {
  if (!t) return '';
  return (t[lang] || t.fr || t.en || t.ar || '').trim();
};

export const FeaturedProductCard = ({
  record,
  onQuote,
}: {
  record: FeaturedRecord;
  onQuote: () => void;
}) => {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const product = record.product;
  const productName = product?.name ?? `Produit #${record.product_id}`;
  const coverImage =
    record.gallery[0] ||
    product?.images?.[0]?.src ||
    product?.image ||
    FALLBACK_IMAGE;
  const inStock = product?.stock_status !== 'outofstock';
  const tagline = pick(record.tagline, lang as any);
  const highlight = pick(record.highlight, lang as any);
  const category = product?.categories?.[0]?.name;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-[#114232] via-[#0f2618] to-[#0a1c12] border border-[#87A922]/30 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(135,169,34,0.15)]"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#87A922]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Image side */}
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] overflow-hidden bg-black/50">
          <img
            src={coverImage}
            alt={productName}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-transparent to-transparent lg:bg-gradient-to-r" />
          <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
            <span className="bg-[#87A922] text-white text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Star className="w-3 h-3" fill="currentColor" />
              {t('catalog.featured', 'Produit Phare')}
            </span>
            {inStock ? (
              <span className="bg-white/15 backdrop-blur-md text-white text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full">
                {t('catalog.instock')}
              </span>
            ) : (
              <span className="bg-red-500/90 text-white text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full">
                {t('catalog.outofstock')}
              </span>
            )}
          </div>
          {category && (
            <span className="absolute bottom-5 left-5 z-10 bg-white/10 backdrop-blur-md text-white/90 text-[10px] uppercase tracking-[0.18em] font-semibold px-3 py-1.5 rounded-full">
              {category}
            </span>
          )}
        </div>

        {/* Content side */}
        <div className="p-8 lg:p-10 flex flex-col relative z-10">
          <div className="text-white/40 text-xs font-mono mb-3">
            SKU: {product?.sku ?? `#${record.product_id}`}
          </div>
          <h3 className="text-3xl md:text-4xl font-light text-white mb-4 leading-tight">
            {productName}
          </h3>
          {tagline && (
            <p className="text-[#87A922] text-base italic mb-5 font-serif">
              "{tagline}"
            </p>
          )}

          {/* Quick specs preview (first 3) */}
          {record.specs.length > 0 && !expanded && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {record.specs.slice(0, 3).map((spec, i) => {
                const label = pick(spec.label, lang as any);
                const value = pick(spec.value, lang as any);
                if (!label && !value) return null;
                return (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/5 rounded-xl px-3 py-2"
                  >
                    <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">
                      {label}
                    </div>
                    <div className="text-white text-sm font-medium">{value}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
            <button
              onClick={onQuote}
              className="bg-[#87A922] hover:bg-[#6c871b] text-white font-bold uppercase tracking-[0.15em] text-xs px-6 py-3 rounded-full transition-colors flex items-center gap-2"
            >
              {t('catalog.quote')} <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-white/80 hover:text-white text-xs uppercase tracking-[0.15em] font-semibold px-4 py-3 flex items-center gap-2"
            >
              {expanded
                ? t('catalog.featured.collapse', 'Réduire')
                : t('catalog.featured.expand', 'Voir les détails')}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-8 lg:p-10 space-y-8">
              {/* Long description */}
              {highlight && (
                <div>
                  <h4 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                    {t('catalog.featured.description', 'Description')}
                  </h4>
                  <p
                    className="text-white/75 leading-relaxed whitespace-pre-wrap"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {highlight}
                  </p>
                </div>
              )}

              {/* Full specs */}
              {record.specs.length > 0 && (
                <div>
                  <h4 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                    {t('catalog.featured.specs', 'Caractéristiques techniques')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {record.specs.map((spec, i) => {
                      const label = pick(spec.label, lang as any);
                      const value = pick(spec.value, lang as any);
                      if (!label && !value) return null;
                      return (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-4 py-2.5 border-b border-white/5"
                        >
                          <span className="text-white/60 text-sm">{label}</span>
                          <span className="text-white text-sm font-medium text-right">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {record.gallery.length > 0 && (
                <div>
                  <h4 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                    {t('catalog.featured.gallery', 'Galerie')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {record.gallery.map((url, i) => (
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
                          onError={(e) =>
                            ((e.target as HTMLImageElement).style.opacity = '0.3')
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brochures */}
              {record.brochures.length > 0 && (
                <div>
                  <h4 className="text-[#87A922] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
                    {t('catalog.featured.brochures', 'Brochures à télécharger')}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {record.brochures.map((b, i) => {
                      const label =
                        pick(b.label, lang as any) ||
                        t('catalog.featured.brochure', 'Brochure');
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={activeImage}
              alt=""
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
