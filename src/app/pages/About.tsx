import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ManagerWord } from '../components/ManagerWord';
import { Partners } from '../components/Partners';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { CountUp } from '../components/fx/CountUp';
import { PivotField } from '../components/fx/PivotField';

const stats = [
  { value: `${new Date().getFullYear() - 2007}+`, label: { fr: "Années d'expérience", ar: 'سنوات خبرة', en: 'Years of experience' } },
  { value: '100%', label: { fr: 'Pivots toujours en service', ar: 'محاور تعمل بدون توقف', en: 'Pivots still running' } },
  { value: '4', label: { fr: 'Agences à travers le sud', ar: 'وكالات في الجنوب', en: 'Agencies across the south' } },
  { value: '6', label: { fr: 'Marques mondiales partenaires', ar: 'علامات عالمية شريكة', en: 'Partner global brands' } },
];

export const About = () => {
  const { t, lang } = useI18n();

  return (
    <div className="bg-paper" style={{ position: 'relative' }}>
      {/* Hero */}
      <section className="relative h-[80vh] flex items-end overflow-hidden bg-forest">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/60 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1651949746848-dff550e5f6b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcm9uZSUyMGFncmljdWx0dXJlJTIwZmllbGR8ZW58MXx8fHwxNzc3MzM1MDAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div
          aria-hidden
          className="absolute z-10 top-16 ltr:-right-32 rtl:-left-32 w-[28rem] h-[28rem] text-lime/20 pointer-events-none hidden md:block"
        >
          <PivotField className="w-full h-full" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <span className="h-px w-10 bg-lime" aria-hidden />
            <span className="text-lime uppercase tracking-[0.3em] text-sm font-semibold">
              {t('about.eyebrow')}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-light text-white leading-[1.02] max-w-4xl"
          >
            {t('about.title.1')}{' '}
            <span className="italic text-lime">{t('about.title.italic')}</span>{' '}
            {t('about.title.2')}
          </motion.h1>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24 relative grain">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center relative z-10">
          <p className="text-2xl md:text-3xl font-display font-light text-forest leading-snug">
            {t('about.intro')}
          </p>
        </div>
      </section>

      {/* Stats — live counters */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-3xl p-8 border border-pine/10 shadow-[0_15px_40px_rgba(15,38,24,0.04)] relative overflow-hidden group hover:border-lime/40 transition-colors duration-500"
              >
                <span className="absolute top-4 ltr:right-5 rtl:left-5 font-mono text-[10px] text-gray-300 tracking-widest">
                  0{i + 1}
                </span>
                <div dir="ltr" className="text-5xl font-display italic text-pine mb-2">
                  <CountUp value={s.value} />
                </div>
                <div className="text-gray-500 text-sm leading-relaxed">{s.label[lang]}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Media collage */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-7 h-[420px] rounded-3xl overflow-hidden"
          >
            <img
              src="https://images.unsplash.com/photo-1611040549344-f71005756038?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpcnJpZ2F0aW9uJTIwZmFybWluZyUyMGNyb3B8ZW58MXx8fHwxNzc3MzM1MDAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt=""
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="md:col-span-5 h-[420px] rounded-3xl overflow-hidden"
          >
            <img
              src="https://images.unsplash.com/photo-1758524051910-60a8d324e110?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjB3b3JraW5nJTIwdGVjaHxlbnwxfHx8fDE3NzczMzUwMDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt=""
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
        </div>
      </section>

      <ManagerWord />

      <Partners />

      <section className="py-24 bg-paper">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center">
          <Link
            to="/services"
            className="inline-flex items-center gap-3 bg-pine hover:bg-forest text-white px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors"
          >
            {t('nav.activities')}
            <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>
    </div>
  );
};
