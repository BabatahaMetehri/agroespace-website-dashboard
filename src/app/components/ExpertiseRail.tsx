import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

/**
 * Horizontal-scroll chapters (desktop): the section pins while three oversized
 * expertise panels slide across — the signature scroll moment of the page.
 * Mobile and RTL-aware; falls back to a vertical stack below lg.
 */

const PANELS = [
  {
    key: "irrigation",
    to: "/services/irrigation",
    img: "https://i.ibb.co/6hsnxxx/freepik-enhance-12620.jpg",
  },
  {
    key: "fertilization",
    to: "/services/fertilization",
    img: "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMHNvaWwlMjBncm93aW5nfGVufDF8fHx8MTc3NzMzNTAwMXww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    key: "retail",
    to: "/services/retail",
    img: "https://i.ibb.co/yb3nDPx/retail-cover.jpg",
  },
] as const;

const Panel = ({
  index,
  panel,
  t,
}: {
  index: number;
  panel: (typeof PANELS)[number];
  t: (k: string) => string;
}) => (
  <div className="relative w-screen lg:w-[88vw] h-full shrink-0 flex items-center px-6 md:px-16">
    <div className="relative w-full h-[72vh] rounded-3xl overflow-hidden group border border-white/10">
      <img
        src={panel.img}
        alt={t(`services.${panel.key}.title`)}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s]"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      {/* ghost index */}
      <span
        aria-hidden
        className="absolute top-6 ltr:right-8 rtl:left-8 font-industrial text-stroke-white text-[clamp(5rem,12vw,11rem)] leading-none select-none"
      >
        0{index + 1}
      </span>
      <div className="absolute bottom-0 inset-x-0 p-8 md:p-14">
        <h3 className="font-industrial uppercase text-white text-3xl md:text-6xl mb-4 leading-[0.95]">
          {t(`services.${panel.key}.title`)}
        </h3>
        <p className="text-white/70 max-w-xl text-sm md:text-lg leading-relaxed mb-7">
          {t(`services.${panel.key}.desc`)}
        </p>
        <Link
          to={panel.to}
          className="inline-flex items-center gap-3 bg-white/10 hover:bg-lime border border-white/20 hover:border-transparent text-white backdrop-blur-md px-6 py-3.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
        >
          {t("services.cta")}
          <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  </div>
);

export const ExpertiseRail = () => {
  const { t, dir } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Travel distance: (n-1) panels × 88vw. Direction flips for RTL.
  const sign = dir === "rtl" ? 1 : -1;
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", `${sign * (PANELS.length - 1) * 88}vw`]);

  return (
    <section className="bg-ink relative grain">
      {/* Heading */}
      <div className="max-w-[100rem] mx-auto px-6 md:px-12 pt-28 pb-4 relative z-10">
        <div className="flex items-center gap-4 mb-5">
          <span className="font-mono text-[11px] text-lime tracking-widest">01</span>
          <span className="h-px w-10 bg-lime/40" aria-hidden />
          <span className="text-lime uppercase tracking-[0.25em] text-xs md:text-sm font-semibold">
            {t("services.eyebrow")}
          </span>
        </div>
        <h2 className="font-industrial uppercase text-white leading-[0.95] text-[clamp(2.4rem,6vw,5.5rem)] max-w-5xl">
          {t("services.title.1")}{" "}
          <span className="font-display normal-case italic font-light text-lime">
            {t("services.title.italic")}
          </span>{" "}
          {t("services.title.2")}
        </h2>
      </div>

      {/* Desktop: pinned horizontal rail */}
      <div ref={ref} className="hidden lg:block h-[300vh] relative">
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          <motion.div style={{ x }} className="flex h-[88vh] items-center">
            {PANELS.map((p, i) => (
              <Panel key={p.key} index={i} panel={p} t={t} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mobile: vertical stack */}
      <div className="lg:hidden space-y-10 px-0 py-10">
        {PANELS.map((p, i) => (
          <div key={p.key} className="h-[78vh]">
            <Panel index={i} panel={p} t={t} />
          </div>
        ))}
      </div>
    </section>
  );
};
