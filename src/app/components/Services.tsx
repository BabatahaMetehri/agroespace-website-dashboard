import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { Droplets, Sprout, Package, ArrowUpRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

export const Services = () => {
  const ref = useRef(null);
  const { t } = useI18n();
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
      className="py-32 bg-[#f4f7f5] relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <span className="text-[#114232] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
              {t("services.eyebrow")}
            </span>
            <h2 className="text-4xl md:text-6xl font-light text-[#0f2618] leading-tight">
              {t("services.title.1")}{" "}
              <span className="font-serif italic text-[#4a7856]">
                {t("services.title.italic")}
              </span>{" "}
              {t("services.title.2")}
            </h2>
          </div>
          <p className="text-gray-600 max-w-sm">{t("services.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, key, to, img, featured }, idx) => (
            <motion.div
              key={key}
              style={{ y: idx % 2 === 0 ? yA : yB }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4 }}
              className={`relative rounded-3xl overflow-hidden border ${
                featured
                  ? "border-[#87A922]/30 md:row-span-1"
                  : "border-[#114232]/5"
              } bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col`}
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={img}
                  alt={t(`services.${key}.title`)}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {featured && (
                  <span className="absolute top-4 left-4 bg-[#87A922] text-white text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full">
                    Western Pivots
                  </span>
                )}
              </div>
              <div className="p-8 md:p-10 flex flex-col flex-1">
                <div className="w-12 h-12 rounded-full bg-[#f4f7f5] flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-[#114232]" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-medium text-[#0f2618] mb-3 leading-tight">
                  {t(`services.${key}.title`)}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm md:text-[15px] flex-1">
                  {t(`services.${key}.desc`)}
                </p>
                <Link
                  to={to}
                  className="mt-6 inline-flex items-center gap-2 text-[#0f2618] font-semibold text-sm hover:text-[#87A922] transition-colors group/cta"
                >
                  {t("services.cta")}
                  <ArrowUpRight className="w-4 h-4 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
