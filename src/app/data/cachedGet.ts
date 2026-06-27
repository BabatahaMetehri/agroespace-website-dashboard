/**
 * cachedGet — invocation-saving fetch wrapper for the *public* edge-function
 * GET endpoints (promo / products / featured / blog / counters).
 *
 * Why this exists
 * ───────────────
 * Every request that reaches a Supabase Edge Function counts as a billable
 * invocation — including ones the in-function rate limiter rejects with 429.
 * So the only way to protect the monthly invocation quota is to call the
 * function *less often*. This helper does two things:
 *
 *   1. localStorage cache with a short TTL — a visitor browsing
 *      Home → Catalog → Blog → back, or returning within a few minutes,
 *      reuses the cached payload instead of re-invoking the function.
 *   2. In-flight de-duplication — if two components request the same URL at
 *      the same moment (e.g. Products + the catalog grid), they share ONE
 *      network request instead of firing two.
 *
 * Public read data (promo banner, product list, blog list) tolerates a few
 * minutes of staleness, so this is safe. Writes (blog view / like) and
 * authenticated admin calls deliberately do NOT go through here.
 */

const VERSION = 'v1'; // bump to invalidate every cached entry after a deploy
const PREFIX = `agroespace.cache.${VERSION}.`;

type Entry<T> = { t: number; data: T };

// Module-level map of requests currently in flight, keyed by URL.
const inFlight = new Map<string, Promise<unknown>>();

function readCache<T>(url: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + url);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.t > ttlMs) {
      localStorage.removeItem(PREFIX + url);
      return null;
    }
    return entry.data;
  } catch {
    return null; // private mode / corrupt entry → treat as miss
  }
}

function writeCache<T>(url: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + url, JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* quota / private mode — caching is best-effort */
  }
}

export interface CachedGetOptions {
  /** Time-to-live for the cached payload, in ms. Default 5 minutes. */
  ttlMs?: number;
  /** Request headers (e.g. the anon-key Authorization header). */
  headers?: HeadersInit;
  /** Value returned when the request fails AND nothing is cached. */
  fallback?: unknown;
}

/**
 * GET `url`, returning a cached copy when one is still fresh. On network or
 * HTTP error, returns the last good cached value if any, otherwise `fallback`.
 */
export async function cachedGet<T>(url: string, opts: CachedGetOptions = {}): Promise<T> {
  const { ttlMs = 5 * 60_000, headers, fallback } = opts;

  const cached = readCache<T>(url, ttlMs);
  if (cached !== null) return cached;

  // Share a single request between concurrent callers for the same URL.
  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      writeCache(url, data);
      return data;
    } catch (err) {
      // Fall back to a stale cache entry (ignoring TTL) before giving up — a
      // brief outage shouldn't blank the page or trigger a retry storm.
      const stale = readCache<T>(url, Number.MAX_SAFE_INTEGER);
      if (stale !== null) return stale;
      if (fallback !== undefined) return fallback as T;
      throw err;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, p);
  return p;
}
