import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, MapPin, ArrowRight } from "lucide-react";
import { FUNCTIONS_BASE } from "../admin/auth/supabase";

type PromoConfig = {
  id: string;
  isActive: boolean;
  badge?: string;
  eyebrow?: string;
  title?: string;
  titleSuffix?: string;
  description?: string;
  dates?: string;
  location?: string;
  locationDetail?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
};

export const PromoModal = () => {
  const [promo, setPromo] = useState<PromoConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    fetch(`${FUNCTIONS_BASE}/public/promo`)
      .then((r) => (r.ok ? (r.json() as Promise<PromoConfig>) : Promise.resolve(null)))
      .then((data) => {
        if (cancelled || !data || !data.isActive) return;
        const storageKey = `agroespace.promo.${data.id}.dismissed`;
        if (window.sessionStorage.getItem(storageKey) === '1') return;
        setPromo(data);
        timer = setTimeout(() => {
          if (!cancelled) setIsVisible(true);
        }, 1500);
      })
      .catch(() => {/* network error — silently skip promo */});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    if (promo) {
      try {
        window.sessionStorage.setItem(`agroespace.promo.${promo.id}.dismissed`, '1');
      } catch {
        /* private mode / quota: best-effort, falls back to per-tab dismiss */
      }
    }
  };

  if (!isVisible || !promo) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0a1c12]/80 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-[#0f2618] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
          >
            {/* Close Button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image Side */}
            {promo.image && (
              <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-transparent to-transparent md:bg-gradient-to-r z-10" />
                <img
                  src={promo.image}
                  alt={promo.title ?? 'Promotion'}
                  className="w-full h-full object-cover"
                />
                {promo.badge && (
                  <div className="absolute top-6 left-6 z-20 bg-[#87A922] text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                    {promo.badge}
                  </div>
                )}
              </div>
            )}

            {/* Content Side */}
            <div className={`${promo.image ? 'w-full md:w-1/2' : 'w-full'} p-8 md:p-12 flex flex-col justify-center`}>
              {promo.eyebrow && (
                <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-2 block">
                  {promo.eyebrow}
                </span>
              )}
              {(promo.title || promo.titleSuffix) && (
                <h2 className="text-4xl md:text-5xl font-light text-white mb-6 leading-tight">
                  {promo.title}{promo.title && promo.titleSuffix ? ' ' : ''}
                  {promo.titleSuffix && (
                    <span className="font-serif italic text-white/80">{promo.titleSuffix}</span>
                  )}
                </h2>
              )}

              {promo.description && (
                <p className="text-white/70 leading-relaxed font-light mb-8">
                  {promo.description}
                </p>
              )}

              <div className="space-y-4 mb-8">
                {promo.dates && (
                  <div className="flex items-center gap-4 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[#87A922]" />
                    </div>
                    <span className="font-medium">{promo.dates}</span>
                  </div>
                )}
                {promo.location && (
                  <div className="flex items-center gap-4 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#87A922]" />
                    </div>
                    <span className="font-medium">
                      {promo.location}
                      {promo.locationDetail && (
                        <>
                          <br />
                          <span className="text-sm text-white/50 font-normal">
                            {promo.locationDetail}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {(() => {
                const rawUrl = (promo.ctaUrl ?? '').trim();
                // Only honour http(s), mailto:, tel:, or in-app paths starting with /
                const safeUrl = /^(https?:\/\/|mailto:|tel:|\/)/i.test(rawUrl) ? rawUrl : '';
                const isExternal = /^https?:\/\//i.test(safeUrl);
                const handleCta = () => {
                  if (safeUrl) {
                    if (isExternal) {
                      window.open(safeUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      window.location.href = safeUrl;
                    }
                  }
                  dismiss();
                };
                return (
                  <button
                    onClick={handleCta}
                    className="bg-white/10 hover:bg-[#87A922] text-white border border-white/20 hover:border-transparent rounded-full px-8 py-4 font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-3 w-full group"
                  >
                    {promo.ctaText ?? 'Fermer'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
