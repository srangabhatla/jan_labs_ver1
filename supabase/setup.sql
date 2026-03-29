-- ============================================================
--  Janardhan Labs — Supabase Setup
--  Paste this entire file into the Supabase SQL Editor and run.
--  Supabase Auth is enabled by default — no setup needed for auth.users
-- ============================================================

-- ── 1. USAGE LOGS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id      text        NOT NULL,
  tokens_used integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Index for fast 24-hour usage lookups per user
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_time
  ON public.usage_logs (user_id, created_at DESC);

-- Index for per-app analytics
CREATE INDEX IF NOT EXISTS idx_usage_logs_app
  ON public.usage_logs (app_id, created_at DESC);

-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────────────────
-- Enable RLS — no direct client access without policy
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage logs (for a "your usage" dashboard)
CREATE POLICY "Users can view own usage"
  ON public.usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE from client — proxy uses service key
-- Service key bypasses RLS entirely, so no INSERT policy needed

-- ── 3. USER PROFILES TABLE (optional but useful) ─────────────────────────
-- Extends auth.users with display info and preferences
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  created_at    timestamptz DEFAULT now(),
  last_seen_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. DAILY USAGE VIEW ──────────────────────────────────────────────────
-- Fast lookup for current day's usage per user (used by proxy for rate limiting)
CREATE OR REPLACE VIEW public.daily_usage AS
  SELECT
    user_id,
    app_id,
    SUM(tokens_used)  AS tokens_today,
    COUNT(*)          AS request_count
  FROM public.usage_logs
  WHERE created_at > now() - INTERVAL '24 hours'
  GROUP BY user_id, app_id;

-- ── 5. ANALYTICS VIEW (your portfolio dashboard) ─────────────────────────
CREATE OR REPLACE VIEW public.app_analytics AS
  SELECT
    app_id,
    DATE_TRUNC('day', created_at)   AS day,
    COUNT(DISTINCT user_id)         AS unique_users,
    COUNT(*)                        AS total_requests,
    SUM(tokens_used)                AS total_tokens
  FROM public.usage_logs
  GROUP BY app_id, DATE_TRUNC('day', created_at)
  ORDER BY day DESC, total_requests DESC;

-- ── 6. SUPABASE AUTH CONFIG ──────────────────────────────────────────────
-- In Supabase Dashboard → Authentication → Settings:
--   • Enable "Email" provider ✓
--   • Disable "Confirm email" — use magic link / OTP instead ✓
--   • Set "Email OTP expiry" to 3600 (1 hour)
--   • Add your site URL to "Site URL" and "Redirect URLs"
--     e.g. https://janardhan.dev and http://localhost:3000

-- ── 7. VERIFICATION QUERY ────────────────────────────────────────────────
-- Run this after setup to confirm tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
-- Expected: profiles, usage_logs
