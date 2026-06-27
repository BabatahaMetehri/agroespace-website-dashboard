import { useEffect, useMemo, useState } from 'react';
import { blogArticles as seed, type BlogArticle } from './blog';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { cachedGet } from './cachedGet';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0c561120`;
// The Supabase gateway verifies a JWT on every function request; the anon key
// is a valid public JWT, so even these public endpoints must send it or the
// gateway returns 401 before the function runs.
const AUTH_HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

type RemotePost = Partial<BlogArticle> & {
  slug: string;
  title: BlogArticle['title'];
  excerpt: BlogArticle['excerpt'];
  body: BlogArticle['body'];
  category: string;
  date: string;
  image: string;
  views?: number;
  likes?: number;
  videos?: string[];
  gallery?: string[];
  published?: boolean;
};

type Counter = { slug: string; views: number; likes: number };

const buildCounterMap = (counters: Counter[]) => {
  const m = new Map<string, Counter>();
  counters.forEach((c) => m.set(c.slug, c));
  return m;
};

const merge = (remote: RemotePost[], counters: Map<string, Counter>): BlogArticle[] => {
  const bySlug = new Map<string, BlogArticle>();
  // Seed first, remote (CMS) overrides any matching slug.
  seed.forEach((s) => bySlug.set(s.slug, s));
  remote.forEach((r) => {
    if (r.published === false) {
      bySlug.delete(r.slug);
      return;
    }
    bySlug.set(r.slug, {
      slug: r.slug,
      title: { ...(bySlug.get(r.slug)?.title ?? { fr: '', ar: '', en: '' }), ...r.title },
      excerpt: { ...(bySlug.get(r.slug)?.excerpt ?? { fr: '', ar: '', en: '' }), ...r.excerpt },
      body: { ...(bySlug.get(r.slug)?.body ?? { fr: '', ar: '', en: '' }), ...r.body },
      category: r.category,
      date: r.date,
      image: r.image,
      views: Number(r.views ?? 0) || 0,
      likes: Number(r.likes ?? 0) || 0,
      gallery: r.gallery,
      videos: r.videos,
    });
  });

  // Layer the canonical counter on top, regardless of source. The seed's
  // demo numbers are kept only as a fallback when no counter has ever been
  // bumped server-side for that slug.
  return Array.from(bySlug.values())
    .map((post) => {
      const c = counters.get(post.slug);
      if (!c) return post;
      return { ...post, views: c.views, likes: c.likes };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
};

export const useBlogArticles = () => {
  const [remote, setRemote] = useState<RemotePost[] | null>(null);
  const [counters, setCounters] = useState<Counter[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cachedGet<RemotePost[]>(`${API_BASE}/public/blog`, { headers: AUTH_HEADERS, fallback: [] }),
      // Counters change when visitors view/like, so keep their TTL short.
      cachedGet<Counter[]>(`${API_BASE}/public/blog/counters`, {
        headers: AUTH_HEADERS,
        ttlMs: 2 * 60_000,
        fallback: [],
      }),
    ])
      .then(([posts, cs]) => {
        if (cancelled) return;
        setRemote(posts);
        setCounters(cs);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const articles = useMemo(
    () => merge(remote ?? [], buildCounterMap(counters ?? [])),
    [remote, counters]
  );
  return { articles, loaded: remote !== null && counters !== null, error };
};

export const fetchArticle = async (slug: string): Promise<BlogArticle | null> => {
  try {
    const res = await fetch(`${API_BASE}/public/blog/${encodeURIComponent(slug)}`, { headers: AUTH_HEADERS });
    if (res.ok) {
      const r = (await res.json()) as RemotePost;
      const seedMatch = seed.find((s) => s.slug === slug);
      return {
        slug: r.slug,
        title: { ...(seedMatch?.title ?? { fr: '', ar: '', en: '' }), ...r.title },
        excerpt: { ...(seedMatch?.excerpt ?? { fr: '', ar: '', en: '' }), ...r.excerpt },
        body: { ...(seedMatch?.body ?? { fr: '', ar: '', en: '' }), ...r.body },
        category: r.category,
        date: r.date,
        image: r.image,
        views: Number(r.views ?? 0) || 0,
        likes: Number(r.likes ?? 0) || 0,
        gallery: r.gallery,
        videos: r.videos,
      };
    }
  } catch {
    /* network error: fall through to the seed */
  }
  // No CMS post for this slug — fall back to the seed and layer the
  // counter on top so view/like numbers stay accurate for seed-only posts.
  const seeded = seed.find((s) => s.slug === slug);
  if (!seeded) return null;
  try {
    const res = await fetch(`${API_BASE}/public/blog/counters`, { headers: AUTH_HEADERS });
    if (res.ok) {
      const counters = (await res.json()) as Counter[];
      const c = counters.find((x) => x.slug === slug);
      if (c) return { ...seeded, views: c.views, likes: c.likes };
    }
  } catch {
    /* network error */
  }
  return seeded;
};

// View bumps are de-duped server-side per call but the frontend also
// sessionStorages a flag so a refresh doesn't double-count from the same tab.
export const bumpView = (slug: string) =>
  fetch(`${API_BASE}/public/blog/${encodeURIComponent(slug)}/view`, { method: 'POST', headers: AUTH_HEADERS })
    .then(async (r) => (r.ok ? ((await r.json()) as { views: number }) : null))
    .catch(() => null);

export const bumpLike = (slug: string, dir: 'up' | 'down') =>
  fetch(`${API_BASE}/public/blog/${encodeURIComponent(slug)}/like?dir=${dir}`, { method: 'POST', headers: AUTH_HEADERS })
    .then(async (r) => (r.ok ? ((await r.json()) as { likes: number }) : null))
    .catch(() => null);
