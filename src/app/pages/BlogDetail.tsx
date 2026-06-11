import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Heart, Share2, MessageCircle, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { BlogArticle } from '../data/blog';
import { bumpLike, bumpView, fetchArticle, useBlogArticles } from '../data/useBlogArticles';
import { useI18n } from '../i18n/I18nProvider';
import { BlogGallery } from '../components/blog/BlogGallery';
import { VideoEmbed } from '../components/blog/VideoEmbed';

type Comment = { id: string; author: string; body: string; created: string };

const STORAGE = (slug: string) => ({
  liked: `agro.blog.liked.${slug}`,
  comments: `agro.blog.comments.${slug}`,
  bumped: `agro.blog.bumped.${slug}`,
});

export const BlogDetail = () => {
  const { slug = '' } = useParams();
  const { articles } = useBlogArticles();
  const { t, lang } = useI18n();

  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState(0);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftBody, setDraftBody] = useState('');

  // Fetch the article (remote-first) once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchArticle(slug).then((a) => {
      if (cancelled) return;
      setArticle(a);
      if (a) {
        setViews(a.views);
        setLikes(a.likes);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Bump the view counter once per session per slug; restore liked state and comments.
  useEffect(() => {
    if (!article) return;
    const keys = STORAGE(article.slug);
    setLiked(window.localStorage.getItem(keys.liked) === '1');
    try {
      const raw = window.localStorage.getItem(keys.comments);
      setComments(raw ? JSON.parse(raw) : []);
    } catch {
      setComments([]);
    }
    const alreadyBumped = window.sessionStorage.getItem(keys.bumped) === '1';
    if (!alreadyBumped) {
      window.sessionStorage.setItem(keys.bumped, '1');
      bumpView(article.slug).then((res) => {
        if (res) setViews(res.views);
      });
    }
  }, [article]);

  const suggested = useMemo(
    () => (article ? articles.filter((a) => a.slug !== article.slug).slice(0, 3) : []),
    [article, articles]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-forest flex items-center justify-center text-white pt-24">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-lime animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-forest flex items-center justify-center text-white pt-24">
        <div className="text-center">
          <p className="text-3xl font-light mb-6">{t('blog.detail.notfound')}</p>
          <Link to="/blog" className="underline">
            ← {t('blog.preview.cta')}
          </Link>
        </div>
      </div>
    );
  }

  const toggleLike = async () => {
    const keys = STORAGE(article.slug);
    const goingUp = !liked;
    setLiked(goingUp);
    setLikes((l) => Math.max(0, l + (goingUp ? 1 : -1)));
    if (goingUp) window.localStorage.setItem(keys.liked, '1');
    else window.localStorage.removeItem(keys.liked);
    const remote = await bumpLike(article.slug, goingUp ? 'up' : 'down');
    if (remote) setLikes(remote.likes);
  };

  const onShare = async () => {
    const url = window.location.href;
    const title = article.title[lang];
    const shareData = { title, url };
    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        lang === 'ar' ? 'تم نسخ الرابط' : lang === 'en' ? 'Link copied' : 'Lien copié',
        { description: url }
      );
    } catch {
      // Last resort: show URL in toast
      toast.info(url, { description: lang === 'ar' ? 'انسخ الرابط يدوياً' : lang === 'en' ? 'Copy the link manually' : 'Copiez le lien manuellement' });
    }
  };

  const onSubmitComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draftAuthor.trim() || !draftBody.trim()) return;
    const next: Comment = {
      id: crypto.randomUUID(),
      author: draftAuthor.trim().slice(0, 80),
      body: draftBody.trim().slice(0, 1000),
      created: new Date().toISOString(),
    };
    const updated = [next, ...comments];
    setComments(updated);
    setDraftAuthor('');
    setDraftBody('');
    window.localStorage.setItem(STORAGE(article.slug).comments, JSON.stringify(updated));
    toast.success(t('blog.comment.published'));
  };

  return (
    <div className="bg-paper pt-32 pb-24" style={{ position: 'relative' }}>
      <article className="max-w-3xl mx-auto px-6 md:px-12">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-forest/60 hover:text-forest text-xs uppercase tracking-[0.2em] mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> {t('blog.preview.cta')}
        </Link>

        <span className="inline-block bg-white text-forest text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full mb-4">
          {article.category}
        </span>

        <h1 className="text-4xl md:text-6xl font-display font-light text-forest leading-[1.08] mb-6">
          {article.title[lang]}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-10">
          <span>{new Date(article.date).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="aspect-[16/9] rounded-3xl overflow-hidden mb-10 shadow-[0_25px_60px_rgba(0,0,0,0.08)]">
          <img src={article.image} alt={article.title[lang]} className="w-full h-full object-cover" />
        </div>

        <div className="prose prose-lg max-w-none text-forest/85 leading-relaxed whitespace-pre-line">
          {article.body[lang]}
        </div>

        {article.gallery && article.gallery.length > 0 && (
          <BlogGallery images={article.gallery} />
        )}

        {article.videos && article.videos.length > 0 && (
          <section className="my-12 space-y-6">
            <div className="text-xs uppercase tracking-[0.18em] text-lime font-semibold">
              {t('blog.detail.videos')}
            </div>
            {article.videos.map((url, i) => (
              <VideoEmbed key={i} url={url} title={article.title[lang]} />
            ))}
          </section>
        )}

        {/* Action bar */}
        <div className="mt-12 flex flex-wrap gap-3 items-center border-t border-forest/5 pt-8">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border transition-colors ${
              liked
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-forest border-forest/10 hover:bg-forest hover:text-white hover:border-transparent'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {liked ? t('blog.detail.liked') : t('blog.detail.like')}
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold bg-white text-forest border border-forest/10 hover:bg-forest hover:text-white hover:border-transparent transition-colors"
          >
            <Share2 className="w-4 h-4" /> {t('blog.detail.share')}
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title[lang])}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-forest/60 hover:text-forest"
          >
            Tweet
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-forest/60 hover:text-forest"
          >
            Facebook
          </a>
        </div>

        {/* Comments */}
        <section className="mt-16">
          <h2 className="text-2xl font-medium text-forest mb-6 flex items-center gap-3">
            <MessageCircle className="w-5 h-5" /> {t('blog.detail.comments')} ({comments.length})
          </h2>

          <form onSubmit={onSubmitComment} className="bg-white rounded-3xl p-6 md:p-8 border border-forest/5 mb-8">
            <input
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              placeholder={t('blog.comment.name')}
              className="w-full bg-paper border border-transparent rounded-xl px-4 py-3 text-forest focus:outline-none focus:border-lime mb-3"
              maxLength={80}
              required
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={3}
              placeholder={t('blog.comment.body')}
              className="w-full bg-paper border border-transparent rounded-xl px-4 py-3 text-forest focus:outline-none focus:border-lime resize-none"
              maxLength={1000}
              required
            />
            <button
              type="submit"
              className="mt-4 inline-flex items-center gap-2 bg-lime hover:bg-lime-deep text-white text-sm font-bold uppercase tracking-[0.1em] px-6 py-3 rounded-full transition-colors"
            >
              <Send className="w-4 h-4" /> {t('blog.comment.publish')}
            </button>
          </form>

          <div className="space-y-5">
            {comments.length === 0 && (
              <p className="text-gray-500 text-sm">{t('blog.comment.empty')}</p>
            )}
            {comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-forest/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-forest">{c.author}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR')}
                  </span>
                </div>
                <p className="text-forest/80 text-sm leading-relaxed whitespace-pre-line">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </article>

      {/* Suggested */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mt-24">
        <h2 className="text-2xl md:text-3xl font-medium text-forest mb-8">{t('blog.detail.next')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {suggested.map((s) => (
            <Link
              key={s.slug}
              to={`/blog/${s.slug}`}
              className="group block bg-white rounded-3xl overflow-hidden border border-forest/5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title[lang]}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-6">
                <h3 className="text-base md:text-lg font-medium text-forest leading-snug mb-3 group-hover:text-sage transition-colors line-clamp-3">
                  {s.title[lang]}
                </h3>
                <span className="text-xs text-forest font-semibold uppercase tracking-[0.15em] flex items-center gap-1.5 group-hover:text-lime transition-colors">
                  {t('blog.read')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
