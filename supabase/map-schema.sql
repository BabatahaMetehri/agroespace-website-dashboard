-- AGROESPACE v4 — Executer dans Supabase SQL Editor
-- ──────────────────────────────────────────────────
-- ETAPE 1: Tables (si premiere installation)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  install_year INTEGER, year_seq INTEGER,
  status TEXT DEFAULT 'active',
  lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  cover_url TEXT,
  customer_name TEXT NOT NULL, customer_contact TEXT,
  customer_phone TEXT, customer_email TEXT,
  wilaya TEXT, commune TEXT, address TEXT,
  pivot_model TEXT, pivot_brand TEXT DEFAULT 'Western Irrigation',
  pivot_spans INTEGER, pivot_length_m NUMERIC, pivot_area_ha NUMERIC,
  pivot_tower_spacing_m NUMERIC DEFAULT 57,
  pivot_end_gun TEXT, pivot_drive TEXT,
  pressure_bar NUMERIC, flow_rate_m3h NUMERIC,
  application_rate_mmh NUMERIC, speed_pct INTEGER, cycle_h INTEGER,
  control_panel TEXT, power_supply TEXT, telemetry TEXT, cable_length_m INTEGER,
  crop TEXT, soil_type TEXT, irrigation_type TEXT,
  water_source TEXT, well_depth_m INTEGER, water_quality TEXT, pump_kw NUMERIC,
  installation_date DATE, warranty_until DATE,
  last_service DATE, next_service DATE,
  technician TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL, type TEXT DEFAULT 'routine',
  description TEXT NOT NULL, technician TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS installation_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
  log_id UUID REFERENCES maintenance_logs(id) ON DELETE SET NULL,
  url TEXT NOT NULL, is_cover BOOLEAN DEFAULT false,
  caption TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- ETAPE 2: Securite (DROP d'abord pour eviter erreur)
-- ──────────────────────────────────────────────────
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_inst" ON installations;
DROP POLICY IF EXISTS "auth_logs" ON maintenance_logs;
DROP POLICY IF EXISTS "auth_photos" ON installation_photos;
DROP POLICY IF EXISTS "auth_all_inst" ON installations;
DROP POLICY IF EXISTS "auth_all_logs" ON maintenance_logs;
DROP POLICY IF EXISTS "auth_read_inst" ON installations;
DROP POLICY IF EXISTS "auth_insert_inst" ON installations;
DROP POLICY IF EXISTS "auth_update_inst" ON installations;
DROP POLICY IF EXISTS "auth_delete_inst" ON installations;
DROP POLICY IF EXISTS "auth_read_logs" ON maintenance_logs;
DROP POLICY IF EXISTS "auth_insert_logs" ON maintenance_logs;
DROP POLICY IF EXISTS "auth_update_logs" ON maintenance_logs;
DROP POLICY IF EXISTS "auth_delete_logs" ON maintenance_logs;

CREATE POLICY "auth_inst" ON installations FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "auth_logs" ON maintenance_logs FOR ALL USING (auth.role()='authenticated');
CREATE POLICY "auth_photos" ON installation_photos FOR ALL USING (auth.role()='authenticated');

-- ──────────────────────────────────────────────────
-- ETAPE 3: Nouvelles colonnes (migration depuis v3)
-- ──────────────────────────────────────────────────
ALTER TABLE installations ADD COLUMN IF NOT EXISTS install_year INTEGER;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS year_seq INTEGER;
ALTER TABLE installations ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE installation_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- ──────────────────────────────────────────────────
-- ETAPE 4: Backfill annee et sequence
-- ──────────────────────────────────────────────────
UPDATE installations
  SET install_year = EXTRACT(YEAR FROM COALESCE(installation_date, created_at))::INTEGER
  WHERE install_year IS NULL;
