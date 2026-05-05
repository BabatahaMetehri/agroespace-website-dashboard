import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

type Testimonial = {
  id: number;
  name: string;
  role: { fr: string; ar: string; en: string };
  content: { fr: string; ar: string; en: string };
  image: string;
};

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Mohammed Benali",
    role: {
      fr: "Agriculteur — Adrar",
      ar: "فلاح — أدرار",
      en: "Farmer — Adrar",
    },
    content: {
      fr: "Grâce aux pivots WESTERN installés par AGROESPACE, j'ai pu augmenter ma production de 40 % tout en économisant l'eau. Le service après-vente est excellent.",
      ar: "بفضل محاور WESTERN التي ركّبتها AGROESPACE، تمكنت من رفع إنتاجي بنسبة 40 % مع توفير الماء. خدمة ما بعد البيع ممتازة.",
      en: "Thanks to the WESTERN pivots installed by AGROESPACE, I was able to increase my production by 40% while saving water. The after-sales service is excellent.",
    },
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/farmer1.jpg-nEwEwXKPKz587Qfl5j8BwOlQnT2PrP.jpeg",
  },
  {
    id: 2,
    name: "Bahir Fahim Alani",
    role: {
      fr: "Responsable des ventes — Alkhorayef",
      ar: "مسؤول المبيعات — الخريف",
      en: "Sales Manager — Alkhorayef",
    },
    content: {
      fr: "AGROESPACE ne se contente pas de vendre des systèmes d'irrigation à pivot, l'entreprise propose une nouvelle approche de la technologie d'irrigation en optimisant l'utilisation de l'eau, des engrais et les heures de fonctionnement.",
      ar: "لا تكتفي أغروسبيس ببيع أنظمة الري المحورية، بل تقدم رؤية جديدة لتقنيات الري عبر تحسين استهلاك الماء والأسمدة وساعات التشغيل.",
      en: "AGROESPACE doesn't just sell pivot irrigation systems, it offers a new approach to irrigation technology by optimizing water and fertilizer use and operating hours.",
    },
    image: "https://i.ibb.co/GfmSqJh0/1738008426852.jpg",
  },
];

export const Testimonials = () => {
  const { t, lang } = useI18n();
  return (
    <section
      className="py-32 bg-[#f4f7f5] text-[#0f2618]"
      style={{ position: "relative" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-20">
          <span className="text-[#87A922] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t("testimonials.eyebrow")}
          </span>
          <h2 className="text-4xl md:text-5xl font-light leading-tight">
            {t("testimonials.title.1")}{" "}
            <span className="font-serif italic text-[#4a7856]">
              {t("testimonials.title.italic")}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((tm, idx) => (
            <motion.div
              key={tm.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.2, duration: 0.8 }}
              className="bg-white p-12 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-[#114232]/5 flex flex-col"
            >
              <Quote className="w-10 h-10 text-[#87A922]/20 mb-6" />
              <p className="text-gray-600 text-lg leading-relaxed flex-1 italic mb-8">
                « {tm.content[lang]} »
              </p>

              <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                <img
                  src={tm.image}
                  alt={tm.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#f4f7f5]"
                  loading="lazy"
                  decoding="async"
                  width="56"
                  height="56"
                />
                <div>
                  <h3 className="font-bold text-[#0f2618] text-base">
                    {tm.name}
                  </h3>
                  <p className="text-sm text-[#4a7856] font-medium">
                    {tm.role[lang]}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
