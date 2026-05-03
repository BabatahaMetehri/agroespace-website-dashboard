import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  })
);

const ROOT = '/make-server-0c561120';
const WC = `${ROOT}/wp-json/wc/v3`;
const WP = `${ROOT}/wp-json/wp/v2`;
const ADMIN = `${ROOT}/admin`;
const PUBLIC = `${ROOT}/public`;

// ─── Health ───────────────────────────────────────────────────────────────
app.get(`${ROOT}/health`, (c) => c.json({ status: 'ok' }));

// ─── Public quote intake ──────────────────────────────────────────────────
// The site posts quote requests here without authentication so the public
// QuoteModal can work. We tag them with status="pending".
app.post(`${ROOT}/quotes`, async (c) => {
  try {
    const payload = await c.req.json();
    const id = `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      status: 'pending' as const,
      created_at: payload.created_at ?? new Date().toISOString(),
      ...payload,
    };
    await kv.set(`quote:${id}`, record);
    return c.json({ id, status: 'queued' }, 201);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

// ─── Admin auth middleware ────────────────────────────────────────────────
// Validates the Supabase JWT and checks the user's email against the
// ADMIN_EMAILS allowlist. The list is comma-separated, lower-cased on read.
const adminAuthClient = () => {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env');
  return createClient(url, anon);
};

async function requireAdmin(c: any, next: any) {
  const auth = c.req.header('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return c.json({ code: 'unauthorized', message: 'Missing bearer token' }, 401);
  }
  const token = auth.slice(7).trim();
  try {
    const supabase = adminAuthClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return c.json({ code: 'unauthorized', message: 'Invalid session' }, 401);
    }
    const allowed = (Deno.env.get('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const email = (data.user.email ?? '').toLowerCase();
    if (allowed.length > 0 && !allowed.includes(email)) {
      return c.json(
        { code: 'forbidden', message: 'Account not in admin allowlist' },
        403
      );
    }
    c.set('admin', { id: data.user.id, email });
    await next();
  } catch (e) {
    return c.json({ code: 'unauthorized', message: String(e) }, 401);
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
type BlogPostShape = {
  slug: string;
  title: { fr: string; ar?: string; en?: string };
  excerpt: { fr: string; ar?: string; en?: string };
  body: { fr: string; ar?: string; en?: string };
  category: string;
  date: string;
  image: string;
  gallery?: string[];
  views: number;
  likes: number;
  published: boolean;
  source: 'cms' | 'seed';
  updated_at?: string;
};

const blogKey = (slug: string) => `blog:post:${slug}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

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
    views: Number(raw?.views ?? 0) || 0,
    likes: Number(raw?.likes ?? 0) || 0,
    published: raw?.published !== false,
    source: 'cms',
    updated_at: new Date().toISOString(),
  };
};

app.get(`${ADMIN}/blog`, requireAdmin, async (c) => {
  const items = await kv.getByPrefix('blog:post:');
  return c.json(items);
});

app.get(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param('slug');
  const item = await kv.get(blogKey(slug));
  if (!item) return c.json({ code: 'not_found', message: 'Post not found' }, 404);
  return c.json(item);
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
    return c.json(post, 201);
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
    // Preserve view/like counters across edits.
    post.views = Number(existing.views ?? post.views) || 0;
    post.likes = Number(existing.likes ?? post.likes) || 0;
    if (post.slug !== slug) {
      // Slug change: write under the new key, drop the old one.
      await kv.set(blogKey(post.slug), post);
      await kv.del(blogKey(slug));
    } else {
      await kv.set(blogKey(slug), post);
    }
    return c.json(post);
  } catch (e) {
    return c.json({ code: 'rest_invalid_payload', message: String(e) }, 400);
  }
});

app.delete(`${ADMIN}/blog/:slug`, requireAdmin, async (c) => {
  const slug = c.req.param('slug');
  await kv.del(blogKey(slug));
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
  const items = (await kv.getByPrefix('blog:post:')) as BlogPostShape[];
  return c.json(items.filter((p) => p?.published !== false));
});

app.get(`${PUBLIC}/blog/:slug`, async (c) => {
  const slug = c.req.param('slug');
  const item = await kv.get(blogKey(slug));
  if (!item) return c.json({ code: 'not_found', message: 'Post not found' }, 404);
  return c.json(item);
});

app.post(`${PUBLIC}/blog/:slug/view`, async (c) => {
  const slug = c.req.param('slug');
  const post = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!post) return c.json({ views: 0 });
  const next = { ...post, views: (post.views ?? 0) + 1 };
  await kv.set(blogKey(slug), next);
  return c.json({ views: next.views });
});

app.post(`${PUBLIC}/blog/:slug/like`, async (c) => {
  const slug = c.req.param('slug');
  const dir = c.req.query('dir') === 'down' ? -1 : 1;
  const post = (await kv.get(blogKey(slug))) as BlogPostShape | null;
  if (!post) return c.json({ likes: 0 });
  const next = { ...post, likes: Math.max(0, (post.likes ?? 0) + dir) };
  await kv.set(blogKey(slug), next);
  return c.json({ likes: next.likes });
});

// ─── WooCommerce-mirror API (X-API-KEY) ───────────────────────────────────
function requireApiKey(c: any, next: any) {
  const expected = Deno.env.get('AGROESPACE_API_KEY') ?? 'changeme-set-AGROESPACE_API_KEY';
  const headerKey = c.req.header('X-API-KEY') ?? c.req.header('x-api-key') ?? '';
  const auth = c.req.header('Authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (headerKey !== expected && bearer !== expected) {
    return c.json(
      { code: 'woocommerce_rest_authentication_error', message: 'Invalid or missing API key' },
      401
    );
  }
  return next();
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
  const items = await kv.getByPrefix('wc:product:');
  let filtered = items;
  if (sku) filtered = filtered.filter((p: any) => p?.sku === sku);
  if (fields) {
    const keep = fields.split(',').map((s) => s.trim());
    filtered = filtered.map((p: any) => {
      const out: Record<string, unknown> = {};
      keep.forEach((f) => {
        if (f in p) out[f] = p[f];
      });
      return out;
    });
  }
  return c.json(filtered);
});

app.post(`${WC}/products`, requireApiKey, async (c) => {
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
      images: body.images ?? [],
      ...body,
      date_created: new Date().toISOString(),
    };
    await kv.set(k.product(id), product);
    if (product.sku) await kv.set(k.productSku(product.sku), { id });
    return c.json(product, 201);
  } catch (e) {
    return c.json({ code: 'woocommerce_rest_invalid_payload', message: String(e) }, 400);
  }
});

app.put(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_invalid_product_id', message: 'Invalid ID.' }, 404);
  }
  try {
    const body = await c.req.json();
    const next = { ...existing, ...body, id, date_modified: new Date().toISOString() };
    await kv.set(k.product(id), next);
    if (next.sku) await kv.set(k.productSku(next.sku), { id });
    return c.json(next, 200);
  } catch (e) {
    return c.json({ code: 'woocommerce_rest_invalid_payload', message: String(e) }, 400);
  }
});

app.delete(`${WC}/products/:id`, requireApiKey, async (c) => {
  const id = c.req.param('id');
  const existing = await kv.get(k.product(id));
  if (!existing) {
    return c.json({ code: 'woocommerce_rest_invalid_product_id', message: 'Invalid ID.' }, 404);
  }
  await kv.del(k.product(id));
  if (existing.sku) await kv.del(k.productSku(existing.sku));
  return c.json({ id, deleted: true }, 200);
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
  const items = await kv.getByPrefix('wc:order:');
  return c.json(items);
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

app.post(`${WP}/media`, requireApiKey, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id ?? Date.now();
    const media = {
      id,
      source_url: body.source_url ?? body.url ?? '',
      title: { rendered: body.title ?? '' },
      alt_text: body.alt_text ?? '',
      ...body,
    };
    await kv.set(k.media(id), media);
    return c.json(media, 201);
  } catch (e) {
    return c.json({ code: 'rest_upload_sideload_error', message: String(e) }, 500);
  }
});

app.all(`${WC}/*`, (c) =>
  c.json({ code: 'rest_no_route', message: 'No route was found matching the URL.' }, 404)
);

Deno.serve(app.fetch);
