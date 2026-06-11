import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { useI18n } from "../i18n/I18nProvider";
import { Marquee } from "./fx/Marquee";
import { MagneticButton } from "./fx/MagneticButton";

// Poster + fallback still — a real frame of the drone footage. Shown instantly
// (LCP), and stays if the video is skipped (slow/data-saver connection, reduced
// motion) or fails to load.
const HERO_FALLBACK_IMG = "/hero-poster.jpg";

/** Masked line reveal — each line slides up out of an overflow clip. */
const RevealLine = ({
  children,
  delay,
  className = "",
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) => (
  <span className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
    <motion.span
      initial={{ y: "112%" }}
      animate={{ y: 0 }}
      transition={{ duration: 1.15, delay, ease: [0.16, 1, 0.3, 1] }}
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
        <div className="absolute inset-0 bg-gradient-to-b from-forest/65 via-forest/30 to-forest z-10" />
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

      <div className="relative z-10 min-h-screen flex flex-col justify-end px-6 md:px-12 max-w-[100rem] mx-auto pt-32 pb-0 w-full">
        {/* Survey line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex items-center justify-between mb-8 text-white/50"
        >
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-lime" aria-hidden />
            <span className="text-lime uppercase tracking-[0.3em] text-xs md:text-sm font-semibold">
              {t("hero.eyebrow")}
            </span>
          </div>
          <span dir="ltr" className="font-mono text-[10px] md:text-xs tracking-[0.25em] hidden md:block">
            28.02°N — 0.18°E · SAHARA DZ
          </span>
        </motion.div>

        {/* Oversized industrial statement */}
        <h1 className="text-white leading-[0.9] tracking-tight">
          <RevealLine delay={0.35} className="font-industrial uppercase text-[clamp(3rem,10.5vw,9.5rem)]">
            {t("hero.title.line1")}
          </RevealLine>
          <RevealLine
            delay={0.5}
            className="font-display italic font-light text-lime text-[clamp(2.6rem,8.5vw,7.5rem)]"
          >
            {t("hero.title.line2")}
          </RevealLine>
          <RevealLine delay={0.65} className="font-industrial uppercase text-[clamp(3rem,10.5vw,9.5rem)]">
            {t("hero.title.line3")}
          </RevealLine>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.95 }}
          className="mt-10 mb-12 flex flex-col md:flex-row gap-8 items-start md:items-end"
        >
          <p className="text-white/75 max-w-md text-base md:text-lg leading-relaxed border-s-2 border-lime/50 ps-5">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-4 md:ms-auto">
            <MagneticButton>
              <Link
                to="/services"
                className="group relative overflow-hidden inline-flex px-8 py-4 rounded-full bg-lime text-white text-sm font-bold uppercase tracking-[0.12em]"
              >
                <span
                  className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                  aria-hidden
                />
                <span className="relative group-hover:text-forest transition-colors duration-300">
                  {t("hero.cta")}
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link
                to="/contact"
                className="inline-flex px-8 py-4 rounded-full bg-white/10 hover:bg-white text-white hover:text-forest border border-white/25 hover:border-transparent text-sm font-bold uppercase tracking-[0.12em] transition-colors backdrop-blur-sm"
              >
                {t("hero.cta.quote")}
              </Link>
            </MagneticButton>
          </div>
        </motion.div>

        {/* Brand band closing the viewport */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.3 }}
          className="border-t border-white/15 -mx-6 md:-mx-12 px-0"
        >
          <Marquee speed={44} className="py-5">
            {marqueeItems.map((item, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="font-industrial uppercase text-white/35 text-sm md:text-base whitespace-nowrap">
                  {item}
                </span>
                <span className="mx-10 w-2 h-2 rounded-full bg-lime/70 shrink-0" aria-hidden />
              </span>
            ))}
          </Marquee>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-28 ltr:right-8 rtl:left-8 hidden lg:flex flex-col items-center gap-3 z-10">
        <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase [writing-mode:vertical-rl]">
          {t("hero.scroll")}
        </span>
        <motion.span
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-12 bg-gradient-to-b from-lime to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
};
