import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";

const app = new Hono();

// ─── Redacted request logger (does not log bodies / auth headers) ─────────
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${ms}ms`,
  );
});

// ─── CORS allowlist (origins) ─────────────────────────────────────────────
// Set CORS_ORIGINS env var to a comma-separated list of allowed origins.
// Defaults to production + localhost when unset to avoid breaking local dev.
const CORS_ALLOWED = (Deno.env.get("CORS_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_CORS = [
  "https://agroespace.com",
  "https://www.agroespace.com",
  "https://agroespace-website-dashboard.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];
const corsAllow = CORS_ALLOWED.length > 0 ? CORS_ALLOWED : DEFAULT_CORS;

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return ""; // server-to-server / curl
      // Allow any *.vercel.app preview deploy in addition to allowlist
      if (
        corsAllow.includes(origin) ||
        /^https:\/\/agroespace-website-dashboard(-[a-z0-9-]+)?\.vercel\.app$/.test(
          origin,
        )
      ) {
        return origin;
      }
      return "";
    },
    allowHeaders: ["Content-Type", "Authorization", "X-API-KEY"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Body size cap (50 KB default; 10 MB on media upload routes) ──────────
app.use("*", async (c, next) => {
  const cl = Number(c.req.header("Content-Length") ?? 0);
  const path = new URL(c.req.url).pathname;
  const isMedia = path.includes("/wp-json/wp/v2/media");
  const max = isMedia ? 10 * 1024 * 1024 : 50 * 1024;
  if (cl > max) {
    return c.json(
      { code: "payload_too_large", message: `Body exceeds ${max} bytes` },
      413,
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
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("x-real-ip") ||
      "anon";
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
            new Set([...bucket.hits, ...persisted.hits]),
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
        Math.ceil((bucket.hits[0] + opts.windowMs - now) / 1000),
      );
      c.header("Retry-After", String(retryAfter));
      // Save current state so concurrent isolates see the limit too
      rlState.set(key, bucket);
      if (opts.persist) {
        try {
          await kv.set(`rl:${key}`, {
            hits: bucket.hits,
            exp: now + opts.windowMs,
          });
        } catch {
          /* ignore */
        }
      }
      return c.json(
        {
          code: "rate_limited",
          message: `Too many requests, retry in ${retryAfter}s`,
        },
        429,
      );
    }

    bucket.hits.push(now);
    rlState.set(key, bucket);
    if (opts.persist) {
      try {
        await kv.set(`rl:${key}`, {
          hits: bucket.hits,
          exp: now + opts.windowMs,
        });
      } catch {
        /* ignore */
      }
    }

    // periodic cleanup so the in-mem map doesn't grow unbounded
    if (rlState.size > 5000) {
      for (const [k, b] of rlState) {
        if (!b.hits.length || b.hits[b.hits.length - 1] < cutoff)
          rlState.delete(k);
      }
    }
    await next();
  };
}

// ─── Input sanitisation helpers ──────────────────────────────────────────
function sanitiseStr(v: unknown, max = 500): string {
  if (typeof v !== "string") return "";
  // strip control chars + tags + collapse whitespace, then cap length
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, max);
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254;
}
function isPhone(s: string): boolean {
  return /^[+\d][\d\s().-]{5,24}$/.test(s);
}

const ROOT = "/make-server-0c561120";
const WC = `${ROOT}/wp-json/wc/v3`;
const WP = `${ROOT}/wp-json/wp/v2`;
const ADMIN = `${ROOT}/admin`;
const PUBLIC = `${ROOT}/public`;

// ─── Health ───────────────────────────────────────────────────────────────
app.get(`${ROOT}/health`, (c) => c.json({ status: "ok" }));

// ─── Public quote intake ──────────────────────────────────────────────────
// Rate-limited (10 / 15min per IP) + strictly validated.
app.post(
  `${ROOT}/quotes`,
  rateLimit({ key: "quotes", max: 10, windowMs: 15 * 60_000, persist: true }),
  async (c) => {
    try {
      const raw = await c.req.json();
      if (!raw || typeof raw !== "object") {
        return c.json(
          { code: "rest_invalid_payload", message: "Bad payload" },
          400,
        );
      }
      // Whitelist fields, sanitise + length-cap
      const name = sanitiseStr(raw.name, 100);
      const phone = sanitiseStr(raw.phone, 30);
      const email = sanitiseStr(raw.email, 254);
      const company = sanitiseStr(raw.company, 150);
      const address = sanitiseStr(raw.address, 200);
      const message = sanitiseStr(raw.message, 2000);
      const product_id = sanitiseStr(String(raw.product_id ?? ""), 80);
      const product_sku = sanitiseStr(raw.product_sku, 80);
      const product_title = sanitiseStr(raw.product_title, 200);

      if (!name || name.length < 2) {
        return c.json({ code: "invalid_name", message: "Name required" }, 400);
      }
      if (!phone || !isPhone(phone)) {
        return c.json(
          { code: "invalid_phone", message: "Valid phone required" },
          400,
        );
      }
      if (email && !isEmail(email)) {
        return c.json({ code: "invalid_email", message: "Invalid email" }, 400);
      }

      const id = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id,
        status: "pending" as const,
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
        ip: c.req.header("x-forwarded-for")?.split(",")[0].trim() || null,
      };
      await kv.set(`quote:${id}`, record);
      return c.json({ id, status: "queued" }, 201);
    } catch (e) {
      return c.json(
        { code: "rest_invalid_payload", message: "Bad request" },
        400,
      );
    }
  },
);

// ─── Admin auth middleware ────────────────────────────────────────────────
// Validates the Supabase JWT and checks the user's email against the
// ADMIN_EMAILS allowlist. The list is comma-separated, lower-cased on read.
const adminAuthClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const anon =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon)
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env");
  return createClient(url, anon);
};

// Per-IP rate limit on bearer-token verification (catches admin login probes
// and broken-token spam): 5 failed attempts per 15 minutes.
const requireAdminRateLimit = rateLimit({
  key: "admin-auth",
  max: 5,
  windowMs: 15 * 60_000,
  persist: true,
});

async function requireAdmin(c: any, next: any) {
  const auth = c.req.header("Authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    // Apply rate limit only when the request is malformed/unauthenticated to
    // avoid penalising legitimately authed admin browsing.
    return await requireAdminRateLimit(c, () =>
      c.json({ code: "unauthorized", message: "Missing bearer token" }, 401),
    );
  }
  const token = auth.slice(7).trim();
  try {
    const supabase = adminAuthClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return await requireAdminRateLimit(c, () =>
        c.json({ code: "unauthorized", message: "Invalid session" }, 401),
      );
    }
    const allowed = (Deno.env.get("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    // Fail closed: if ADMIN_EMAILS is unset, no one is admin.
    if (allowed.length === 0) {
      console.error(
        "SECURITY: ADMIN_EMAILS env var not set; denying all admin access",
      );
      return c.json(
        { code: "forbidden", message: "Admin allowlist not configured" },
        403,
      );
    }
    const email = (data.user.email ?? "").toLowerCase();
    if (!allowed.includes(email)) {
      return await requireAdminRateLimit(c, () =>
        c.json(
          { code: "forbidden", message: "Account not in admin allowlist" },
          403,
        ),
      );
    }
    c.set("admin", { id: data.user.id, email });
    await next();
  } catch (e) {
    return c.json({ code: "unauthorized", message: "Auth check failed" }, 401);
  }
}

app.get(`${ADMIN}/whoami`, requireAdmin, (c) => c.json(c.get("admin")));

// ─── Admin: dashboard stats ───────────────────────────────────────────────
app.get(`${ADMIN}/stats`, requireAdmin, async (c) => {
  const [quotes, posts, products] = await Promise.all([
    kv.getByPrefix("quote:"),
    kv.getByPrefix("blog:post:"),
    kv.getByPrefix("wc:product:"),
  ]);
  const sortedQuotes = quotes.sort((a: any, b: any) =>
    (a?.created_at ?? "") < (b?.created_at ?? "") ? 1 : -1,
  );
  return c.json({
    quotes: {
      total: quotes.length,
      pending: quotes.filter((q: any) => (q?.status ?? "pending") === "pending")
        .length,
      recent: sortedQuotes.slice(0, 5),
    },
    posts: { total: posts.length },
    products: { total: products.length },
  });
});

// ─── Admin: quotes ────────────────────────────────────────────────────────
app.get(`${ADMIN}/quotes`, requireAdmin, async (c) => {
  const items = await kv.getByPrefix("quote:");
  return c.json(items);
});

app.patch(`${ADMIN}/quotes/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`quote:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Quote not found" }, 404);
  try {
    const patch = await c.req.json();
    const next = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    await kv.set(`quote:${id}`, next);
    return c.json(next);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/quotes/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
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
  source: "cms";
  updated_at?: string;
};

type BlogCounter = { slug: string; views: number; likes: number };

const blogKey = (slug: string) => `blog:post:${slug}`;
const counterKey = (slug: string) => `blog:counter:${slug}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

async function getCounter(slug: string): Promise<BlogCounter> {
  const cur = (await kv.get(counterKey(slug))) as BlogCounter | null;
  return cur ?? { slug, views: 0, likes: 0 };
}

async function bumpCounter(
  slug: string,
  patch: { views?: number; likes?: number },
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
  post: T,
): Promise<T & { views: number; likes: number }> {
  const c = await getCounter(post.slug);
  return { ...post, views: c.views, likes: c.likes };
}

const sanitize = (raw: any, fallbackSlug?: string): BlogPostShape => {
  const slug = slugify(String(raw?.slug ?? fallbackSlug ?? ""));
  return {
    slug,
    title: {
      fr: String(raw?.title?.fr ?? ""),
      ar: raw?.title?.ar ? String(raw.title.ar) : undefined,
      en: raw?.title?.en ? String(raw.title.en) : undefined,
    },
    excerpt: {
      fr: String(raw?.excerpt?.fr ?? ""),
      ar: raw?.excerpt?.ar ? String(raw.excerpt.ar) : undefined,
      en: raw?.excerpt?.en ? String(raw.excerpt.en) : undefined,
    },
    body: {
      fr: String(raw?.body?.fr ?? ""),
      ar: raw?.body?.ar ? String(raw.body.ar) : undefined,
      en: raw?.body?.en ? String(raw.body.en) : undefined,
    },
    category: String(raw?.category ?? "Innovation"),
    date: String(raw?.date ?? new Date().toISOString().slice(0, 10)),
    image: String(raw?.image ?? ""),
    gallery: Array.isArray(raw?.gallery) ? raw.gallery.map(String) : [],
    videos: Array.isArray(raw?.videos) ? raw.videos.map(String) : [],
    published: raw?.published !== false,
    source: "cms",
    updated_at: new Date().toISOString(),
  };
};

// Admin blog list. Same pagination/filter contract as /admin/products:
//   ?page=N&per_page=N&search=<query>&status=published|draft|all&all=true
// Without ?all=true returns the paginated shape; with ?all=true returns the
// raw array for any older caller that hasn't migrated.
app.get(`${ADMIN}/blog`, requireAdmin, async (c) => {
  const posts = (await kv.getByPrefix("blog:post:")) as BlogPostShape[];
  const merged = await Promise.all(posts.map((p) => withCounter(p)));

  if (c.req.query("all") === "true") return c.json(merged);

  const counts = {
    all: merged.length,
    published: merged.filter((p: any) => p?.published !== false).length,
    draft: merged.filter((p: any) => p?.published === false).length,
  };

  const status = (c.req.query("status") ?? "all").toLowerCase();
  const search = (c.req.query("search") ?? "").trim().toLowerCase();

  let filtered: any[] = merged;
  if (status === "published")
    filtered = filtered.filter((p: any) => p?.published !== false);
  else if (status === "draft")
    filtered = filtered.filter((p: any) => p?.published === false);

  if (search) {
    filtered = filtered.filter((p: any) =>
      [
        p?.title?.fr,
        p?.title?.ar,
        p?.title?.en,
        p?.excerpt?.fr,
        p?.excerpt?.ar,
        p?.excerpt?.en,
        p?.category,
        p?.slug,
      ]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(search)),
    );
  }

  filtered.sort((a: any, b: any) =>
    String(b?.date ?? "").localeCompare(String(a?.date ?? "")),
  );

  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const perPage = Math.min(
    200,
    Math.max(1, Number(c.req.query("per_page") ?? 24) || 24),
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;

  return c.json({
    items: filtered.slice(start, start + perPage),
    total,
    page: safePage,
    per_page: perPage,
    total_pages: totalPages,
    counts,
  });
});

app.get(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const item = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!item)
    return c.json({ code: "not_found", message: "Post not found" }, 404);
  return c.json(await withCounter(item));
});

app.post(`${ADMIN}/blog`, requireAdmin, async (c) => {
  try {
    const raw = await c.req.json();
    const post = sanitize(raw);
    if (!post.slug)
      return c.json(
        { code: "invalid_slug", message: "Slug is required." },
        400,
      );
    if (!post.title.fr.trim())
      return c.json(
        { code: "invalid_title", message: "French title is required." },
        400,
      );
    const exists = await kv.get(blogKey(post.slug));
    if (exists)
      return c.json(
        {
          code: "slug_taken",
          message: "A post with this slug already exists.",
        },
        409,
      );
    await kv.set(blogKey(post.slug), post);
    return c.json(await withCounter(post), 201);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const existing = await kv.get(blogKey(slug));
  if (!existing)
    return c.json({ code: "not_found", message: "Post not found" }, 404);
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
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  await Promise.all([kv.del(blogKey(slug)), kv.del(counterKey(slug))]);
  return c.json({ slug, deleted: true });
});

// ─── Admin: products (built on top of the WooCommerce-mirror store) ───────
// Admin product list. Supports server-side pagination + filtering so the UI
// stays fast even with 5000+ synced products. Query params:
//   ?page=N            (1-based, default 1)
//   ?per_page=N        (default 50, max 500)
//   ?status=active|trash|all   (default all)
//   ?category=<id>     (optional)
//   ?search=<query>    (matches name | sku | id)
//   ?all=true          (legacy: returns the full unpaginated array)
//
// Response shape (paginated): { items, total, page, per_page, total_pages,
//   counts: { all, active, trash }, categories: [...lightweight category list] }
//
// Skipping ?all returns the new shape; passing ?all=true returns the bare
// array for any caller that hasn't migrated yet.
app.get(`${ADMIN}/products`, requireAdmin, async (c) => {
  const items = (await kv.getByPrefix("wc:product:")) as any[];
  // Always derive stock status + hydrate categories on read.
  for (const p of items) {
    if (
      Array.isArray(p?.categories) &&
      p.categories.some((cc: any) => !cc?.name)
    ) {
      p.categories = await hydrateProductCategories(p.categories);
    }
    p.stock_status = deriveStockStatus(p);
  }

  // Legacy mode — full array, used by older code paths.
  if (c.req.query("all") === "true") {
    return c.json(items);
  }

  // Counts (computed against the FULL list so pills always show accurate totals).
  const counts = {
    all: items.length,
    active: items.filter((p: any) => p?.status !== "trash").length,
    trash: items.filter((p: any) => p?.status === "trash").length,
    hidden: items.filter(
      (p: any) => p?.hidden_from_catalog === true && p?.status !== "trash",
    ).length,
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  const status = (c.req.query("status") ?? "all").toLowerCase();
  const categoryFilter = c.req.query("category") ?? "";
  const search = (c.req.query("search") ?? "").trim().toLowerCase();
  // visibility=visible|hidden|all (default all). Hidden = hidden_from_catalog=true
  const visibility = (c.req.query("visibility") ?? "all").toLowerCase();

  let filtered = items;
  if (status === "active")
    filtered = filtered.filter((p: any) => p?.status !== "trash");
  else if (status === "trash")
    filtered = filtered.filter((p: any) => p?.status === "trash");

  if (visibility === "hidden") {
    filtered = filtered.filter((p: any) => p?.hidden_from_catalog === true);
  } else if (visibility === "visible") {
    filtered = filtered.filter((p: any) => p?.hidden_from_catalog !== true);
  }

  if (categoryFilter && categoryFilter !== "all") {
    filtered = filtered.filter(
      (p: any) =>
        Array.isArray(p?.categories) &&
        p.categories.some(
          (cc: any) => String(cc?.id ?? cc?.name) === String(categoryFilter),
        ),
    );
  }

  if (search) {
    filtered = filtered.filter((p: any) =>
      [p?.name, p?.sku, p?.id, p?.description]
        .filter((v) => v != null)
        .some((v: any) => String(v).toLowerCase().includes(search)),
    );
  }

  // ── Sort: most recently modified first (admins want fresh stuff on top) ─
  filtered.sort((a: any, b: any) => {
    const am = a?.date_modified ?? a?.date_created ?? "";
    const bm = b?.date_modified ?? b?.date_created ?? "";
    return String(bm).localeCompare(String(am));
  });

  // ── Per-category counts on the FILTERED-by-status set so pills reflect
  // what the user is currently viewing.
  const categoryCountSource =
    status === "trash"
      ? items.filter((p: any) => p?.status === "trash")
      : status === "active"
        ? items.filter((p: any) => p?.status !== "trash")
        : items;
  const categoryCounts: Record<string, number> = {};
  for (const p of categoryCountSource) {
    for (const cc of Array.isArray(p?.categories) ? p.categories : []) {
      const key = String(cc?.id ?? cc?.name ?? "");
      if (!key) continue;
      categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
    }
  }

  // ── Paginate ────────────────────────────────────────────────────────────
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const perPage = Math.min(
    500,
    Math.max(1, Number(c.req.query("per_page") ?? 50) || 50),
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);

  return c.json({
    items: slice,
    total,
    page: safePage,
    per_page: perPage,
    total_pages: totalPages,
    counts,
    category_counts: categoryCounts,
  });
});

// Bulk delete (default = soft trash, ?force=true = permanent). Used by the
// admin UI's multi-select toolbar. Accepts a JSON body of { ids: [...] }.
app.post(`${ADMIN}/products/bulk-delete`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const ids: any[] = Array.isArray(body?.ids) ? body.ids : [];
    const force = body?.force === true || c.req.query("force") === "true";
    const results: { id: number | string; ok: boolean; reason?: string }[] = [];
    for (const rawId of ids) {
      const id = String(rawId);
      const existing = await kv.get(`wc:product:${id}`);
      if (!existing) {
        results.push({ id, ok: false, reason: "not_found" });
        continue;
      }
      const sku = (existing as any).sku ? String((existing as any).sku) : "";
      if (force) {
        await kv.del(`wc:product:${id}`);
        if (sku) await kv.del(`wc:product_sku:${sku}`);
      } else {
        const trashed = {
          ...(existing as any),
          id: Number(id),
          status: "trash",
          date_modified: new Date().toISOString(),
        };
        await kv.set(`wc:product:${id}`, trashed);
        if (sku) await kv.del(`wc:product_sku:${sku}`);
      }
      results.push({ id, ok: true });
    }
    return c.json({
      deleted: results.filter((r) => r.ok).map((r) => r.id),
      errors: results.filter((r) => !r.ok),
      force,
    });
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// Bulk restore from trash
app.post(`${ADMIN}/products/bulk-restore`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const ids: any[] = Array.isArray(body?.ids) ? body.ids : [];
    const restored: (number | string)[] = [];
    for (const rawId of ids) {
      const id = String(rawId);
      const existing = await kv.get(`wc:product:${id}`);
      if (!existing) continue;
      const next = {
        ...(existing as any),
        id: Number(id),
        status: "publish",
        date_modified: new Date().toISOString(),
      };
      await kv.set(`wc:product:${id}`, next);
      restored.push(id);
    }
    return c.json({ restored });
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// Bulk toggle catalog visibility. Sets `hidden_from_catalog: true|false` on
// the listed products. Hidden products keep syncing from Logicom (SKUs and
// stock stay accurate) but disappear from the public catalog. Use case:
// admin wants to temporarily pull a product without deleting it.
app.post(`${ADMIN}/products/bulk-visibility`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const ids: any[] = Array.isArray(body?.ids) ? body.ids : [];
    const hidden = body?.hidden === true;
    const updated: (number | string)[] = [];
    for (const rawId of ids) {
      const id = String(rawId);
      const existing = await kv.get(`wc:product:${id}`);
      if (!existing) continue;
      const next = {
        ...(existing as any),
        id: Number(id),
        hidden_from_catalog: hidden,
        date_modified: new Date().toISOString(),
      };
      await kv.set(`wc:product:${id}`, next);
      updated.push(id);
    }
    console.log(
      `[admin] bulk-visibility hidden=${hidden} count=${updated.length}`,
    );
    return c.json({ updated, hidden });
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// Single-row toggle (used by the eye icon in the products table).
app.post(`${ADMIN}/products/:id/visibility`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Product not found" }, 404);
  try {
    const body = await c.req.json().catch(() => ({}));
    // If `hidden` is not provided, just flip the current value.
    const cur = (existing as any).hidden_from_catalog === true;
    const hidden = typeof body?.hidden === "boolean" ? body.hidden : !cur;
    const next = {
      ...(existing as any),
      id: Number(id),
      hidden_from_catalog: hidden,
      date_modified: new Date().toISOString(),
    };
    await kv.set(`wc:product:${id}`, next);
    return c.json(next);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// Empty the trash — permanently deletes ALL products with status='trash'.
app.post(`${ADMIN}/products/empty-trash`, requireAdmin, async (c) => {
  const items = (await kv.getByPrefix("wc:product:")) as any[];
  const trashed = items.filter((p: any) => p?.status === "trash");
  for (const p of trashed) {
    await kv.del(`wc:product:${p.id}`);
    if (p.sku) await kv.del(`wc:product_sku:${p.sku}`);
  }
  console.log(
    `[admin] empty-trash → permanently deleted ${trashed.length} products`,
  );
  return c.json({ deleted: trashed.length });
});

app.post(`${ADMIN}/products`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const id = await safeIncomingId("product", body.id);
    const product = {
      id,
      sku: body.sku ?? null,
      name: body.name ?? "",
      description: body.description ?? "",
      short_description: body.short_description ?? "",
      regular_price: body.regular_price ?? "",
      sale_price: body.sale_price ?? "",
      manage_stock: body.manage_stock ?? false,
      stock_quantity: body.stock_quantity ?? 0,
      stock_status: body.stock_status ?? "instock",
      categories: body.categories ?? [],
      attributes: body.attributes ?? [],
      image: body.image ?? "",
      images: body.images ?? (body.image ? [{ src: body.image }] : []),
      ...body,
      date_created: new Date().toISOString(),
    };
    product.stock_status = deriveStockStatus(product);
    await kv.set(`wc:product:${id}`, product);
    if (product.sku) await kv.set(`wc:product_sku:${product.sku}`, { id });
    return c.json(product, 201);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/products/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Product not found" }, 404);
  try {
    const body = await c.req.json();
    const next: any = {
      ...existing,
      ...body,
      id,
      date_modified: new Date().toISOString(),
    };
    next.stock_status = deriveStockStatus(next);
    await kv.set(`wc:product:${id}`, next);
    if (next.sku) await kv.set(`wc:product_sku:${next.sku}`, { id });
    return c.json(next);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/products/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Product not found" }, 404);
  const sku = (existing as any).sku ? String((existing as any).sku) : "";
  const force = String(c.req.query("force") ?? "").toLowerCase();
  const isForce = force === "true" || force === "1" || force === "yes";
  if (isForce) {
    await kv.del(`wc:product:${id}`);
    if (sku) await kv.del(`wc:product_sku:${sku}`);
    return c.json({ id, deleted: true });
  }
  // Soft trash — also clear SKU index so fresh sync with same SKU starts clean
  const trashed = {
    ...(existing as any),
    id: Number(id),
    status: "trash",
    date_modified: new Date().toISOString(),
  };
  await kv.set(`wc:product:${id}`, trashed);
  if (sku) await kv.del(`wc:product_sku:${sku}`);
  return c.json({ ...trashed, trashed: true });
});

// Restore a trashed product (admin-only)
app.post(`${ADMIN}/products/:id/restore`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:product:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Product not found" }, 404);
  const restored = {
    ...(existing as any),
    id: Number(id),
    status: "publish",
    date_modified: new Date().toISOString(),
  };
  await kv.set(`wc:product:${id}`, restored);
  return c.json(restored);
});

// ─── Admin category endpoints ─────────────────────────────────────────────
// Mirror of the WC endpoints above but session-authed (used by the admin UI).
app.get(`${ADMIN}/categories`, requireAdmin, async (c) => {
  const items = (await kv.getByPrefix("wc:category:")) as any[];
  items.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  return c.json(items);
});

app.post(`${ADMIN}/categories`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const name = String(body.name ?? "").trim();
    if (!name)
      return c.json({ code: "invalid_name", message: "Name required" }, 400);
    // Canonical lowercase slug, same logic as the public WC endpoint
    const slug = canonicalSlug(body.slug ?? name);
    // De-dupe by slug (case-insensitive)
    const all = (await kv.getByPrefix("wc:category:")) as any[];
    if (all.find((x: any) => canonicalSlug(x?.slug ?? "") === slug)) {
      return c.json(
        {
          code: "term_exists",
          message: "A category with this slug already exists.",
        },
        400,
      );
    }
    const id = await safeIncomingId("category", body.id);
    const cat = {
      id,
      name,
      slug,
      parent: 0,
      description: String(body.description ?? ""),
      display: "default",
      image: null,
      menu_order: 0,
      count: 0,
    };
    await kv.set(`wc:category:${id}`, cat);
    return c.json(cat, 201);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/categories/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:category:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Category not found" }, 404);
  try {
    const body = await c.req.json();
    const next = { ...existing, ...body, id: Number(id) };
    await kv.set(`wc:category:${id}`, next);
    return c.json(next);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/categories/:id`, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`wc:category:${id}`);
  if (!existing)
    return c.json({ code: "not_found", message: "Category not found" }, 404);
  await kv.del(`wc:category:${id}`);
  return c.json({ id, deleted: true });
});

// ─── Public blog endpoints (no auth) ──────────────────────────────────────
app.get(`${PUBLIC}/blog`, async (c) => {
  const posts = (await kv.getByPrefix("blog:post:")) as BlogPostShape[];
  const published = posts.filter((p) => p?.published !== false);
  const merged = await Promise.all(published.map((p) => withCounter(p)));
  return c.json(merged);
});

// All known blog counters in a single call. The frontend uses this to
// overlay live counts on top of static seed posts that don't have a
// CMS-stored body.
app.get(`${PUBLIC}/blog/counters`, async (_c) => {
  const counters = (await kv.getByPrefix("blog:counter:")) as BlogCounter[];
  return _c.json(counters);
});

app.get(`${PUBLIC}/blog/:slug`, async (c) => {
  const slug = c.req.param("slug");
  const item = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!item)
    return c.json({ code: "not_found", message: "Post not found" }, 404);
  return c.json(await withCounter(item));
});

app.post(
  `${PUBLIC}/blog/:slug/view`,
  rateLimit({ key: "blog-view", max: 30, windowMs: 60_000 }),
  async (c) => {
    const slug = c.req.param("slug");
    const next = await bumpCounter(slug, { views: 1 });
    return c.json({ views: next.views });
  },
);

// Dedupe + persistence: a (slug, hashed-IP) pair can flip the like state once
// per 24h. Stored in KV so it survives isolate restarts and works
// cross-isolate (unlike the in-memory rate limiter).
async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`agroespace-like-salt::${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

app.post(
  `${PUBLIC}/blog/:slug/like`,
  rateLimit({ key: "blog-like", max: 10, windowMs: 60_000 }),
  async (c) => {
    const slug = c.req.param("slug");
    const dir = c.req.query("dir") === "down" ? -1 : 1;
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("x-real-ip") ||
      "anon";
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
  },
);

// ─── Public products (no auth) ────────────────────────────────────────────
// Statuses that hide a product from the public catalog. Matches WooCommerce
// conventions: only `publish` (and undefined = legacy) is shown; trash/draft/
// pending/private/deleted are all hidden.
const PUBLIC_HIDDEN_STATUSES = new Set([
  "trash",
  "draft",
  "pending",
  "private",
  "deleted",
]);

app.get(`${PUBLIC}/products`, async (c) => {
  const items = (await kv.getByPrefix("wc:product:")) as any[];
  const visible = items.filter(
    (p) =>
      !PUBLIC_HIDDEN_STATUSES.has(String(p?.status ?? "publish")) &&
      p?.stock_status !== "deleted" &&
      // Admin-controlled: products with `hidden_from_catalog: true` keep
      // syncing from Logicom (so SKUs/stock stay accurate) but are NOT
      // shown to public visitors. Used to temporarily hide items.
      p?.hidden_from_catalog !== true &&
      // WC standard: catalog_visibility="hidden" or "search" → not in catalog
      p?.catalog_visibility !== "hidden",
  );
  visible.sort((a: any, b: any) =>
    Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1,
  );
  // Hydrate categories on read so the catalog filter pills show real names
  // even for products synced before the hydrate fix.
  for (const p of visible) {
    if (
      Array.isArray(p?.categories) &&
      p.categories.some((c: any) => !c?.name)
    ) {
      p.categories = await hydrateProductCategories(p.categories);
    }
  }
  return c.json(visible.map((p) => wcProductShape(p)));
});

// ─── Promo modal config ───────────────────────────────────────────────────
// Stored at kv key 'promo:current'. The public endpoint lets the front-end
// PromoModal fetch live config; the admin endpoints allow editing via the
// dashboard without a redeploy.

const PROMO_KV_KEY = "promo:current";

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
      id: String(body.id ?? "promo"),
      isActive: body.isActive === true,
      badge: String(body.badge ?? ""),
      eyebrow: String(body.eyebrow ?? ""),
      title: String(body.title ?? ""),
      titleSuffix: String(body.titleSuffix ?? ""),
      description: String(body.description ?? ""),
      dates: String(body.dates ?? ""),
      location: String(body.location ?? ""),
      locationDetail: String(body.locationDetail ?? ""),
      ctaText: String(body.ctaText ?? ""),
      // Whitelist URL schemes — only http(s), mailto:, tel:, or in-app paths.
      // Blocks javascript:, data:, vbscript:, file:, etc. that could XSS.
      ctaUrl: (() => {
        const raw = String(body.ctaUrl ?? "")
          .trim()
          .slice(0, 500);
        if (!raw) return "";
        return /^(https?:\/\/|mailto:|tel:|\/)/i.test(raw) ? raw : "";
      })(),
      image: String(body.image ?? ""),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(PROMO_KV_KEY, config);
    return c.json(config);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// ─── Featured / pinned products ──────────────────────────────────────────
// Highlight layer over the normal catalog. Stored in its own namespace so
// Logicom sync never touches it. Each entry references a product_id and
// carries marketing metadata (tagline, expandable description, technical
// specs, gallery URLs, brochure links).

const FEATURED_KV_PREFIX = "featured:";
const featuredKey = (productId: string | number) =>
  `${FEATURED_KV_PREFIX}${productId}`;

type Translatable = { fr: string; en?: string; ar?: string };
type FeaturedSpec = { label: Translatable; value: Translatable };
type FeaturedBrochure = { label: Translatable; url: string };
type FeaturedProduct = {
  product_id: number;
  enabled: boolean;
  sort_order: number;
  tagline: Translatable;
  highlight: Translatable;
  specs: FeaturedSpec[];
  gallery: string[];
  brochures: FeaturedBrochure[];
  updated_at: string;
};

function sanitizeTranslatable(raw: any, max = 1000): Translatable {
  return {
    fr: String(raw?.fr ?? "").slice(0, max),
    en: raw?.en != null ? String(raw.en).slice(0, max) : "",
    ar: raw?.ar != null ? String(raw.ar).slice(0, max) : "",
  };
}

function sanitizeFeaturedUrl(raw: any, maxLen = 1000): string {
  const s = String(raw ?? "")
    .trim()
    .slice(0, maxLen);
  if (!s) return "";
  // Only http(s) or in-app absolute paths — blocks javascript:/data:/vbscript:
  return /^(https?:\/\/|\/)/i.test(s) ? s : "";
}

function sanitizeFeatured(body: any, productId: number): FeaturedProduct {
  return {
    product_id: productId,
    enabled: body?.enabled !== false,
    sort_order: Number.isFinite(Number(body?.sort_order))
      ? Math.floor(Number(body.sort_order))
      : 0,
    tagline: sanitizeTranslatable(body?.tagline, 200),
    highlight: sanitizeTranslatable(body?.highlight, 4000),
    specs: Array.isArray(body?.specs)
      ? body.specs.slice(0, 30).map((s: any) => ({
          label: sanitizeTranslatable(s?.label, 200),
          value: sanitizeTranslatable(s?.value, 500),
        }))
      : [],
    gallery: Array.isArray(body?.gallery)
      ? body.gallery
          .slice(0, 30)
          .map((u: any) => sanitizeFeaturedUrl(u, 1000))
          .filter(Boolean)
      : [],
    brochures: Array.isArray(body?.brochures)
      ? body.brochures.slice(0, 20).map((b: any) => ({
          label: sanitizeTranslatable(b?.label, 200),
          url: sanitizeFeaturedUrl(b?.url, 1000),
        }))
      : [],
    updated_at: new Date().toISOString(),
  };
}

// Public endpoint used by /catalog — hydrates each featured entry with the
// live product (so SKU, title, stock, image stay current). Filters out
// entries whose product has been hidden, trashed, or deleted.
app.get(`${PUBLIC}/featured`, async (c) => {
  const items = (await kv.getByPrefix(FEATURED_KV_PREFIX)) as FeaturedProduct[];
  const enabled = items.filter((f) => f?.enabled !== false);
  enabled.sort(
    (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
  );
  const hydrated = await Promise.all(
    enabled.map(async (f) => {
      const product = (await kv.get(k.product(f.product_id))) as any | null;
      if (!product) return null;
      if (PUBLIC_HIDDEN_STATUSES.has(String(product.status ?? "publish")))
        return null;
      return { ...f, product: wcProductShape(product) };
    }),
  );
  return c.json(hydrated.filter(Boolean));
});

app.get(`${ADMIN}/featured`, requireAdmin, async (c) => {
  const items = (await kv.getByPrefix(FEATURED_KV_PREFIX)) as FeaturedProduct[];
  items.sort((a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0));
  const hydrated = await Promise.all(
    items.map(async (f) => {
      const product = (await kv.get(k.product(f.product_id))) as any | null;
      return { ...f, product: product ? wcProductShape(product) : null };
    }),
  );
  return c.json(hydrated);
});

app.post(`${ADMIN}/featured`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const productId = Number(body?.product_id);
    if (!Number.isFinite(productId) || productId <= 0) {
      return c.json(
        { code: "rest_invalid_payload", message: "product_id required" },
        400,
      );
    }
    const product = await kv.get(k.product(productId));
    if (!product) {
      return c.json(
        { code: "rest_product_not_found", message: "Product does not exist" },
        404,
      );
    }
    const config = sanitizeFeatured(body, productId);
    await kv.set(featuredKey(productId), config);
    if (config.enabled !== false) {
      const prod = (await kv.get(k.product(productId))) as any;
      if (prod?.hidden_from_catalog === true) {
        await kv.set(k.product(productId), {
          ...prod,
          hidden_from_catalog: false,
          date_modified: new Date().toISOString(),
        });
      }
    }
    return c.json(config);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.put(`${ADMIN}/featured/:id`, requireAdmin, async (c) => {
  try {
    const productId = Number(c.req.param("id"));
    if (!Number.isFinite(productId) || productId <= 0) {
      return c.json({ code: "rest_invalid_id", message: "invalid id" }, 400);
    }
    const existing = (await kv.get(
      featuredKey(productId),
    )) as FeaturedProduct | null;
    if (!existing) {
      return c.json(
        { code: "rest_not_found", message: "Featured entry not found" },
        404,
      );
    }
    const body = await c.req.json();
    const config = sanitizeFeatured({ ...existing, ...body }, productId);
    await kv.set(featuredKey(productId), config);
    if (config.enabled !== false) {
      const prod = (await kv.get(k.product(productId))) as any;
      if (prod?.hidden_from_catalog === true) {
        await kv.set(k.product(productId), {
          ...prod,
          hidden_from_catalog: false,
          date_modified: new Date().toISOString(),
        });
      }
    }
    return c.json(config);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/featured/:id`, requireAdmin, async (c) => {
  const productId = Number(c.req.param("id"));
  if (!Number.isFinite(productId) || productId <= 0) {
    return c.json({ code: "rest_invalid_id", message: "invalid id" }, 400);
  }
  await kv.del(featuredKey(productId));
  return c.json({ deleted: true, id: productId });
});

// ─── Shape helpers (match WC/WP REST API exactly) ────────────────────────
// Logicom and other ERP sync tools recognise existing products by parsing
// the WooCommerce/WordPress response shape. If the shape doesn't match,
// they fail to detect existing records and re-create them in a loop.

const SUPABASE_URL_ENV = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLIC_HOST = SUPABASE_URL_ENV.replace(/^https?:\/\//, "").replace(
  /\/$/,
  "",
);
const API_ROOT_ABS = `${SUPABASE_URL_ENV}/functions/v1/make-server-0c561120`;

// Sequential ID counter — WooCommerce uses small auto-increment integers,
// not Date.now() millisecond timestamps which some sync tools reject.
// Sequential 32-bit-safe IDs. CRITICAL for sync compatibility:
// real WordPress uses MySQL auto-increment giving small ints (15, 16, 17...).
// Many WC sync clients (including Logicom) store these as 32-bit signed
// integers — anything >2^31 (~2.1 billion) overflows their internal lookup
// table, breaks the local id→remote-id mapping, and causes infinite POST
// retry loops. NEVER use Date.now() for sync-visible IDs.
type IdKind =
  | "product"
  | "media"
  | "category"
  | "attribute"
  | "attribute_term"
  | "customer"
  | "order";

async function nextId(kind: IdKind): Promise<number> {
  const key = `counter:${kind}`;
  const cur = (await kv.get(key)) as number | null;
  // Different starting points per resource so no client-side ID collisions
  // between e.g. category-id 15 and product-id 15 in Logicom's lookup tables.
  const start: Record<string, number> = {
    media: 1000,
    category: 14, // next will be 15 — matches WC default "Uncategorized" id
    customer: 1,
    order: 1,
    attribute: 0,
    attribute_term: 0,
    product: 0,
  };
  const next = (cur ?? start[kind] ?? 0) + 1;
  await kv.set(key, next);
  return next;
}

// 32-bit signed integer max — IDs above this overflow Logicom's lookup table
// (and many other WC sync clients that store remote IDs as int32). Anything
// above this and the client cannot map our id back to its local row → it
// retries the create endlessly. NEVER expose an id larger than this.
const MAX_SAFE_WC_ID_GLOBAL = 2_147_483_647;

// Generic helper used by every WC endpoint that mints/persists an ID.
// - If the caller supplied a positive int32 id, accept it (idempotent re-create).
// - Otherwise (no id, oversized id, garbage value) → mint a fresh sequential
//   id from the per-resource counter.
// This is the ONE place to enforce the 32-bit-safe rule, so adding a new
// resource type later automatically inherits the protection.
async function safeIncomingId(kind: IdKind, providedId: any): Promise<number> {
  const n = providedId != null ? Number(providedId) : NaN;
  if (
    Number.isFinite(n) &&
    n > 0 &&
    Math.floor(n) === n &&
    n <= MAX_SAFE_WC_ID_GLOBAL
  ) {
    return n;
  }
  return await nextId(kind);
}

// Generic oversized-ID migrator. When we LOOK UP an existing record (by slug,
// SKU, email, etc.) and find a row whose id was minted before the int32 fix,
// rewrite it under a fresh sequential id and delete the old key. Returns the
// migrated record so the caller can return it to the client immediately.
//
// The kvKeyFor function builds the storage key from an id (e.g. k.attribute,
// k.category). secondaryUpdates lets you update auxiliary indexes (e.g. the
// SKU → id map for products).
async function migrateOversizedId<T extends { id: number | string }>(
  existing: T,
  kind: IdKind,
  kvKeyFor: (id: number | string) => string,
  secondaryUpdates?: (newId: number, oldId: number) => Promise<void>,
): Promise<T> {
  const oldId = Number(existing.id);
  if (!Number.isFinite(oldId) || oldId <= MAX_SAFE_WC_ID_GLOBAL)
    return existing;
  const newId = await nextId(kind);
  const migrated: T = { ...existing, id: newId };
  await kv.set(kvKeyFor(newId), migrated);
  await kv.del(kvKeyFor(oldId));
  if (secondaryUpdates) await secondaryUpdates(newId, oldId);
  console.log(
    `[wc-id-migrate] ${kind} ${oldId} → ${newId} (int32 overflow fix)`,
  );
  return migrated;
}

// Auto-derive stock_status from quantity. Real WooCommerce flips a product
// to "outofstock" automatically once stock_quantity reaches 0 (when stock is
// managed). Logicom often leaves stock_status as "instock" no matter what,
// so we enforce the rule here on every read AND every write.
function deriveStockStatus(p: any): "instock" | "outofstock" {
  // Universal rule: if a quantity is present and it's 0 or negative, the
  // product is out of stock — regardless of whether `manage_stock` is on.
  // Logicom often sends `stock_quantity: 0` with `manage_stock: false` and
  // `stock_status: "instock"` (stale), so we always recompute from quantity.
  const hasQty = p?.stock_quantity != null && p?.stock_quantity !== "";
  if (hasQty) {
    const qty = Number(p.stock_quantity);
    if (!Number.isFinite(qty) || qty <= 0) return "outofstock";
    return "instock";
  }
  // No quantity supplied at all → trust the stored status (defaults instock).
  return p?.stock_status === "outofstock" ? "outofstock" : "instock";
}

// ISO date without trailing Z — matches WordPress format ("2026-05-03T14:09:58")
function wpDate(d?: string | Date): string {
  const date = d ? new Date(d) : new Date();
  return date
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replace("Z", "");
}

function wcProductShape(p: any): any {
  const id = Number(p.id);
  const created = wpDate(p.date_created);
  const modified = wpDate(p.date_modified ?? p.date_created);
  const name = String(p.name ?? "");
  const slug = p.slug ?? (slugify(name) || `product-${id}`);
  const regular = String(p.regular_price ?? "");
  const sale = String(p.sale_price ?? "");
  const price = sale || regular;
  const onSale = !!sale && sale !== regular;

  // Normalize images to WC shape
  const images =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images.map((img: any, idx: number) => ({
          id: Number(img.id ?? idx + 1),
          date_created: created,
          date_created_gmt: created,
          date_modified: modified,
          date_modified_gmt: modified,
          src: String(img.src ?? img.source_url ?? ""),
          name: String(img.name ?? ""),
          alt: String(img.alt ?? ""),
        }))
      : p.image
        ? [
            {
              id: 0,
              date_created: created,
              date_created_gmt: created,
              date_modified: modified,
              date_modified_gmt: modified,
              src: String(p.image),
              name: "",
              alt: "",
            },
          ]
        : [];

  // Normalize categories
  const categories = (Array.isArray(p.categories) ? p.categories : []).map(
    (c: any) => ({
      id: Number(c.id ?? 0),
      name: String(c.name ?? ""),
      slug: String(c.slug ?? slugify(c.name ?? "")),
    }),
  );

  return {
    id,
    name,
    slug,
    permalink: `${API_ROOT_ABS}/wp-json/wc/v3/products/${id}`,
    date_created: created,
    date_created_gmt: created,
    date_modified: modified,
    date_modified_gmt: modified,
    type: String(p.type ?? "simple"),
    status: String(p.status ?? "publish"),
    featured: p.featured === true,
    catalog_visibility: String(p.catalog_visibility ?? "visible"),
    description: String(p.description ?? ""),
    short_description: String(p.short_description ?? ""),
    sku: String(p.sku ?? ""),
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
    external_url: "",
    button_text: "",
    tax_status: "taxable",
    tax_class: "",
    manage_stock: p.manage_stock === true,
    stock_quantity: p.manage_stock ? Number(p.stock_quantity ?? 0) : null,
    stock_status: deriveStockStatus(p),
    backorders: "no",
    backorders_allowed: false,
    backordered: false,
    sold_individually: false,
    weight: String(p.weight ?? ""),
    dimensions: { length: "", width: "", height: "" },
    shipping_required: true,
    shipping_taxable: true,
    shipping_class: "",
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: "0.00",
    rating_count: 0,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: "",
    categories,
    tags: [],
    images,
    attributes: Array.isArray(p.attributes) ? p.attributes : [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    price_html: price
      ? `<span class="woocommerce-Price-amount amount">${price}</span>`
      : "",
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
  const sourceUrl = String(m.source_url ?? "");
  const filename = String(m.filename ?? m.title ?? `media-${id}.jpg`);
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const slug = (m.slug ?? (slugify(baseName) || `media-${id}`)) as string;
  const mimeType = String(m.mime_type ?? "image/jpeg");
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
    status: "inherit",
    type: "attachment",
    link: sourceUrl,
    title: { raw: titleText, rendered: titleText },
    author: 1,
    featured_media: 0,
    comment_status: "open",
    ping_status: "closed",
    template: "",
    meta: [],
    permalink_template: `${API_ROOT_ABS}/?attachment_id=${id}`,
    generated_slug: slug,
    class_list: [
      `post-${id}`,
      "attachment",
      "type-attachment",
      "status-inherit",
      "hentry",
    ],
    description: { raw: "", rendered: "" },
    caption: { raw: "", rendered: "" },
    alt_text: String(m.alt_text ?? ""),
    media_type: "image",
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
        aperture: "0",
        credit: "",
        camera: "",
        caption: "",
        created_timestamp: "0",
        copyright: "",
        focal_length: "0",
        iso: "0",
        shutter_speed: "0",
        title: "",
        orientation: "1",
        keywords: [],
      },
    },
    post: null,
    source_url: sourceUrl,
    missing_image_sizes: [],
    _links: {
      self: [
        {
          href: `${API_ROOT_ABS}/wp-json/wp/v2/media/${id}`,
          targetHints: { allow: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        },
      ],
      collection: [{ href: `${API_ROOT_ABS}/wp-json/wp/v2/media` }],
      about: [{ href: `${API_ROOT_ABS}/wp-json/wp/v2/types/attachment` }],
      author: [
        {
          embeddable: true,
          href: `${API_ROOT_ABS}/wp-json/wp/v2/users/1`,
        },
      ],
      replies: [
        {
          embeddable: true,
          href: `${API_ROOT_ABS}/wp-json/wp/v2/comments?post=${id}`,
        },
      ],
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
          name: media.title ?? img.name ?? "",
          alt: img.alt ?? media.alt_text ?? "",
        });
        continue;
      }
    }
    // No id and no src — drop the entry rather than emit a broken image
  }
  return out;
}

// When Logicom assigns a category to a product, it sends only the id:
// `categories: [{id: 16}]`. The name and slug are empty so the admin table
// and catalog filter render empty pills. Hydrate by looking up each category
// in KV so the stored product has the full {id, name, slug} triplet.
async function hydrateProductCategories(categories: any): Promise<any[]> {
  if (!Array.isArray(categories)) return [];
  const out: any[] = [];
  for (const cat of categories) {
    if (!cat) continue;
    const idNum = Number(cat.id ?? 0);
    // id=0 is Logicom's placeholder for "no category" — drop it (otherwise
    // products show up with an empty-named ghost pill on the catalog)
    if (!idNum) continue;
    const stored = (await kv.get(k.category(idNum))) as any | null;
    if (stored) {
      out.push({
        id: idNum,
        name: String(stored.name ?? cat.name ?? ""),
        slug: String(stored.slug ?? cat.slug ?? ""),
      });
    } else if (cat.name) {
      // Category not in our DB but Logicom sent a name — keep what they sent
      out.push({
        id: idNum,
        name: String(cat.name),
        slug: String(cat.slug ?? ""),
      });
    }
    // No name available and not in DB → drop entry (better than empty pill)
  }
  return out;
}

// WC standard behaviour: PUT replaces the full images array. This matches
// real WordPress and is what Logicom's connector expects (it was designed to
// work with real WC). Any merging would prevent users from REMOVING photos in
// Logicom — the deleted photo would persist on the website.
//
// Set `?merge_images=true` (or `merge_images: true` in body) to opt into the
// legacy union-by-id behaviour, useful for some sync tools that send photos
// one at a time when first attaching them.
function mergeImages(
  existing: any[] = [],
  incoming: any[] = [],
  merge: boolean,
): any[] {
  if (!merge) return incoming;
  const seen = new Map<string, any>();
  const keyOf = (img: any) =>
    img?.id != null
      ? `id:${img.id}`
      : img?.src
        ? `src:${img.src}`
        : `?:${Math.random()}`;
  for (const img of existing) seen.set(keyOf(img), img);
  for (const img of incoming)
    seen.set(keyOf(img), { ...seen.get(keyOf(img)), ...img });
  return Array.from(seen.values());
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
  contentType: string,
): Promise<{ url: string; path: string; size: number }> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key)
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key);

  // Ensure bucket exists (idempotent — error is harmless if it already exists)
  try {
    await sb.storage.createBucket("media", { public: true });
  } catch {
    /* already exists */
  }

  const yyyy = new Date().getFullYear();
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${yyyy}/${mm}/${Date.now()}-${safeName}`;

  const { error } = await sb.storage.from("media").upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from("media").getPublicUrl(path);
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
  const expected = Deno.env.get("AGROESPACE_API_KEY") ?? "";
  if (!expected || expected === "changeme-set-AGROESPACE_API_KEY") return false;

  const headerKey =
    c.req.header("X-API-KEY") ?? c.req.header("x-api-key") ?? "";
  if (headerKey && timingSafeEqual(headerKey, expected)) return true;

  const auth =
    c.req.header("Authorization") ?? c.req.header("authorization") ?? "";
  if (auth) {
    const lower = auth.toLowerCase();
    if (lower.startsWith("bearer ")) {
      if (timingSafeEqual(auth.slice(7).trim(), expected)) return true;
    } else if (lower.startsWith("basic ")) {
      try {
        const decoded = atob(auth.slice(6).trim());
        const idx = decoded.indexOf(":");
        const secret = idx === -1 ? decoded : decoded.slice(idx + 1);
        if (timingSafeEqual(secret, expected)) return true;
      } catch {
        /* malformed base64 — treat as auth failure */
      }
    }
  }

  const cs = c.req.query("consumer_secret");
  if (cs && timingSafeEqual(cs, expected)) return true;
  return false;
}

function requireApiKey(c: any, next: any) {
  if (!checkApiKey(c)) {
    return c.json(
      {
        code: "woocommerce_rest_authentication_error",
        message: "Invalid or missing API key",
      },
      401,
    );
  }
  return next();
}

// WooCommerce-style pagination. Reads page/per_page from the query string,
// caps per_page at 100 (matches WC default), and writes X-WP-Total and
// X-WP-TotalPages headers so Logicom knows when to stop paging.
function paginate<T>(c: any, items: T[]): T[] {
  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(c.req.query("per_page") ?? "20") || 20),
  );
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  c.header("X-WP-Total", String(total));
  c.header("X-WP-TotalPages", String(totalPages));
  return items.slice(start, start + perPage);
}

const k = {
  product: (id: string | number) => `wc:product:${id}`,
  productSku: (sku: string) => `wc:product_sku:${sku}`,
  category: (id: string | number) => `wc:category:${id}`,
  attribute: (id: string | number) => `wc:attribute:${id}`,
  attrTerm: (attrId: string | number, id: string | number) =>
    `wc:attribute:${attrId}:term:${id}`,
  order: (id: string | number) => `wc:order:${id}`,
  customer: (id: string | number) => `wc:customer:${id}`,
  media: (id: string | number) => `wp:media:${id}`,
};

// Real WordPress always ships with an "Uncategorized" default category at
// id=15. Some WC sync clients (Logicom included) assume this exists and may
// fall back to it for products without an explicit category. Seed once on
// first call so we never 404 a default-id lookup.
let _seededDefaults = false;
async function seedDefaultsOnce() {
  if (_seededDefaults) return;
  _seededDefaults = true;
  const existing = await kv.get(k.category(15));
  if (!existing) {
    await kv.set(k.category(15), {
      id: 15,
      name: "Uncategorized",
      slug: "uncategorized",
      parent: 0,
      description: "",
      display: "default",
      image: null,
      menu_order: 0,
      count: 0,
    });
    // Make sure the counter doesn't reuse 15
    const cur = (await kv.get("counter:category")) as number | null;
    if (!cur || cur < 15) await kv.set("counter:category", 15);
    console.log("[wc-categories] seeded default Uncategorized id=15");
  }
}

app.get(`${WC}/products`, requireApiKey, async (c) => {
  const sku = c.req.query("sku");
  const fields = c.req.query("_fields");
  const status = c.req.query("status"); // e.g. ?status=publish or ?status=trash
  const items = (await kv.getByPrefix("wc:product:")) as any[];
  let filtered = items;
  if (sku) filtered = filtered.filter((p: any) => p?.sku === sku);
  if (status) {
    // ?status=any → return everything (matches WC convention)
    if (status !== "any") {
      filtered = filtered.filter(
        (p: any) => String(p?.status ?? "publish") === status,
      );
    }
  }
  // Newest first — keeps Logicom's incremental pulls deterministic.
  filtered.sort((a: any, b: any) =>
    Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1,
  );
  let page = paginate(c, filtered).map((p) => wcProductShape(p));
  if (fields) {
    const keep = fields.split(",").map((s) => s.trim());
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
  const id = c.req.param("id");
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_product_id",
      "Invalid ID.",
      404,
    );
  }
  return c.json(wcProductShape(existing));
});

app.post(`${WC}/products`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();
    console.log(
      `[wc-product-create] body=${JSON.stringify(body).slice(0, 500)}`,
    );

    if (body.images) body.images = await hydrateProductImages(body.images);
    if (body.categories)
      body.categories = await hydrateProductCategories(body.categories);

    if (body.sku) {
      const existingMap = (await kv.get(k.productSku(body.sku))) as {
        id: number;
      } | null;
      if (existingMap?.id != null) {
        const existing = (await kv.get(k.product(existingMap.id))) as
          | any
          | null;
        if (existing) {
          // ── Recycled-SKU detection ────────────────────────────────────────
          // Logicom doesn't always call DELETE when a user deletes a product
          // in their UI — it just reuses the SKU for a different product.
          // Without intervention, our idempotent POST would merge the new
          // product's name over the old product's record, keeping the old
          // price/images/category — a "Frankenstein" record.
          //
          // If the incoming POST has a different name (with a name set), or
          // the existing record was already trashed, treat it as a true
          // recreate: wipe stale fields, regenerate the picture slot.
          const incomingName = String(body.name ?? "").trim();
          const existingName = String(existing.name ?? "").trim();
          const isRecreation =
            existing.status === "trash" ||
            (incomingName !== "" &&
              existingName !== "" &&
              incomingName !== existingName);

          if (isRecreation) {
            console.log(
              `[wc-product-create] RECYCLED SKU "${body.sku}" — old name="${existingName}" new name="${incomingName}" → resetting product`,
            );
            // Build a fresh product with default fields, only keeping the id+sku
            const reset = {
              id: existingMap.id,
              sku: body.sku,
              name: "",
              slug: "",
              description: "",
              short_description: "",
              regular_price: "",
              sale_price: "",
              manage_stock: false,
              stock_quantity: 0,
              stock_status: "instock",
              status: "publish",
              categories: [],
              attributes: [],
              images: [],
              meta_data: [],
              date_created: new Date().toISOString(),
              date_modified: new Date().toISOString(),
            };
            const fresh = {
              ...reset,
              ...body,
              id: existingMap.id,
              date_created: reset.date_created,
              date_modified: reset.date_modified,
            };
            await kv.set(k.product(existingMap.id), fresh);
            return c.json(wcProductShape(fresh), 201);
          }

          // Genuine idempotent retry — same SKU, same name → merge as before
          const merged = {
            ...existing,
            ...body,
            id: existingMap.id,
            date_modified: new Date().toISOString(),
          };
          await kv.set(k.product(existingMap.id), merged);
          console.log(
            `[wc-product-create] idempotent retry of sku="${body.sku}" → returning existing id=${existingMap.id}`,
          );
          return c.json(wcProductShape(merged), 200);
        }
      }
    }

    const id = await safeIncomingId("product", body.id);
    const now = new Date().toISOString();
    const product: any = {
      id,
      sku: body.sku ?? "",
      name: body.name ?? "",
      slug: body.slug ?? slugify(body.name ?? `product-${id}`),
      description: body.description ?? "",
      short_description: body.short_description ?? "",
      regular_price: String(body.regular_price ?? ""),
      sale_price: String(body.sale_price ?? ""),
      manage_stock: body.manage_stock === true,
      stock_quantity: Number(body.stock_quantity ?? 0),
      stock_status: body.stock_status ?? "instock",
      categories: body.categories ?? [],
      attributes: body.attributes ?? [],
      images: body.images ?? [],
      meta_data: body.meta_data ?? [],
      ...body,
      id,
      date_created: now,
      date_modified: now,
    };
    product.stock_status = deriveStockStatus(product);
    await kv.set(k.product(id), product);
    if (product.sku) await kv.set(k.productSku(product.sku), { id });
    return c.json(wcProductShape(product), 201);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.put(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_product_id",
      "Invalid ID.",
      404,
    );
  }
  try {
    const body = await c.req.json();
    // Log the full payload so we can diagnose issues like "Logicom isn't
    // actually sending the new price/image" — invaluable for debugging.
    console.log(
      `[wc-product-update] id=${id} body=${JSON.stringify(body).slice(0, 800)}`,
    );
    if (body.categories)
      body.categories = await hydrateProductCategories(body.categories);
    let mergedImages: any[] | undefined;
    if (body.images !== undefined) {
      const hydrated = await hydrateProductImages(body.images);
      // Default = REPLACE (matches real WC). Pass `merge_images: true` if a
      // sync tool sends photos one at a time and expects them to accumulate.
      const merge =
        body.merge_images === true || c.req.query("merge_images") === "true";
      mergedImages = mergeImages(
        (existing as any).images ?? [],
        hydrated,
        merge,
      );
      console.log(
        `[wc-product-update] id=${existing.id} images: incoming=${hydrated.length} ${merge ? "merge" : "replace"} → final=${mergedImages.length}`,
      );
    }
    const next: any = {
      ...existing,
      ...body,
      ...(mergedImages !== undefined ? { images: mergedImages } : {}),
      id: Number(id),
      date_modified: new Date().toISOString(),
    };
    // Strip the meta-flags so they don't end up persisted on the product
    delete next.replace_images;
    delete next.delete_existing_images;
    delete next.merge_images;
    // Auto-derive stock_status from quantity (real WC behaviour)
    next.stock_status = deriveStockStatus(next);
    await kv.set(k.product(id), next);
    if (next.sku) await kv.set(k.productSku(next.sku), { id: Number(id) });
    return c.json(wcProductShape(next), 200);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

// Helper: parse WC's `?force=true` param (also accepts force=1).
// Standard WooCommerce contract:
//   DELETE /products/:id            → soft trash (status='trash', stays in DB)
//   DELETE /products/:id?force=true → permanent delete (hard remove)
function parseForceFlag(c: any): boolean {
  const v = String(c.req.query("force") ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

// Helper: trash or permanently delete a product. Used by both the ID-based
// and SKU-based delete endpoints below.
//
// CRITICAL: When trashing or deleting, we ALSO clear the SKU index. Otherwise
// when Logicom recreates a product with the same SKU later, our idempotent-
// create logic finds the trashed/deleted record and merges old data (price,
// images) into the "new" product, producing a Frankenstein record with the
// new name but old price/photos.
async function deleteProductInternal(
  existing: any,
  force: boolean,
): Promise<any> {
  const id = Number(existing.id);
  const sku = existing.sku ? String(existing.sku) : "";
  if (force) {
    await kv.del(k.product(id));
    if (sku) await kv.del(k.productSku(sku));
    console.log(`[wc-delete] permanently deleted product id=${id} sku=${sku}`);
    return wcProductShape({ ...existing, id });
  }
  // Soft trash — keep the record (so admins can restore) but unmap the SKU
  // immediately so a fresh sync of the same SKU starts clean.
  const trashed = {
    ...existing,
    id,
    status: "trash",
    date_modified: new Date().toISOString(),
  };
  await kv.set(k.product(id), trashed);
  if (sku) {
    await kv.del(k.productSku(sku));
    console.log(
      `[wc-delete] trashed product id=${id} + cleared sku index "${sku}"`,
    );
  } else {
    console.log(`[wc-delete] trashed product id=${id} (no sku)`);
  }
  return wcProductShape(trashed);
}

app.delete(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_product_id",
      "Invalid ID.",
      404,
    );
  }
  const result = await deleteProductInternal(existing, parseForceFlag(c));
  return c.json(result, 200);
});

// Fallback: delete by SKU. Some sync tools track products by their internal
// SKU, not the WC-assigned ID. Without this, deletes from Logicom that use
// SKU-based reference would silently 404 and the product would stay live.
app.delete(`${WC}/products/by-sku/:sku`, requireApiKey, async (c) => {
  const sku = c.req.param("sku");
  const map = (await kv.get(k.productSku(sku))) as { id: number } | null;
  if (!map?.id) {
    return wcError(
      c,
      "woocommerce_rest_invalid_product_sku",
      "No product with this SKU.",
      404,
    );
  }
  const existing = await kv.get(k.product(map.id));
  if (!existing) {
    // Stale index entry — clean it up
    await kv.del(k.productSku(sku));
    return wcError(
      c,
      "woocommerce_rest_invalid_product_sku",
      "Product missing.",
      404,
    );
  }
  const result = await deleteProductInternal(existing, parseForceFlag(c));
  return c.json(result, 200);
});

// Bulk delete: WC supports POST /products/batch with {delete: [id1, id2, ...]}.
// Logicom may use this when a bulk-sync detects missing items.
app.post(`${WC}/products/batch`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();
    const force = parseForceFlag(c) || body.force === true;
    const out: { deleted: any[]; create: any[]; update: any[] } = {
      deleted: [],
      create: [],
      update: [],
    };
    if (Array.isArray(body.delete)) {
      for (const rawId of body.delete) {
        const existing = await kv.get(k.product(rawId));
        if (existing) {
          out.deleted.push(await deleteProductInternal(existing, force));
        }
      }
    }
    return c.json(out, 200);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

// ─── Product categories ──────────────────────────────────────────────────
// Logicom (and any WC sync tool) calls these endpoints when the user changes
// the "famille d'article" of a product. The protocol:
//   1. Try POST /products/categories with {name, slug}
//   2. If WC returns 400 `term_exists` with `data.resource_id`, use that ID
//   3. Otherwise WC returns 201 with the new category
//   4. PUT /products/:id with `categories: [{id: <that id>}]`
//
// The previous implementation always returned 201 with a fresh timestamp ID,
// so Logicom kept creating duplicate categories on every sync — infinite loop.

// Real WooCommerce ALWAYS lowercases slugs server-side, regardless of what
// the client sends. Logicom relies on this — it sends `slug: "PIVOT"`, expects
// `slug: "pivot"` back, and uses the lowercase form for its internal lookup.
// If we echo "PIVOT" back, Logicom never finds the category in subsequent
// `GET ?slug=pivot` queries and POSTs again, looping forever.
function canonicalSlug(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9À-ſ]+/g, "-") // keep accented chars
    .replace(/^-+|-+$/g, "");
}

// Build WC-style _links so the response shape exactly matches a real
// WooCommerce install (some sync tools parse self.href to extract the id).
// IMPORTANT: hardcode HTTPS — Supabase edge runtime sees requests internally
// as HTTP (TLS terminates at the load balancer), so c.req.url returns http://
// even though the public URL is https://. If we echo http:// in _links and
// Logicom does a verification GET on that URL, it fails — and Logicom may
// interpret that as "category not actually created" and retry the POST.
function categoryLinks(_c: any, id: number) {
  const host = "jvmddidfxabdbtiscdop.supabase.co";
  const root = `https://${host}/functions/v1/make-server-0c561120/wp-json/wc/v3`;
  return {
    self: [{ href: `${root}/products/categories/${id}` }],
    collection: [{ href: `${root}/products/categories` }],
  };
}

// Single source of truth for the category response shape. Field order MUST
// match real WooCommerce exactly so sync tools that do positional / strict
// JSON parsing don't get tripped up.
function categoryShape(c: any, raw: any) {
  const id = Number(raw?.id ?? 0);
  return {
    id,
    name: String(raw?.name ?? ""),
    slug: String(raw?.slug ?? ""),
    parent: Number(raw?.parent ?? 0),
    description: String(raw?.description ?? ""),
    display: String(raw?.display ?? "default"),
    image: raw?.image ?? null,
    menu_order: Number(raw?.menu_order ?? 0),
    count: Number(raw?.count ?? 0),
    _links: categoryLinks(c, id),
  };
}

// Look up a category by its slug. Slug is the canonical WC identifier for
// duplicate detection (matches WordPress's term_taxonomy table behaviour).
// Case-insensitive — handles legacy categories stored with mixed-case slugs.
async function findCategoryBySlug(slug: string): Promise<any | null> {
  if (!slug) return null;
  const target = canonicalSlug(slug);
  const all = (await kv.getByPrefix("wc:category:")) as any[];
  return all.find((c: any) => canonicalSlug(c?.slug ?? "") === target) ?? null;
}

app.get(`${WC}/products/categories`, requireApiKey, async (c) => {
  await seedDefaultsOnce();
  const all = (await kv.getByPrefix("wc:category:")) as any[];
  const slug = c.req.query("slug");
  const search = c.req.query("search");
  let filtered = all;
  if (slug) {
    const target = canonicalSlug(slug);
    filtered = filtered.filter(
      (cat: any) => canonicalSlug(cat?.slug ?? "") === target,
    );
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (cat: any) =>
        String(cat?.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(cat?.slug ?? "")
          .toLowerCase()
          .includes(q),
    );
  }
  filtered.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  const shaped = filtered.map((cat: any) => categoryShape(c, cat));
  console.log(
    `[wc-categories] GET list slug=${slug ?? "-"} search=${search ?? "-"} → ${shaped.length} results`,
  );
  return c.json(paginate(c, shaped));
});

app.get(`${WC}/products/categories/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const cat = await kv.get(k.category(id));
  if (!cat) {
    console.log(`[wc-categories] GET id=${id} → 404`);
    return wcError(
      c,
      "woocommerce_rest_term_invalid",
      "Resource does not exist.",
      404,
    );
  }
  console.log(`[wc-categories] GET id=${id} → 200`);
  return c.json(categoryShape(c, cat));
});

// Backwards-compat alias — the rest of the file still uses these names.
// All new code should use MAX_SAFE_WC_ID_GLOBAL + migrateOversizedId() above.
const MAX_SAFE_WC_ID = MAX_SAFE_WC_ID_GLOBAL;
const migrateOversizedCategoryId = (existing: any) =>
  migrateOversizedId(existing, "category", (id) => k.category(id));

app.post(`${WC}/products/categories`, requireApiKey, async (c) => {
  try {
    await seedDefaultsOnce();
    const body = await c.req.json();
    console.log(`[wc-categories] POST body=${JSON.stringify(body)}`);
    const name = String(body.name ?? "").trim();
    if (!name) {
      return wcError(
        c,
        "woocommerce_rest_category_invalid_name",
        "Name is required.",
        400,
      );
    }
    const slug = canonicalSlug(body.slug ?? name);

    // ── Idempotent create ────────────────────────────────────────────────
    let dup = await findCategoryBySlug(slug);
    if (dup) {
      // First, fix any oversized id from before this migration
      dup = await migrateOversizedCategoryId(dup);

      const strict = String(c.req.query("strict") ?? "").toLowerCase();
      if (strict === "true" || strict === "1") {
        c.status(400);
        return c.json({
          code: "term_exists",
          message:
            "A term with the name provided already exists with this parent.",
          data: { status: 400, resource_id: dup.id },
        });
      }
      // Also rewrite slug if mixed-case was stored before the canonical fix
      const fixed = { ...dup, slug, name: dup.name || name };
      if (dup.slug !== slug) {
        await kv.set(k.category(Number(dup.id)), fixed);
        console.log(
          `[wc-categories] migrated slug "${dup.slug}" → "${slug}" for id=${dup.id}`,
        );
      }
      console.log(
        `[wc-categories] duplicate slug "${slug}" → returning existing id=${dup.id}`,
      );
      return c.json(categoryShape(c, fixed), 201);
    }

    // Use sequential int unless caller explicitly provided a small id
    const id = await safeIncomingId("category", body.id);
    const cat = {
      id,
      name,
      slug,
      parent: Number(body.parent ?? 0),
      description: String(body.description ?? ""),
      display: String(body.display ?? "default"),
      image: body.image ?? null,
      menu_order: Number(body.menu_order ?? 0),
      count: Number(body.count ?? 0),
    };
    await kv.set(k.category(id), cat);
    console.log(`[wc-categories] created id=${id} slug=${slug}`);
    return c.json(categoryShape(c, cat), 201);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.put(`${WC}/products/categories/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.category(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_term_invalid",
      "Resource does not exist.",
      404,
    );
  }
  try {
    const body = await c.req.json();
    // Normalise any slug coming in (lowercase + sanitise)
    const incomingSlug =
      body.slug != null ? canonicalSlug(body.slug) : undefined;
    if (
      incomingSlug &&
      incomingSlug !== canonicalSlug((existing as any).slug ?? "")
    ) {
      const dup = await findCategoryBySlug(incomingSlug);
      if (dup && Number(dup.id) !== Number(id)) {
        c.status(400);
        return c.json({
          code: "term_exists",
          message: "A term with this slug already exists.",
          data: { status: 400, resource_id: dup.id },
        });
      }
    }
    const next = {
      ...existing,
      ...body,
      ...(incomingSlug !== undefined ? { slug: incomingSlug } : {}),
      id: Number(id),
    };
    await kv.set(k.category(id), next);
    console.log(`[wc-categories] PUT id=${id} slug=${(next as any).slug}`);
    return c.json(categoryShape(c, next), 200);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.delete(`${WC}/products/categories/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.category(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_term_invalid",
      "Resource does not exist.",
      404,
    );
  }
  await kv.del(k.category(id));
  console.log(`[wc-categories] DELETE id=${id}`);
  return c.json({ ...categoryShape(c, existing), deleted: true }, 200);
});

// List attributes — needed by Logicom's "characteristics" sync option which
// fetches the full list before deciding whether to create a new attribute.
app.get(`${WC}/products/attributes`, requireApiKey, async (c) => {
  const items = (await kv.getByPrefix("wc:attribute:")) as any[];
  // Filter out term entries (key shape `wc:attribute:<aid>:term:<tid>`)
  const attrs = items.filter(
    (x: any) => x && x.id != null && !("term" in x === false && false),
  );
  // Simpler: by-prefix returns everything; tag terms with a marker so we can
  // skip them. We instead identify attributes by checking the stored shape:
  // attributes have `slug` + `type`, terms don't have `type`.
  const onlyAttrs = items.filter(
    (x: any) => x && typeof x === "object" && "type" in x,
  );
  onlyAttrs.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  return c.json(onlyAttrs);
});

app.get(`${WC}/products/attributes/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.attribute(id));
  if (!existing) {
    return c.json(
      {
        code: "woocommerce_rest_taxonomy_invalid",
        message: "Invalid attribute.",
      },
      404,
    );
  }
  return c.json(existing);
});

app.post(`${WC}/products/attributes`, requireApiKey, async (c) => {
  const body = await c.req.json();
  console.log(
    `[wc-attributes] POST body=${JSON.stringify(body).slice(0, 400)}`,
  );
  // Idempotent: if an attribute with the same slug already exists, return it.
  // This stops Logicom's "characteristics" loop that would otherwise re-POST
  // the same attribute with a fresh huge timestamp id every time.
  const slug = canonicalSlug(body.slug ?? body.name ?? "");
  if (slug) {
    const all = (await kv.getByPrefix("wc:attribute:")) as any[];
    let dup = all.find(
      (x: any) => x && "type" in x && canonicalSlug(x.slug ?? "") === slug,
    );
    if (dup) {
      // Heal any pre-existing oversized id before returning.
      dup = await migrateOversizedId(dup, "attribute", (id) => k.attribute(id));
      console.log(
        `[wc-attributes] duplicate slug "${slug}" → returning existing id=${dup.id}`,
      );
      return c.json(dup, 201);
    }
  }
  const id = await safeIncomingId("attribute", body.id);
  const attr = {
    ...body,
    id,
    name: body.name ?? "",
    slug: slug || canonicalSlug(`attribute-${id}`),
    type: body.type ?? "select",
    order_by: body.order_by ?? "menu_order",
    has_archives: body.has_archives === true,
  };
  await kv.set(k.attribute(id), attr);
  console.log(`[wc-attributes] created id=${id} slug=${attr.slug}`);
  return c.json(attr, 201);
});

app.put(`${WC}/products/attributes/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  let existing = await kv.get(k.attribute(id));
  if (!existing) {
    return c.json(
      {
        code: "woocommerce_rest_taxonomy_invalid",
        message: "Invalid attribute.",
      },
      404,
    );
  }
  // Heal oversized id transparently
  existing = await migrateOversizedId(existing as any, "attribute", (i) =>
    k.attribute(i),
  );
  const body = await c.req.json();
  const next = { ...existing, ...body, id: Number((existing as any).id) };
  await kv.set(k.attribute((existing as any).id), next);
  return c.json(next, 200);
});

app.delete(`${WC}/products/attributes/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.attribute(id));
  if (!existing) {
    return c.json(
      {
        code: "woocommerce_rest_taxonomy_invalid",
        message: "Invalid attribute.",
      },
      404,
    );
  }
  await kv.del(k.attribute(id));
  return c.json({ ...(existing as any), deleted: true });
});

app.get(`${WC}/products/attributes/:attrId/terms`, requireApiKey, async (c) => {
  const attrId = c.req.param("attrId");
  const items = (await kv.getByPrefix(`wc:attribute:${attrId}:term:`)) as any[];
  items.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  return c.json(items);
});

app.post(
  `${WC}/products/attributes/:attrId/terms`,
  requireApiKey,
  async (c) => {
    const attrId = c.req.param("attrId");
    const body = await c.req.json();
    console.log(
      `[wc-attr-terms] POST attrId=${attrId} body=${JSON.stringify(body).slice(0, 400)}`,
    );
    const slug = canonicalSlug(body.slug ?? body.name ?? "");
    if (slug) {
      const all = (await kv.getByPrefix(
        `wc:attribute:${attrId}:term:`,
      )) as any[];
      let dup = all.find((x: any) => x && canonicalSlug(x.slug ?? "") === slug);
      if (dup) {
        dup = await migrateOversizedId(dup, "attribute_term", (id) =>
          k.attrTerm(attrId, id),
        );
        console.log(
          `[wc-attr-terms] duplicate slug "${slug}" → returning existing id=${dup.id}`,
        );
        return c.json(dup, 201);
      }
    }
    const id = await safeIncomingId("attribute_term", body.id);
    const term = {
      ...body,
      id,
      name: body.name ?? "",
      slug: slug || canonicalSlug(`term-${id}`),
    };
    await kv.set(k.attrTerm(attrId, id), term);
    console.log(`[wc-attr-terms] created id=${id} slug=${term.slug}`);
    return c.json(term, 201);
  },
);

app.put(
  `${WC}/products/attributes/:attrId/terms/:id`,
  requireApiKey,
  async (c) => {
    const attrId = c.req.param("attrId");
    const id = c.req.param("id");
    let existing = await kv.get(k.attrTerm(attrId, id));
    if (!existing) {
      return c.json(
        { code: "woocommerce_rest_term_invalid", message: "Invalid term ID." },
        404,
      );
    }
    existing = await migrateOversizedId(
      existing as any,
      "attribute_term",
      (i) => k.attrTerm(attrId, i),
    );
    const body = await c.req.json();
    const next = { ...existing, ...body, id: Number((existing as any).id) };
    await kv.set(k.attrTerm(attrId, (existing as any).id), next);
    return c.json(next, 200);
  },
);

app.delete(
  `${WC}/products/attributes/:attrId/terms/:id`,
  requireApiKey,
  async (c) => {
    const attrId = c.req.param("attrId");
    const id = c.req.param("id");
    const existing = await kv.get(k.attrTerm(attrId, id));
    if (!existing) {
      return c.json(
        { code: "woocommerce_rest_term_invalid", message: "Invalid term ID." },
        404,
      );
    }
    await kv.del(k.attrTerm(attrId, id));
    return c.json({ ...(existing as any), deleted: true });
  },
);

app.get(`${WC}/orders`, requireApiKey, async (c) => {
  const items = (await kv.getByPrefix("wc:order:")) as any[];
  items.sort((a: any, b: any) =>
    Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1,
  );
  return c.json(paginate(c, items));
});

app.put(`${WC}/orders/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.order(id));
  if (!existing) {
    return c.json(
      { code: "woocommerce_rest_invalid_order_id", message: "Invalid order." },
      404,
    );
  }
  const body = await c.req.json();
  const next = { ...existing, ...body, id };
  await kv.set(k.order(id), next);
  return c.json(next, 200);
});

// ─── Customers (commande vente / sales orders prerequisite) ─────────────
// Logicom calls this when syncing customer records before pushing orders.
// Full CRUD with WC-shape responses + idempotent create-by-email.

function wcCustomerShape(c: any) {
  const empty = {
    first_name: "",
    last_name: "",
    company: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    phone: "",
  };
  return {
    id: Number(c?.id ?? 0),
    date_created: c?.date_created ?? new Date().toISOString(),
    date_created_gmt: c?.date_created ?? new Date().toISOString(),
    date_modified:
      c?.date_modified ?? c?.date_created ?? new Date().toISOString(),
    date_modified_gmt:
      c?.date_modified ?? c?.date_created ?? new Date().toISOString(),
    email: String(c?.email ?? ""),
    first_name: String(c?.first_name ?? ""),
    last_name: String(c?.last_name ?? ""),
    role: String(c?.role ?? "customer"),
    username: String(c?.username ?? c?.email ?? `customer-${c?.id}`),
    billing: { ...empty, ...(c?.billing ?? {}) },
    shipping: { ...empty, ...(c?.shipping ?? {}) },
    is_paying_customer: Boolean(c?.is_paying_customer ?? false),
    avatar_url: String(c?.avatar_url ?? ""),
    meta_data: Array.isArray(c?.meta_data) ? c.meta_data : [],
    _links: {
      self: [{ href: `${c?._links?.self?.[0]?.href ?? ""}` }],
      collection: [{ href: "" }],
    },
  };
}

async function findCustomerByEmail(email: string): Promise<any | null> {
  if (!email) return null;
  const all = (await kv.getByPrefix("wc:customer:")) as any[];
  const target = email.trim().toLowerCase();
  return (
    all.find((cus: any) => String(cus?.email ?? "").toLowerCase() === target) ??
    null
  );
}

app.get(`${WC}/customers`, requireApiKey, async (c) => {
  const all = (await kv.getByPrefix("wc:customer:")) as any[];
  const email = c.req.query("email");
  const search = c.req.query("search");
  let filtered = all;
  if (email)
    filtered = filtered.filter(
      (cu: any) =>
        String(cu?.email ?? "").toLowerCase() === email.toLowerCase(),
    );
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((cu: any) =>
      [cu?.email, cu?.first_name, cu?.last_name, cu?.company]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  filtered.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  return c.json(paginate(c, filtered.map(wcCustomerShape)));
});

app.get(`${WC}/customers/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const cus = await kv.get(k.customer(id));
  if (!cus) {
    return wcError(
      c,
      "woocommerce_rest_invalid_id",
      "Invalid resource ID.",
      404,
    );
  }
  return c.json(wcCustomerShape(cus));
});

app.post(`${WC}/customers`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();
    const email = String(body.email ?? "").trim();

    // Idempotent create — Logicom doesn't parse `resource_id` from the
    // standard 400 `registration-error-email-exists` error, so we return
    // 201 with the existing customer as if we just created it.
    // Add `?strict=true` to opt back into the standard WC error behaviour.
    if (email) {
      const dup = await findCustomerByEmail(email);
      if (dup) {
        const strict = String(c.req.query("strict") ?? "").toLowerCase();
        if (strict === "true" || strict === "1") {
          c.status(400);
          return c.json({
            code: "registration-error-email-exists",
            message:
              "An account is already registered with this email address.",
            data: { status: 400, resource_id: dup.id },
          });
        }
        console.log(
          `[wc-customers] duplicate email "${email}" → returning existing id=${dup.id}`,
        );
        return c.json(wcCustomerShape(dup), 201);
      }
    }

    const id = await safeIncomingId("customer", body.id);
    const now = new Date().toISOString();
    const customer = {
      id,
      email,
      first_name: String(body.first_name ?? ""),
      last_name: String(body.last_name ?? ""),
      role: String(body.role ?? "customer"),
      username: String(body.username ?? email ?? `customer-${id}`),
      billing: body.billing ?? {},
      shipping: body.shipping ?? {},
      is_paying_customer: Boolean(body.is_paying_customer ?? false),
      meta_data: Array.isArray(body.meta_data) ? body.meta_data : [],
      date_created: now,
      date_modified: now,
    };
    await kv.set(k.customer(id), customer);
    return c.json(wcCustomerShape(customer), 201);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.put(`${WC}/customers/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.customer(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_id",
      "Invalid resource ID.",
      404,
    );
  }
  try {
    const body = await c.req.json();
    // Reject email change to one already used by another customer
    if (body.email && body.email !== (existing as any).email) {
      const dup = await findCustomerByEmail(String(body.email));
      if (dup && Number(dup.id) !== Number(id)) {
        c.status(400);
        return c.json({
          code: "registration-error-email-exists",
          message: "Another account is already registered with this email.",
          data: { status: 400, resource_id: dup.id },
        });
      }
    }
    const next = {
      ...existing,
      ...body,
      id: Number(id),
      date_modified: new Date().toISOString(),
    };
    await kv.set(k.customer(id), next);
    return c.json(wcCustomerShape(next), 200);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.delete(`${WC}/customers/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.customer(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_id",
      "Invalid resource ID.",
      404,
    );
  }
  await kv.del(k.customer(id));
  return c.json({ ...wcCustomerShape(existing), deleted: true }, 200);
});

// ─── Sales orders (commande vente) — also commonly missing ─────────────
// `GET /orders` already exists. Add POST/GET-by-id/DELETE so Logicom can
// push real orders once customers are in place.
app.get(`${WC}/orders/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const order = await kv.get(k.order(id));
  if (!order) {
    return wcError(
      c,
      "woocommerce_rest_invalid_order_id",
      "Invalid order.",
      404,
    );
  }
  return c.json(order);
});

app.post(`${WC}/orders`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();
    const id = await safeIncomingId("order", body.id);
    const now = new Date().toISOString();
    const order = {
      id,
      number: String(id),
      status: String(body.status ?? "pending"),
      currency: String(body.currency ?? "DZD"),
      customer_id: Number(body.customer_id ?? 0),
      billing: body.billing ?? {},
      shipping: body.shipping ?? {},
      payment_method: String(body.payment_method ?? ""),
      payment_method_title: String(body.payment_method_title ?? ""),
      transaction_id: String(body.transaction_id ?? ""),
      line_items: Array.isArray(body.line_items) ? body.line_items : [],
      total: String(body.total ?? "0"),
      subtotal: String(body.subtotal ?? body.total ?? "0"),
      total_tax: String(body.total_tax ?? "0"),
      shipping_total: String(body.shipping_total ?? "0"),
      meta_data: Array.isArray(body.meta_data) ? body.meta_data : [],
      date_created: now,
      date_modified: now,
    };
    await kv.set(k.order(id), order);
    return c.json(order, 201);
  } catch (e) {
    return wcError(c, "woocommerce_rest_invalid_payload", String(e), 400);
  }
});

app.delete(`${WC}/orders/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.order(id));
  if (!existing) {
    return wcError(
      c,
      "woocommerce_rest_invalid_order_id",
      "Invalid order.",
      404,
    );
  }
  await kv.del(k.order(id));
  return c.json({ ...existing, deleted: true }, 200);
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
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
]);
const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

app.post(`${WP}/media`, requireApiKey, async (c) => {
  try {
    const contentType = (c.req.header("Content-Type") ?? "").toLowerCase();
    const dispoHeader = c.req.header("Content-Disposition") ?? "";
    const filenameMatch = dispoHeader.match(
      /filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i,
    );
    let filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "";

    let sourceUrl = "";
    let mimeType = "";
    let filesize = 0;

    if (contentType.includes("multipart/form-data")) {
      // Multipart form upload
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return wcError(c, "rest_upload_no_data", "No data supplied.", 400);
      }
      filename = filename || file.name || `upload-${Date.now()}.bin`;
      mimeType = file.type || "application/octet-stream";
      if (!ALLOWED_MEDIA_MIME.has(mimeType)) {
        return wcError(
          c,
          "rest_upload_invalid_type",
          `MIME ${mimeType} not allowed`,
          415,
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      filesize = bytes.byteLength;
      if (filesize > MAX_MEDIA_BYTES) {
        return wcError(c, "rest_upload_too_large", "File exceeds 10MB", 413);
      }
      const up = await uploadFileToStorage(filename, bytes, mimeType);
      sourceUrl = up.url;
    } else if (
      contentType.startsWith("image/") ||
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/") ||
      contentType === "application/pdf"
    ) {
      // Raw binary upload (the WordPress REST canonical way)
      mimeType = contentType.split(";")[0].trim();
      if (!ALLOWED_MEDIA_MIME.has(mimeType)) {
        return wcError(
          c,
          "rest_upload_invalid_type",
          `MIME ${mimeType} not allowed`,
          415,
        );
      }
      const buf = await c.req.arrayBuffer();
      const bytes = new Uint8Array(buf);
      filesize = bytes.byteLength;
      if (filesize > MAX_MEDIA_BYTES) {
        return wcError(c, "rest_upload_too_large", "File exceeds 10MB", 413);
      }
      const ext = mimeType.split("/")[1] || "bin";
      filename = filename || `upload-${Date.now()}.${ext}`;
      const up = await uploadFileToStorage(filename, bytes, mimeType);
      sourceUrl = up.url;
    } else {
      // JSON fallback (source_url provided externally)
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {
        return wcError(c, "rest_upload_no_data", "No data supplied.", 400);
      }
      sourceUrl = String(body.source_url ?? body.url ?? "");
      if (!sourceUrl) {
        return wcError(
          c,
          "rest_upload_no_data",
          "No source_url provided.",
          400,
        );
      }
      filename =
        filename || body.filename || body.title || `media-${Date.now()}.jpg`;
      mimeType = String(body.mime_type ?? "image/jpeg");
    }

    const id = await nextId("media");
    const now = new Date().toISOString();
    const stored = {
      id,
      filename,
      slug: slugify(filename.replace(/\.[^/.]+$/, "")) || `media-${id}`,
      source_url: sourceUrl,
      mime_type: mimeType,
      filesize,
      width: 0,
      height: 0,
      alt_text: "",
      title: filename.replace(/\.[^/.]+$/, ""),
      title_rendered: filename.replace(/\.[^/.]+$/, ""),
      date_created: now,
    };
    await kv.set(k.media(id), stored);
    return c.json(wpMediaShape(stored), 201);
  } catch (e) {
    return wcError(c, "rest_upload_sideload_error", String(e), 500);
  }
});

app.get(`${WP}/media`, requireApiKey, async (c) => {
  const items = (await kv.getByPrefix("wp:media:")) as any[];
  items.sort((a: any, b: any) =>
    Number(a?.id ?? 0) < Number(b?.id ?? 0) ? 1 : -1,
  );
  const page = paginate(c, items).map((m) => wpMediaShape(m));
  return c.json(page);
});

app.get(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, "rest_post_invalid_id", "Invalid attachment ID.", 404);
  }
  return c.json(wpMediaShape(existing));
});

app.put(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, "rest_post_invalid_id", "Invalid attachment ID.", 404);
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
    return wcError(c, "rest_invalid_payload", String(e), 400);
  }
});

app.delete(`${WP}/media/:id`, requireApiKey, async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(k.media(id));
  if (!existing) {
    return wcError(c, "rest_post_invalid_id", "Invalid attachment ID.", 404);
  }
  await kv.del(k.media(id));
  return c.json({ deleted: true, previous: wpMediaShape(existing) });
});

app.all(`${WC}/*`, (c) =>
  c.json(
    { code: "rest_no_route", message: "No route was found matching the URL." },
    404,
  ),
);

Deno.serve(app.fetch);
