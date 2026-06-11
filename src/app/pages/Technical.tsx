import { motion } from "motion/react";
import { Link } from "react-router";
import { Shield, Zap, Droplets, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { VideoShowcase } from "../components/VideoShowcase";
import { PivotTech } from "../components/PivotTech";
import { MagneticButton } from "../components/fx/MagneticButton";

export const Technical = () => {
  const { t } = useI18n();

  const specs = [
    {
      icon: Shield,
      title: t("technical.spec1.title"),
      body: t("technical.spec1.body"),
    },
    {
      icon: Zap,
      title: t("technical.spec2.title"),
      body: t("technical.spec2.body"),
    },
    {
      icon: Droplets,
      title: t("technical.spec3.title"),
      body: t("technical.spec3.body"),
    },
  ];

  return (
    <div className="bg-ink min-h-screen font-sans" style={{ position: "relative" }}>
      {/* Editorial opening */}
      <section className="relative pt-40 pb-10 overflow-hidden grain">
        <div className="max-w-[100rem] mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <span className="h-px w-10 bg-lime" aria-hidden />
            <span className="text-lime uppercase tracking-[0.4em] text-xs md:text-sm font-semibold">
              {t("technical.eyebrow")}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-industrial uppercase text-white leading-[0.9] text-[clamp(3rem,9vw,8.5rem)]"
          >
            Western{" "}
            <span className="block font-display normal-case font-light italic text-lime text-[clamp(2.4rem,6.5vw,6rem)]">
              Pivot Systems
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/70 text-lg md:text-xl max-w-2xl font-light mt-8 border-s-2 border-lime/40 ps-5"
          >
            {t("technical.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* The machine — interactive 3D */}
      <PivotTech />

      {/* Specs Grid */}
      <section className="py-28 relative z-20 bg-ink">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
            {specs.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.7 }}
                className="bg-ink p-10 md:p-12 space-y-6 hover:bg-white/[0.03] transition-colors duration-500"
              >
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-lime" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[10px] text-white/25 tracking-widest">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-2xl font-display font-medium text-white">{title}</h3>
                <p className="text-white/60 leading-relaxed font-light">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-lime py-24 relative overflow-hidden grain">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-medium text-white mb-8">
            {t("technical.cta.title")}
          </h2>
          <p className="text-white/90 text-lg mb-12 max-w-2xl mx-auto">
            {t("technical.cta.body")}
          </p>
          <MagneticButton>
            <Link
              to="/contact"
              className="bg-ink hover:bg-forest text-white px-10 py-5 rounded-full font-bold uppercase tracking-wider text-sm transition-all inline-flex items-center gap-3 mx-auto group"
            >
              {t("technical.cta.btn")}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:-scale-x-100" />
            </Link>
          </MagneticButton>
        </div>
      </section>

      <VideoShowcase />
    </div>
  );
};
