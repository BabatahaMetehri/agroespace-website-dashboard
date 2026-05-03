import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export const NotFound = () => {
  const { t } = useI18n();

  return (
    <div
      className="min-h-screen bg-[#0a1c12] flex items-center justify-center px-6 pt-24 pb-12"
      style={{ position: 'relative' }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[#87A922] uppercase tracking-[0.25em] text-sm font-semibold mb-6 block">
            {t('error.404.eyebrow')}
          </span>

          <h1 className="font-light text-white leading-none mb-8 select-none">
            <span className="block text-[8rem] md:text-[12rem] font-serif italic text-[#87A922]/20">
              404
            </span>
          </h1>

          <h2 className="text-3xl md:text-5xl font-light text-white mb-6 leading-tight">
            {t('error.404.title')}
          </h2>

          <p className="text-white/60 text-lg leading-relaxed mb-12 max-w-lg mx-auto">
            {t('error.404.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="group bg-[#87A922] hover:bg-[#6c871b] text-white px-8 py-4 rounded-full font-bold uppercase tracking-wider text-sm transition-all flex items-center gap-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t('error.404.home')}
            </Link>
            <Link
              to="/contact"
              className="text-white/60 hover:text-white px-6 py-4 rounded-full font-medium uppercase tracking-wider text-sm transition-colors flex items-center gap-2 border border-white/10 hover:border-white/30"
            >
              <MessageCircle className="w-4 h-4" />
              {t('error.404.contact')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
