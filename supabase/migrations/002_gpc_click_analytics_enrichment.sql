-- Global Presell Commerce (GPC) — Migration 002: Granular Click & Geo Analytics
-- 100% Additive & Idempotent: Preserves ALL existing tables, rows, products, pages, and events.
-- Safe to run on your active Supabase project (rvgcniaowzmsudzliozf).

ALTER TABLE public.gpc_click_events
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS browser_language TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS browser TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS os TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referrer TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS traffic_source TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clicked_element TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clicked_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clicked_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS page_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS page_slug TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_gpc_click_events_owner_product
  ON public.gpc_click_events (owner_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gpc_click_events_owner_country_city
  ON public.gpc_click_events (owner_id, country, city);

-- Allow public click logging for both published pages AND active /go/:shortCode redirect links
DROP POLICY IF EXISTS "gpc_click_events_public_insert" ON public.gpc_click_events;
CREATE POLICY "gpc_click_events_public_insert" ON public.gpc_click_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gpc_published_pages p
      WHERE p.public_key = gpc_click_events.public_key
        AND p.owner_id = gpc_click_events.owner_id
        AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.gpc_redirect_links r
      WHERE ('go_' || r.short_code) = gpc_click_events.public_key
        AND r.owner_id = gpc_click_events.owner_id
        AND r.is_active = true
    )
  );
