import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('YOUR_PROJECT_ID') ||
  !rawUrl.startsWith('https://');
const isPlaceholderKey =
  !rawAnonKey ||
  rawAnonKey.includes('YOUR_SUPABASE_ANON_KEY') ||
  rawAnonKey.length < 20;

export const isSupabaseConfigured: boolean = !isPlaceholderUrl && !isPlaceholderKey;

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não está configurado nas variáveis de ambiente.');
    }
    _supabaseClient = createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabaseClient;
}

export const GPC_TABLES = {
  users: 'gpc_users',
  categories: 'gpc_categories',
  products: 'gpc_products',
  affiliateLinks: 'gpc_affiliate_links',
  redirectLinks: 'gpc_redirect_links',
  pages: 'gpc_pages',
  publishedPages: 'gpc_published_pages',
  pageVersions: 'gpc_page_versions',
  userTemplates: 'gpc_user_templates',
  campaigns: 'gpc_campaigns',
  clickEvents: 'gpc_click_events',
  whatsappWidgets: 'gpc_whatsapp_widgets',
  paymentGateways: 'gpc_payment_gateways',
  userSettings: 'gpc_user_settings',
} as const;
