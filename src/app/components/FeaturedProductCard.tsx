import { motion } from 'motion/react';
import { ArrowUpRight, Star } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

type Translatable = { fr?: string; en?: string; ar?: string };

export type FeaturedRecord = {
  product_id: number;
  enabled: boolean;
  sort_order: number;
  tagline: Translatable;
  highlight: Translatable;
  /** Headline coverage badge, e.g. "30 HA". */
  coverage?: string;
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

/**
 * Compact, elegant featured card. The big card with inline expansion was
 * replaced by this small card + a full-screen detail modal (opened via onOpen)
 * so a row of 5 pivots stays short and scannable.
 */
export const FeaturedProductCard = ({
  record,
  onOpen,
}: {
  record: FeaturedRecord;
  onOpen: () => void;
}) => {
  const { t, lang } = useI18n();
  const product = record.product;
  const productName = product?.name ?? `Produit #${record.product_id}`;
  const coverImage =
    record.gallery[0] || product?.images?.[0]?.src || product?.image || FALLBACK_IMAGE;
  const tagline = pick(record.tagline, lang as any);
  const coverage = (record.coverage ?? '').trim();

  // Up to two short specs to tease under the name.
  const teaser = record.specs
    .map((s) => ({ label: pick(s.label, lang as any), value: pick(s.value, lang as any) }))
    .filter((s) => s.label || s.value)
    .slice(0, 2);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group text-left relative flex flex-col bg-gradient-to-br from-[#114232] via-[#0f2618] to-[#0a1c12] border border-[#87A922]/30 rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.25)] hover:border-[#87A922]/60 hover:shadow-[0_25px_60px_rgba(135,169,34,0.22)] transition-all duration-500"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/50">
        <img
          src={coverImage}
          alt={productName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_IMAGE)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-transparent to-transparent" />
        <span className="absolute top-4 left-4 z-10 bg-[#87A922] text-white text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Star className="w-3 h-3" fill="currentColor" />
          {t('catalog.featured', 'Produit Phare')}
        </span>
        {coverage && (
          <span className="absolute bottom-4 left-4 z-10 bg-white/95 text-[#0f2618] text-lg font-bold tracking-tight px-3.5 py-1 rounded-xl shadow-lg">
            {coverage}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-medium text-white leading-snug line-clamp-2 mb-2">
          {productName}
        </h3>
        {tagline && (
          <p className="text-[#87A922] text-sm italic mb-4 line-clamp-2">"{tagline}"</p>
        )}

        {teaser.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            {teaser.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5 line-clamp-1">
                  {s.label}
                </div>
                <div className="text-white text-sm font-medium line-clamp-1">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-white text-xs uppercase tracking-[0.15em] font-semibold group-hover:text-[#87A922] transition-colors">
            {t('catalog.featured.expand', 'Voir les détails')}
          </span>
          <span className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-[#87A922] flex items-center justify-center transition-colors">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </span>
        </div>
      </div>
    </motion.button>
  );
};
