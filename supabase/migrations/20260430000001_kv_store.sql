-- AGROESPACE — KV store for the make-server-0c561120 edge function.
-- Stores quotes, blog posts, blog counters (views/likes) and the
-- WooCommerce-mirror data (products, categories, attributes, orders,
-- customers, media). The edge function uses the service_role key, so RLS
-- is enabled with no policies: only the function can read/write.

CREATE TABLE IF NOT EXISTS public.kv_store_0c561120 (
  key   TEXT  NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE public.kv_store_0c561120 ENABLE ROW LEVEL SECURITY;

-- The PRIMARY KEY constraint already creates a btree index on `key`,
-- which Postgres uses for "key LIKE 'prefix%'" prefix scans. No extra
-- index needed.

-- Service-role bypasses RLS by design. We grant the table explicitly so
-- it's visible to PostgREST's schema cache without requiring a manual
-- "Reload schema cache" click in the dashboard.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_0c561120 TO service_role;
