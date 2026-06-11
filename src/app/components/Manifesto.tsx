import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { useI18n } from '../i18n/I18nProvider';

/**
 * Scroll-driven manifesto: the company's statement reveals word by word as the
 * visitor scrolls, with field imagery breathing in between. This is the
 * editorial heart of the page — it replaces the old static gallery grid.
 */

const TEXT: Record<'fr' | 'ar' | 'en', string> = {
  fr: "Depuis 2007, nous dessinons des cercles verts dans le désert algérien. Des fermes entières — irriguées, fertilisées, accompagnées — par une seule équipe d'ingénieurs, du premier forage à la première récolte.",
  ar: 'منذ 2007 ونحن نرسم دوائر خضراء في الصحراء الجزائرية. مزارع كاملة — مروية، مسمَّدة، مرافَقة — بفريق مهندسين واحد، من أول بئر إلى أول حصاد.',
  en: 'Since 2007 we have been drawing green circles across the Algerian desert. Entire farms — irrigated, fertilized, supported — by a single team of engineers, from first borehole to first harvest.',
};

const INLINE_IMAGES = [
  'https://i.ibb.co/gMMqVq7Z/IMG-5967.jpg',
  'https://i.ibb.co/9HTdBChj/montage-pivot-haute-resolution.jpg',
];

const Word = ({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) => {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block me-[0.28em]">
      {children}
    </motion.span>
  );
};

export const Manifesto = () => {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.82', 'end 0.42'],
  });

  const words = TEXT[lang].split(' ');
  const imgY1 = useTransform(scrollYProgress, [0, 1], ['12%', '-12%']);
  const imgY2 = useTransform(scrollYProgress, [0, 1], ['18%', '-18%']);

  return (
    <section className="relative bg-paper py-36 md:py-48 overflow-hidden grain">
      {/* drifting field photos behind the text */}
      <motion.div
        style={{ y: imgY1 }}
        className="absolute top-16 ltr:left-[4%] rtl:right-[4%] w-44 md:w-64 aspect-[3/4] rounded-2xl overflow-hidden rotate-[-5deg] shadow-2xl hidden sm:block"
        aria-hidden
      >
        <img src={INLINE_IMAGES[0]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </motion.div>
      <motion.div
        style={{ y: imgY2 }}
        className="absolute bottom-10 ltr:right-[5%] rtl:left-[5%] w-48 md:w-72 aspect-[4/3] rounded-2xl overflow-hidden rotate-[4deg] shadow-2xl hidden sm:block"
        aria-hidden
      >
        <img src={INLINE_IMAGES[1]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </motion.div>

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6 md:px-12">
        <p className="font-display font-light text-forest leading-[1.32] text-[clamp(1.7rem,3.6vw,3.2rem)]">
          {words.map((w, i) => (
            <Word
              key={i}
              progress={scrollYProgress}
              range={[i / words.length, Math.min(1, (i + 1.5) / words.length)]}
            >
              {w}
            </Word>
          ))}
        </p>
      </div>
    </section>
  );
};
