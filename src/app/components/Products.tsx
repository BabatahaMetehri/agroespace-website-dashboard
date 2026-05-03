import { useRef } from "react";
import { useScroll } from "motion/react";
import { useI18n } from "../i18n/I18nProvider";

const products = [
  {
    id: "01",
    title: "Pivots Centraux",
    desc: "Solutions d'irrigation robustes pour les grandes parcelles, conçues pour résister aux climats difficiles.",
    img: "https://i.ibb.co/39W3DNJ3/DJI-0176-1.jpg",
  },
  {
    id: "02",
    title: "Arroseuses",
    desc: "Arroseuses de précision pour une irrigation optimale. Qualité garantie avec Komet, Senninger et Nelson.",
    img: "https://i.ibb.co/5XWfzqXK/Gemini-Generated-Image-p7y4v4p7y4v4p7y4.jpg",
  },
  {
    id: "03",
    title: "Pompes Immergées",
    desc: "Pompes de qualité supérieure pour irrigation par pivot central. Puissances disponibles : de 7,5 HP à 125 HP.",
    img: "https://i.ibb.co/j9N2JGwR/nouveaute-pompe-immergee-by-shakti-pumps-i-ltd-15077-9884784.jpg",
  },
];

export const Products = () => {
  const containerRef = useRef(null);
  const { t } = useI18n();
  useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="produits"
      ref={containerRef}
      style={{ position: "relative" }}
      className="relative bg-[#0a1c12] text-white"
    >
      {/* Sticky Container for desktop */}
      <div className="hidden lg:flex max-w-7xl mx-auto h-[300vh] relative">
        <div className="w-1/2 h-screen sticky top-0 flex flex-col justify-center px-12 z-20">
          <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t("products.eyebrow")}
          </span>
          <h2 className="text-6xl font-light leading-tight mb-8">
            {t("products.title.1")} <br />
            <span className="font-serif italic text-white/80">
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
          {products.map((product, i) => (
            <div
              key={product.id}
              className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={product.img}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                <div className="text-[#87A922] font-mono text-sm mb-2">
                  {product.id}
                </div>
                <h3 className="text-3xl font-medium mb-3">{product.title}</h3>
                <p className="text-white/70">{product.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile version */}
      <div className="lg:hidden px-6 py-24 space-y-16">
        <div>
          <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t("products.eyebrow")}
          </span>
          <h2 className="text-4xl font-light leading-tight mb-6">
            {t("products.title.1")}{" "}
            <span className="font-serif italic text-white/80">
              {t("products.title.italic")}
            </span>{" "}
            {t("products.title.2")}
          </h2>
          <p className="text-white/60">{t("products.subtitle")}</p>
        </div>

        <div className="space-y-12">
          {products.map((product) => (
            <div
              key={product.id}
              className="relative w-full aspect-square rounded-2xl overflow-hidden"
            >
              <img
                src={product.img}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                <div className="text-[#87A922] font-mono text-sm mb-1">
                  {product.id}
                </div>
                <h3 className="text-2xl font-medium mb-2">{product.title}</h3>
                <p className="text-white/70 text-sm">{product.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
