import { useEffect, useMemo, useState } from 'react';
import { Eye, Heart, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useBlogArticles } from '../data/useBlogArticles';
import { useI18n } from '../i18n/I18nProvider';

export const Blog = () => {
  const { t, lang } = useI18n();
  const { articles } = useBlogArticles();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => set.add(a.category));
    return ['all', ...Array.from(set)];
  }, [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      const matchesCat = activeCat === 'all' || a.category === activeCat;
      const matchesQuery =
        q === '' ||
        a.title[lang].toLowerCase().includes(q) ||
        a.excerpt[lang].toLowerCase().includes(q) ||
        a.body[lang].toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, activeCat, lang, articles]);

  useEffect(() => setPage(1), [query, activeCat]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="bg-[#f4f7f5] min-h-screen pt-32 pb-24" style={{ position: 'relative' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16 text-center">
          <span className="text-[#114232] uppercase tracking-[0.2em] text-sm font-semibold mb-4 block">
            {t('blog.preview.eyebrow')}
          </span>
          <h1 className="text-4xl md:text-6xl font-light text-[#0f2618]">
            {t('blog.preview.title.1')}{' '}
            <span className="font-serif italic text-[#4a7856]">{t('blog.preview.title.italic')}</span>
          </h1>
        </div>

        {/* Search + categories */}
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between mb-12">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full bg-white border border-[#0f2618]/5 rounded-full py-3 ps-12 pe-4 text-[#0f2618] focus:outline-none focus:border-[#87A922] transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.15em] font-semibold transition-colors ${
                  activeCat === c
                    ? 'bg-[#0f2618] text-white border border-transparent'
                    : 'bg-white text-[#0f2618]/70 border border-[#0f2618]/10 hover:text-[#0f2618]'
                }`}
              >
                {c === 'all' ? 'Tous' : c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-20">Aucun article trouvé.</p>
        ) : (
          /* Simple CSS grid — no masonry library, no absolute positioning, no collision risk */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {paginated.map((article, idx) => (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="flex flex-col"
              >
                <Link
                  to={`/blog/${article.slug}`}
                  className="group bg-white rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[#114232]/5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer flex flex-col h-full"
                >
                  <div className="relative aspect-[16/9] overflow-hidden shrink-0">
                    <img
                      src={article.image}
                      alt={article.title[lang]}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.18em] font-bold bg-white/90 text-[#0f2618] px-3 py-1.5 rounded-full">
                      {article.category}
                    </span>
                  </div>

                  <div className="p-6 md:p-8 flex flex-col flex-1">
                    <div className="text-[#87A922] text-sm font-semibold tracking-wider uppercase mb-3">
                      {new Date(article.date).toLocaleDateString(
                        lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR',
                        { day: '2-digit', month: 'long', year: 'numeric' }
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-medium text-[#0f2618] leading-snug mb-3 group-hover:text-[#4a7856] transition-colors">
                      {article.title[lang]}
                    </h2>
                    <p className="text-gray-500 leading-relaxed line-clamp-3 mb-6 flex-1 text-sm md:text-base">
                      {article.excerpt[lang]}
                    </p>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                      <div className="flex items-center gap-4 text-gray-400 text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-4 h-4" /> {article.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4" /> {article.likes.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#87A922] transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-16">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-10 h-10 rounded-full border border-[#0f2618]/10 bg-white hover:bg-[#0f2618]/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-[#0f2618]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-10 h-10 px-3 rounded-full text-sm font-semibold transition-colors ${
                  n === safePage
                    ? 'bg-[#0f2618] text-white'
                    : 'bg-white text-[#0f2618]/70 border border-[#0f2618]/10 hover:bg-[#0f2618]/5'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-10 h-10 rounded-full border border-[#0f2618]/10 bg-white hover:bg-[#0f2618]/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-[#0f2618]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
