/**
 * Western CP-600 — interactive parts database.
 * Source: "WESTERN CP-600 Parts Manual" (WPM-EN-March 2019).
 *
 * ÉDITABLE LIBREMENT :
 *  - `catalogQuery`  → terme de recherche pré-rempli quand le visiteur clique
 *    "Voir dans le catalogue" (/catalog?q=...). Mettez ici le nom exact du
 *    produit équivalent dans votre catalogue Logicom quand il existe.
 *    Laissez vide ("") pour pointer vers le catalogue sans filtre.
 *  - `image`         → URL d'une photo/vidéo-poster du composant (optionnel).
 *  - `refs`          → références fabricant affichées dans la fiche (manuel).
 */

export type Lang = "fr" | "ar" | "en";
export type LString = Record<Lang, string>;

export interface PivotPart {
  id: string;
  name: LString;
  blurb: LString;
  /** Western part numbers straight from the CP-600 manual. */
  refs: { no: string; label: string }[];
  /** Page(s) in the CP-600 parts manual. */
  pages: string;
  /** Search term for /catalog?q=… — fill with your Logicom product name. */
  catalogQuery?: string;
  /** Optional media (photo URL) shown at the top of the card. */
  image?: string;
}

export const PIVOT_PARTS: PivotPart[] = [
  {
    id: "pivot-point",
    name: {
      fr: "Structure du point pivot",
      ar: "هيكل نقطة الارتكاز",
      en: "Pivot point structure",
    },
    blurb: {
      fr: "Pyramide en acier galvanisé ancrée au massif béton : 4 jambes, contreventements n°1 à n°7 et boulons d'ancrage. C'est le cœur fixe autour duquel toute la machine tourne.",
      ar: "هرم من الفولاذ المغلفن مثبت على قاعدة خرسانية: 4 أرجل ودعامات زاوية من 1 إلى 7 ومسامير تثبيت. هذا هو القلب الثابت الذي تدور حوله الآلة بأكملها.",
      en: "Hot-dip galvanized steel pyramid anchored to the concrete pad: 4 legs, angle braces #1–#7 and anchor bolts. The fixed heart the whole machine rotates around.",
    },
    refs: [
      { no: "10029-11", label: "Pivot leg (×4)" },
      { no: "10071-11", label: "Leg mount / pivot foot" },
      { no: "10030-11 … 10036-11", label: "Angle braces #1–#7" },
      { no: "10037-11", label: "Torsional angle" },
      { no: "95.20099", label: 'Anchor bolt 7/8" w/ nut' },
    ],
    pages: "34–36",
    catalogQuery: "",
  },
  {
    id: "collector-ring",
    name: {
      fr: "Bague collectrice",
      ar: "الحلقة الجامعة (كولكتور)",
      en: "Collector ring",
    },
    blurb: {
      fr: "Bague collectrice 11 anneaux au sommet du pivot : elle transmet l'alimentation et les signaux électriques à la machine en rotation continue, sans torsion de câble.",
      ar: "حلقة جامعة بـ11 مسارًا في أعلى المحور: تنقل الكهرباء والإشارات إلى الآلة أثناء دورانها المستمر دون التواء الكابلات.",
      en: "11-ring collector at the pivot top: feeds power and control signals to the continuously rotating machine without twisting cables.",
    },
    refs: [
      { no: "9684834", label: "Collector ring 11-ring" },
      { no: "07055-11", label: "Collector stop flange" },
      { no: "10046-41", label: 'SS conduit 1" (J-tube)' },
    ],
    pages: "34, 52",
    catalogQuery: "",
  },
  {
    id: "riser-elbows",
    name: {
      fr: "Colonne montante & coudes",
      ar: "أنبوب الصعود والأكواع",
      en: "Riser pipe & elbows",
    },
    blurb: {
      fr: "L'eau entre par le coude d'admission 8\"5/8, monte dans la colonne (acier galvanisé ou inox) et repart par le coude supérieur vers la travée — avec palier, joint triple lèvre et tirants.",
      ar: 'يدخل الماء عبر كوع الدخول 8"5/8، يصعد في الأنبوب القائم (مغلفن أو ستانلس) ثم يتجه عبر الكوع العلوي نحو الامتداد — مع محمل وحشية ثلاثية الشفاه وقضبان شد.',
      en: 'Water enters through the 8-5/8" inlet elbow, climbs the stand riser (galvanized or stainless) and exits via the upper elbow into the span — with bearing, triple-lip gasket and tie rods.',
    },
    refs: [
      { no: "10039-11", label: "Stand riser pipe (10850-51 SS)" },
      { no: "10079-11", label: "Inlet elbow 8.63 × 8.63" },
      { no: "10157-11", label: "Upper elbow 6-5/8" },
      { no: "10043-01", label: "Bearing assembly" },
      { no: "9778988", label: 'Triple-lip gasket 8"' },
      { no: "10087-12", label: "Tie rod 89.5 threaded" },
    ],
    pages: "15–17, 20, 34",
    catalogQuery: "",
  },
  {
    id: "control-panel",
    name: {
      fr: "Armoire de commande",
      ar: "لوحة التحكم الرئيسية",
      en: "Main control panel",
    },
    blurb: {
      fr: "Le poste de pilotage : minuterie de pourcentage (vitesse), voltmètre 600 V, commutateurs marche/arrière, sécurité, options auto-reverse / auto-stop / redémarrage automatique.",
      ar: "مركز القيادة: مؤقّت النسبة المئوية (السرعة)، فولتميتر 600 فولت، مفاتيح أمامي/خلفي، أمان، وخيارات الرجوع التلقائي والإيقاف وإعادة التشغيل التلقائي.",
      en: "The cockpit: percentage timer (speed), 600 V voltmeter, FWD/REV switches, safety circuit, auto-reverse / auto-stop / auto-restart options.",
    },
    refs: [
      { no: "95.40090", label: "Percentage timer 60 s" },
      { no: "95.40089", label: "Voltmeter GE 600 V" },
      { no: "12007-01", label: "3-pos twist switch" },
      { no: "13000-01", label: "Contactor 3P 32A" },
      { no: "95.40091", label: "Control transformer" },
      { no: "12003-01", label: "Time delay safety" },
    ],
    pages: "50–62",
    catalogQuery: "",
  },
  {
    id: "span-pipe",
    name: {
      fr: "Tuyauterie de travée",
      ar: "أنابيب الامتداد",
      en: "Span pipe",
    },
    blurb: {
      fr: 'Tubes 6"5/8 × 39 pieds, sorties tous les 117" (≈ 3 m), galvanisés à chaud — ou chemisés polyéthylène pour les eaux agressives. Diamètres 5", 6"5/8 et 8"5/8 selon le débit.',
      ar: 'أنابيب 6"5/8 بطول 39 قدمًا، مخارج كل 117 بوصة (≈ 3 م)، مغلفنة على الساخن — أو مبطنة بالبولي إيثيلين للمياه القاسية. أقطار 5" و6"5/8 و8"5/8 حسب التدفق.',
      en: '6-5/8" × 39 ft pipes, outlets every 117" (≈ 3 m), hot-dip galvanized — or poly-lined for aggressive water. 5", 6-5/8" and 8-5/8" diameters per flow rate.',
    },
    refs: [
      { no: "10000-11", label: "CP pipe 6.63 × 39 R117 G" },
      { no: "10300-11", label: "CP pipe 8.63 × 39 R117 G" },
      { no: "10400-51", label: "Poly pipe 6.63 × 39 lined" },
      { no: "10082-11", label: "REC mid tower 6.63 × 293.5" },
      { no: "10041-11", label: "REC end tower 6.63" },
    ],
    pages: "12–13, 22–23",
    catalogQuery: "",
  },
  {
    id: "truss",
    name: {
      fr: "Tirants & treillis",
      ar: "قضبان الشد والتدعيم",
      en: "Truss rods & angles",
    },
    blurb: {
      fr: 'Tirants forgés Ø 3/4" et 13/16" (codes couleur orange / bleu / blanc / vert) tendus sous le tube, cornières de treillis et entretoises : la rigidité d\'un pont, le poids en moins.',
      ar: 'قضبان مشدودة مطروقة بقطر 3/4" و13/16" (رموز لونية: برتقالي/أزرق/أبيض/أخضر) تحت الأنبوب مع زوايا تدعيم وروابط عرضية: صلابة جسر بوزن أقل.',
      en: 'Forged 3/4" and 13/16" truss rods (orange / blue / white / green color codes) tensioned under the pipe, truss-leg angles and cross ties: bridge-grade stiffness, less weight.',
    },
    refs: [
      { no: "10109-11", label: "Truss rod .75 × 232 orange" },
      { no: "10110-11", label: "Truss rod .75 × 266.875 blue" },
      { no: "10085-11 / 10086-11", label: "Rod brackets top / bottom" },
      { no: "10053-11", label: "Truss leg #2 (1961 mm)" },
      { no: "10054-11", label: "Cross tie #2 (2672 mm)" },
    ],
    pages: "26, 32–33",
    catalogQuery: "",
  },
  {
    id: "tower",
    name: {
      fr: "Tour motrice",
      ar: "البرج المتحرك",
      en: "Drive tower",
    },
    blurb: {
      fr: 'Jambes 157" (3,99 m) en cornière galvanisée, base rigide, entretoises et diagonales : chaque tour porte la conduite à près de 4 m du sol et roule en cercle parfait.',
      ar: "أرجل بطول 157 بوصة (3.99 م) من زوايا مغلفنة، قاعدة صلبة وروابط قطرية: كل برج يحمل الأنبوب على ارتفاع 4 أمتار تقريبًا ويسير في دائرة مثالية.",
      en: '157" (3.99 m) galvanized angle legs, rigid base frame, cross ties and diagonals: each tower carries the pipeline almost 4 m high and rolls a perfect circle.',
    },
    refs: [
      { no: "10064-11", label: 'Tower leg 157" (3988 mm)' },
      { no: "10754-11", label: "TR frame assy Western GB" },
      { no: "10066-11", label: "Tower cross tie #2" },
      { no: "10069-11", label: 'Brace diagonal 68.63"' },
    ],
    pages: "14, 27–30",
    catalogQuery: "",
  },
  {
    id: "gearmotor",
    name: {
      fr: "Motoréducteur central",
      ar: "المحرك المخفض المركزي",
      en: "Center drive gearmotor",
    },
    blurb: {
      fr: "Le muscle de chaque tour : motoréducteur 30 à 56 tr/min (0,6 à 1,5 ch) sous capot fibre de verre. Il entraîne les deux réducteurs de roue via les arbres de transmission.",
      ar: "عضلة كل برج: محرك مخفض بسرعة 30 إلى 56 دورة/دقيقة (0.6 إلى 1.5 حصان) تحت غطاء من الألياف الزجاجية، يدير علبتي تروس العجلات عبر أعمدة النقل.",
      en: "Each tower's muscle: 30–56 RPM gearmotor (0.6–1.5 HP) under a fiberglass cover, driving both wheel gearboxes through the drive shafts.",
    },
    refs: [
      { no: "96V7955", label: "Gearmotor 30 RPM, 1 HP" },
      { no: "96V8446", label: "Gearmotor 34 RPM, 0.6 HP helical" },
      { no: "996V7943", label: "Gearmotor 1.5 HP, 56 RPM" },
      { no: "98.200600FG", label: "Cover, fiberglass" },
      { no: "0639640", label: "Stator cover UMC power saver" },
    ],
    pages: "42, 159",
    catalogQuery: "",
  },
  {
    id: "gearbox",
    name: {
      fr: "Réducteur de roue UMC",
      ar: "علبة تروس العجلة UMC",
      en: "UMC wheel gearbox",
    },
    blurb: {
      fr: "Réducteur à vis sans fin UMC 740/760-U, rapport 50:1 ou 52:1, couple énorme à la roue. Version double entrée disponible. La pièce d'usure stratégique du pivot.",
      ar: "علبة تروس دودية UMC ‏740/760-U بنسبة 50:1 أو 52:1 وعزم هائل عند العجلة. تتوفر نسخة بمدخل مزدوج. القطعة الاستراتيجية الأكثر طلبًا في المحور.",
      en: "UMC 740/760-U worm-drive gearbox, 50:1 or 52:1 ratio, massive torque at the wheel. Double-input version available. The strategic wear part of any pivot.",
    },
    refs: [
      { no: "02233-09", label: "GB UMC 740 50:1 NT UNI" },
      { no: "8296679", label: "Double input gearbox 52:1" },
      { no: "8296680", label: "760-U heavy duty 52:1" },
      { no: "8296681", label: "760-U heavy duty 50:1" },
    ],
    pages: "42–45",
    catalogQuery: "",
  },
  {
    id: "driveshaft",
    name: {
      fr: "Arbres & accouplements",
      ar: "أعمدة النقل والوصلات",
      en: "Drive shafts & couplers",
    },
    blurb: {
      fr: "Entre motoréducteur et réducteurs de roue : arbres de transmission avec accouplements flexibles UMC ou multi-arbres C-X — tolèrent les défauts d'alignement sur terrain réel.",
      ar: "بين المحرك المخفض وعلب تروس العجلات: أعمدة نقل بوصلات مرنة UMC أو C-X متعددة الأعمدة — تتحمل اختلال المحاذاة في الميدان الحقيقي.",
      en: "Between gearmotor and wheel gearboxes: drive shafts with UMC flex couplers or the universal multi-shaft C-X coupler — forgiving of real-field misalignment.",
    },
    refs: [
      { no: "02173-01", label: "CPL flex UMC 1 × .75" },
      { no: "PZ98924", label: "AIC flex U-joint" },
      { no: "400964", label: "Universal multi-shaft C-X coupler" },
    ],
    pages: "47",
    catalogQuery: "",
  },
  {
    id: "wheel",
    name: {
      fr: "Roue & pneu",
      ar: "العجلة والإطار",
      en: "Rim & tire",
    },
    blurb: {
      fr: "Pneus agraires 14.9/13-24 8 plis (BKT TR118 ou Petlas) sur jantes 12×24 galvanisées : flottaison maximale, ornières minimales, même en sol sableux saharien.",
      ar: "إطارات زراعية 14.9/13-24 بـ8 طبقات (BKT TR118 أو Petlas) على جنوط 12×24 مغلفنة: تعويم أقصى وأخاديد أقل حتى في الرمال الصحراوية.",
      en: "14.9/13-24 8-ply ag tires (BKT TR118 or Petlas) on 12×24 galvanized rims: maximum flotation, minimum rutting — even in Saharan sand.",
    },
    refs: [
      { no: "400944", label: "Tire 14.9/13-24 8-ply BKT TR118" },
      { no: "8298895PT", label: "Petlas tire assy 14.9 × 24 w/ tube" },
      { no: "8297651-11", label: "Rim 12 × 24 galvanized" },
      { no: "02234-07", label: "Wheel nut UMC" },
    ],
    pages: "46",
    catalogQuery: "",
  },
  {
    id: "tower-box",
    name: {
      fr: "Boîtier électrique de tour",
      ar: "علبة كهرباء البرج",
      en: "Tower junction box",
    },
    blurb: {
      fr: "Sur chaque tour : boîtier à microswitch et temporisation qui maintient l'alignement de la machine. Tour d'extrémité : auto-reverse, arrêt automatique et commande du canon.",
      ar: "على كل برج: علبة بمفتاح ميكروي ومؤقّت تحافظ على استقامة الآلة. برج النهاية: رجوع تلقائي وإيقاف تلقائي والتحكم في المدفع الطرفي.",
      en: "On every tower: microswitch + timer box that keeps the machine aligned. End tower adds auto-reverse, auto-shutdown and end-gun control.",
    },
    refs: [
      { no: "90015-02", label: "JB int. tower kit w/ timer" },
      { no: "90017-01", label: "JB end tower kit" },
      { no: "07.990309", label: "Microswitch long arm" },
      { no: "03057-41", label: "Span wire 12+16 11C 132 ft" },
    ],
    pages: "50–60, 73–75",
    catalogQuery: "",
  },
  {
    id: "sprinkler",
    name: {
      fr: "Asperseurs & cannes",
      ar: "الرشاشات والأنابيب النازلة",
      en: "Sprinklers & drops",
    },
    blurb: {
      fr: "Tous les 3 m, une canne (galva ou flexible) + régulateur de pression + asperseur : Nelson D3000/S3000/R3000, 3NV, Senninger LDN & I-WOB, ou Komet KPS. Pluie fine, zéro ruissellement.",
      ar: "كل 3 أمتار: أنبوب نازل (مغلفن أو مرن) + منظم ضغط + رشاش: Nelson D3000/S3000/R3000 أو 3NV أو Senninger LDN وI-WOB أو Komet KPS. رذاذ ناعم بلا جريان سطحي.",
      en: "Every 3 m: a drop (galvanized or flex hose) + pressure regulator + sprinkler: Nelson D3000/S3000/R3000, 3NV, Senninger LDN & I-WOB, or Komet KPS. Fine rain, zero runoff.",
    },
    refs: [
      { no: "9569348", label: "Body A3000/D3000" },
      { no: "9569396", label: "S3000 spinner cap assy" },
      { no: "9769002", label: "Pressure regulator 20 PSI" },
      { no: "9399429", label: "Senninger LDN base" },
      { no: "05010205", label: "Komet KPS precision spray" },
      { no: "9727966", label: "Flex drop hose 3/4\" × 250'" },
    ],
    pages: "84–104",
    catalogQuery: "",
  },
  {
    id: "endgun",
    name: {
      fr: "Porte-à-faux & canon d'extrémité",
      ar: "الذراع الطرفية والمدفع الطرفي",
      en: "Overhang & end gun",
    },
    blurb: {
      fr: "Le porte-à-faux 4\" haubané ajoute jusqu'à 25 m de portée ; le canon Nelson SR-75/100/150 avec surpresseur 2 ch arrose les coins. Jusqu'à +4 ha gagnés par cercle.",
      ar: 'الذراع الطرفية 4" المثبتة بالكابلات تضيف حتى 25 م من المدى؛ ومدفع Nelson SR-75/100/150 مع مضخة معززة 2 حصان يروي الزوايا. حتى 4 هكتارات إضافية لكل دائرة.',
      en: 'The cable-stayed 4" overhang adds up to 25 m of reach; the Nelson SR-75/100/150 end gun with 2 HP booster pump waters the corners. Up to +4 ha gained per circle.',
    },
    refs: [
      { no: "10160-11", label: "OH pipe 4.0 × 39 ft" },
      { no: "10179-01", label: "OH back cable assy" },
      { no: "400386", label: "Nelson SR-100 end gun" },
      { no: "90038-01", label: "Booster pump basic 2 HP" },
      { no: "9494510", label: "Part-circle impact P85AS" },
    ],
    pages: "18–19, 64–70, 106–108",
    catalogQuery: "",
  },
];
