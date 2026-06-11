import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n/I18nProvider';
import { CountUp } from './fx/CountUp';

// The three.js scene lives in its own chunk — fetched only when this section
// approaches the viewport on capable devices.
const PivotScene = lazy(() => import('./three/PivotScene'));

const FALLBACK_IMG = 'https://i.ibb.co/39W3DNJ3/DJI-0176-1.jpg';

function canRun3D(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 1024) return false; // phones/tablets get the photo
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const PivotTech = () => {
  const { t, lang } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const [mount3D, setMount3D] = useState(false);

  // Fetch + mount the 3D chunk only when the section is near the viewport.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !canRun3D()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMount3D(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const specs = [
    {
      value: '400 m',
      label: { fr: 'Portée par système', ar: 'مدى لكل نظام', en: 'Reach per system' },
    },
    {
      value: '50 ha+',
      label: { fr: 'Irrigués par cercle', ar: 'مروية لكل دائرة', en: 'Irrigated per circle' },
    },
    {
      value: '0',
      label: { fr: 'Pannes depuis 2007', ar: 'أعطال منذ 2007', en: 'Failures since 2007' },
    },
    {
      value: '100%',
      label: { fr: 'Acier galvanisé à chaud', ar: 'فولاذ مغلفن على الساخن', en: 'Hot-dip galvanized steel' },
    },
  ];

  return (
    <section ref={hostRef} className="relative bg-ink overflow-hidden grain">
      {/* Stage */}
      <div className="relative h-[88vh] min-h-[620px]">
        {mount3D ? (
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-lime animate-spin" />
              </div>
            }
          >
            <div className="absolute inset-0">
              <PivotScene />
            </div>
          </Suspense>
        ) : (
          <>
            <img
              src={FALLBACK_IMG}
              alt="Pivot central Western en fonctionnement"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-ink/55" />
          </>
        )}

        {/* vignette so the HTML layer reads on any background */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink pointer-events-none" />

        {/* Headline layer */}
        <div className="absolute inset-x-0 top-0 pt-20 md:pt-24 pointer-events-none">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="font-mono text-[11px] text-lime tracking-widest">03</span>
                <span className="h-px w-10 bg-lime/40" aria-hidden />
                <span className="text-lime uppercase tracking-[0.25em] text-xs md:text-sm font-semibold">
                  {lang === 'ar' ? 'الآلة' : lang === 'en' ? 'The machine' : 'La machine'}
                </span>
              </div>
              <h2 className="font-industrial uppercase text-white leading-[0.92] text-[clamp(2.6rem,7vw,6.5rem)]">
                Western
                <span className="block font-display normal-case font-light italic text-lime text-[clamp(2rem,5vw,4.6rem)]">
                  Pivot Systems
                </span>
              </h2>
            </motion.div>
          </div>
        </div>

        {/* Spec instrument bar */}
        <div className="absolute inset-x-0 bottom-0 pb-10">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md"
            >
              {specs.map((s, i) => (
                <div key={i} className="bg-ink/70 px-6 py-5">
                  <div dir="ltr" className="font-industrial text-white text-2xl md:text-4xl mb-1">
                    <CountUp value={s.value} />
                  </div>
                  <div className="text-white/50 text-[11px] md:text-xs uppercase tracking-[0.15em]">
                    {s.label[lang]}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
