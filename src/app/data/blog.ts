export type BlogArticle = {
  slug: string;
  image: string;
  date: string;
  category: string;
  excerpt: { fr: string; ar: string; en: string };
  title: { fr: string; ar: string; en: string };
  views: number;
  likes: number;
  body: { fr: string; ar: string; en: string };
  gallery?: string[];
  videos?: string[]; // YouTube / Vimeo / direct .mp4 URLs
};

export const blogArticles: BlogArticle[] = [];

const _seed: BlogArticle[] = [
  {
    slug: 'optimiser-irrigation-cereales-sud-algerien',
    image:
      'https://images.unsplash.com/photo-1657626625832-2c0851cdaa9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGVhdCUyMGZpZWxkJTIwc3Vuc2V0fGVufDF8fHx8MTc3NzMzNTAwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025-10-12',
    category: 'Irrigation',
    title: {
      fr: "Comment optimiser l'irrigation des céréales dans le Sud Algérien ?",
      ar: 'كيف نحسّن ري الحبوب في الجنوب الجزائري؟',
      en: 'How to optimize cereal irrigation in southern Algeria?',
    },
    excerpt: {
      fr:
        "Réduire la consommation d'eau sans sacrifier le rendement : retours d'expérience sur 20+ pivots installés.",
      ar: 'تخفيض استهلاك الماء دون التضحية بالمردود: تجارب من 20+ محوراً مركّباً.',
      en: 'Cutting water use without sacrificing yields: lessons from 20+ installed pivots.',
    },
    body: {
      fr:
        "Le Sud algérien impose des contraintes thermiques et hydriques uniques. Sur les exploitations que nous accompagnons depuis 2018, l'optimisation passe par trois leviers : la programmation horaire, la pression en bout d'aile, et l'entretien préventif des asperseurs.\n\nDans cet article nous détaillons un cas concret d'une exploitation de 120 ha à Adrar, où la consommation d'eau a baissé de 22 % la première saison après l'installation d'un pivot Western piloté à distance.",
      ar:
        'يفرض الجنوب الجزائري قيوداً حرارية ومائية فريدة. على المستثمرات التي نرافقها منذ 2018، يمر التحسين عبر ثلاث روافع: البرمجة الزمنية، الضغط في طرف الجناح، والصيانة الوقائية للرشاشات.',
      en:
        "Southern Algeria has unique heat and water constraints. On the farms we follow since 2018, optimization runs on three levers: scheduling, end-tower pressure, and preventive sprinkler maintenance.",
    },
    views: 1240,
    likes: 342,
  },
  {
    slug: 'teledetection-drones-agriculture-precision',
    image:
      'https://images.unsplash.com/photo-1758524051910-60a8d324e110?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjB3b3JraW5nJTIwdGVjaHxlbnwxfHx8fDE3NzczMzUwMDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025-10-05',
    category: 'Innovation',
    title: {
      fr: "Télédétection et Drones : l'agriculture de précision démystifiée",
      ar: 'الاستشعار عن بُعد والطائرات بدون طيار: الزراعة الدقيقة بشكل مبسّط',
      en: 'Drones & remote sensing: precision farming, demystified',
    },
    excerpt: {
      fr:
        "Cartographie multispectrale, détection précoce des stress hydriques : les drones changent vraiment la donne.",
      ar: 'الخرائط متعددة الأطياف وكشف الإجهاد المائي مبكراً: الطائرات بدون طيار تغيّر القواعد.',
      en: 'Multispectral mapping and early water-stress detection: drones really do change the game.',
    },
    body: {
      fr:
        "Les drones agricoles ne sont plus un gadget. Couplés à un pivot piloté à distance, ils permettent d'identifier les zones de stress avant qu'elles ne soient visibles à l'œil nu, et de moduler l'arrosage en conséquence.",
      ar:
        'لم تعد الطائرات بدون طيار في الفلاحة مجرد رفاهية. عند ربطها بمحور تحكّم عن بُعد، تمكّن من رصد مناطق الإجهاد قبل ظهورها بالعين المجردة.',
      en:
        'Agricultural drones are no longer a gimmick. Paired with remote pivots, they spot stress zones before they become visible and let you fine-tune irrigation in response.',
    },
    views: 856,
    likes: 189,
  },
  {
    slug: 'qualite-eau-durabilite-pivots',
    image:
      'https://images.unsplash.com/photo-1606214554388-c56ecfdeefb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMGRyb3AlMjBzcGxhc2glMjBjbGVhbnxlbnwxfHx8fDE3NzczMzUwMDN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025-09-28',
    category: 'Maintenance',
    title: {
      fr: "La qualité de l'eau et son impact sur la durabilité de vos pivots",
      ar: 'جودة الماء وأثرها على متانة محاوركم',
      en: 'Water quality and its impact on pivot durability',
    },
    excerpt: {
      fr: 'pH, salinité, fer dissous : tout ce qui ronge vos asperseurs et comment l\'anticiper.',
      ar: 'الحموضة، الملوحة والحديد المذاب: كل ما يُتلف الرشاشات وكيف تتفاداه.',
      en: 'pH, salinity, dissolved iron: what eats away at sprinklers and how to anticipate it.',
    },
    body: {
      fr:
        "Une eau chargée en fer ou en calcaire raccourcit drastiquement la durée de vie des asperseurs. Nos ingénieurs réalisent une analyse d'eau systématique avant chaque devis pour vous orienter vers la bonne combinaison filtration / matériaux.",
      ar:
        'إن الماء المحمَّل بالحديد أو الكلس يقلل بشكل ملحوظ من عمر الرشاشات. يقوم مهندسونا بتحليل منهجي للمياه قبل أي عرض سعر.',
      en:
        'Iron- or limescale-rich water dramatically shortens sprinkler life. Our engineers run a systematic water analysis before every quote to dial in filtration and materials.',
    },
    views: 2100,
    likes: 450,
  },
  {
    slug: 'innovations-2026-pompes-submersibles',
    image:
      'https://images.unsplash.com/photo-1747304349673-ed528cfe3223?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMGdyZWVuJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3NzMzNTAwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025-09-15',
    category: 'Innovation',
    title: {
      fr: 'Innovations 2026 : nouvelles pompes submersibles à haut rendement',
      ar: 'ابتكارات 2026: مضخات غاطسة جديدة عالية المردودية',
      en: 'Innovations 2026: new high-efficiency submersible pumps',
    },
    excerpt: {
      fr: 'Les nouvelles têtes Alkhorayef baissent encore la consommation à débit équivalent.',
      ar: 'رؤوس الخريف الجديدة تخفّض الاستهلاك أكثر عند نفس التدفق.',
      en: "Alkhorayef's latest pump heads cut consumption further at the same flow.",
    },
    body: {
      fr:
        "Les nouvelles têtes Alkhorayef présentées au Watec 2025 montrent une baisse de 8 à 12 % de la consommation à débit équivalent, ce qui se traduit, en pratique, par une amortissement de l'investissement plus rapide pour les exploitations supérieures à 60 ha.",
      ar:
        'تُظهر رؤوس الخريف الجديدة المُقدَّمة في Watec 2025 انخفاضاً يتراوح بين 8 و12% في الاستهلاك عند نفس التدفق.',
      en:
        "Alkhorayef's new pump heads, shown at Watec 2025, deliver an 8–12% drop in consumption at the same flow rate.",
    },
    views: 940,
    likes: 210,
  },
  {
    slug: 'analyse-sols-installation',
    image:
      'https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFudCUyMHNvaWwlMjBncm93aW5nfGVufDF8fHx8MTc3NzMzNTAwMXww&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025-09-02',
    category: 'Conseil',
    title: {
      fr: "Analyse des sols : l'étape cruciale avant toute installation",
      ar: 'تحليل التربة: الخطوة الحاسمة قبل أي تركيب',
      en: 'Soil analysis: the crucial step before any installation',
    },
    excerpt: {
      fr: 'Aucun pivot n\'est sérieux sans une analyse pédologique préalable. Voici ce que nous regardons.',
      ar: 'لا يمكن لأي محور أن يكون جدّياً دون تحليل تربة مُسبق.',
      en: 'No pivot is serious without a prior soil study. Here is what we look at.',
    },
    body: {
      fr:
        "Avant chaque installation, nos ingénieurs réalisent un sondage tarière à plusieurs profondeurs. Ils vérifient la texture, la capacité de rétention, la présence de couches imperméables, et l'orographie générale de la parcelle.",
      ar:
        'قبل أي تركيب، يقوم مهندسونا بسبر التربة على أعماق متعددة. يدرسون البنية والاحتفاظ بالماء والطبقات الكتيمة وطبوغرافيا القطعة.',
      en:
        "Before each installation, our engineers run an auger survey at multiple depths to check texture, retention, impermeable layers, and field orography.",
    },
    views: 1500,
    likes: 280,
  },
];
void _seed; // kept for reference, not used in production

export const findArticle = (slug: string) =>
  blogArticles.find((a) => a.slug === slug) ?? null;
