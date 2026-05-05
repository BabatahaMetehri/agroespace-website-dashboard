import React from "react";
import { motion } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";

const images = [
  "https://i.ibb.co/4RzQwm3q/freepik-2820216691.jpg",
  "https://i.ibb.co/XrNSGZJ5/b91915f018a2939da085763a9ab65c87.jpg",
  "https://i.ibb.co/gMMqVq7Z/IMG-5967.jpg",
  "https://i.ibb.co/9HTdBChj/montage-pivot-haute-resolution.jpg",
];

export const Gallery = () => {
  const { t } = useI18n();
  return (
    <section id="galerie" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-light text-[#0f2618]">
            {t("gallery.title.1")}{" "}
            <span className="font-serif italic text-[#4a7856]">{t("gallery.title.italic")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Large prominent image */}
          <motion.div
            whileHover={{ scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="md:col-span-8 h-[500px] rounded-3xl overflow-hidden relative cursor-pointer"
          >
            <img
              src={images[0]}
              alt="Wheat field"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
          </motion.div>

          {/* Top right smaller image */}
          <motion.div
            whileHover={{ scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="md:col-span-4 h-[500px] rounded-3xl overflow-hidden relative cursor-pointer"
          >
            <img
              src={images[1]}
              alt="Farmer tech"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </motion.div>

          {/* Bottom left smaller image */}
          <motion.div
            whileHover={{ scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="md:col-span-5 h-[400px] rounded-3xl overflow-hidden relative cursor-pointer"
          >
            <img
              src={images[2]}
              alt="Water drop"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </motion.div>

          {/* Bottom right medium image */}
          <motion.div
            whileHover={{ scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="md:col-span-7 h-[400px] rounded-3xl overflow-hidden relative cursor-pointer"
          >
            <img
              src={images[3]}
              alt="Geometric lines"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
