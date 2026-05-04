import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import * as kv from './kv_store.ts';

const app = new Hono();

// ─── Redacted request logger (does not log bodies / auth headers) ─────────
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${ms}ms`);
});

// ─── CORS allowlist (origins) ─────────────────────────────────────────────
// Set CORS_ORIGINS env var to a comma-separated list of allowed origins.
// Defaults to production + localhost when unset to avoid breaking local dev.
const CORS_ALLOWED = (Deno.env.get('CORS_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_CORS = [
  'https://agroespace.com',
  'https://www.agroespace.com',
  'https://agroespace-website-dashboard.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];
const corsAllow = CORS_ALLOWED.length > 0 ? CORS_ALLOWED : DEFAULT_CORS;

app.use(
  '/*',
  cors({
    origin: (origin) => {
      if (!origin) return ''; // server-to-server / curl
      // Allow any *.vercel.app preview deploy in addition to allowlist
      if (
        corsAllow.includes(origin) ||
        /^https:\/\/agroespace-website-dashboard(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
      ) {
        return origin;
      }
      return '';
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  })
);

// ─── Body size cap (50 KB default; 10 MB on media upload routes) ──────────
app.use('*', async (c, next) => {
  const cl = Number(c.req.header('Content-Length') ?? 0);
  const path = new URL(c.req.url).pathname;
  const isMedia = path.includes('/wp-json/wp/v2/media');
  const max = isMedia ? 10 * 1024 * 1024 : 50 * 1024;
  if (cl > max) {
    return c.json(
      { code: 'payload_too_large', message: `Body exceeds ${max} bytes` },
      413
    );
  }
  await next();
});

// ─── Rate limiter (sliding-window, hybrid in-memory + KV) ─────────────────
// In-memory map gives sub-ms checks for the common case. For sensitive
// endpoints (`persist: true`) we additionally write the bucket to KV so
// limits hold across Deno isolates and isolate restarts. KV-only mode adds
// ~30-80 ms per call — only worth it on auth + quote endpoints.
type Bucket = { hits: number[] };
const rlState = new Map<string, Bucket>();

function rateLimit(opts: {
  key: string;
  max: number;
  windowMs: number;
  persist?: boolean;
}) {
  return async (c: any, next: any) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      'anon';
    const key = `${opts.key}:${ip}`;
    const now = Date.now();
    const cutoff = now - opts.windowMs;

    // Layer 1: in-memory bucket (fast path)
    let bucket = rlState.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((t) => t > cutoff);

    // Layer 2: persistent KV bucket — merge with in-memory.
    if (opts.persist) {
      try {
        const persisted = await kv.get(`rl:${key}`);
        if (persisted && Array.isArray(persisted.hits)) {
          const merged = Array.from(
            new Set([...bucket.hits, ...persisted.hits])
          )
            .filter((t: number) => t > cutoff)
            .sort();
          bucket = { hits: merged };
        }
      } catch {
        /* KV outage — fall back to in-memory */
      }
    }

    if (bucket.hits.length >= opts.max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.hits[0] + opts.windowMs - now) / 1000)
      );
      c.header('Retry-After', String(retryAfter));
      // Save current state so concurrent isolates see the limit too
      rlState.set(key, bucket);
      if (opts.persist) {
        try {
          await kv.set(`rl:${key}`, { hits: bucket.hits, exp: now + opts.windowMs });
        } catch {/* ignore */}
      }
      return c.json(
        {
          code: 'rate_limited',
          message: `Too many requests, retry in ${retryAfter}s`,
        },
        429
      );
    }

    bucket.hits.push(now);
    rlState.set(key, bucket);
    if (opts.persist) {
      try {
        await kv.set(`rl:${key}`, { hits: bucket.hits, exp: now + opts.windowMs });
      } catch {/* ignore */}
    }

    // periodic cleanup so the in-mem map doesn't grow unbounded
    if (rlState.size > 5000) {
      for (const [k, b] of rlState) {
        if (!b.hits.length || b.hits[b.hits.length - 1] < cutoff) rlState.delete(k);
      }
    }
    await next();
  };
}

// ─── Input sanitisation helpers ──────────────────────────────────────────
function sanitiseStr(v: unknown, max = 500): string {
  if (typeof v !== 'string') return '';
  // strip control chars + tags + collapse whitespace, then cap length
  return v
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, max);
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254;
}
function isPhone(s: string): boolean {
  return /^[+\d][\d\s().-]{5,24}$/.test(s);
}

const ROOT = '/make-server-0c561120';
const WC = `${ROOT}/wp-json/wc/v3`;
const WP = `${ROOT}/wp-json/wp/v2`;
const ADMIN = `${ROOT}/admin`;
const PUBLIC = `${ROOT}/public`;

// ─── Health ───────────────────────────────────────────────────────────────
app.get(`${ROOT}/health`, (c) => c.json({ status: 'ok' }));

// ─── Public quote intake ──────────────────────────────────────────────────
// Rate-limited (10 / 15min per IP) + strictly validated.
app.post(
  `${ROOT}/quotes`,
  rateLimit({ key: 'quotes', max: 10, windowMs: 15 * 60_000, persist: true }),
  async (c) => {
    try {
      const raw = await c.req.json();
      if (!raw || typeof raw !== 'object') {
        return c.json({ code: 'rest_invalid_payload', message: 'Bad payload' }, 400);
      }
      // Whitelist fields, sanitise + length-cap
      const name = sanitiseStr(raw.name, 100);
      const phone = sanitiseStr(raw.phone, 30);
      const email = sanitiseStr(raw.email, 254);
      const company = sanitiseStr(raw.company, 150);
      const address = sanitiseStr(raw.address, 200);
      const message = sanitiseStr(raw.message, 2000);
      const product_id = sanitiseStr(String(raw.product_id ?? ''), 80);
      const product_sku = sanitiseStr(raw.product_sku, 80);
      const product_title = sanitiseStr(raw.product_title, 200);

      if (!name || name.length < 2) {
        return c.json({ code: 'invalid_name', message: 'Name required' }, 400);
      }
      if (!phone || !isPhone(phone)) {
        return c.json({ code: 'invalid_phone', message: 'Valid phone required' }, 400);
      }
      if (email && !isEmail(email)) {
        return c.json({ code: 'invalid_email', message: 'Invalid email' }, 400);
      }

      const id = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        name,
        phone,
        email,
        company,
        address,
        message,
        product_id,
        product_sku,
        product_title,
        ip: c.req.header('x-forwarded-for')?.split(',')[0].trim() || null,
      };
      await kv.set(`quote:${id}`, record);
      return c.json({ id, status: 'queued' }, 201);
    } catch (e) {
      return c.json({ code: 'rest_invalid_payload', message: 'Bad request' }, 400);
    }
  }
);

// ─── Admin auth middleware ────────────────────────────────────────────────
// Validates the Supabase JWT and checks the user's email against the
// ADMIN_EMAILS allowlist. The list is comma-separated, lower-cased on read.
const adminAuthClient = () => {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env');
  return createClient(url, anon);
};

// Per-IP rate limit on bearer-token verification (catches admin login probes
// and broken-token spam): 5 failed attempts per 15 minutes.
const requireAdminRateLimit = rateLimit({
  key: 'admin-auth',
  max: 5,
  windowMs: 15 * 60_000,
  persist: true,
});

async function requireAdmin(c: any, next: any) {
  const auth = c.req.header('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    // Apply rate limit only when the request is malformed/unauthenticated to
    // avoid penalising legitimately authed admin browsing.
    return await requireAdminRateLimit(c, () =>
      c.json({ code: 'unauthorized', message: 'Missing bearer token' }, 401)
    );
  }
  const token = auth.slice(7).trim();
  try {
    const supabase = adminAuthClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return await requireAdminRateLimit(c, () =>
        c.json({ code: 'unauthorized', message: 'Invalid session' }, 401)
      );
    }
    const allowed = (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    // Fail closed: if ADMIN_EMAILS is unset, no one is admin.
    if (allowed.length === 0) {
      console.error('SECURITY: ADMIN_EMAILS env var not set; denying all admin access');
      return c.json(
        { code: 'forbidden', message: 'Admin allowlist not configured' },
        403
      );
    }
    const email = (data.user.email ?? '').toLowerCase();
    if (!allowed.includes(email)) {
      return await requireAdminRateLimit(c, () =>
        c.json(
          { code: 'forbidden', message: 'Account not in admin allowlist' },
          403
        )
      );
    }
    c.set('admin', { id: data.user.id, email });
    await next();
  } catch (e) {
    return c.json({ code: 'unauthorized', message: 'Auth check failed' }, 401);
  }
}

app.get(`${ADMIN}/whoami`, requireAdmin, (c) => c.json(c.get('admin')));

// ─── Admin: dashboard stats ───────────────────────────────────────────────
app.get(`${ADMIN}/stats`, requireAdmin, async (c) => {
  const [quotes, posts, products] = await Promise.all([
    kv.getByPrefix('quote:'),
    kv.getByPrefix('blog:post:'),
    kv.getByPrefix('wc:product:'),
  ]);
  const sortedQuotes = quotes.sort((a: any, b: any) =>
    (a?.created_at ?? '') < (b?.created_at ?? '') ? 1 : -1
  );
  return c.json({
    quotes: {
      total: quotes.length,
      pending: quotes.filter((q: any) => (q?.status ?? 'pending') === 'pending').length,
      recent: sortedQuotes.slice(0, 5),
    },
    posts: { total: posts.length },
    products: { total: products.length },
  });
});

// ─── Admin: quotes ────────────────────────────────────────────────────────
app.get(`${ADMIN}/quotes`, requireAdmin, async (c) => {
  const items = await kv.getByPrefix('quote:');
  return c.json(items);
});

app.patch(`${ADMIN}/quotes/:id`, requireAdmin, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(`quote:${id}`);
  if (!existing) return c.json({ code: 'not_found', message: 'Quote not found' }, 404);
  try {
    const patch = await c.req.json();
    const next = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
    await kv.set(`quote:${id}`, next);
    return c.json(next);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/quotes/:id`, requireAdmin, async (c) => {
  const id = c.req.param('id');
  await kv.del(`quote:${id}`);
  return c.json({ id, deleted: true });
});

// ─── Admin: blog ──────────────────────────────────────────────────────────
// Posts and counters live in two separate kv namespaces:
//   blog:post:{slug}     — post content (CMS-authored only)
//   blog:counter:{slug}  — { slug, views, likes }, source of truth for both
//                           CMS-authored AND static seed posts.
// Splitting them lets a visitor like or view a seed post (whose body lives
// only in the frontend `data/blog.ts`) and get a real persisted counter,
// while the admin can edit the post body without touching the counts.

type BlogPostShape = {
  slug: string;
  title: { fr: string; ar?: string; en?: string };
  excerpt: { fr: string; ar?: string; en?: string };
  body: { fr: string; ar?: string; en?: string };
  category: string;
  date: string;
  image: string;
  gallery?: string[];
  videos?: string[];
  published: boolean;
  source: 'cms';
  updated_at?: string;
};

type BlogCounter = { slug: string; views: number; likes: number };

const blogKey = (slug: string) => `blog:post:${slug}`;
const counterKey = (slug: string) => `blog:counter:${slug}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

async function getCounter(slug: string): Promise<BlogCounter> {
  const cur = (await kv.get(counterKey(slug))) as BlogCounter | null;
  return cur ?? { slug, views: 0, likes: 0 };
}

async function bumpCounter(
  slug: string,
  patch: { views?: number; likes?: number }
): Promise<BlogCounter> {
  const cur = await getCounter(slug);
  const next: BlogCounter = {
    slug,
    views: Math.max(0, cur.views + (patch.views ?? 0)),
    likes: Math.max(0, cur.likes + (patch.likes ?? 0)),
  };
  await kv.set(counterKey(slug), next);
  return next;
}

async function withCounter<T extends { slug: string }>(
  post: T
): Promise<T & { views: number; likes: number }> {
  const c = await getCounter(post.slug);
  return { ...post, views: c.views, likes: c.likes };
}

const sanitize = (raw: any, fallbackSlug?: string): BlogPostShape => {
  const slug = slugify(String(raw?.slug ?? fallbackSlug ?? ''));
  return {
    slug,
    title: {
      fr: String(raw?.title?.fr ?? ''),
      ar: raw?.title?.ar ? String(raw.title.ar) : undefined,
      en: raw?.title?.en ? String(raw.title.en) : undefined,
    },
    excerpt: {
      fr: String(raw?.excerpt?.fr ?? ''),
      ar: raw?.excerpt?.ar ? String(raw.excerpt.ar) : undefined,
      en: raw?.excerpt?.en ? String(raw.excerpt.en) : undefined,
    },
    body: {
      fr: String(raw?.body?.fr ?? ''),
      ar: raw?.body?.ar ? String(raw.body.ar) : undefined,
      en: raw?.body?.en ? String(raw.body.en) : undefined,
    },
    category: String(raw?.category ?? 'Innovation'),
    date: String(raw?.date ?? new Date().toISOString().slice(0, 10)),
    image: String(raw?.image ?? ''),
    gallery: Array.isArray(raw?.gallery) ? raw.gallery.map(String) : [],
    videos: Array.isArray(raw?.videos) ? raw.videos.map(String) : [],
    published: raw?.published !== false,
    source: 'cms',
    updated_at: new Date().toISOString(),
  };
};

app.get(`${ADMIN}/blog`, requireAdmin, async (c) => {
  const posts = (await kv.getByPrefix('blog:post:')) as BlogPostShape[];
  const merged = await Promise.all(posts.map((p) => withCounter(p)));
  return c.json(merged);
});

app.get(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param('slug');
  const item = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!item) return c.json({ code: 'not_found', message: 'Post not found' }, 404);
  return c.json(await withCounter(item));
});

app.post(`${ADMIN}/blog`, requireAdmin, async (c) => {
  try {
    const raw = await c.req.json();
    const post = sanitize(raw);
    if (!post.slug) return c.json({ code: 'invalid_slug', message: 'Slug is required.' }, 400);
    if (!post.title.fr.trim())
      return c.json({ code: 'invalid_title', message: 'French title is required.' }, 400);
    const exists = await kv.get(blogKey(post.slug));
    if (exists)
      return c.json({ code: 'slug_taken', message: 'A post with this slug already exists.' }, 409);
    await kv.set(blogKey(post.slug), post);
    return c.json(await withCounter(post), 201);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param('slug');
  const existing = await kv.get(blogKey(slug));
  if (!existing) return c.json({ code: 'not_found', message: 'Post not found' }, 404);
  try {
    const raw = await c.req.json();
    const post = sanitize({ ...existing, ...raw }, slug);
    if (post.slug !== slug) {
      // Slug change: move post AND counter so view/like history follows.
      await kv.set(blogKey(post.slug), post);
      await kv.del(blogKey(slug));
      const oldCounter = (await kv.get(counterKey(slug))) as BlogCounter | null;
      if (oldCounter) {
        await kv.set(counterKey(post.slug), { ...oldCounter, slug: post.slug });
        await kv.del(counterKey(slug));
      }
    } else {
      await kv.set(blogKey(slug), post);
    }
    return c.json(await withCounter(post));
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param('slug');
  await Promise.all([kv.del(blogKey(slug)), kv.del(counterKey(slug))]);
  return c.json({ slug, deleted: true });
});

// ─── Admin: products (built on top of the WooCommerce-mirror store) ───────
app.get(`${ADMIN}/products`, requireAdmin, async (c) => {
  const items = await kv.getByPrefix('wc:product:');
  return c.json(items);
});

app.post(`${ADMIN}/products`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id ?? Date.now();
    const product = {
      id,
      sku: body.sku ?? null,
      name: body.name ?? '',
      description: body.description ?? '',
      regular_price: body.regular_price ?? '',
      sale_price: body.sale_price ?? '',
      manage_stock: body.manage_stock ?? false,
      stock_quantity: body.stock_quantity ?? 0,
      stock_status: body.stock_status ?? 'instock',
      categories: body.categories ?? [],
      attributes: body.attributes ?? [],
      image: body.image ?? '',
      images: body.images ?? (body.image ? [{ src: body.image }] : []),
      ...body,
      date_created: new Date().toISOString(),
    };
    await kv.set(`wc:product:${id}`, product);
    if (product.sku) await kv.set(`wc:product_sku:${product.sku}`, { id });
    return c.json(product, 201);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/products/:id`, requireAdmin, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing) return c.json({ code: 'not_found', message: 'Product not found' }, 404);
  try {
    const body = await c.req.json();
    const next = { ...existing, ...body, id, date_modified: new Date().toISOString() };
    await kv.set(`wc:product:${id}`, next);
    if (next.sku) await kv.set(`wc:product_sku:${next.sku}`, { id });
    return c.json(next);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/products/:id`, requireAdmin, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing) return c.json({ code: 'not_found', message: 'Product not found' }, 404);
  await kv.del(`wc:product:${id}`);
  if (existing.sku) await kv.del(`wc:product_sku:${existing.sku}`);
  return c.json({ id, deleted: true });
});

// ─── Public blog endpoints (no auth) ──────────────────────────────────────
app.get(`${PUBLIC}/blog`, async (c) => {
  const posts = (await kv.getByPrefix('blog:post:')) as BlogPostShape[];
  const published = posts.filter((p) => p?.published !== false);
  const merged = await Promise.all(published.map((p) => withCounter(p)));
  return c.json(merged);
});

// All known blog counters in a single call. The frontend uses this to
// overlay live counts on top of static seed posts that don't have a
// CMS-stored body.
app.get(`${PUBLIC}/blog/counters`, async (_c) => {
  const counters = (await kv.getByPrefix('blog:counter:')) as BlogCounter[];
  return _c.json(counters);
});

app.get(`${PUBLIC}/blog/:slug`, async (c) => {
  const slug = c.req.param('slug');
  const item = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!item) return c.json({ code: 'not_found', message: 'Post not found' }, 404);
  return c.json(await withCounter(item));
});

app.post(
  `${PUBLIC}/blog/:slug/view`,
  rateLimit({ key: 'blog-view', max: 30, windowMs: 60_000 }),
  async (c) => {
    const slug = c.req.param('slug');
    const next = await bumpCounter(slug, { views: 1 });
    return c.json({ views: next.views });
  }
);

// Dedupe + persistence: a (slug, hashed-IP) pair can flip the like state once
// per 24h. Stored in KV so it survives isolate restarts and works
// cross-isolate (unlike the in-memory rate limiter).
async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`agroespace-like-salt::${ip}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

app.post(
  `${PUBLIC}/blog/:slug/like`,
  rateLimit({ key: 'blog-like', max: 10, windowMs: 60_000 }),
  async (c) => {
    const slug = c.req.param('slug');
    const dir = c.req.query('dir') === 'down' ? -1 : 1;
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      'anon';
    const ipHash = await hashIP(ip);
    const dedupeKey = `like-vote:${slug}:${ipHash}`;
    try {
      const existing = await kv.get(dedupeKey);
      const now = Date.now();
      const TTL = 24 * 60 * 60 * 1000;
      // existing = { state: 1 | -1, ts: number }
      if (existing && existing.ts && now - existing.ts < TTL) {
        if (existing.state === dir) {
          // already in this state — no-op (return current count without changes)
          const counters = (await kv.get(`blog:counters:${slug}`)) ?? {
            views: 0,
            likes: 0,
          };
          return c.json({ likes: counters.likes, deduped: true });
        }
      }
      await kv.set(dedupeKey, { state: dir, ts: now });
    } catch {
      /* best effort — if KV fails we still rate-limit via in-mem */
    }
    const next = await bumpCounter(slug, { likes: dir });
    return c.json({ likes: next.likes });
  }
);

// ─── Public products (no auth) ────────────────────────────────────────────
app.get(`${PUBLIC}/products`, async (c) => {
  const items = (await kv.getByPrefix('wc:product:')) as any[];
  const visible = items.filter((p) => p?.status !== 'deleted' && p?.stock_status !== 'deleted');
  visible.sort((a: any, b: any) => (Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1));
  return c.json(visible.map((p) => wcProductShape(p)));
});

// ─── Promo modal config ───────────────────────────────────────────────────
// Stored at kv key 'promo:current'. The public endpoint lets the front-end
// PromoModal fetch live config; the admin endpoints allow editing via the
// dashboard without a redeploy.

const PROMO_KV_KEY = 'promo:current';

type PromoConfig = {
  id: string;
  isActive: boolean;
  badge?: string;
  eyebrow?: string;
  title?: string;
  titleSuffix?: string;
  description?: string;
  dates?: string;
  location?: string;
  locationDetail?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  updatedAt?: string;
};

app.get(`${PUBLIC}/promo`, async (c) => {
  const promo = (await kv.get(PROMO_KV_KEY)) as PromoConfig | null;
  if (!promo) return c.json(null, 404);
  return c.json(promo);
});

app.get(`${ADMIN}/promo`, requireAdmin, async (c) => {
  const promo = (await kv.get(PROMO_KV_KEY)) as PromoConfig | null;
  return c.json(promo ?? null);
});

app.put(`${ADMIN}/promo`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const config: PromoConfig = {
      id: String(body.id ?? 'promo'),
      isActive: body.isActive === true,
      badge: String(body.badge ?? ''),
      eyebrow: String(body.eyebrow ?? ''),
      title: String(body.title ?? ''),
      titleSuffix: String(body.titleSuffix ?? ''),
      description: String(body.description ?? ''),
      dates: String(body.dates ?? ''),
      location: String(body.location ?? ''),
      locationDetail: String(body.locationDetail ?? ''),
      ctaText: String(body.ctaText ?? ''),
      // Whitelist URL schemes — only http(s), mailto:, tel:, or in-app paths.
      // Blocks javascript:, data:, vbscript:, file:, etc. that could XSS.
      ctaUrl: (() => {
        const raw = String(body.ctaUrl ?? '').trim().slice(0, 500);
        if (!raw) return '';
        return /^(https?:\/\/|mailto:|tel:|\/)/i.test(raw) ? raw : '';
      })(),
      image: String(body.image ?? ''),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(PROMO_KV_KEY, config);
    return c.json(config);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

// ─── Shape helpers (match WC/WP REST API exactly) ────────────────────────
// Logicom and other ERP sync tools recognise existing products by parsing
// the WooCommerce/WordPress response shape. If the shape doesn't match,
// they fail to detect existing records and re-create them in a loop.

const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL') ?? '';
const PUBLIC_HOST = SUPABASE_URL_ENV.replace(/^https?:\/\//, '').replace(/\/$/, '');
const API_ROOT_ABS = `${SUPABASE_URL_ENV}/functions/v1/make-server-0c561120`;

// Sequential ID counter — WooCommerce uses small auto-increment integers,
// not Date.now() millisecond timestamps which some sync tools reject.
async function nextId(kind: 'product' | 'media' | 'category' | 'attribute'): Promise<number> {
  const key = `counter:${kind}`;
  const cur = (await kv.get(key)) as number | null;
  const next = (cur ?? (kind === 'media' ? 1000 : 0)) + 1;
  await kv.set(key, next);
  return next;
}

// ISO date without trailing Z — matches WordPress format ("2026-05-03T14:09:58")
function wpDate(d?: string | Date): string {
  const date = d ? new Date(d) : new Date();
  return date.toISOString().replace(/\.\d+Z$/, '').replace('Z', '');
}

function wcProductShape(p: any): any {
  const id = Number(p.id);
  const created = wpDate(p.date_created);
  const modified = wpDate(p.date_modified ?? p.date_created);
  const name = String(p.name ?? '');
  const slug = p.slug ?? (slugify(name) || `product-${id}`);
  const regular = String(p.regular_price ?? '');
  const sale = String(p.sale_price ?? '');
  const price = sale || regular;
  const onSale = !!sale && sale !== regular;

  // Normalize images to WC shape
  const images = (Array.isArray(p.images) && p.images.length > 0)
    ? p.images.map((img: any, idx: number) => ({
        id: Number(img.id ?? idx + 1),
        date_created: created,
        date_created_gmt: created,
        date_modified: modified,
        date_modified_gmt: modified,
        src: String(img.src ?? img.source_url ?? ''),
        name: String(img.name ?? ''),
        alt: String(img.alt ?? ''),
      }))
    : (p.image
        ? [{
            id: 0,
            date_created: created,
            date_created_gmt: created,
            date_modified: modified,
            date_modified_gmt: modified,
            src: String(p.image),
            name: '',
            alt: '',
          }]
        : []);

  // Normalize categories
  const categories = (Array.isArray(p.categories) ? p.categories : []).map((c: any) => ({
    id: Number(c.id ?? 0),
    name: String(c.name ?? ''),
    slug: String(c.slug ?? slugify(c.name ?? '')),
  }));

  return {
    id,
    name,
    slug,
    permalink: `${API_ROOT_ABS}/wp-json/wc/v3/products/${id}`,
    date_created: created,
    date_created_gmt: created,
    date_modified: modified,
    date_modified_gmt: modified,
    type: String(p.type ?? 'simple'),
    status: String(p.status ?? 'publish'),
    featured: p.featured === true,
    catalog_visibility: String(p.catalog_visibility ?? 'visible'),
    description: String(p.description ?? ''),
    short_description: String(p.short_description ?? ''),
    sku: String(p.sku ?? ''),
    price,
    regular_price: regular,
    sale_price: sale,
    date_on_sale_from: null,
    date_on_sale_from_gmt: null,
    date_on_sale_to: null,
    date_on_sale_to_gmt: null,
    on_sale: onSale,
    purchasable: true,
    total_sales: Number(p.total_sales ?? 0),
    virtual: false,
    downloadable: false,
    downloads: [],
    download_limit: -1,
    download_expiry: -1,
    external_url: '',
    button_text: '',
    tax_status: 'taxable',
    tax_class: '',
    manage_stock: p.manage_stock === true,
    stock_quantity: p.manage_stock ? Number(p.stock_quantity ?? 0) : null,
    stock_status: String(p.stock_status ?? 'instock'),
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    sold_individually: false,
    weight: String(p.weight ?? ''),
    dimensions: { length: '', width: '', height: '' },
    shipping_required: true,
    shipping_taxable: true,
    shipping_class: '',
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: '0.00',
    rating_count: 0,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: '',
    categories,
    tags: [],
    images,
    attributes: Array.isArray(p.attributes) ? p.attributes : [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    price_html: price ? `<span class="woocommerce-Price-amount amount">${price}</span>` : '',
    meta_data: Array.isArray(p.meta_data) ? p.meta_data : [],
    _links: {
      self: [{ href: `${API_ROOT_ABS}/wp-json/wc/v3/products/${id}` }],
      collection: [{ href: `${API_ROOT_ABS}/wp-json/wc/v3/products` }],
    },
  };
}

function wpMediaShape(m: any): any {
  const id = Number(m.id);
  const date = wpDate(m.date_created ?? m.date);
  const sourceUrl = String(m.source_url ?? '');
  const filename = String(m.filename ?? m.title ?? `media-${id}.jpg`);
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const slug = (m.slug ?? (slugify(baseName) || `media-${id}`)) as string;
  const mimeType = String(m.mime_type ?? 'image/jpeg');
  const filesize = Number(m.filesize ?? 0);
  const width = Number(m.width ?? 0);
  const height = Number(m.height ?? 0);
  const titleText = m.title_rendered ?? baseName;

  return {
    id,
    date,
    date_gmt: date,
    guid: { rendered: sourceUrl, raw: sourceUrl },
    modified: date,
    modified_gmt: date,
    slug,
    status: 'inherit',
    type: 'attachment',
    link: sourceUrl,
    title: { raw: titleText, rendered: titleText },
    author: 1,
    featured_media: 0,
    comment_status: 'open',
    ping_status: 'closed',
    template: '',
    meta: [],
    permalink_template: `${API_ROOT_ABS}/?attachment_id=${id}`,
    generated_slug: slug,
    class_list: [`post-${id}`, 'attachment', 'type-attachment', 'status-inherit', 'hentry'],
    description: { raw: '', rendered: '' },
    caption: { raw: '', rendered: '' },
    alt_text: String(m.alt_text ?? ''),
    media_type: 'image',
    mime_type: mimeType,
    media_details: {
      width,
      height,
      file: filename,
      filesize,
      sizes: {
        full: {
          file: filename,
          width,
          height,
          mime_type: mimeType,
          source_url: sourceUrl,
        },
      },
      image_meta: {
        aperture: '0',
        credit: '',
        camera: '',
        caption: '',
        created_timestamp: '0',
        copyright: '',
        focal_length: '0',
        iso: '0',
        shutter_speed: '0',
        title: '',
        orientation: '1',
        keywords: [],
      },
    },
    post: null,
    source_url: sourceUrl,
    missing_image_sizes: [],
    _links: {
      self: [{
        href: `${API_ROOT_ABS}/wp-json/wp/v2/media/${id}`,
        targetHints: { allow: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      }],
      collection: [{ href: `${API_ROOT_ABS}/wp-json/wp/v2/media` }],
      about: [{ href: `${API_ROOT_ABS}/wp-json/wp/v2/types/attachment` }],
      author: [{
        embeddable: true,
        href: `${API_ROOT_ABS}/wp-json/wp/v2/users/1`,
      }],
      replies: [{
        embeddable: true,
        href: `${API_ROOT_ABS}/wp-json/wp/v2/comments?post=${id}`,
      }],
    },
  };
}

// When Logicom (or any sync tool) sends `images: [{id: 3038}]` after first
// uploading the media, we need to look up the media record and hydrate the
// missing `src` field. Otherwise products show no image because WC product
// shape requires `src` on each image entry.
async function hydrateProductImages(images: any): Promise<any[]> {
  if (!Array.isArray(images)) return [];
  const out: any[] = [];
  for (const img of images) {
    if (!img) continue;
    const hasSrc = !!(img.src || img.source_url);
    if (hasSrc) {
      out.push(img);
      continue;
    }
    if (img.id != null) {
      const media = (await kv.get(`wp:media:${img.id}`)) as any;
      if (media?.source_url) {
        out.push({
          id: Number(img.id),
          src: media.source_url,
          name: media.title ?? img.name ?? '',
          alt: img.alt ?? media.alt_text ?? '',
        });
        continue;
      }
    }
    // No id and no src — drop the entry rather than emit a broken image
  }
  return out;
}

// Standardised WooCommerce-style error envelope. Sync tools check for the
// `data.status` field to determine the HTTP code without re-parsing headers.
function wcError(c: any, code: string, message: string, status: number) {
  c.status(status);
  return c.json({ code, message, data: { status } });
}

// Upload a binary blob to Supabase Storage (bucket "media") and return the
// public URL. Creates the bucket on first use.
async function uploadFileToStorage(
  filename: string,
  body: Uint8Array,
  contentType: string
): Promise<{ url: string; path: string; size: number }> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key);

  // Ensure bucket exists (idempotent — error is harmless if it already exists)
  try {
    await sb.storage.createBucket('media', { public: true });
  } catch { /* already exists */ }

  const yyyy = new Date().getFullYear();
  const mm = String(new Date().getMonth() + 1).padStart(2, '0');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${yyyy}/${mm}/${Date.now()}-${safeName}`;

  const { error } = await sb.storage.from('media').upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl, path, size: body.byteLength };
}

// ─── WooCommerce-mirror API ───────────────────────────────────────────────
// Real WooCommerce installs use either Basic Auth (consumer_key as user,
// consumer_secret as password) over HTTPS or the query-string equivalent
// (?consumer_key=...&consumer_secret=...). Logicom/Delfiv and most ERP
// connectors only know how to speak that flavour, so we accept all of:
//   • X-API-KEY: <key>
//   • Authorization: Bearer <key>
//   • Authorization: Basic base64(<anything>:<key>)
//   • ?consumer_key=<anything>&consumer_secret=<key>
// In every case the *secret* must equal AGROESPACE_API_KEY. The "key"
// half can be any non-empty string — Logicom usually wants both fields
// filled in, but only the secret is checked.
// Constant-time comparison defeats timing attacks on the shared API secret.
// Always processes the longer of the two strings so the runtime depends only
// on the candidate length, not on which characters match.
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  const len = Math.max(ea.length, eb.length);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

function checkApiKey(c: any): boolean {
  const expected = Deno.env.get('AGROESPACE_API_KEY') ?? '';
  if (!expected || expected === 'changeme-set-AGROESPACE_API_KEY') return false;

  const headerKey = c.req.header('X-API-KEY') ?? c.req.header('x-api-key') ?? '';
  if (headerKey && timingSafeEqual(headerKey, expected)) return true;

  const auth = c.req.header('Authorization') ?? c.req.header('authorization') ?? '';
  if (auth) {
    const lower = auth.toLowerCase();
    if (lower.startsWith('bearer ')) {
      if (timingSafeEqual(auth.slice(7).trim(), expected)) return true;
    } else if (lower.startsWith('basic ')) {
      try {
        const decoded = atob(auth.slice(6).trim());
        const idx = decoded.indexOf(':');
        const secret = idx === -1 ? decoded : decoded.slice(idx + 1);
        if (timingSafeEqual(secret, expected)) return true;
      } catch {
        /* malformed base64 — treat as auth failure */
      }
    }
  }

  const cs = c.req.query('consumer_secret');
  if (cs && timingSafeEqual(cs, expected)) return true;
  return false;
}

function requireApiKey(c: any, next: any) {
  if (!checkApiKey(c)) {
    return c.json(
      { code: 'woocommerce_rest_authentication_error', message: 'Invalid or missing API key' },
      401
    );
  }
  return next();
}

// WooCommerce-style pagination. Reads page/per_page from the query string,
// caps per_page at 100 (matches WC default), and writes X-WP-Total and
// X-WP-TotalPages headers so Logicom knows when to stop paging.
function paginate<T>(c: any, items: T[]): T[] {
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('per_page') ?? '20') || 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  c.header('X-WP-Total', String(total));
  c.header('X-WP-TotalPages', String(totalPages));
  return items.slice(start, start + perPage);
}

const k = {
  product: (id: string | number) => `wc:product:${id}`,
  productSku: (sku: string) => `wc:product_sku:${sku}`,
  category: (id: string | number) => `wc:category:${id}`,
  attribute: (id: string | number) => `wc:attribute:${id}`,
  attrTerm: (attrId: string | number, id: string | number) => `wc:attribute:${attrId}:term:${id}`,
  order: (id: string | number) => `wc:order:${id}`,
  customer: (id: string | number) => `wc:customer:${id}`,
  media: (id: string | number) => `wp:media:${id}`,
};

app.get(`${WC}/products`, requireApiKey, async (c) => {
  const sku = c.req.query('sku');
  const fields = c.req.query('_fields');
  const items = (await kv.getByPrefix('wc:product:')) as any[];
  let filtered = items;
  if (sku) filtered = filtered.filter((p: any) => p?.sku === sku);
  // Newest first — keeps Logicom's incremental pulls deterministic.
  filtered.sort((a: any, b: any) => (Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1));
  let page = paginate(c, filtered).map((p) => wcProductShape(p));
  if (fields) {
    const keep = fields.split(',').map((s) => s.trim());
    page = page.map((p: any) => {
      const out: Record<string, unknown> = {};
      keep.forEach((f) => {
        if (f in p) out[f] = p[f];
      });
      return out;
    });
  }
  return c.json(page);
});

app.get(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(c, 'woocommerce_rest_invalid_product_id', 'Invalid ID.', 404);
  }
  return c.json(wcProductShape(existing));
});

app.post(`${WC}/products`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();

    // If a SKU is given and already exists, return the existing product
    // (idempotent create — prevents Logicom from spawning duplicates).
    // Hydrate image src from media kv if Logicom only sent {id: ...}
    if (body.images) body.images = await hydrateProductImages(body.images);

    if (body.sku) {
      const existingMap = (await kv.get(k.productSku(body.sku))) as { id: number } | null;
      if (existingMap?.id != null) {
        const existing = await kv.get(k.product(existingMap.id));
        if (existing) {
          // Merge any new fields from the POST onto the existing record.
          const merged = {
            ...existing,
            ...body,
            id: existingMap.id,
            date_modified: new Date().toISOString(),
          };
          await kv.set(k.product(existingMap.id), merged);
          return c.json(wcProductShape(merged), 200);
        }
      }
    }

    const id = body.id != null ? Number(body.id) : await nextId('product');
    const now = new Date().toISOString();
    const product = {
      id,
      sku: body.sku ?? '',
      name: body.name ?? '',
      slug: body.slug ?? slugify(body.name ?? `product-${id}`),
      description: body.description ?? '',
      short_description: body.short_description ?? '',
      regular_price: String(body.regular_price ?? ''),
      sale_price: String(body.sale_price ?? ''),
      manage_stock: body.manage_stock === true,
      stock_quantity: Number(body.stock_quantity ?? 0),
      stock_status: body.stock_status ?? 'instock',
      categories: body.categories ?? [],
      attributes: body.attributes ?? [],
      images: body.images ?? [],
      meta_data: body.meta_data ?? [],
      ...body,
      id,
      date_created: now,
      date_modified: now,
    };
    await kv.set(k.product(id), product);
    if (product.sku) await kv.set(k.productSku(product.sku), { id });
    return c.json(wcProductShape(product), 201);
  } catch (e) {
    return wcError(c, 'woocommerce_rest_invalid_payload', String(e), 400);
  }
});

app.put(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(c, 'woocommerce_rest_invalid_product_id', 'Invalid ID.', 404);
  }
  try {
    const body = await c.req.json();
    if (body.images) body.images = await hydrateProductImages(body.images);
    const next = {
      ...existing,
      ...body,
      id: Number(id),
      date_modified: new Date().toISOString(),
    };
    await kv.set(k.product(id), next);
    if (next.sku) await kv.set(k.productSku(next.sku), { id: Number(id) });
    return c.json(wcProductShape(next), 200);
  } catch (e) {
    return wcError(c, 'woocommerce_rest_invalid_payload', String(e), 400);
  }
});

app.delete(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(c, 'woocommerce_rest_invalid_product_id', 'Invalid ID.', 404);
  }
  await kv.del(k.product(id));
  if ((existing as any).sku) await kv.del(k.productSku((existing as any).sku));
  // WC returns the deleted product in the response, with the shaped object.
  return c.json(wcProductShape({ ...existing, id: Number(id) }), 200);
});

app.post(`${WC}/products/categories`, requireApiKey, async (c) => {
  const body = await c.req.json();
  const id = body.id ?? Date.now();
  const cat = { id, name: body.name ?? '', slug: body.slug ?? '', ...body };
  await kv.set(k.category(id), cat);
  return c.json(cat, 201);
});

app.put(`${WC}/products/categories/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.category(id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_term_invalid', message: 'Invalid term ID.' }, 404);
  }
  const body = await c.req.json();
  const next = { ...existing, ...body, id };
  await kv.set(k.category(id), next);
  return c.json(next, 200);
});

app.post(`${WC}/products/attributes`, requireApiKey, async (c) => {
  const body = await c.req.json();
  const id = body.id ?? Date.now();
  const attr = { id, name: body.name ?? '', slug: body.slug ?? '', type: body.type ?? 'select', ...body };
  await kv.set(k.attribute(id), attr);
  return c.json(attr, 201);
});

app.put(`${WC}/products/attributes/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.attribute(id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_taxonomy_invalid', message: 'Invalid attribute.' }, 404);
  }
  const body = await c.req.json();
  const next = { ...existing, ...body, id };
  await kv.set(k.attribute(id), next);
  return c.json(next, 200);
});

app.post(`${WC}/products/attributes/:attrId/terms`, requireApiKey, async (c) => {
  const attrId = c.req.param('attrId');
  const body = await c.req.json();
  const id = body.id ?? Date.now();
  const term = { id, name: body.name ?? '', slug: body.slug ?? '', ...body };
  await kv.set(k.attrTerm(attrId, id), term);
  return c.json(term, 201);
});

app.put(`${WC}/products/attributes/:attrId/terms/:id`, requireApiKey, async (c) => {
  const attrId = c.req.param('attrId');
  const id = c.req.param('id');
  const existing = await kv.get(k.attrTerm(attrId, id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_term_invalid', message: 'Invalid term ID.' }, 404);
  }
  const body = await c.req.json();
  const next = { ...existing, ...body, id };
  await kv.set(k.attrTerm(attrId, id), next);
  return c.json(next, 200);
});

app.get(`${WC}/orders`, requireApiKey, async (c) => {
  const items = (await kv.getByPrefix('wc:order:')) as any[];
  items.sort((a: any, b: any) => (Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1));
  return c.json(paginate(c, items));
});

app.put(`${WC}/orders/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.order(id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_invalid_order_id', message: 'Invalid order.' }, 404);
  }
  const body = await c.req.json();
  const next = { ...existing, ...body, id };
  await kv.set(k.order(id), next);
  return c.json(next, 200);
});

app.post(`${WC}/customers`, requireApiKey, async (c) => {
  const body = await c.req.json();
  const id = body.id ?? Date.now();
  const customer = { id, ...body, date_created: new Date().toISOString() };
  await kv.set(k.customer(id), customer);
  return c.json(customer, 201);
});

// WordPress REST media endpoint — accepts THREE upload formats:
//   1. Raw binary body (Content-Type: image/jpeg, etc.) — what WP REST docs
//      call "uploading via file data". This is what wp-admin and most
//      sync apps (Logicom included) use.
//   2. multipart/form-data with a "file" field.
//   3. application/json with a "source_url" pointing at an existing image.
//
// In all cases we upload the binary to Supabase Storage (bucket "media",
// auto-created on first call) and return the full WP REST shape including
// guid, media_details, _links, etc.
// Allowed media MIME types (defence-in-depth — also applies to multipart files)
const ALLOWED_MEDIA_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
]);
const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

app.post(`${WP}/media`, requireApiKey, async (c) => {
  try {
    const contentType = (c.req.header('Content-Type') ?? '').toLowerCase();
    const dispoHeader = c.req.header('Content-Disposition') ?? '';
    const filenameMatch = dispoHeader.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
    let filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : '';

    let sourceUrl = '';
    let mimeType = '';
    let filesize = 0;

    if (contentType.includes('multipart/form-data')) {
      // Multipart form upload
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return wcError(c, 'rest_upload_no_data', 'No data supplied.', 400);
      }
      filename = filename || file.name || `upload-${Date.now()}.bin`;
      mimeType = file.type || 'application/octet-stream';
      if (!ALLOWED_MEDIA_MIME.has(mimeType)) {
        return wcError(c, 'rest_upload_invalid_type', `MIME ${mimeType} not allowed`, 415);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      filesize = bytes.byteLength;
      if (filesize > MAX_MEDIA_BYTES) {
        return wcError(c, 'rest_upload_too_large', 'File exceeds 10MB', 413);
      }
      const up = await uploadFileToStorage(filename, bytes, mimeType);
      sourceUrl = up.url;
    } else if (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType === 'application/pdf'
    ) {
      // Raw binary upload (the WordPress REST canonical way)
      mimeType = contentType.split(';')[0].trim();
      if (!ALLOWED_MEDIA_MIME.has(mimeType)) {
        return wcError(c, 'rest_upload_invalid_type', `MIME ${mimeType} not allowed`, 415);
      }
      const buf = await c.req.arrayBuffer();
      const bytes = new Uint8Array(buf);
      filesize = bytes.byteLength;
      if (filesize > MAX_MEDIA_BYTES) {
        return wcError(c, 'rest_upload_too_large', 'File exceeds 10MB', 413);
      }
      const ext = mimeType.split('/')[1] || 'bin';
      filename = filename || `upload-${Date.now()}.${ext}`;
      const up = await uploadFileToStorage(filename, bytes, mimeType);
      sourceUrl = up.url;
    } else {
      // JSON fallback (source_url provided externally)
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {
        return wcError(c, 'rest_upload_no_data', 'No data supplied.', 400);
      }
      sourceUrl = String(body.source_url ?? body.url ?? '');
      if (!sourceUrl) {
        return wcError(c, 'rest_upload_no_data', 'No source_url provided.', 400);
      }
      filename = filename || body.filename || body.title || `media-${Date.now()}.jpg`;
      mimeType = String(body.mime_type ?? 'image/jpeg');
    }

    const id = await nextId('media');
    const now = new Date().toISOString();
    const stored = {
      id,
      filename,
      slug: slugify(filename.replace(/\.[^/.]+$/, '')) || `media-${id}`,
      source_url: sourceUrl,
      mime_type: mimeType,
      filesize,
      width: 0,
      height: 0,
      alt_text: '',
      title: filename.replace(/\.[^/.]+$/, ''),
      title_rendered: filename.replace(/\.[^/.]+$/, ''),
      date_created: now,
    };
    await kv.set(k.media(id), stored);
    return c.json(wpMediaShape(stored), 201);
  } catch (e) {
    return wcError(c, 'rest_upload_sideload_error', String(e), 500);
  }
});

app.get(`${WP}/media`, requireApiKey, async (c) => {
  const items = (await kv.getByPrefix('wp:media:')) as any[];
  items.sort((a: any, b: any) => (Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1));
  const page = paginate(c, items).map((m) => wpMediaShape(m));
  return c.json(page);
});

app.get(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, 'rest_post_invalid_id', 'Invalid attachment ID.', 404);
  }
  return c.json(wpMediaShape(existing));
});

app.put(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, 'rest_post_invalid_id', 'Invalid attachment ID.', 404);
  }
  try {
    const body = await c.req.json();
    const next = {
      ...existing,
      title: body.title ?? (existing as any).title,
      title_rendered: body.title ?? (existing as any).title_rendered,
      alt_text: body.alt_text ?? (existing as any).alt_text,
      ...body,
      id: Number(id),
    };
    await kv.set(k.media(id), next);
    return c.json(wpMediaShape(next));
  } catch (e) {
    return wcError(c, 'rest_invalid_payload', String(e), 400);
  }
});

app.delete(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, 'rest_post_invalid_id', 'Invalid attachment ID.', 404);
  }
  await kv.del(k.media(id));
  return c.json({ deleted: true, previous: wpMediaShape(existing) });
});

app.all(`${WC}/*`, (c) =>
  c.json({ code: 'rest_no_route', message: 'No route was found matching the URL.' }, 404)
);

Deno.serve(app.fetch);
