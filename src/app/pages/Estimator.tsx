import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Droplets,
  Gauge,
  Sprout,
  TriangleAlert,
  RotateCcw,
  Check,
} from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { CountUp } from "../components/fx/CountUp";
import { EstimatorField } from "../components/estimator/EstimatorField";
import { parseKml } from "../lib/kml";
import {
  estimate,
  radiusM,
  pivotSku,
  type Crop,
  type ObstacleLevel,
  type Shape,
} from "../lib/pivotEstimator";

type Lang = "fr" | "ar" | "en";

// ── Trilingual copy (kept local so the wizard is self-contained) ─────────────
const T: Record<Lang, Record<string, string>> = {
  fr: {
    eyebrow: "Outil gratuit",
    title1: "Estimateur de",
    title2: "pivots intelligents",
    intro:
      "Estimez en 1 minute combien de pivots, quelles tailles et quel débit d'eau il faut pour votre terrain. Indicatif — pas une étude d'ingénierie.",
    step: "Étape",
    of: "sur",
    next: "Suivant",
    back: "Retour",
    seeResult: "Voir mon estimation",
    restart: "Recommencer",
    s1: "Surface du terrain",
    s1sub: "Superficie totale à irriguer.",
    hectares: "hectares",
    orUpload: "Ou importez votre tracé Google Earth (.kml)",
    uploadHint: "Le fichier reste sur votre appareil — rien n'est envoyé.",
    kmlOk: "Terrain importé : {a} ha détectés.",
    kmlErr: "Fichier illisible. Exportez un .kml (pas .kmz) depuis Google Earth.",
    s2: "Forme du terrain",
    s2sub: "La forme change le taux de remplissage par des cercles.",
    shapeSquare: "Carré / bloc",
    shapeRect: "Rectangulaire",
    shapeNarrow: "Étroit / en bande",
    shapeIrregular: "Irrégulier",
    s3: "Obstacles",
    s3sub: "Poteaux, routes, bâtiments réduisent la surface utile.",
    obsNone: "Aucun",
    obsLight: "Léger (poteaux)",
    obsModerate: "Modéré (routes)",
    obsHeavy: "Important (bâtiments)",
    s4: "Culture principale",
    s4sub: "Sert à estimer le besoin en eau quotidien.",
    cropCereals: "Céréales / blé",
    cropMaize: "Maïs",
    cropPotato: "Pomme de terre",
    cropAlfalfa: "Luzerne",
    cropVegetables: "Maraîchage",
    kIrrigated: "Surface irriguée",
    kEfficiency: "Efficacité",
    kPivots: "Pivots",
    kWater: "Eau / jour",
    kFlow: "Débit système",
    kWaste: "Pertes (coins)",
    resultTitle: "Votre plan recommandé",
    resultLead: "Configuration optimale depuis notre inventaire de pivots de surface :",
    coverage: "Couverture",
    radius: "Rayon",
    requestQuote: "Demander un devis",
    tooSmall:
      "Votre terrain est plus petit que notre plus petit pivot (20 ha). Contactez-nous pour une solution adaptée.",
    tight:
      "Terrain juste à la limite — un seul pivot 20 ha conviendrait (léger débordement possible).",
    disclaimer:
      "Estimation indicative basée sur la géométrie des cercles et des moyennes climatiques sahariennes. Le nombre exact de pivots, leur implantation et le débit réel dépendent d'une étude de terrain (topographie, point d'eau, sol, vent). Demandez une étude gratuite.",
    ctaStudy: "Obtenir une étude gratuite",
    units: "ha",
    waterUnit: "m³/j",
    flowUnit: "L/s",
  },
  ar: {
    eyebrow: "أداة مجانية",
    title1: "مُقدّر",
    title2: "المحاور الذكية",
    intro:
      "قدّر في دقيقة عدد المحاور وأحجامها وكمية الماء اللازمة لأرضك. تقدير إرشادي — وليس دراسة هندسية.",
    step: "الخطوة",
    of: "من",
    next: "التالي",
    back: "رجوع",
    seeResult: "اعرض تقديري",
    restart: "إعادة",
    s1: "مساحة الأرض",
    s1sub: "المساحة الإجمالية المراد ريّها.",
    hectares: "هكتار",
    orUpload: "أو استورد مخطّطك من Google Earth (.kml)",
    uploadHint: "يبقى الملف على جهازك — لا يُرسل شيء.",
    kmlOk: "تم استيراد الأرض: {a} هكتار.",
    kmlErr: "ملف غير مقروء. صدّر ملف .kml (وليس .kmz) من Google Earth.",
    s2: "شكل الأرض",
    s2sub: "الشكل يؤثّر على نسبة التغطية بالدوائر.",
    shapeSquare: "مربّع / كتلة",
    shapeRect: "مستطيل",
    shapeNarrow: "ضيّق / شريطي",
    shapeIrregular: "غير منتظم",
    s3: "العوائق",
    s3sub: "الأعمدة والطرق والمباني تقلّل المساحة المفيدة.",
    obsNone: "لا شيء",
    obsLight: "خفيف (أعمدة)",
    obsModerate: "متوسط (طرق)",
    obsHeavy: "كبير (مبانٍ)",
    s4: "المحصول الرئيسي",
    s4sub: "لتقدير الحاجة اليومية للماء.",
    cropCereals: "حبوب / قمح",
    cropMaize: "ذرة",
    cropPotato: "بطاطا",
    cropAlfalfa: "فصّة (برسيم)",
    cropVegetables: "خضروات",
    kIrrigated: "المساحة المرويّة",
    kEfficiency: "الكفاءة",
    kPivots: "المحاور",
    kWater: "الماء / يوم",
    kFlow: "تدفّق النظام",
    kWaste: "الفاقد (الزوايا)",
    resultTitle: "خطتك المقترحة",
    resultLead: "أفضل تركيبة من مخزوننا لمحاور السطح:",
    coverage: "التغطية",
    radius: "نصف القطر",
    requestQuote: "اطلب عرض سعر",
    tooSmall:
      "أرضك أصغر من أصغر محور لدينا (20 هكتار). تواصل معنا لحلّ مناسب.",
    tight:
      "الأرض عند الحدّ تقريبًا — محور واحد 20 هكتار يناسبها (مع تجاوز بسيط محتمل).",
    disclaimer:
      "تقدير إرشادي مبني على هندسة الدوائر ومتوسّطات المناخ الصحراوي. العدد الدقيق للمحاور وتوزيعها والتدفّق الحقيقي يعتمد على دراسة ميدانية (التضاريس، مصدر الماء، التربة، الرياح). اطلب دراسة مجانية.",
    ctaStudy: "احصل على دراسة مجانية",
    units: "هكتار",
    waterUnit: "م³/يوم",
    flowUnit: "ل/ث",
  },
  en: {
    eyebrow: "Free tool",
    title1: "Smart pivot",
    title2: "estimator",
    intro:
      "Estimate in 1 minute how many pivots, which sizes and what water flow your land needs. Indicative — not an engineering study.",
    step: "Step",
    of: "of",
    next: "Next",
    back: "Back",
    seeResult: "See my estimate",
    restart: "Start over",
    s1: "Land size",
    s1sub: "Total area to irrigate.",
    hectares: "hectares",
    orUpload: "Or import your Google Earth outline (.kml)",
    uploadHint: "The file stays on your device — nothing is uploaded.",
    kmlOk: "Land imported: {a} ha detected.",
    kmlErr: "Unreadable file. Export a .kml (not .kmz) from Google Earth.",
    s2: "Terrain shape",
    s2sub: "Shape changes how well circles fill the plot.",
    shapeSquare: "Square / block",
    shapeRect: "Rectangular",
    shapeNarrow: "Narrow / strip",
    shapeIrregular: "Irregular",
    s3: "Obstacles",
    s3sub: "Poles, roads, buildings reduce usable area.",
    obsNone: "None",
    obsLight: "Light (poles)",
    obsModerate: "Moderate (roads)",
    obsHeavy: "Heavy (buildings)",
    s4: "Main crop",
    s4sub: "Used to estimate the daily water need.",
    cropCereals: "Cereals / wheat",
    cropMaize: "Maize",
    cropPotato: "Potato",
    cropAlfalfa: "Alfalfa",
    cropVegetables: "Vegetables",
    kIrrigated: "Irrigated area",
    kEfficiency: "Efficiency",
    kPivots: "Pivots",
    kWater: "Water / day",
    kFlow: "System flow",
    kWaste: "Corner waste",
    resultTitle: "Your recommended plan",
    resultLead: "Best fit from our surface-pivot inventory:",
    coverage: "Coverage",
    radius: "Radius",
    requestQuote: "Request a quote",
    tooSmall:
      "Your land is smaller than our smallest pivot (20 ha). Contact us for a tailored solution.",
    tight:
      "Land right at the limit — a single 20 ha pivot would fit (slight overhang possible).",
    disclaimer:
      "Indicative estimate based on circle geometry and Saharan climate averages. The exact pivot count, layout and real flow depend on a site survey (topography, water source, soil, wind). Request a free study.",
    ctaStudy: "Get a free study",
    units: "ha",
    waterUnit: "m³/day",
    flowUnit: "L/s",
  },
};

const SHAPES: { id: Shape; key: string; icon: ReactNode }[] = [
  { id: "square", key: "shapeSquare", icon: <rect x="6" y="6" width="20" height="20" rx="2" /> },
  { id: "rectangular", key: "shapeRect", icon: <rect x="3" y="9" width="26" height="14" rx="2" /> },
  { id: "narrow", key: "shapeNarrow", icon: <rect x="2" y="12" width="28" height="8" rx="2" /> },
  {
    id: "irregular",
    key: "shapeIrregular",
    icon: <path d="M5 8 L20 5 L28 14 L24 26 L9 24 L4 16 Z" />,
  },
];

const OBSTACLES: { id: ObstacleLevel; key: string }[] = [
  { id: "none", key: "obsNone" },
  { id: "light", key: "obsLight" },
  { id: "moderate", key: "obsModerate" },
  { id: "heavy", key: "obsHeavy" },
];

const CROPS: { id: Crop; key: string }[] = [
  { id: "cereals", key: "cropCereals" },
  { id: "maize", key: "cropMaize" },
  { id: "potato", key: "cropPotato" },
  { id: "alfalfa", key: "cropAlfalfa" },
  { id: "vegetables", key: "cropVegetables" },
];

const TOTAL_STEPS = 4;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");

export const Estimator = () => {
  const { lang, dir } = useI18n();
  const tr = (k: string) => T[lang][k] ?? T.fr[k] ?? k;

  const [step, setStep] = useState(1); // 1..4 inputs, 5 = results
  const [landHa, setLandHa] = useState(60);
  const [shape, setShape] = useState<Shape>("square");
  const [obstacles, setObstacles] = useState<ObstacleLevel>("none");
  const [crop, setCrop] = useState<Crop>("cereals");
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(
    () => estimate({ landHa, shape, obstacles, crop }),
    [landHa, shape, obstacles, crop],
  );

  const onKml = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseKml(await file.text());
    if (!parsed || parsed.areaHa <= 0) {
      toast.error(tr("kmlErr"));
      return;
    }
    setLandHa(parsed.areaHa);
    setShape(parsed.shape);
    toast.success(tr("kmlOk").replace("{a}", String(parsed.areaHa)));
  };

  const liveKpis = [
    { label: tr("kIrrigated"), value: `${fmt(result.irrigatedHa)} ${tr("units")}` },
    { label: tr("kEfficiency"), value: `${Math.round(result.efficiencyPct)} %` },
    { label: tr("kPivots"), value: `${result.pivotCount}` },
    { label: tr("kWater"), value: `${fmt(result.dailyWaterM3)} ${tr("waterUnit")}` },
  ];

  return (
    <div className="bg-ink min-h-screen text-white grain" style={{ position: "relative" }} dir={dir}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <span className="h-px w-10 bg-lime/50" aria-hidden />
          <span className="text-lime uppercase tracking-[0.25em] text-xs md:text-sm font-semibold">
            {tr("eyebrow")}
          </span>
        </div>
        <h1 className="font-industrial uppercase leading-[0.92] text-[clamp(2.4rem,6.5vw,5.5rem)]">
          {tr("title1")}{" "}
          <span className="font-display normal-case italic font-light text-lime">
            {tr("title2")}
          </span>
        </h1>
        <p className="text-white/60 max-w-2xl mt-5 leading-relaxed">{tr("intro")}</p>

        <div className="mt-12 grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* ── Controls column ─────────────────────────────────────────── */}
          <div>
            {/* Progress */}
            {step <= TOTAL_STEPS && (
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs text-white/40 mb-2 font-mono">
                  <span>
                    {tr("step")} {step} {tr("of")} {TOTAL_STEPS}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-lime"
                    initial={false}
                    animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.3 }}
              >
                {/* STEP 1 — land size + KML */}
                {step === 1 && (
                  <div>
                    <StepHead title={tr("s1")} sub={tr("s1sub")} />
                    <div className="flex items-end gap-4 mb-6">
                      <input
                        type="number"
                        min={1}
                        value={landHa}
                        onChange={(e) => setLandHa(Math.max(0, Number(e.target.value) || 0))}
                        className="w-40 bg-white/5 border border-white/15 rounded-2xl px-5 py-4 text-4xl font-industrial focus:outline-none focus:border-lime"
                      />
                      <span className="text-white/50 pb-4">{tr("hectares")}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={500}
                      step={5}
                      value={Math.min(500, landHa)}
                      onChange={(e) => setLandHa(Number(e.target.value))}
                      className="w-full accent-lime"
                    />

                    <div className="mt-8 border border-dashed border-white/15 rounded-2xl p-5 hover:border-lime/50 transition-colors">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".kml,application/vnd.google-earth.kml+xml"
                        className="hidden"
                        onChange={(e) => onKml(e.target.files?.[0])}
                      />
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-3 text-start w-full group"
                      >
                        <span className="w-11 h-11 shrink-0 rounded-xl bg-lime/15 border border-lime/30 flex items-center justify-center text-lime group-hover:bg-lime/25 transition-colors">
                          <Upload className="w-5 h-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium">{tr("orUpload")}</span>
                          <span className="block text-xs text-white/40">{tr("uploadHint")}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 — shape */}
                {step === 2 && (
                  <div>
                    <StepHead title={tr("s2")} sub={tr("s2sub")} />
                    <div className="grid grid-cols-2 gap-3">
                      {SHAPES.map((s) => (
                        <SelectCard
                          key={s.id}
                          active={shape === s.id}
                          onClick={() => setShape(s.id)}
                        >
                          <svg viewBox="0 0 32 32" className="w-10 h-10 mb-3 fill-current">
                            {s.icon}
                          </svg>
                          <span className="text-sm font-medium">{tr(s.key)}</span>
                        </SelectCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3 — obstacles */}
                {step === 3 && (
                  <div>
                    <StepHead title={tr("s3")} sub={tr("s3sub")} />
                    <div className="space-y-3">
                      {OBSTACLES.map((o) => (
                        <SelectRow
                          key={o.id}
                          active={obstacles === o.id}
                          onClick={() => setObstacles(o.id)}
                          label={tr(o.key)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4 — crop */}
                {step === 4 && (
                  <div>
                    <StepHead title={tr("s4")} sub={tr("s4sub")} />
                    <div className="flex flex-wrap gap-3">
                      {CROPS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCrop(c.id)}
                          className={`px-5 py-3 rounded-full border text-sm font-medium transition-colors ${
                            crop === c.id
                              ? "bg-lime text-white border-transparent"
                              : "bg-white/5 border-white/15 text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {tr(c.key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 5 — results */}
                {step === 5 && (
                  <ResultsPanel
                    result={result}
                    tr={tr}
                    onRestart={() => setStep(1)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            {step <= TOTAL_STEPS && (
              <div className="flex items-center gap-3 mt-10">
                {step > 1 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {tr("back")}
                  </button>
                )}
                <button
                  onClick={() => setStep((s) => Math.min(5, s + 1))}
                  disabled={landHa <= 0}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-lime hover:bg-lime-deep disabled:opacity-40 text-white font-bold uppercase tracking-[0.1em] text-xs transition-colors"
                >
                  {step === TOTAL_STEPS ? tr("seeResult") : tr("next")}
                  <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              </div>
            )}
          </div>

          {/* ── Live visual + KPIs ──────────────────────────────────────── */}
          <div className="lg:sticky lg:top-28">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
              <div className="h-64 md:h-80 w-full">
                <EstimatorField result={result} shape={shape} obstacles={obstacles} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 mt-4 rounded-xl overflow-hidden">
                {liveKpis.map((k) => (
                  <div key={k.label} className="bg-ink px-4 py-3">
                    <div dir="ltr" className="font-industrial text-lg md:text-xl">
                      {k.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="flex items-start gap-2 text-[11px] text-white/35 mt-3 leading-relaxed">
              <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400/70" />
              {tr("disclaimer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Small building blocks ────────────────────────────────────────────────────
const StepHead = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-display font-medium">{title}</h2>
    <p className="text-white/50 text-sm mt-1">{sub}</p>
  </div>
);

const SelectCard = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center text-center rounded-2xl border p-6 transition-colors ${
      active
        ? "bg-lime/15 border-lime text-white"
        : "bg-white/5 border-white/15 text-white/70 hover:text-white hover:bg-white/10"
    }`}
  >
    {children}
  </button>
);

const SelectRow = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between rounded-2xl border px-5 py-4 transition-colors ${
      active
        ? "bg-lime/15 border-lime"
        : "bg-white/5 border-white/15 hover:bg-white/10"
    }`}
  >
    <span className="text-sm font-medium">{label}</span>
    <span
      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
        active ? "bg-lime border-transparent" : "border-white/30"
      }`}
    >
      {active && <Check className="w-3 h-3 text-white" />}
    </span>
  </button>
);

// ── Results ──────────────────────────────────────────────────────────────────
const ResultsPanel = ({
  result,
  tr,
  onRestart,
}: {
  result: ReturnType<typeof estimate>;
  tr: (k: string) => string;
  onRestart: () => void;
}) => {
  if (!result.feasible) {
    return (
      <div>
        <StepHead title={tr("resultTitle")} sub="" />
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-white/80">
          <TriangleAlert className="w-6 h-6 text-amber-400 mb-3" />
          {tr("tooSmall")}
        </div>
        <Link
          to="/contact"
          className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-lime hover:bg-lime-deep text-white font-bold uppercase tracking-[0.1em] text-xs transition-colors"
        >
          {tr("ctaStudy")} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
        </Link>
        <button
          onClick={onRestart}
          className="mt-3 ms-3 inline-flex items-center gap-2 text-white/50 hover:text-white text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {tr("restart")}
        </button>
      </div>
    );
  }

  const bigKpis = [
    { icon: Sprout, label: tr("kIrrigated"), value: `${fmt(result.irrigatedHa)} ${tr("units")}` },
    { icon: Gauge, label: tr("kEfficiency"), value: `${Math.round(result.efficiencyPct)} %` },
    { icon: Droplets, label: tr("kWater"), value: `${fmt(result.dailyWaterM3)} ${tr("waterUnit")}` },
    { icon: Gauge, label: tr("kFlow"), value: `${fmt(result.flowLps)} ${tr("flowUnit")}` },
  ];

  return (
    <div>
      <StepHead title={tr("resultTitle")} sub={tr("resultLead")} />

      {result.note === "tight" && (
        <p className="text-xs text-amber-300/80 -mt-3 mb-5">{tr("tight")}</p>
      )}

      {/* Pivot product cards */}
      <div className="space-y-3 mb-8">
        {result.picks.map((p) => (
          <div
            key={p.size}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="w-16 h-16 shrink-0 rounded-xl bg-lime/10 border border-lime/25 flex items-center justify-center">
              <div className="text-center leading-none">
                <div className="font-industrial text-2xl text-lime">{p.size}</div>
                <div className="text-[9px] text-lime/70 uppercase">ha</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg">
                {p.count}× {tr("coverage")} {p.size} ha
              </div>
              <div className="text-xs text-white/45 font-mono">
                {pivotSku(p.size)} · {tr("radius")} ≈ {Math.round(radiusM(p.size))} m
              </div>
            </div>
            <Link
              to={`/catalog?q=${encodeURIComponent(pivotSku(p.size))}`}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-lime hover:bg-lime-deep text-white text-xs font-bold uppercase tracking-[0.08em] transition-colors"
            >
              {tr("requestQuote")} <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </Link>
          </div>
        ))}
      </div>

      {/* KPI grid with count-up */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden mb-8">
        {bigKpis.map((k, i) => (
          <div key={i} className="bg-ink p-5">
            <k.icon className="w-4 h-4 text-lime/70 mb-2" />
            <div dir="ltr" className="font-industrial text-xl md:text-2xl">
              <CountUp value={k.value} />
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/40 mt-1">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-forest hover:bg-lime hover:text-white font-bold uppercase tracking-[0.1em] text-xs transition-colors"
        >
          {tr("ctaStudy")} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
        </Link>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-white/60 hover:text-white text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {tr("restart")}
        </button>
      </div>
    </div>
  );
};
