import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ManagerWord } from '../components/ManagerWord';
import { Partners } from '../components/Partners';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

const stats = [
  { value: `${new Date().getFullYear() - 2007}+`, label: { fr: "Années d'expérience", ar: 'سنوات خبرة', en: 'Years of experience' } },
  { value: '100%', label: { fr: 'Pivots toujours en service', ar: 'محاور تعمل بدون توقف', en: 'Pivots still running' } },
  { value: '4', label: { fr: 'Agences à travers le sud', ar: 'وكالات في الجنوب', en: 'Agencies across the south' } },
  { value: '6', label: { fr: 'Marques mondiales partenaires', ar: 'علامات عالمية شريكة', en: 'Partner global brands' } },
];

export const About = () => {
  const { t, lang } = useI18n();

  return (
    <div className="bg-[#f4f7f5]" style={{ position: 'relative' }}>
      {/* Hero */}
      <section className="relative h-[80vh] flex items-end overflow-hidden bg-[#0f2618]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2618] via-[#0f2618]/60 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1651949746848-dff550e5f6b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcm9uZSUyMGFncmljdWx0dXJlJTIwZmllbGR8ZW58MXx8fHwxNzc3MzM1MDAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-20">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#87A922] uppercase tracking-[0.3em] text-sm font-semibold mb-6 block"
          >
            {t('about.eyebrow')}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-light text-white leading-[1.05] max-w-4xl"
          >
            {t('about.title.1')}{' '}
            <span className="font-serif italic text-white/80">{t('about.title.italic')}</span>{' '}
            {t('about.title.2')}
          </motion.h1>
        </div>
      </section>

      {/* Intro */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center">
          <p className="text-2xl md:text-3xl font-light text-[#0f2618] leading-snug">
            {t('about.intro')}
          </p>
        </div>
      </section>

      {/* Stats */}
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
                className="bg-white rounded-3xl p-8 border border-[#114232]/5 shadow-[0_15px_40px_rgba(0,0,0,0.03)]"
              >
                <div className="text-5xl font-serif italic text-[#114232] mb-2">{s.value}</div>
                <div className="text-gray-500 text-sm leading-relaxed">{s.label[lang]}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Media collage */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 h-[420px] rounded-3xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1611040549344-f71005756038?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpcnJpZ2F0aW9uJTIwZmFybWluZyUyMGNyb3B8ZW58MXx8fHwxNzc3MzM1MDAwfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-5 h-[420px] rounded-3xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1758524051910-60a8d324e110?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjB3b3JraW5nJTIwdGVjaHxlbnwxfHx8fDE3NzczMzUwMDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <ManagerWord />

      <Partners />

      <section className="py-24 bg-[#f4f7f5]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center">
          <Link
            to="/services"
            className="inline-flex items-center gap-3 bg-[#114232] hover:bg-[#0a1c12] text-white px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors"
          >
            {t('nav.activities')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
