import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router";
import { ShieldCheck, Truck, Wrench, Award } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

export const Hero = () => {
  const containerRef = useRef(null);
  const { t } = useI18n();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

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
        <img
          src="https://images.unsplash.com/photo-1625419196393-fcd5737436a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMGlycmlnYXRpb24lMjBwaXZvdCUyMGRyb25lfGVufDF8fHx8MTc3NzMzNTAwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Agriculture Irrigation"
          className="w-full h-full object-cover scale-105"
        />
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
