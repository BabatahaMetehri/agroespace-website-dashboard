import { motion } from 'motion/react';
import { Eye, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useBlogArticles } from '../data/useBlogArticles';
import { useI18n } from '../i18n/I18nProvider';

const formatDate = (iso: string, lang: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const BlogPreview = () => {
  const { t, lang } = useI18n();
  const { articles } = useBlogArticles();
  const featured = articles.slice(0, 3);

  return (
    <section className="py-32 bg-paper relative grain">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="h-px w-10 bg-sage/40" aria-hidden />
              <span className="text-pine uppercase tracking-[0.2em] text-sm font-semibold">
                {t('blog.preview.eyebrow')}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-light text-forest leading-tight">
              {t('blog.preview.title.1')}{' '}
              <span className="italic text-sage">{t('blog.preview.title.italic')}</span>
            </h2>
          </div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-forest hover:text-lime font-semibold uppercase tracking-[0.15em] text-xs transition-colors"
          >
            {t('blog.preview.cta')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map((a, idx) => (
            <motion.div
              key={a.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
            >
              <Link
                to={`/blog/${a.slug}`}
                className="group block bg-white rounded-3xl overflow-hidden border border-pine/10 shadow-[0_15px_40px_rgba(15,38,24,0.03)] hover:shadow-[0_25px_60px_rgba(15,38,24,0.08)] hover:-translate-y-1 hover:border-lime/40 transition-all duration-500"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={a.image}
                    alt={a.title[lang]}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 ltr:left-4 rtl:right-4 text-[10px] uppercase tracking-[0.18em] font-bold bg-white/90 text-forest px-3 py-1.5 rounded-full">
                    {a.category}
                  </span>
                </div>
                <div className="p-7">
                  <div className="text-xs text-lime font-semibold tracking-wider uppercase mb-3">
                    {formatDate(a.date, lang)}
                  </div>
                  <h3 className="text-lg md:text-xl font-display font-medium text-forest leading-snug mb-4 group-hover:text-sage transition-colors line-clamp-3">
                    {a.title[lang]}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-5">
                    {a.excerpt[lang]}
                  </p>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-5 text-gray-400 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> {a.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" /> {a.likes.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-forest font-semibold uppercase tracking-[0.12em] flex items-center gap-1.5 group-hover:text-lime transition-colors">
                      {t('blog.read')}
                      <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
