import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { ShieldCheck, Truck, Wrench, Award } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

// Poster + fallback still — a real frame of the drone footage. Shown instantly
// (LCP), and stays if the video is skipped (slow/data-saver connection, reduced
// motion) or fails to load.
const HERO_FALLBACK_IMG = "/hero-poster.jpg";

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

  return (
    <section
      ref={containerRef}
      style={{ position: "relative" }}
      className="relative min-h-screen w-full overflow-hidden bg-[#0f2618]"
    >
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2618]/60 via-[#0f2618]/40 to-[#0f2618] z-10" />
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

      <div className="relative z-10 min-h-screen flex flex-col justify-end px-6 md:px-12 max-w-7xl mx-auto pt-32 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <span className="text-[#87A922] uppercase tracking-[0.3em] text-sm font-semibold mb-6 block">
            {t("hero.eyebrow")}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-8xl font-light text-white leading-[1.05] max-w-4xl tracking-tight"
        >
          {t("hero.title.line1")} <br />
          <span className="font-serif italic text-white/90">
            {t("hero.title.line2")}
          </span>{" "}
          <br />
          {t("hero.title.line3")}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-10 flex flex-col md:flex-row gap-8 items-start md:items-center"
        >
          <p className="text-white/75 max-w-md text-base md:text-lg leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 md:ms-auto">
            <Link
              to="/services"
              className="px-7 py-3.5 rounded-full bg-[#87A922] hover:bg-[#6c871b] text-white text-sm font-bold uppercase tracking-[0.1em] transition-colors"
            >
              {t("hero.cta")}
            </Link>
            <Link
              to="/contact"
              className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-[#0f2618] border border-white/20 hover:border-transparent text-sm font-bold uppercase tracking-[0.1em] transition-all"
            >
              {t("hero.cta.quote")}
            </Link>
          </div>
        </motion.div>

        {/* USPs strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {usps.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 hover:bg-white/10 transition-colors"
            >
              <Icon className="w-6 h-6 text-[#87A922] mb-3" strokeWidth={1.5} />
              <div className="text-white text-sm md:text-base font-semibold mb-1">
                {t(key)}
              </div>
              <div className="text-white/55 text-xs md:text-sm leading-relaxed">
                {t(`${key}.desc`)}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-6 right-6 hidden lg:block z-10">
        <div className="text-white/40 text-xs tracking-[0.2em] uppercase">
          {t("hero.scroll")}
        </div>
      </div>
    </section>
  );
};
