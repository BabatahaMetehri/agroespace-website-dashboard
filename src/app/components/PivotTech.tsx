import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, X } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { CountUp } from "./fx/CountUp";
import { PIVOT_PARTS } from "./three/pivotParts";

// The three.js scene lives in its own chunk — fetched only when this section
// approaches the viewport on capable devices.
const PivotScene = lazy(() => import("./three/PivotScene"));

const FALLBACK_IMG = "https://i.ibb.co/39W3DNJ3/DJI-0176-1.jpg";

function canRun3D(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  if (window.innerWidth < 1024) return false; // phones/tablets get the photo
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Local trilingual UI strings for the parts explorer.
const UI = {
  hint: {
    fr: "Glissez pour tourner · cliquez puis molette pour zoomer · touchez un repère vert",
    ar: "اسحب للتدوير · انقر ثم استخدم العجلة للتقريب · المس نقطة خضراء",
    en: "Drag to rotate · click then scroll to zoom · tap a green marker",
  },
  manual: {
    fr: "Manuel Western CP-600 · p.",
    ar: "دليل Western CP-600 · ص",
    en: "Western CP-600 manual · p.",
  },
  refs: {
    fr: "Références fabricant",
    ar: "مراجع المصنّع",
    en: "Manufacturer references",
  },
  catalog: {
    fr: "Trouver dans le catalogue",
    ar: "ابحث في الكتالوج",
    en: "Find in catalog",
  },
  close: { fr: "Fermer", ar: "إغلاق", en: "Close" },
} as const;

export const PivotTech = () => {
  return null;
  const { lang } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const [mount3D, setMount3D] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const part = selected ? PIVOT_PARTS.find((p) => p.id === selected) : null;

  const specs = [
    {
      value: "400 m",
      label: {
        fr: "Portée par système",
        ar: "مدى لكل نظام",
        en: "Reach per system",
      },
    },
    {
      value: "20 ha+",
      label: {
        fr: "Irrigués par cercle",
        ar: "مروية لكل دائرة",
        en: "Irrigated per circle",
      },
    },
    {
      value: "0",
      label: {
        fr: "Pannes depuis 2007",
        ar: "أعطال منذ 2007",
        en: "Failures since 2007",
      },
    },
    {
      value: "100%",
      label: {
        fr: "Acier galvanisé à chaud",
        ar: "فولاذ مغلفن على الساخن",
        en: "Hot-dip galvanized steel",
      },
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
              <PivotScene selectedId={selected} onSelect={setSelected} />
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

        {/* top/bottom vignette so the HTML layer reads on any background —
            kept off the middle band so the 3D stays fully interactive */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-ink to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent pointer-events-none" />

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
                <span className="font-mono text-[11px] text-lime tracking-widest">
                  03
                </span>
                <span className="h-px w-10 bg-lime/40" aria-hidden />
                <span className="text-lime uppercase tracking-[0.25em] text-xs md:text-sm font-semibold">
                  {lang === "ar"
                    ? "الآلة"
                    : lang === "en"
                      ? "The machine"
                      : "La machine"}
                </span>
              </div>
              <h2 className="font-industrial uppercase text-white leading-[0.92] text-[clamp(2.6rem,7vw,6.5rem)]">
                Western
                <span className="block font-display normal-case font-light italic text-lime text-[clamp(2rem,5vw,4.6rem)]">
                  CP-600
                </span>
              </h2>
            </motion.div>
          </div>
        </div>

        {/* Interaction hint — only when the 3D is live and nothing is open */}
        {mount3D && !part && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-36 inset-x-0 flex justify-center pointer-events-none px-6"
          >
            <span className="bg-ink/70 backdrop-blur-md border border-white/10 text-white/70 text-[11px] md:text-xs tracking-[0.08em] px-5 py-2.5 rounded-full inline-flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-lime animate-pulse"
                aria-hidden
              />
              {UI.hint[lang]}
            </span>
          </motion.div>
        )}

        {/* Part spec card */}
        <AnimatePresence>
          {part && (
            <motion.aside
              key={part.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-24 ltr:right-6 rtl:left-6 md:ltr:right-12 md:rtl:left-12 z-20 w-[min(92vw,360px)] max-h-[calc(100%-13rem)] overflow-y-auto rounded-2xl bg-ink/85 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
              {part.image && (
                <img
                  src={part.image}
                  alt={part.name[lang]}
                  className="w-full h-36 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-white font-display text-xl leading-snug">
                    {part.name[lang]}
                  </h3>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label={UI.close[lang]}
                    className="shrink-0 w-8 h-8 rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p
                  dir="ltr"
                  className="font-mono text-[10px] text-lime/80 tracking-[0.18em] uppercase mb-4 rtl:text-right"
                >
                  {UI.manual[lang]} {part.pages}
                </p>
                <p className="text-white/70 text-sm leading-relaxed mb-5">
                  {part.blurb[lang]}
                </p>

                <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.25em] mb-2">
                  {UI.refs[lang]}
                </p>
                <ul className="space-y-1.5 mb-6">
                  {part.refs.map((r) => (
                    <li
                      key={r.no}
                      dir="ltr"
                      className="flex items-baseline gap-3 text-[12px] rtl:flex-row-reverse"
                    >
                      <span className="font-mono text-lime/90 whitespace-nowrap">
                        {r.no}
                      </span>
                      <span className="text-white/55 truncate">{r.label}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={
                    part.catalogQuery
                      ? `/catalog?q=${encodeURIComponent(part.catalogQuery)}`
                      : "/catalog"
                  }
                  className="group inline-flex items-center justify-center gap-2 w-full bg-lime hover:bg-lime-deep text-white px-5 py-3.5 rounded-full font-bold uppercase tracking-[0.12em] text-xs transition-colors"
                >
                  {UI.catalog[lang]}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:-scale-x-100" />
                </Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Spec instrument bar */}
        <div className="absolute inset-x-0 bottom-0 pb-10 pointer-events-none">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md"
            >
              {specs.map((s, i) => (
                <div key={i} className="bg-ink/70 px-6 py-5">
                  <div
                    dir="ltr"
                    className="font-industrial text-white text-2xl md:text-4xl mb-1"
                  >
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
