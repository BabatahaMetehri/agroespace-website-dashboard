import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { ShieldCheck, Truck, Wrench, Award } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { Marquee } from "./fx/Marquee";
import { PivotField } from "./fx/PivotField";

// Poster + fallback still — a real frame of the drone footage. Shown instantly
// (LCP), and stays if the video is skipped (slow/data-saver connection, reduced
// motion) or fails to load.
const HERO_FALLBACK_IMG = "/hero-poster.jpg";

/** Masked line reveal for the headline — each line slides up from a clip. */
const RevealLine = ({
  children,
  delay,
  className = "",
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) => (
  <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
    <motion.span
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`block ${className}`}
    >
      {children}
    </motion.span>
  </span>
);

export const Hero = () => {
  const containerRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useI18n();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Load the drone video lazily so it never blocks first paint. We hold off
  // until the browser is idle, and skip it entirely on data-saver / slow
  // connections or when the user prefers reduced motion — the poster stays.
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    if (typeof conn?.effectiveType === "string" && /(^|-)2g$/.test(conn.effectiveType)) return;

    let idleId: number;
    let timeoutId: number;
    const start = () => setShowVideo(true);
    if ("requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(start, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(start, 1000);
    }
    return () => {
      if (idleId && "cancelIdleCallback" in window) (window as any).cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const usps = [
    { icon: ShieldCheck, key: "usp.installed" },
    { icon: Truck, key: "usp.delivery" },
    { icon: Award, key: "usp.warranty" },
    { icon: Wrench, key: "usp.aftersale" },
  ] as const;

  const marqueeItems = [
    t("nav.activities.irrigation"),
    t("usp.exclusivity"),
    t("nav.activities.fertilization"),
    t("usp.warranty"),
    t("nav.activities.retail"),
    t("usp.delivery"),
  ];

  return (
    <section
      ref={containerRef}
      style={{ position: "relative" }}
      className="relative min-h-screen w-full overflow-hidden bg-forest"
    >
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-forest/60 via-forest/40 to-forest z-10" />
        {/* Fallback / poster — always present beneath the video. Instant paint
            (LCP) and the guaranteed fallback if the video is skipped or fails. */}
        <img
          src={HERO_FALLBACK_IMG}
          alt="Pivot d'irrigation vu par drone"
          className="absolute inset-0 w-full h-full object-cover scale-105"
          fetchPriority="high"
          decoding="async"
        />
        {/* Drone video — mounted only once idle, fades in over the poster. */}
        {showVideo && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover scale-105 transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={HERO_FALLBACK_IMG}
            onCanPlay={() => setVideoReady(true)}
            onError={() => {
              setShowVideo(false);
              setVideoReady(false);
            }}
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>

      {/* Signature pivot mark, sweeping slowly behind the headline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.6 }}
        className="absolute z-[5] text-lime/25 pointer-events-none
                   w-[34rem] h-[34rem] md:w-[44rem] md:h-[44rem]
                   top-1/2 -translate-y-[62%] ltr:-right-40 rtl:-left-40 hidden sm:block"
      >
        <PivotField className="w-full h-full" />
      </motion.div>

      <div className="relative z-10 min-h-screen flex flex-col justify-end px-6 md:px-12 max-w-7xl mx-auto pt-32 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center gap-4 mb-6"
        >
          <span className="h-px w-10 bg-lime" aria-hidden />
          <span className="text-lime uppercase tracking-[0.3em] text-xs md:text-sm font-semibold">
            {t("hero.eyebrow")}
          </span>
        </motion.div>

        <h1 className="text-[3.4rem] md:text-8xl font-display font-light text-white leading-[0.98] max-w-4xl tracking-tight">
          <RevealLine delay={0.35}>{t("hero.title.line1")}</RevealLine>
          <RevealLine delay={0.5} className="italic text-lime font-normal">
            {t("hero.title.line2")}
          </RevealLine>
          <RevealLine delay={0.65}>{t("hero.title.line3")}</RevealLine>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-10 flex flex-col md:flex-row gap-8 items-start md:items-center"
        >
          <p className="text-white/75 max-w-md text-base md:text-lg leading-relaxed border-s-2 border-lime/40 ps-5">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 md:ms-auto">
            <Link
              to="/services"
              className="group relative overflow-hidden px-7 py-3.5 rounded-full bg-lime text-white text-sm font-bold uppercase tracking-[0.1em] transition-colors"
            >
              <span className="absolute inset-0 bg-lime-deep translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" aria-hidden />
              <span className="relative">{t("hero.cta")}</span>
            </Link>
            <Link
              to="/contact"
              className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-forest border border-white/20 hover:border-transparent text-sm font-bold uppercase tracking-[0.1em] transition-all backdrop-blur-sm"
            >
              {t("hero.cta.quote")}
            </Link>
          </div>
        </motion.div>

        {/* USPs strip — engineering-card language: index, hairline, icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.15 }}
          className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {usps.map(({ icon: Icon, key }, i) => (
            <div
              key={key}
              className="group bg-white/5 backdrop-blur-md border border-white/10 hover:border-lime/40 rounded-2xl p-5 md:p-6 hover:bg-white/10 transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className="w-6 h-6 text-lime" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-white/30 tracking-widest">
                  0{i + 1}
                </span>
              </div>
              <div className="text-white text-sm md:text-base font-semibold mb-1">
                {t(key)}
              </div>
              <div className="text-white/55 text-xs md:text-sm leading-relaxed">
                {t(`${key}.desc`)}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Brand marquee — closes the hero like a printed band */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.4 }}
          className="mt-10 border-t border-white/10"
        >
          <Marquee speed={42} className="py-4">
            {marqueeItems.map((item, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="text-white/45 uppercase tracking-[0.3em] text-[11px] md:text-xs whitespace-nowrap">
                  {item}
                </span>
                <span className="mx-8 w-1.5 h-1.5 rounded-full bg-lime/60 shrink-0" aria-hidden />
              </span>
            ))}
          </Marquee>
        </motion.div>
      </div>

      <div className="absolute bottom-24 ltr:right-6 rtl:left-6 hidden lg:flex items-center gap-3 z-10">
        <span className="text-white/40 text-xs tracking-[0.2em] uppercase [writing-mode:vertical-rl]">
          {t("hero.scroll")}
        </span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-10 bg-gradient-to-b from-lime to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
};
