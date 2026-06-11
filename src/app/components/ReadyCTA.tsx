import { motion } from 'motion/react';
import { Phone } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { PivotField } from './fx/PivotField';
import { MagneticButton } from './fx/MagneticButton';

export const ReadyCTA = () => {
  const { t } = useI18n();

  return (
    <section className="relative py-36 bg-ink overflow-hidden grain">
      {/* Atmosphere */}
      <div className="absolute -top-40 ltr:-right-40 rtl:-left-40 w-96 h-96 bg-pine rounded-full blur-[100px] opacity-50" aria-hidden />
      <div className="absolute -bottom-40 ltr:-left-40 rtl:-right-40 w-[500px] h-[500px] bg-lime rounded-full blur-[140px] opacity-20" aria-hidden />

      {/* Full pivot mark centred behind the headline */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-lime/15 pointer-events-none"
      >
        <PivotField className="w-[42rem] h-[42rem] md:w-[56rem] md:h-[56rem]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-lime uppercase tracking-[0.3em] text-sm font-semibold mb-6 block"
        >
          {t('cta.ready.eyebrow')}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="font-industrial uppercase text-white leading-[0.95] mb-8 text-[clamp(2.6rem,7.5vw,7rem)]"
        >
          {t('cta.ready.title.1')}{' '}
          <span className="font-display normal-case italic font-light text-lime">{t('cta.ready.italic')}</span>{' '}
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
          <MagneticButton>
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
          </MagneticButton>
          <MagneticButton>
            <a
              href="tel:+213661391012"
              className="inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white text-white hover:text-forest border border-white/20 hover:border-transparent px-8 py-5 rounded-full font-bold uppercase tracking-[0.1em] text-sm transition-colors backdrop-blur-sm"
            >
              <Phone className="w-5 h-5" /> {t('cta.ready.call')}
            </a>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
};
