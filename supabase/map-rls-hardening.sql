-- ════════════════════════════════════════════════════════════════════════
-- AGROESPACE — Map app RLS hardening
-- ════════════════════════════════════════════════════════════════════════
-- Run this in the SQL Editor of the MAP Supabase project (the one with
-- project ref `dizeodyknchhaaqifpji`), NOT the main agroespace one.
--
-- Replaces the wide-open "any authenticated user has FULL CRUD" policy
-- (`auth.role()='authenticated'`) with a proper role-based model:
--
--   admin    → full read + write on all three tables
--   engineer → read all + add maintenance_logs and installation_photos
--              (cannot create/edit/delete installations)
--   anyone authenticated but not in profiles → read-only (viewer)
--
-- Roles live in a new `profiles` table keyed by auth.users.id. A trigger
-- auto-creates a `viewer` profile on every signup; you promote users to
-- `engineer` or `admin` manually (see "Adding users" instructions below).
-- ════════════════════════════════════════════════════════════════════════


-- ─── 1. Profiles table + role enum ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE map_role AS ENUM ('admin', 'engineer', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role map_role NOT NULL DEFAULT 'viewer',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile (so the app can show their role); only
-- admins can read every profile or change roles.
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_write" ON profiles;

CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ─── 2. Auto-create profile on signup ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users that already exist
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'viewer'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ─── 3. Helper functions used by RLS ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_engineer_or_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'engineer')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── 4. Drop the old wide-open policies ───────────────────────────────────
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

-- ─── 5. Installations: read = anyone authed, write = admin only ──────────
CREATE POLICY "inst_read_authed" ON installations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "inst_insert_admin" ON installations
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "inst_update_admin" ON installations
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "inst_delete_admin" ON installations
  FOR DELETE USING (public.is_admin());

-- ─── 6. Maintenance logs: read authed, write engineer+admin ──────────────
CREATE POLICY "logs_read_authed" ON maintenance_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "logs_insert_engadmin" ON maintenance_logs
  FOR INSERT WITH CHECK (public.is_engineer_or_admin());

CREATE POLICY "logs_update_engadmin" ON maintenance_logs
  FOR UPDATE USING (public.is_engineer_or_admin())
  WITH CHECK (public.is_engineer_or_admin());

CREATE POLICY "logs_delete_admin" ON maintenance_logs
  FOR DELETE USING (public.is_admin());

-- ─── 7. Installation photos: read authed, write engineer+admin ───────────
CREATE POLICY "photos_read_authed" ON installation_photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "photos_insert_engadmin" ON installation_photos
  FOR INSERT WITH CHECK (public.is_engineer_or_admin());

CREATE POLICY "photos_update_engadmin" ON installation_photos
  FOR UPDATE USING (public.is_engineer_or_admin())
  WITH CHECK (public.is_engineer_or_admin());

CREATE POLICY "photos_delete_admin" ON installation_photos
  FOR DELETE USING (public.is_admin());

-- ─── 8. Promote your account to admin (RUN ONCE, EDIT EMAIL FIRST) ───────
-- Replace the email below with YOUR account's email, then uncomment+run.
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'taha.metehri@agroespace.com';

-- After this migration, to add a new engineer:
--   1. Have them sign up via the map's login screen (or create them in
--      Supabase dashboard → Authentication → Users → Add user)
--   2. Run:  UPDATE public.profiles SET role = 'engineer' WHERE email = 'them@…';
-- To promote to admin:  UPDATE public.profiles SET role = 'admin' WHERE email = '…';
-- To revoke:  UPDATE public.profiles SET role = 'viewer' WHERE email = '…';
