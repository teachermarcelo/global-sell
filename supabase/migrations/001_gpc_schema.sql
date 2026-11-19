-- Global Presell Commerce (GPC) — Idempotent Supabase PostgreSQL Schema
-- Prefix: gpc_* (Zero conflict with any existing tables, functions, triggers, or policies in an active Supabase project)

-- 1. Helper trigger function for updated_at (isolated with gpc_ prefix)
CREATE OR REPLACE FUNCTION public.gpc_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- 2. Users (linked to Supabase Auth uid as text)
CREATE TABLE IF NOT EXISTS public.gpc_users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT 'Afiliado Global',
  photo_url TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  default_lang TEXT NOT NULL DEFAULT 'pt' CHECK (default_lang IN ('pt', 'en', 'es')),
  company_name TEXT NOT NULL DEFAULT '',
  default_policy_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.gpc_categories (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#2563EB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_categories_owner ON public.gpc_categories (owner_id);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.gpc_products (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT '',
  origin_country TEXT NOT NULL DEFAULT 'BR',
  country TEXT NOT NULL DEFAULT 'BR',
  language TEXT NOT NULL DEFAULT 'pt' CHECK (language IN ('pt', 'en', 'es', 'auto')),
  network TEXT NOT NULL DEFAULT 'Hotmart',
  affiliate_url TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR', 'GBP')),
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  producer_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_products_owner ON public.gpc_products (owner_id);

-- 5. Affiliate Links
CREATE TABLE IF NOT EXISTS public.gpc_affiliate_links (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  short_code TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  alternative_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  country TEXT NOT NULL DEFAULT 'BR',
  network TEXT NOT NULL DEFAULT 'Hotmart',
  affiliate_tag TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_affiliate_links_owner ON public.gpc_affiliate_links (owner_id);

-- 6. Public Redirect Links (/go/:shortCode)
CREATE TABLE IF NOT EXISTS public.gpc_redirect_links (
  short_code TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  link_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  destination_url TEXT NOT NULL,
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_redirect_links_owner ON public.gpc_redirect_links (owner_id);

-- 7. Pages (Workspace Drafts & Published Management)
CREATE TABLE IF NOT EXISTS public.gpc_pages (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  parent_page_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_kind TEXT NOT NULL DEFAULT 'presell',
  presell_type TEXT NOT NULL DEFAULT 'cookies_centered',
  funnel_stage TEXT NOT NULL DEFAULT 'bottom',
  language TEXT NOT NULL DEFAULT 'auto',
  origin_country TEXT NOT NULL DEFAULT 'BR',
  target_country TEXT NOT NULL DEFAULT 'BR',
  affiliate_link_id TEXT NOT NULL DEFAULT '',
  affiliate_url TEXT NOT NULL DEFAULT '',
  policy_email_mode TEXT NOT NULL DEFAULT 'producer',
  policy_email TEXT NOT NULL DEFAULT '',
  ghost_mode BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'processing', 'unpublished')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  public_key TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
  payment_config JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
  ab_test JSONB NOT NULL DEFAULT '{"enabled":false,"splitPercent":50}'::jsonb,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_pages_owner ON public.gpc_pages (owner_id);
CREATE INDEX IF NOT EXISTS idx_gpc_pages_public_key ON public.gpc_pages (public_key);

-- 8. Published Pages (Public Read Snapshot for /pt/:slug, /en/:slug, /es/:slug, /p/:slug)
CREATE TABLE IF NOT EXISTS public.gpc_published_pages (
  public_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_kind TEXT NOT NULL DEFAULT 'presell',
  presell_type TEXT NOT NULL DEFAULT 'cookies_centered',
  funnel_stage TEXT NOT NULL DEFAULT 'bottom',
  language TEXT NOT NULL DEFAULT 'auto',
  origin_country TEXT NOT NULL DEFAULT 'BR',
  target_country TEXT NOT NULL DEFAULT 'BR',
  affiliate_url TEXT NOT NULL DEFAULT '',
  policy_email TEXT NOT NULL DEFAULT '',
  ghost_mode BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished')),
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
  payment_config JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
  ab_test JSONB NOT NULL DEFAULT '{"enabled":false,"splitPercent":50}'::jsonb,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_published_pages_slug_status ON public.gpc_published_pages (slug, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gpc_published_pages_owner ON public.gpc_published_pages (owner_id);

-- 9. Page Versions
CREATE TABLE IF NOT EXISTS public.gpc_page_versions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  version_number BIGINT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_page_versions_owner_page ON public.gpc_page_versions (owner_id, page_id, version_number DESC);

-- 10. User Templates
CREATE TABLE IF NOT EXISTS public.gpc_user_templates (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  presell_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_user_templates_owner ON public.gpc_user_templates (owner_id);

-- 11. Campaigns
CREATE TABLE IF NOT EXISTS public.gpc_campaigns (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'google_ads',
  page_id TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  target_country TEXT NOT NULL DEFAULT 'BR',
  daily_budget NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_campaigns_owner ON public.gpc_campaigns (owner_id);

-- 12. Click & Conversion Events (Public Insert for Published Page Visitors & /go/ Redirects)
CREATE TABLE IF NOT EXISTS public.gpc_click_events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  page_id TEXT NOT NULL DEFAULT '',
  public_key TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'affiliate_click', 'whatsapp_click', 'checkout_start', 'conversion')),
  variant TEXT NOT NULL DEFAULT 'A' CHECK (variant IN ('A', 'B')),
  language TEXT NOT NULL DEFAULT 'pt',
  browser_language TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'BR',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop', 'tablet', 'mobile')),
  browser TEXT NOT NULL DEFAULT '',
  os TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  traffic_source TEXT NOT NULL DEFAULT '',
  clicked_element TEXT NOT NULL DEFAULT '',
  clicked_label TEXT NOT NULL DEFAULT '',
  clicked_url TEXT NOT NULL DEFAULT '',
  page_title TEXT NOT NULL DEFAULT '',
  page_slug TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT 'direct',
  utm_medium TEXT NOT NULL DEFAULT 'none',
  utm_campaign TEXT NOT NULL DEFAULT '',
  gateway TEXT NOT NULL DEFAULT '',
  revenue NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_click_events_owner ON public.gpc_click_events (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gpc_click_events_owner_product ON public.gpc_click_events (owner_id, product_id, created_at DESC);

-- 13. WhatsApp Widgets
CREATE TABLE IF NOT EXISTS public.gpc_whatsapp_widgets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  prefilled_message TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  button_label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_whatsapp_widgets_owner ON public.gpc_whatsapp_widgets (owner_id);

-- 14. Payment Gateways
CREATE TABLE IF NOT EXISTS public.gpc_payment_gateways (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  public_key_or_account TEXT NOT NULL DEFAULT '',
  checkout_base_url TEXT NOT NULL DEFAULT '',
  pix_key TEXT NOT NULL DEFAULT '',
  supported_currencies JSONB NOT NULL DEFAULT '["BRL"]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'live' CHECK (mode IN ('live', 'sandbox')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_gpc_payment_gateways_owner ON public.gpc_payment_gateways (owner_id);

-- 15. Workspace Settings
CREATE TABLE IF NOT EXISTS public.gpc_user_settings (
  owner_id TEXT PRIMARY KEY,
  ga4_measurement_id TEXT NOT NULL DEFAULT '',
  gtm_container_id TEXT NOT NULL DEFAULT '',
  google_ads_id TEXT NOT NULL DEFAULT '',
  google_ads_conversion_label TEXT NOT NULL DEFAULT '',
  meta_pixel_id TEXT NOT NULL DEFAULT '',
  head_scripts TEXT NOT NULL DEFAULT '',
  body_scripts TEXT NOT NULL DEFAULT '',
  custom_domain TEXT NOT NULL DEFAULT '',
  auto_detect_visitor_lang BOOLEAN NOT NULL DEFAULT true,
  default_visitor_lang TEXT NOT NULL DEFAULT 'pt' CHECK (default_visitor_lang IN ('pt', 'en', 'es')),
  preserve_affiliate_params BOOLEAN NOT NULL DEFAULT true,
  robots_index_default BOOLEAN NOT NULL DEFAULT true,
  cookie_consent_text_pt TEXT NOT NULL DEFAULT '',
  cookie_consent_text_en TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 16. Updated_at triggers on gpc_* tables (drop & recreate safely)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'gpc_users',
    'gpc_categories',
    'gpc_products',
    'gpc_affiliate_links',
    'gpc_redirect_links',
    'gpc_pages',
    'gpc_published_pages',
    'gpc_user_templates',
    'gpc_campaigns',
    'gpc_whatsapp_widgets',
    'gpc_payment_gateways',
    'gpc_user_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gpc_set_updated_at();',
      tbl,
      tbl
    );
  END LOOP;
END $$;

-- 17. Enable Row-Level Security (RLS) on all gpc_* tables
ALTER TABLE public.gpc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_redirect_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_published_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_whatsapp_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpc_user_settings ENABLE ROW LEVEL SECURITY;

-- 18. RLS Policies (strictly scoped with gpc_ prefix, safe & idempotent)

-- gpc_users
DROP POLICY IF EXISTS "gpc_users_owner_all" ON public.gpc_users;
CREATE POLICY "gpc_users_owner_all" ON public.gpc_users
  FOR ALL TO authenticated
  USING (uid = (SELECT auth.uid())::text)
  WITH CHECK (uid = (SELECT auth.uid())::text);

-- gpc_categories
DROP POLICY IF EXISTS "gpc_categories_owner_all" ON public.gpc_categories;
CREATE POLICY "gpc_categories_owner_all" ON public.gpc_categories
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_products
DROP POLICY IF EXISTS "gpc_products_owner_all" ON public.gpc_products;
CREATE POLICY "gpc_products_owner_all" ON public.gpc_products
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_affiliate_links
DROP POLICY IF EXISTS "gpc_affiliate_links_owner_all" ON public.gpc_affiliate_links;
CREATE POLICY "gpc_affiliate_links_owner_all" ON public.gpc_affiliate_links
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_redirect_links (Owner manages, Anyone can read active redirects)
DROP POLICY IF EXISTS "gpc_redirect_links_owner_all" ON public.gpc_redirect_links;
CREATE POLICY "gpc_redirect_links_owner_all" ON public.gpc_redirect_links
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "gpc_redirect_links_public_read" ON public.gpc_redirect_links;
CREATE POLICY "gpc_redirect_links_public_read" ON public.gpc_redirect_links
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- gpc_pages
DROP POLICY IF EXISTS "gpc_pages_owner_all" ON public.gpc_pages;
CREATE POLICY "gpc_pages_owner_all" ON public.gpc_pages
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_published_pages (Owner manages, Anyone can read published pages)
DROP POLICY IF EXISTS "gpc_published_pages_owner_all" ON public.gpc_published_pages;
CREATE POLICY "gpc_published_pages_owner_all" ON public.gpc_published_pages
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "gpc_published_pages_public_read" ON public.gpc_published_pages;
CREATE POLICY "gpc_published_pages_public_read" ON public.gpc_published_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- gpc_page_versions
DROP POLICY IF EXISTS "gpc_page_versions_owner_all" ON public.gpc_page_versions;
CREATE POLICY "gpc_page_versions_owner_all" ON public.gpc_page_versions
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_user_templates
DROP POLICY IF EXISTS "gpc_user_templates_owner_all" ON public.gpc_user_templates;
CREATE POLICY "gpc_user_templates_owner_all" ON public.gpc_user_templates
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_campaigns
DROP POLICY IF EXISTS "gpc_campaigns_owner_all" ON public.gpc_campaigns;
CREATE POLICY "gpc_campaigns_owner_all" ON public.gpc_campaigns
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_click_events (Owner reads, Visitors can insert events for published pages)
DROP POLICY IF EXISTS "gpc_click_events_owner_read" ON public.gpc_click_events;
CREATE POLICY "gpc_click_events_owner_read" ON public.gpc_click_events
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid())::text);

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

-- gpc_whatsapp_widgets
DROP POLICY IF EXISTS "gpc_whatsapp_widgets_owner_all" ON public.gpc_whatsapp_widgets;
CREATE POLICY "gpc_whatsapp_widgets_owner_all" ON public.gpc_whatsapp_widgets
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_payment_gateways
DROP POLICY IF EXISTS "gpc_payment_gateways_owner_all" ON public.gpc_payment_gateways;
CREATE POLICY "gpc_payment_gateways_owner_all" ON public.gpc_payment_gateways
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);

-- gpc_user_settings
DROP POLICY IF EXISTS "gpc_user_settings_owner_all" ON public.gpc_user_settings;
CREATE POLICY "gpc_user_settings_owner_all" ON public.gpc_user_settings
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())::text)
  WITH CHECK (owner_id = (SELECT auth.uid())::text);
