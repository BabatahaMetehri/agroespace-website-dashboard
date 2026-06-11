import { motion } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";

const images = [
  "https://i.ibb.co/4RzQwm3q/freepik-2820216691.jpg",
  "https://i.ibb.co/XrNSGZJ5/b91915f018a2939da085763a9ab65c87.jpg",
  "https://i.ibb.co/gMMqVq7Z/IMG-5967.jpg",
  "https://i.ibb.co/9HTdBChj/montage-pivot-haute-resolution.jpg",
];

const Tile = ({
  src,
  span,
  height,
  index,
}: {
  src: string;
  span: string;
  height: string;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.7, delay: index * 0.08 }}
    className={`${span} ${height} group rounded-3xl overflow-hidden relative cursor-pointer`}
  >
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
      loading="lazy"
      decoding="async"
    />
    <div className="absolute inset-0 bg-forest/15 group-hover:bg-transparent transition-colors duration-500" />
    {/* Survey-mark index on hover */}
    <span className="absolute bottom-5 ltr:left-6 rtl:right-6 font-mono text-white/0 group-hover:text-white/90 text-xs tracking-[0.3em] transition-colors duration-500">
      FIG. 0{index + 1}
    </span>
  </motion.div>
);

export const Gallery = () => {
  const { t } = useI18n();
  return (
    <section id="galerie" className="py-32 bg-paper relative grain">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-light text-forest">
            {t("gallery.title.1")}{" "}
            <span className="italic text-sage">{t("gallery.title.italic")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Tile src={images[0]} span="md:col-span-8" height="h-[500px]" index={0} />
          <Tile src={images[1]} span="md:col-span-4" height="h-[500px]" index={1} />
          <Tile src={images[2]} span="md:col-span-5" height="h-[400px]" index={2} />
          <Tile src={images[3]} span="md:col-span-7" height="h-[400px]" index={3} />
        </div>
      </div>
    </section>
  );
};
