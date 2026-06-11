import { useRef } from "react";
import { motion } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";
import { PivotField } from "./fx/PivotField";

type Translator = (key: string) => string;
const products = (t: Translator) => [
  {
    id: "01",
    title: t("products.pivots.title"),
    desc: t("products.pivots.desc"),
    img: "https://i.ibb.co/39W3DNJ3/DJI-0176-1.jpg",
  },
  {
    id: "02",
    title: t("products.sprinklers.title"),
    desc: t("products.sprinklers.desc"),
    img: "https://i.ibb.co/5XWfzqXK/Gemini-Generated-Image-p7y4v4p7y4v4p7y4.jpg",
  },
  {
    id: "03",
    title: t("products.pumps.title"),
    desc: t("products.pumps.desc"),
    img: "https://i.ibb.co/j9N2JGwR/nouveaute-pompe-immergee-by-shakti-pumps-i-ltd-15077-9884784.jpg",
  },
];

export const Products = () => {
  const containerRef = useRef(null);
  const { t } = useI18n();
  const productList = products(t);

  return (
    <section
      id="produits"
      ref={containerRef}
      style={{ position: "relative" }}
      className="relative bg-ink text-white grain"
    >
      {/* Faint pivot mark anchoring the dark section */}
      <div
        aria-hidden
        className="absolute top-24 ltr:left-[-12rem] rtl:right-[-12rem] w-[28rem] h-[28rem] text-white/[0.05] pointer-events-none hidden lg:block"
      >
        <PivotField className="w-full h-full" reverse />
      </div>

      {/* Sticky Container for desktop */}
      <div className="hidden lg:flex max-w-7xl mx-auto h-[300vh] relative">
        <div className="w-1/2 h-screen sticky top-0 flex flex-col justify-center px-12 z-20">
          <div className="flex items-center gap-4 mb-5">
            <span className="font-mono text-[11px] text-lime tracking-widest">02</span>
            <span className="h-px w-10 bg-lime/40" aria-hidden />
            <span className="text-lime uppercase tracking-[0.2em] text-sm font-semibold">
              {t("products.eyebrow")}
            </span>
          </div>
          <h2 className="text-6xl font-display font-light leading-[1.02] mb-8">
            {t("products.title.1")} <br />
            <span className="italic text-lime">
              {t("products.title.italic")}
            </span>{" "}
            <br />
            {t("products.title.2")}
          </h2>
          <p className="text-white/60 text-lg max-w-md">
            {t("products.subtitle")}
          </p>
        </div>

        <div className="w-1/2 flex flex-col pt-[50vh] pb-[50vh] gap-[30vh] z-10 px-12 relative">
          {productList.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0.4, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ margin: "-20% 0px -20% 0px" }}
              transition={{ duration: 0.6 }}
              className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src={product.img}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lime font-mono text-sm">{product.id}</span>
                  <span className="h-px flex-1 bg-white/20" aria-hidden />
                </div>
                <h3 className="text-3xl font-display font-medium mb-3">{product.title}</h3>
                <p className="text-white/70">{product.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile version */}
      <div className="lg:hidden px-6 py-24 space-y-16">
        <div>
          <div className="flex items-center gap-4 mb-5">
            <span className="font-mono text-[11px] text-lime tracking-widest">02</span>
            <span className="h-px w-10 bg-lime/40" aria-hidden />
            <span className="text-lime uppercase tracking-[0.2em] text-sm font-semibold">
              {t("products.eyebrow")}
            </span>
          </div>
          <h2 className="text-4xl font-display font-light leading-tight mb-6">
            {t("products.title.1")}{" "}
            <span className="italic text-lime">
              {t("products.title.italic")}
            </span>{" "}
            {t("products.title.2")}
          </h2>
          <p className="text-white/60">{t("products.subtitle")}</p>
        </div>

        <div className="space-y-12">
          {productList.map((product) => (
            <div
              key={product.id}
              className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10"
            >
              <img
                src={product.img}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-6">
                <div className="text-lime font-mono text-sm mb-1">
                  {product.id}
                </div>
                <h3 className="text-2xl font-display font-medium mb-2">{product.title}</h3>
                <p className="text-white/70 text-sm">{product.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
