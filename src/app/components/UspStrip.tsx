import { motion } from "motion/react";
import { ShieldCheck, Truck, Wrench, Award } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

/** Instrument strip: the four operational guarantees, hairline-separated. */
export const UspStrip = () => {
  const { t } = useI18n();
  const usps = [
    { icon: ShieldCheck, key: "usp.installed" },
    { icon: Truck, key: "usp.delivery" },
    { icon: Award, key: "usp.warranty" },
    { icon: Wrench, key: "usp.aftersale" },
  ] as const;

  return (
    <section className="bg-ink border-y border-white/10">
      <div className="max-w-[100rem] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-white/10 lg:divide-x rtl:lg:divide-x-reverse">
        {usps.map(({ icon: Icon, key }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className="group px-8 py-10 hover:bg-white/[0.04] transition-colors duration-500"
          >
            <div className="flex items-center justify-between mb-5">
              <Icon className="w-6 h-6 text-lime" strokeWidth={1.5} />
              <span className="font-mono text-[10px] text-white/25 tracking-widest">
                0{i + 1}
              </span>
            </div>
            <div className="text-white font-semibold mb-1.5">{t(key)}</div>
            <div className="text-white/50 text-sm leading-relaxed">
              {t(`${key}.desc`)}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
