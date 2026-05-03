import { motion } from 'motion/react';
import { Phone } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export const ReadyCTA = () => {
  const { t } = useI18n();

  return (
    <section className="relative py-32 bg-[#0f2618] overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#114232] rounded-full blur-[100px] opacity-50" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#87A922] rounded-full blur-[140px] opacity-25" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[#87A922] uppercase tracking-[0.3em] text-sm font-semibold mb-6 block"
        >
          {t('cta.ready.eyebrow')}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-4xl md:text-7xl font-light text-white leading-tight mb-8"
        >
          {t('cta.ready.title.1')}{' '}
          <span className="font-serif italic text-white/85">{t('cta.ready.italic')}</span>{' '}
          {t('cta.ready.title.2')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-white/70 text-lg max-w-2xl mx-auto mb-12"
        >
          {t('cta.ready.subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="https://wa.me/213661391012"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1fad53] text-white px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors shadow-[0_0_60px_rgba(37,211,102,0.25)]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2z" />
            </svg>
            {t('cta.ready.whatsapp')}
          </a>
          <a
            href="tel:+213661391012"
            className="inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white text-white hover:text-[#0f2618] border border-white/20 hover:border-transparent px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors"
          >
            <Phone className="w-5 h-5" /> {t('cta.ready.call')}
          </a>
        </motion.div>
      </div>
    </section>
  );
};
