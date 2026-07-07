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
  Ruler,
  Maximize2,
  Info,
  Layers,
} from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { CountUp } from "../components/fx/CountUp";
import { EstimatorField } from "../components/estimator/EstimatorField";
import { parseKml } from "../lib/kml";
import {
  estimate,
  radiusM,
  diameterM,
  cellHa,
  pivotSku,
  fieldDims,
  maxSizeForWidth,
  shapeFromAspect,
  SHAPE_MAX,
  type Crop,
  type ObstacleLevel,
  type PivotSize,
  type Shape,
} from "../lib/pivotEstimator";
import {
  estimateWithObstacles,
  OBSTACLE_SPECS,
  type Obstacle,
  type ObstacleType,
} from "../lib/pivotPlacement";

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
    modeSurface: "Surface",
    modeDims: "Dimensions (avancé)",
    width: "Largeur",
    height: "Longueur",
    meters: "mètres",
    dimsHint:
      "Plus précis : la forme et la plus grande taille de pivot possible se déduisent des dimensions.",
    derivedShape: "Forme déduite de vos dimensions",
    detailTitle: "Détails techniques",
    diameter: "Ø",
    footprint: "Emprise",
    summaryUsable: "Surface utile",
    summaryWaste: "Pertes (coins/bords)",
    summaryDims: "Dimensions estimées",
    waterDepth: "Dose brute",
    depthUnit: "mm/j",
    seasonalWater: "Saison (120 j)",
    whyTitle: "Pourquoi cette configuration ?",
    why30:
      "Le pivot 30 ha — le plus courant en Algérie et le meilleur rapport coût/hectare — est privilégié dès qu'il convient.",
    whySaved:
      "{n} machine(s) de moins qu'une solution composée uniquement de pivots 20 ha : moins de points de pivot, de pompes et d'installation.",
    tooNarrow:
      "Votre parcelle est trop étroite ({w} m) pour notre plus petit pivot (≈ 505 m de large). Un système linéaire ou une autre solution conviendrait mieux — contactez-nous.",
    recommended: "Le + courant",
    maxFitLabel: "Pivot max pour cette largeur",
    obsPlaceHint:
      "Choisissez un type puis cliquez sur le plan à droite pour placer l'obstacle exactement. Cliquez sur un obstacle placé pour le retirer. Dès qu'un obstacle est placé, le calcul devient géométrique et exact.",
    obsClear: "Tout effacer",
    geoNote:
      "Plan géométrique exact : chaque cercle est positionné en évitant vos obstacles et les limites du terrain.",
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
    modeSurface: "المساحة",
    modeDims: "الأبعاد (متقدّم)",
    width: "العرض",
    height: "الطول",
    meters: "متر",
    dimsHint: "أدقّ: يُستنتج الشكل وأكبر محور ممكن من الأبعاد.",
    derivedShape: "الشكل مستنتَج من أبعادك",
    detailTitle: "تفاصيل تقنية",
    diameter: "القطر",
    footprint: "المساحة المشغولة",
    summaryUsable: "المساحة المفيدة",
    summaryWaste: "الفاقد (الزوايا/الحواف)",
    summaryDims: "الأبعاد المقدّرة",
    waterDepth: "الجرعة الإجمالية",
    depthUnit: "مم/يوم",
    seasonalWater: "الموسم (120 يوم)",
    whyTitle: "لماذا هذه التركيبة؟",
    why30:
      "محور 30 هكتار — الأكثر شيوعًا في الجزائر وأفضل تكلفة لكل هكتار — يُفضَّل كلّما كان مناسبًا.",
    whySaved:
      "{n} آلة أقل مقارنةً بحلّ يعتمد فقط على محاور 20 هكتار: نقاط ارتكاز ومضخّات وتركيب أقل.",
    tooNarrow:
      "قطعتك ضيّقة جدًا ({w} م) على أصغر محور لدينا (عرض ≈ 505 م). نظام خطّي أو حلّ آخر قد يكون أنسب — تواصل معنا.",
    recommended: "الأكثر شيوعًا",
    maxFitLabel: "أكبر محور لهذا العرض",
    obsPlaceHint:
      "اختر نوعًا ثم انقر على المخطط لوضع العائق في مكانه الحقيقي. انقر على عائق لإزالته. بمجرد وضع عائق يصبح الحساب هندسيًا دقيقًا.",
    obsClear: "مسح الكل",
    geoNote: "مخطط هندسي دقيق: كل دائرة موضوعة مع تفادي عوائقك وحدود الأرض.",
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
    modeSurface: "Surface",
    modeDims: "Dimensions (advanced)",
    width: "Width",
    height: "Length",
    meters: "metres",
    dimsHint:
      "More precise: the shape and the largest possible pivot are derived from the dimensions.",
    derivedShape: "Shape derived from your dimensions",
    detailTitle: "Technical details",
    diameter: "Ø",
    footprint: "Footprint",
    summaryUsable: "Usable area",
    summaryWaste: "Waste (corners/edges)",
    summaryDims: "Estimated dimensions",
    waterDepth: "Gross depth",
    depthUnit: "mm/day",
    seasonalWater: "Season (120 d)",
    whyTitle: "Why this configuration?",
    why30:
      "The 30-ha pivot — Algeria's most common size and best cost-per-hectare — is favoured whenever it fits.",
    whySaved:
      "{n} fewer machine(s) than an all-20-ha layout: fewer pivot points, pumps and installations.",
    tooNarrow:
      "Your plot is too narrow ({w} m) for our smallest pivot (≈ 505 m wide). A linear system or another solution would suit better — contact us.",
    recommended: "Most common",
    maxFitLabel: "Largest pivot for this width",
    obsPlaceHint:
      "Pick a type then click the plan on the right to place the obstacle exactly. Click a placed obstacle to remove it. Once an obstacle is placed the calculation becomes exact geometry.",
    obsClear: "Clear all",
    geoNote:
      "Exact geometric plan: every circle is positioned avoiding your obstacles and the field limits.",
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

const OB_LABELS: Record<ObstacleType, Record<Lang, string>> = {
  pole: { fr: "Poteau", ar: "عمود", en: "Pole" },
  building: { fr: "Bâtiment", ar: "مبنى", en: "Building" },
  trees: { fr: "Arbres", ar: "أشجار", en: "Trees" },
  road: { fr: "Route", ar: "طريق", en: "Road" },
};

const TOTAL_STEPS = 4;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
const shapeKey = (s: Shape) => SHAPES.find((x) => x.id === s)?.key ?? "shapeSquare";

export const Estimator = () => {
  const { lang, dir } = useI18n();
  const tr = (k: string) => T[lang][k] ?? T.fr[k] ?? k;

  const [step, setStep] = useState(1); // 1..4 inputs, 5 = results
  const [mode, setMode] = useState<"surface" | "dims">("surface");
  const [landHa, setLandHa] = useState(60);
  const [widthM, setWidthM] = useState(800);
  const [heightM, setHeightM] = useState(800);
  const [shape, setShape] = useState<Shape>("square");
  const [obstacles, setObstacles] = useState<ObstacleLevel>("none");
  const [obsList, setObsList] = useState<Obstacle[]>([]);
  const [obsType, setObsType] = useState<ObstacleType>("pole");
  const [roadOrient, setRoadOrient] = useState<"h" | "v">("v");
  const [crop, setCrop] = useState<Crop>("cereals");
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    // With placed obstacles we switch to the exact geometric engine:
    // real rectangle, real circles, per-obstacle clearances.
    if (obsList.length > 0) {
      const d = mode === "dims" ? { wM: widthM, hM: heightM } : fieldDims(landHa, shape);
      const effShape =
        mode === "dims"
          ? shapeFromAspect(Math.max(d.wM, d.hM) / Math.max(1, Math.min(d.wM, d.hM)))
          : shape;
      const cap = maxSizeForWidth(Math.min(d.wM, d.hM));
      const maxSize = (cap ? Math.min(cap, SHAPE_MAX[effShape]) : 20) as PivotSize;
      return estimateWithObstacles({
        wM: d.wM,
        hM: d.hM,
        shape: effShape,
        crop,
        obstacles: obsList,
        maxSize,
      });
    }
    return estimate(
      mode === "dims"
        ? { landHa: 0, shape, obstacles, crop, widthM, heightM }
        : { landHa, shape, obstacles, crop },
    );
  }, [mode, landHa, widthM, heightM, shape, obstacles, crop, obsList]);

  const canProceed = mode === "dims" ? widthM > 0 && heightM > 0 : landHa > 0;

  const onKml = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseKml(await file.text());
    if (!parsed || parsed.areaHa <= 0) {
      toast.error(tr("kmlErr"));
      return;
    }
    setMode("surface");
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
                {/* STEP 1 — land size / dimensions + KML */}
                {step === 1 && (
                  <div>
                    <StepHead title={tr("s1")} sub={tr("s1sub")} />

                    {/* mode toggle */}
                    <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-full mb-6">
                      {(["surface", "dims"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                            mode === m ? "bg-lime text-white" : "text-white/55 hover:text-white"
                          }`}
                        >
                          {tr(m === "surface" ? "modeSurface" : "modeDims")}
                        </button>
                      ))}
                    </div>

                    {mode === "surface" ? (
                      <>
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
                      </>
                    ) : (
                      <div>
                        <p className="text-xs text-white/40 mb-4 flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-lime/70" />
                          {tr("dimsHint")}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {(
                            [
                              ["width", widthM, setWidthM],
                              ["height", heightM, setHeightM],
                            ] as const
                          ).map(([key, val, setter]) => (
                            <label key={key} className="block">
                              <span className="text-xs text-white/50 uppercase tracking-[0.1em]">
                                {tr(key)} ({tr("meters")})
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => setter(Math.max(0, Number(e.target.value) || 0))}
                                className="mt-1.5 w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3.5 text-2xl font-industrial focus:outline-none focus:border-lime"
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 text-sm text-white/50">
                          ≈ <span className="text-white font-semibold">{fmt((widthM * heightM) / 10_000)}</span>{" "}
                          {tr("hectares")}
                        </div>
                      </div>
                    )}

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

                {/* STEP 2 — shape (derived & read-only in dimensions mode) */}
                {step === 2 && (
                  <div>
                    <StepHead title={tr("s2")} sub={tr("s2sub")} />
                    {mode === "dims" ? (
                      <div className="rounded-2xl border border-lime/40 bg-lime/10 p-6">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-lime/80 mb-2 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> {tr("derivedShape")}
                        </div>
                        <div className="text-xl font-display font-medium">
                          {tr(shapeKey(result.shape))}
                        </div>
                        <div className="text-xs text-white/45 font-mono mt-1">
                          {fmt(result.widthM)} × {fmt(result.heightM)} m
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                )}

                {/* STEP 3 — obstacles: qualitative level OR exact placement */}
                {step === 3 && (
                  <div>
                    <StepHead title={tr("s3")} sub={tr("s3sub")} />
                    {obsList.length === 0 && (
                      <div className="space-y-3 mb-6">
                        {OBSTACLES.map((o) => (
                          <SelectRow
                            key={o.id}
                            active={obstacles === o.id}
                            onClick={() => setObstacles(o.id)}
                            label={tr(o.key)}
                          />
                        ))}
                      </div>
                    )}
                    <div className="rounded-2xl border border-lime/25 bg-lime/[0.05] p-4">
                      <p className="text-xs text-white/55 leading-relaxed mb-3">
                        {tr("obsPlaceHint")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {(Object.keys(OBSTACLE_SPECS) as ObstacleType[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setObsType(t)}
                            className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                              obsType === t
                                ? "bg-lime text-white border-transparent"
                                : "bg-white/5 border-white/15 text-white/70 hover:text-white"
                            }`}
                          >
                            {OB_LABELS[t][lang]}
                          </button>
                        ))}
                        {obsType === "road" && (
                          <span className="inline-flex rounded-full border border-white/15 overflow-hidden">
                            {(["v", "h"] as const).map((o) => (
                              <button
                                key={o}
                                onClick={() => setRoadOrient(o)}
                                className={`px-3 py-2 text-xs ${
                                  roadOrient === o
                                    ? "bg-lime text-white"
                                    : "text-white/60 hover:text-white"
                                }`}
                              >
                                {o === "v" ? "↕" : "↔"}
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                      {obsList.length > 0 && (
                        <button
                          onClick={() => setObsList([])}
                          className="mt-3 text-xs text-white/40 hover:text-red-300 transition-colors"
                        >
                          {tr("obsClear")} ({obsList.length})
                        </button>
                      )}
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
                  disabled={!canProceed}
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
                <EstimatorField
                  result={result}
                  obstacles={obsList}
                  placements={"placements" in result ? result.placements : undefined}
                  editable={step === 3}
                  onPlace={(x, y) =>
                    setObsList((l) => [
                      ...l,
                      {
                        id: crypto.randomUUID(),
                        type: obsType,
                        x,
                        y,
                        orient: obsType === "road" ? roadOrient : undefined,
                      },
                    ])
                  }
                  onRemove={(id) => setObsList((l) => l.filter((o) => o.id !== id))}
                />
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
    const msg =
      result.note === "too-narrow"
        ? tr("tooNarrow").replace(
            "{w}",
            String(Math.round(Math.min(result.widthM, result.heightM))),
          )
        : tr("tooSmall");
    return (
      <div>
        <StepHead title={tr("resultTitle")} sub="" />
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-white/80">
          <TriangleAlert className="w-6 h-6 text-amber-400 mb-3" />
          {msg}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-lime hover:bg-lime-deep text-white font-bold uppercase tracking-[0.1em] text-xs transition-colors"
          >
            {tr("ctaStudy")} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {tr("restart")}
          </button>
        </div>
      </div>
    );
  }

  const bigKpis = [
    { icon: Sprout, label: tr("kIrrigated"), value: `${fmt(result.irrigatedHa)} ${tr("units")}` },
    { icon: Gauge, label: tr("kEfficiency"), value: `${Math.round(result.efficiencyPct)} %` },
    { icon: Droplets, label: tr("kWater"), value: `${fmt(result.dailyWaterM3)} ${tr("waterUnit")}` },
    { icon: Gauge, label: tr("kFlow"), value: `${fmt(result.flowLps)} ${tr("flowUnit")}` },
  ];

  const details = [
    { icon: Sprout, label: tr("summaryUsable"), value: `${fmt(result.usableBlockHa)} ${tr("units")}` },
    { icon: Layers, label: tr("kWaste"), value: `${fmt(result.wasteHa)} ${tr("units")}` },
    { icon: Droplets, label: tr("waterDepth"), value: `${result.grossDepthMm.toFixed(1)} ${tr("depthUnit")}` },
    { icon: Droplets, label: tr("seasonalWater"), value: `${fmt(result.dailyWaterM3 * 120)} ${tr("waterUnit").split("/")[0]}` },
    { icon: Maximize2, label: tr("summaryDims"), value: `${fmt(result.widthM)}×${fmt(result.heightM)} m` },
    { icon: Ruler, label: tr("maxFitLabel"), value: `${result.effectiveMaxSize} ${tr("units")}` },
  ];

  return (
    <div>
      <StepHead title={tr("resultTitle")} sub={tr("resultLead")} />

      {result.note === "tight" && (
        <p className="text-xs text-amber-300/80 -mt-3 mb-5">{tr("tight")}</p>
      )}
      {"placements" in result && result.feasible && (
        <p className="text-xs text-lime/80 -mt-3 mb-5">{tr("geoNote")}</p>
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
              <div className="font-display text-lg flex items-center gap-2 flex-wrap">
                {p.count}× {tr("coverage")} {p.size} ha
                {p.size === 30 && (
                  <span className="text-[9px] uppercase tracking-[0.1em] bg-lime/20 text-lime border border-lime/30 rounded-full px-2 py-0.5">
                    {tr("recommended")}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/45 font-mono">
                {pivotSku(p.size)} · {tr("radius")} {Math.round(radiusM(p.size))} m · {tr("diameter")}{" "}
                {Math.round(diameterM(p.size))} m · {tr("footprint")} {cellHa(p.size).toFixed(1)} ha
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

      {/* Headline KPIs with count-up */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden mb-6">
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

      {/* Technical detail grid */}
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">{tr("detailTitle")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden mb-8">
        {details.map((d, i) => (
          <div key={i} className="bg-ink px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-white/40 mb-1">
              <d.icon className="w-3 h-3 text-lime/60" /> {d.label}
            </div>
            <div dir="ltr" className="font-medium text-sm">{d.value}</div>
          </div>
        ))}
      </div>

      {/* Why this configuration */}
      <div className="rounded-2xl border border-lime/20 bg-lime/[0.06] p-5 mb-8">
        <div className="flex items-center gap-2 text-lime text-sm font-semibold mb-3">
          <Info className="w-4 h-4" /> {tr("whyTitle")}
        </div>
        <ul className="space-y-2 text-sm text-white/70">
          <li className="flex items-start gap-2">
            <span className="text-lime mt-1">•</span> {tr("why30")}
          </li>
          {result.machinesSaved > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-lime mt-1">•</span>
              {tr("whySaved").replace("{n}", String(result.machinesSaved))}
            </li>
          )}
        </ul>
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
