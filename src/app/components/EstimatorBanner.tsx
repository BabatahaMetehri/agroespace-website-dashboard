import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Calculator, Check } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

type Lang = "fr" | "ar" | "en";

const T: Record<Lang, {
  badge: string;
  title1: string;
  title2: string;
  sub: string;
  b1: string;
  b2: string;
  b3: string;
  cta: string;
  stat: string;
  statLabel: string;
}> = {
  fr: {
    badge: "Nouvel outil gratuit",
    title1: "Combien de pivots pour",
    title2: "votre terrain ?",
    sub: "Estimez en 1 minute le nombre de pivots, les tailles idéales et vos besoins en eau — sans inscription.",
    b1: "Tailles optimisées par coût (pivot 30  ha privilégié)",
    b2: "Importez votre tracé Google Earth (.kml)",
    b3: "Résultat détaillé : surface irriguée, débit, plan",
    cta: "Lancer l'estimateur",
    stat: "≈ 78 %",
    statLabel: "de surface irriguée par cercle",
  },
  ar: {
    badge: "أداة مجانية جديدة",
    title1: "كم محورًا تحتاج",
    title2: "أرضك؟",
    sub: "قدّر في دقيقة عدد المحاور والأحجام المثلى واحتياجك من الماء — دون تسجيل.",
    b1: "أحجام مُحسَّنة حسب التكلفة (يُفضَّل محور 30 هكتار)",
    b2: "استورد مخطّطك من Google Earth (.kml)",
    b3: "نتيجة مفصّلة: المساحة المرويّة، التدفّق، الخطة",
    cta: "ابدأ التقدير",
    stat: "≈ 78 ٪",
    statLabel: "مساحة مرويّة لكل دائرة",
  },
  en: {
    badge: "New free tool",
    title1: "How many pivots for",
    title2: "your land?",
    sub: "Estimate in 1 minute the number of pivots, ideal sizes and your water needs — no sign-up.",
    b1: "Cost-optimised sizing (30-ha pivot favoured)",
    b2: "Import your Google Earth outline (.kml)",
    b3: "Detailed result: irrigated area, flow, plan",
    cta: "Launch the estimator",
    stat: "≈ 78%",
    statLabel: "irrigated area per circle",
  },
};

export const EstimatorBanner = () => {
  const { lang } = useI18n();
  const t = T[lang];

  return (
    <section className="bg-ink py-20 md:py-28 relative overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2rem] border border-lime/20 overflow-hidden bg-gradient-to-br from-forest/40 via-ink to-ink"
        >
          {/* lime glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 ltr:-right-24 rtl:-left-24 w-96 h-96 bg-lime rounded-full blur-[130px] opacity-20"
          />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Copy */}
            <div className="p-8 md:p-12 lg:p-14">
              <span className="inline-flex items-center gap-2 text-lime uppercase tracking-[0.2em] text-[11px] font-semibold mb-5">
                <span className="w-2 h-2 rounded-full bg-lime animate-pulse" aria-hidden />
                {t.badge}
              </span>
              <h2 className="font-industrial uppercase text-white leading-[0.95] text-[clamp(2rem,5vw,3.6rem)]">
                {t.title1}{" "}
                <span className="font-display normal-case italic font-light text-lime">
                  {t.title2}
                </span>
              </h2>
              <p className="text-white/65 mt-5 max-w-md leading-relaxed">{t.sub}</p>

              <ul className="mt-6 space-y-2.5">
                {[t.b1, t.b2, t.b3].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-white/75">
                    <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-lime/20 border border-lime/40 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-lime" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                to="/estimator"
                className="group mt-8 inline-flex items-center gap-3 bg-lime hover:bg-lime-deep text-white px-7 py-4 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors shadow-[0_0_50px_rgba(135,169,34,0.25)]"
              >
                <Calculator className="w-5 h-5" />
                {t.cta}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:-scale-x-100" />
              </Link>
            </div>

            {/* Decorative field of packed pivot circles */}
            <div className="relative h-56 md:h-full min-h-[20rem] overflow-hidden">
              <svg
                viewBox="0 0 300 300"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden
              >
                <defs>
                  <radialGradient id="bdisc" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#87a922" stopOpacity="0.5" />
                    <stop offset="75%" stopColor="#87a922" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6c871b" stopOpacity="0.1" />
                  </radialGradient>
                </defs>
                {/* dry field */}
                <rect x="20" y="20" width="260" height="260" rx="10" fill="#1c2a17" stroke="#87a922" strokeOpacity="0.25" strokeDasharray="6 5" />
                {/* packed circles (corners show as waste) */}
                {[
                  [85, 85, 62],
                  [215, 85, 62],
                  [85, 215, 62],
                  [215, 215, 62],
                ].map(([cx, cy, r], i) => (
                  <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    initial={{ r: 0, opacity: 0 }}
                    whileInView={{ r, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    fill="url(#bdisc)"
                    stroke="#87a922"
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                  />
                ))}
                {[
                  [85, 85],
                  [215, 85],
                  [85, 215],
                  [215, 215],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={2.4} fill="#eaf6c6" />
                ))}
              </svg>

              {/* floating stat chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="absolute bottom-5 ltr:left-5 rtl:right-5 bg-ink/80 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3"
              >
                <div dir="ltr" className="font-industrial text-2xl text-lime">{t.stat}</div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-white/50 max-w-[10rem]">
                  {t.statLabel}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
