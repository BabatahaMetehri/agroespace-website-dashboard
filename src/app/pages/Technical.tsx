import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Shield, Zap, Droplets, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { VideoShowcase } from "../components/VideoShowcase";

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
    <div
      className="bg-[#0f2618] min-h-screen font-sans"
      style={{ position: "relative" }}
    >
      {/* Cinematic Hero */}
      <section className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-[#0f2618]/60 to-transparent z-10" />
          <img
            src="https://i.ibb.co/6hsnxxx/freepik-enhance-12620.jpg"
            alt="Western Pivot Systems"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-20 text-center max-w-4xl px-6 pt-32">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#87A922] uppercase tracking-[0.4em] text-sm font-semibold mb-6 block"
          >
            {t("technical.eyebrow")}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-8xl font-light text-white leading-tight mb-8"
          >
            Western Pivot{" "}
            <span className="font-serif italic text-white/80">Systems</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto font-light"
          >
            {t("technical.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Specs Grid */}
      <section className="py-24 relative z-20 bg-[#0f2618]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {specs.map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-[#87A922]" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-medium text-white">{title}</h3>
                <p className="text-white/60 leading-relaxed font-light">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#87A922] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-medium text-white mb-8">
            {t("technical.cta.title")}
          </h2>
          <p className="text-white/90 text-lg mb-12 max-w-2xl mx-auto">
            {t("technical.cta.body")}
          </p>
          <Link
            to="/contact"
            className="bg-[#0f2618] hover:bg-[#0a1c12] text-white px-10 py-5 rounded-full font-bold uppercase tracking-wider text-sm transition-all inline-flex items-center gap-3 mx-auto group"
          >
            {t("technical.cta.btn")}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <VideoShowcase />
    </div>
  );
};
