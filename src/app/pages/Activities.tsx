import { motion } from "motion/react";
import { Link } from "react-router";
import { Droplets, Sprout, Package, ArrowRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

export const Activities = () => {
  const { t } = useI18n();
  const items = [
    {
      icon: Droplets,
      to: "/services/irrigation",
      key: "irrigation",
      img: "https://i.ibb.co/6hsnxxx/freepik-enhance-12620.jpg",
    },
    {
      icon: Sprout,
      to: "/services/fertilization",
      key: "fertilization",
      img: "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMHNvaWwlMjBncm93aW5nfGVufDF8fHx8MTc3NzMzNTAwMXww&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      icon: Package,
      to: "/services/retail",
      key: "retail",
      img: "https://i.ibb.co/yb3nDPx/retail-cover.jpg",
    },
  ];

  return (
    <div className="bg-paper pt-32 pb-24" style={{ position: "relative" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl mb-16">
          <span className="text-pine uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t("activities.eyebrow")}
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-light text-forest leading-tight">
            {t("activities.title.1")}{" "}
            <span className="font-serif italic text-sage">
              {t("activities.italic")}
            </span>{" "}
            {t("activities.title.2")}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map(({ icon: Icon, to, key, img }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Link
                to={to}
                className="group block bg-white rounded-3xl overflow-hidden border border-pine/10 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500"
              >
                <div className="relative aspect-[5/4] overflow-hidden">
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest/40 to-transparent" />
                </div>
                <div className="p-8">
                  <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center mb-5">
                    <Icon
                      className="w-5 h-5 text-pine"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h2 className="text-2xl font-medium text-forest mb-3 leading-tight">
                    {t(`services.${key}.title`)}
                  </h2>
                  <p className="text-gray-500 leading-relaxed text-sm md:text-[15px] mb-6">
                    {t(`services.${key}.desc`)}
                  </p>
                  <div className="inline-flex items-center gap-2 text-forest font-semibold text-sm group-hover:text-lime transition-colors">
                    {t("services.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
