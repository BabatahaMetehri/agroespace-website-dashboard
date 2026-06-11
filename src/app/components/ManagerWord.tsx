import { motion } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";
import { PivotField } from "./fx/PivotField";

export const ManagerWord = () => {
  const { t } = useI18n();
  return (
    <section
      className="py-32 bg-forest text-white relative overflow-hidden grain"
      style={{ position: "relative" }}
    >
      {/* Pivot mark sweeping slowly in the corner */}
      <div
        aria-hidden
        className="absolute -top-40 ltr:-right-40 rtl:-left-40 w-[34rem] h-[34rem] text-white/[0.06] pointer-events-none"
      >
        <PivotField className="w-full h-full" />
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
            <div className="relative">
              {/* Offset frame — printed-plate effect */}
              <div
                aria-hidden
                className="absolute -inset-3 ltr:translate-x-5 rtl:-translate-x-5 translate-y-5 rounded-3xl border border-lime/25"
              />
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="absolute inset-0 bg-lime/20 mix-blend-overlay z-10" />
                <img
                  src="https://i.ibb.co/DP04Gfx8/ai-yacine-fekhar-squoosh.jpg"
                  alt="Yacine Fekhar - Directeur Général"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-forest to-transparent z-20">
                  <h3 className="text-2xl font-display font-medium text-white mb-1">
                    Yacine Fekhar
                  </h3>
                  <p className="text-lime font-semibold text-sm uppercase tracking-wider">
                    {t("manager.role")}
                  </p>
                </div>
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
            {/* Oversized editorial quote glyph */}
            <span
              aria-hidden
              className="block font-display italic text-lime/30 text-[7rem] leading-[0.4] select-none"
            >
              “
            </span>
            <span className="text-lime uppercase tracking-[0.2em] text-sm font-semibold block">
              {t("manager.eyebrow")}
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-light text-white leading-[1.1]">
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
              <p className="text-xl font-display italic text-white pt-4 border-t border-white/10">
                {t("manager.signoff")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
