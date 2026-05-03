import { motion } from "motion/react";
import { Link } from "react-router";
import { Check, ArrowRight } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

type ServiceKey = "irrigation" | "fertilization" | "retail";

const heroImages: Record<ServiceKey, string> = {
  irrigation: "https://i.ibb.co/6hsnxxx/freepik-enhance-12620.jpg",
  fertilization:
    "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMHNvaWwlMjBncm93aW5nfGVufDF8fHx8MTc3NzMzNTAwMXww&ixlib=rb-4.1.0&q=80&w=1080",
  retail: "https://i.ibb.co/yb3nDPx/retail-cover.jpg",
};

const benefits: Record<ServiceKey, { fr: string; ar: string; en: string }[]> = {
  irrigation: [
    {
      fr: "Pivots Western : galvanisés à chaud, conçus pour l'extrême sud algérien.",
      ar: "محاور Western: مغلفنة على الساخن، مصمَّمة للجنوب الجزائري الحار.",
      en: "Western pivots: hot-dip galvanized, built for Algeria’s deep south.",
    },
    {
      fr: "Transport et montage inclus jusqu'à la première rotation.",
      ar: "النقل والتركيب مشمولان حتى الدوران الأول.",
      en: "Transport and assembly included until first rotation.",
    },
    {
      fr: "Garantie 1 an + service après-vente assuré par nos ingénieurs.",
      ar: "ضمان سنة + خدمة ما بعد البيع بإشراف مهندسينا.",
      en: "1-year warranty + after-sales handled by our own engineers.",
    },
    {
      fr: "Pilotage à distance compatible avec nos solutions partenaires.",
      ar: "تحكم عن بُعد متوافق مع حلول شركائنا.",
      en: "Remote-control ready with our partner stack.",
    },
  ],
  fertilization: [
    {
      fr: "Programmation de fertirrigation couplée au pivot.",
      ar: "برمجة التسميد بالري مع المحور.",
      en: "Fertigation scheduling coupled to the pivot.",
    },
    {
      fr: "Analyses d'eau et de sol systématiques avant chaque devis.",
      ar: "تحليل منهجي للماء والتربة قبل كل عرض سعر.",
      en: "Systematic water and soil analysis before every quote.",
    },
    {
      fr: "Suivi terrain : nos ingénieurs ajustent les apports avec vous.",
      ar: "متابعة ميدانية: يضبط مهندسونا المدخلات معكم.",
      en: "Field follow-up: our engineers tune inputs with you.",
    },
  ],
  retail: [
    {
      fr: "Stock permanent : asperseurs Komet/Senninger/Nelson, motoréducteurs UMC.",
      ar: "مخزون دائم: رشاشات Komet/Senninger/Nelson، محركات UMC.",
      en: "Permanent stock: Komet/Senninger/Nelson sprinklers, UMC gearmotors.",
    },
    {
      fr: "Commande à distance avec livraison dans nos 4 agences.",
      ar: "الطلب عن بُعد مع التسليم في وكالاتنا الأربع.",
      en: "Remote ordering with delivery to our 4 agencies.",
    },
    {
      fr: "Conseils techniques : nos vendeurs sont aussi techniciens.",
      ar: "استشارة تقنية: بائعونا هم تقنيون كذلك.",
      en: "Technical advice: our sellers are technicians too.",
    },
  ],
};

const longCopy: Record<ServiceKey, { fr: string; ar: string; en: string }> = {
  irrigation: {
    fr: "AGROESPACE est spécialisé dans les pivots centraux WESTERN. Nous nous concentrons exclusivement sur cette gamme — pas de pivots linéaires ni de goutte-à-goutte — pour pouvoir maîtriser parfaitement chaque pose, chaque entretien et chaque pièce détachée. Depuis nos débuts, aucun pivot que nous avons installé n'est tombé en panne, et le service après-vente reste entièrement assuré par nos ingénieurs.",
    ar: "تتخصص أغروسبيس في محاور WESTERN المركزية حصرياً. نُركز على هذه السلسلة فقط — لا نوزع المحاور الخطية ولا التنقيط — لنتحكم بشكل كامل في كل تركيب، صيانة، وقطعة غيار. منذ انطلاقنا، لم يتعطل أي محور ركّبناه، وخدمة ما بعد البيع يضمنها مهندسونا.",
    en: "AGROESPACE specializes in WESTERN central pivots. We focus exclusively on this range — no linear pivots, no drip — so we can perfectly own every install, every service, every spare part. Since we started, not one pivot we installed has gone out of service, and after-sales is entirely handled by our engineers.",
  },
  fertilization: {
    fr: "Notre approche fertilisation s'appuie sur une lecture fine des sols et de l'eau, et sur un dialogue continu avec l'agriculteur. Nous calibrons la fertirrigation au plus juste pour optimiser les rendements sans sur-doser, et nous ajustons les recommandations à chaque étape culturale.",
    ar: "يقوم نهجنا في التسميد على قراءة دقيقة للتربة والماء، وعلى حوار مستمر مع الفلاح. نضبط التسميد بالري بدقة لتحسين المردود دون إفراط في الجرعات.",
    en: "Our fertilization approach builds on a careful read of soil and water, and on ongoing dialogue with the farmer. We dial fertigation in precisely to lift yields without overdosing.",
  },
  retail: {
    fr: "Au-delà des installations clé-en-main, AGROESPACE distribue les pièces détachées et accessoires des marques de référence : Komet, Senninger, Nelson, UMC, Alkhorayef. Notre stock vous permet de réparer vite et bien, partout dans le sud algérien.",
    ar: "إلى جانب التركيب الجاهز للاستعمال، توزّع أغروسبيس قطع الغيار والإكسسوارات من العلامات المرجعية: Komet، Senninger، Nelson، UMC، الخريف. مخزوننا يضمن إصلاحاً سريعاً.",
    en: "Beyond turn-key installs, AGROESPACE distributes spare parts and accessories from reference brands: Komet, Senninger, Nelson, UMC, Alkhorayef. Our stock keeps you running fast across southern Algeria.",
  },
};

export const ServicePage = ({ service }: { service: ServiceKey }) => {
  const { t, lang } = useI18n();

  return (
    <div className="bg-[#f4f7f5]" style={{ position: "relative" }}>
      <section className="relative h-[60vh] flex items-end overflow-hidden bg-[#0f2618]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-[#0f2618]/60 to-transparent z-10" />
          <img
            src={heroImages[service]}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-16 w-full">
          <Link
            to="/services"
            className="text-white/60 hover:text-white text-xs uppercase tracking-[0.2em] inline-block mb-4"
          >
            ← {t("nav.activities")}
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-light text-white leading-tight max-w-3xl"
          >
            {t(`services.${service}.title`)}
          </motion.h1>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <p className="text-xl md:text-2xl font-light text-[#0f2618]/85 leading-relaxed whitespace-pre-line">
            {longCopy[service][lang]}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="bg-white rounded-3xl p-10 md:p-14 border border-[#114232]/5 shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
            <h2 className="text-2xl md:text-3xl font-medium text-[#0f2618] mb-8">
              {service === "irrigation"
                ? lang === "ar"
                  ? "لماذا نحن"
                  : lang === "en"
                    ? "Why us"
                    : "Pourquoi nous"
                : lang === "ar"
                  ? "مزايا الخدمة"
                  : lang === "en"
                    ? "Service highlights"
                    : "Atouts du service"}
            </h2>
            <ul className="space-y-5">
              {benefits[service].map((b, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-[#87A922] text-white flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-700 text-base md:text-lg leading-relaxed">
                    {b[lang]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#0f2618] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white leading-tight mb-8">
            {lang === "ar"
              ? "هل نناقش مشروعكم؟"
              : lang === "en"
                ? "Shall we discuss your project?"
                : "Discutons de votre projet ?"}
          </h2>
          <Link
            to="/contact"
            className="inline-flex items-center gap-3 bg-[#87A922] hover:bg-[#6c871b] text-white px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors"
          >
            {t("hero.cta.quote")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
