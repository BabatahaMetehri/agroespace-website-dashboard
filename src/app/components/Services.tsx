import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { Droplets, Sprout, Package, ArrowUpRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

export const Services = () => {
  const ref = useRef(null);
  const { t } = useI18n();
  const [isMd, setIsMd] = useState(false);
  useEffect(() => {
    const check = () => setIsMd(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yA = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const yB = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);

  const cards = [
    {
      icon: Droplets,
      key: "irrigation",
      to: "/services/irrigation",
      img: "https://i.ibb.co/6hsnxxx/freepik-enhance-12620.jpg",
      featured: true,
    },
    {
      icon: Sprout,
      key: "fertilization",
      to: "/services/fertilization",
      img: "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMHNvaWwlMjBncm93aW5nfGVufDF8fHx8MTc3NzMzNTAwMXww&ixlib=rb-4.1.0&q=80&w=1080",
      featured: false,
    },
    {
      icon: Package,
      key: "retail",
      to: "/services/retail",
      img: "https://i.ibb.co/yb3nDPx/retail-cover.jpg",
      featured: false,
    },
  ];

  return (
    <section
      id="expertise"
      ref={ref}
      style={{ position: "relative" }}
      className="py-32 bg-paper relative overflow-hidden grain"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-5">
              <span className="font-mono text-[11px] text-sage tracking-widest">01</span>
              <span className="h-px w-10 bg-sage/40" aria-hidden />
              <span className="text-pine uppercase tracking-[0.2em] text-sm font-semibold">
                {t("services.eyebrow")}
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-light text-forest leading-[1.05]">
              {t("services.title.1")}{" "}
              <span className="italic text-sage">
                {t("services.title.italic")}
              </span>{" "}
              {t("services.title.2")}
            </h2>
          </div>
          <p className="text-gray-600 max-w-sm md:pb-2">{t("services.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, key, to, img, featured }, idx) => (
            <motion.div
              key={key}
              style={{ y: isMd ? (idx % 2 === 0 ? yA : yB) : 0 }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4 }}
              className={`group relative rounded-3xl overflow-hidden border ${
                featured ? "border-lime/40" : "border-pine/10"
              } bg-white shadow-[0_20px_50px_rgba(15,38,24,0.05)] flex flex-col`}
            >
              <Link to={to} className="flex flex-col flex-1">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={img}
                    alt={t(`services.${key}.title`)}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/50 to-transparent" />
                  <span className="absolute bottom-4 ltr:left-5 rtl:right-5 font-mono text-white/80 text-xs tracking-widest">
                    0{idx + 1} /
                  </span>
                  {featured && (
                    <span className="absolute top-4 ltr:left-4 rtl:right-4 bg-lime text-white text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full">
                      Western Pivots
                    </span>
                  )}
                </div>
                <div className="p-8 md:p-10 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-full bg-paper border border-pine/10 flex items-center justify-center group-hover:bg-lime group-hover:border-transparent transition-colors duration-500">
                      <Icon
                        className="w-5 h-5 text-pine group-hover:text-white transition-colors duration-500"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-medium text-forest mb-3 leading-tight">
                    {t(`services.${key}.title`)}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm md:text-[15px] flex-1">
                    {t(`services.${key}.desc`)}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-forest font-semibold text-sm group-hover:text-lime transition-colors">
                    {t("services.cta")}
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
