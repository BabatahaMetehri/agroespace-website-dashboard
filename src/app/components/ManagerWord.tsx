import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

export const ManagerWord = () => {
  const { t } = useI18n();
  return (
    <section
      className="py-32 bg-[#0f2618] text-white relative overflow-hidden"
      style={{ position: "relative" }}
    >
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transform translate-x-1/3 -translate-y-1/4"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="30"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="20"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-5/12"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-[#87A922]/20 mix-blend-overlay z-10" />
              <img
                src="https://i.ibb.co/DP04Gfx8/ai-yacine-fekhar-squoosh.jpg"
                alt="Yacine Fekhar - Directeur Général"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0f2618] to-transparent z-20">
                <h3 className="text-2xl font-medium text-white mb-1">
                  Yacine Fekhar
                </h3>
                <p className="text-[#87A922] font-semibold text-sm uppercase tracking-wider">
                  {t("manager.role")}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full lg:w-7/12 space-y-8"
          >
            <Quote className="w-12 h-12 text-white/20 mb-2" />
            <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold block">
              {t("manager.eyebrow")}
            </span>
            <h2 className="text-4xl md:text-5xl font-light text-white leading-tight">
              {t("manager.commitment.title")}
            </h2>

            <div className="space-y-6 text-lg text-white/70 font-light leading-relaxed">
              <p>{t("manager.commitment.body")}</p>
              <p>{t("manager.body2")}</p>
              <p>
                <strong className="text-white font-medium">
                  {t("manager.mission.title")}
                </strong>
                <br />
                {t("manager.mission.body")}
              </p>
              <p className="text-xl font-medium text-white italic pt-4 border-t border-white/10">
                {t("manager.signoff")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
