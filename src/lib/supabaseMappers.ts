import {
  ABTestConfig,
  AffiliateLink,
  Campaign,
  Category,
  ClickEvent,
  LanguageCode,
  PageBlock,
  PageItem,
  PageLanguageSetting,
  PagePaymentConfig,
  PageSeo,
  PageTheme,
  PageTracking,
  PageTranslationContent,
  PageVersion,
  PageWhatsappConfig,
  PaymentGateway,
  PaymentProvider,
  PresellType,
  Product,
  PublishedPage,
  TimestampLike,
  UserProfile,
  UserTemplate,
  UserWorkspaceSettings,
  WhatsappWidget,
} from '../types';

export function toTimestampLike(input: unknown): TimestampLike {
  if (
    input &&
    typeof input === 'object' &&
    'toMillis' in input &&
    typeof (input as TimestampLike).toMillis === 'function'
  ) {
    return input as TimestampLike;
  }
  const ms =
    typeof input === 'string' || typeof input === 'number'
      ? Date.parse(String(input)) || (typeof input === 'number' ? input : Date.now())
      : input instanceof Date
      ? input.getTime()
      : Date.now();
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  return {
    seconds: Math.floor(safeMs / 1000),
    nanoseconds: (safeMs % 1000) * 1_000_000,
    toMillis: () => safeMs,
    toDate: () => new Date(safeMs),
  };
}

export function mapRowToUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    uid: String(row.uid || ''),
    displayName: String(row.display_name || 'Afiliado Global'),
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
    plan: (row.plan as UserProfile['plan']) || 'pro',
    defaultLang: (row.default_lang as LanguageCode) || 'pt',
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    description: row.description ? String(row.description) : '',
    color: row.color ? String(row.color) : '#2563EB',
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    name: String(row.name || ''),
    description: row.description ? String(row.description) : '',
    imageUrl: row.image_url ? String(row.image_url) : '',
    categoryId: row.category_id ? String(row.category_id) : '',
    originCountry: row.origin_country ? String(row.origin_country) : 'BR',
    country: String(row.country || 'BR'),
    language: (row.language as PageLanguageSetting) || 'pt',
    network: row.network ? String(row.network) : 'Hotmart',
    affiliateUrl: String(row.affiliate_url || ''),
    price: Number(row.price || 0),
    currency: (row.currency as Product['currency']) || 'BRL',
    commissionRate: Number(row.commission_rate || 0),
    producerEmail: row.producer_email ? String(row.producer_email) : '',
    status: (row.status as Product['status']) || 'active',
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToAffiliateLink(row: Record<string, unknown>): AffiliateLink {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    productId: row.product_id ? String(row.product_id) : '',
    label: String(row.label || ''),
    shortCode: String(row.short_code || ''),
    destinationUrl: String(row.destination_url || ''),
    alternativeUrls: Array.isArray(row.alternative_urls)
      ? (row.alternative_urls as string[])
      : [],
    country: row.country ? String(row.country) : 'BR',
    network: row.network ? String(row.network) : 'Hotmart',
    affiliateTag: row.affiliate_tag ? String(row.affiliate_tag) : '',
    utmSource: row.utm_source ? String(row.utm_source) : '',
    utmMedium: row.utm_medium ? String(row.utm_medium) : '',
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : '',
    buttonText: row.button_text ? String(row.button_text) : '',
    isPrimary: Boolean(row.is_primary),
    isActive: row.is_active !== false,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToPage(row: Record<string, unknown>): PageItem {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    parentPageId: row.parent_page_id ? String(row.parent_page_id) : '',
    productId: row.product_id ? String(row.product_id) : '',
    categoryId: row.category_id ? String(row.category_id) : '',
    templateId: row.template_id ? String(row.template_id) : '',
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    pageKind: (row.page_kind as PageItem['pageKind']) || 'presell',
    presellType: (row.presell_type as PresellType) || 'cookies_centered',
    funnelStage: (row.funnel_stage as PageItem['funnelStage']) || 'bottom',
    language: (row.language as PageLanguageSetting) || 'auto',
    originCountry: row.origin_country ? String(row.origin_country) : 'BR',
    targetCountry: row.target_country ? String(row.target_country) : 'BR',
    affiliateLinkId: row.affiliate_link_id ? String(row.affiliate_link_id) : '',
    affiliateUrl: row.affiliate_url ? String(row.affiliate_url) : '',
    policyEmailMode: (row.policy_email_mode as 'producer' | 'custom') || 'producer',
    policyEmail: row.policy_email ? String(row.policy_email) : '',
    ghostMode: Boolean(row.ghost_mode),
    status: (row.status as PageItem['status']) || 'draft',
    sortOrder: Number(row.sort_order ?? 0),
    publicKey: row.public_key ? String(row.public_key) : '',
    blocks: Array.isArray(row.blocks) ? (row.blocks as PageBlock[]) : [],
    theme: (row.theme as PageTheme) || {
      primaryColor: '#0F172A',
      accentColor: '#16A34A',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      showHeader: true,
      showFooter: true,
      borderRadius: 'md',
    },
    seo: (row.seo as PageSeo) || {
      metaTitle: String(row.title || ''),
      metaDescription: '',
      robotsIndex: true,
    },
    tracking: (row.tracking as PageTracking) || {},
    whatsapp: (row.whatsapp as PageWhatsappConfig) || { enabled: false },
    paymentConfig: (row.payment_config as PagePaymentConfig) || { enabled: false },
    abTest: (row.ab_test as ABTestConfig) || { enabled: false, splitPercent: 50 },
    translations:
      (row.translations as Partial<Record<LanguageCode, PageTranslationContent>>) || {},
    publishedAt: row.published_at ? toTimestampLike(row.published_at) : null,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToPublishedPage(row: Record<string, unknown>): PublishedPage {
  return {
    ownerId: String(row.owner_id || ''),
    pageId: String(row.page_id || ''),
    productId: row.product_id ? String(row.product_id) : '',
    publicKey: String(row.public_key || ''),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    pageKind: (row.page_kind as PublishedPage['pageKind']) || 'presell',
    presellType: (row.presell_type as PresellType) || 'cookies_centered',
    funnelStage: (row.funnel_stage as PublishedPage['funnelStage']) || 'bottom',
    language: (row.language as PageLanguageSetting) || 'auto',
    originCountry: row.origin_country ? String(row.origin_country) : 'BR',
    targetCountry: row.target_country ? String(row.target_country) : 'BR',
    affiliateUrl: row.affiliate_url ? String(row.affiliate_url) : '',
    policyEmail: row.policy_email ? String(row.policy_email) : '',
    ghostMode: Boolean(row.ghost_mode),
    status: row.status === 'unpublished' ? 'unpublished' : 'published',
    blocks: Array.isArray(row.blocks) ? (row.blocks as PageBlock[]) : [],
    theme: (row.theme as PageTheme) || {
      primaryColor: '#0F172A',
      accentColor: '#16A34A',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      showHeader: true,
      showFooter: true,
      borderRadius: 'md',
    },
    seo: (row.seo as PageSeo) || {
      metaTitle: String(row.title || ''),
      metaDescription: '',
      robotsIndex: true,
    },
    tracking: (row.tracking as PageTracking) || {},
    whatsapp: (row.whatsapp as PageWhatsappConfig) || { enabled: false },
    paymentConfig: (row.payment_config as PagePaymentConfig) || { enabled: false },
    abTest: (row.ab_test as ABTestConfig) || { enabled: false, splitPercent: 50 },
    translations:
      (row.translations as Partial<Record<LanguageCode, PageTranslationContent>>) || {},
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToPageVersion(row: Record<string, unknown>): PageVersion {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    pageId: String(row.page_id || ''),
    versionNumber: Number(row.version_number || 0),
    note: row.note ? String(row.note) : '',
    snapshot:
      row.snapshot && typeof row.snapshot === 'object'
        ? (row.snapshot as Record<string, unknown>)
        : {},
    createdAt: toTimestampLike(row.created_at),
  };
}

export function mapRowToUserTemplate(row: Record<string, unknown>): UserTemplate {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    name: String(row.name || ''),
    presellType: (row.presell_type as PresellType) || 'cookies_centered',
    description: row.description ? String(row.description) : '',
    isFavorite: Boolean(row.is_favorite),
    blocks: Array.isArray(row.blocks) ? (row.blocks as PageBlock[]) : [],
    theme: (row.theme as PageTheme) || {
      primaryColor: '#0F172A',
      accentColor: '#16A34A',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      showHeader: true,
      showFooter: true,
      borderRadius: 'md',
    },
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    name: String(row.name || ''),
    platform: (row.platform as Campaign['platform']) || 'google_ads',
    pageId: row.page_id ? String(row.page_id) : '',
    utmSource: row.utm_source ? String(row.utm_source) : '',
    utmMedium: row.utm_medium ? String(row.utm_medium) : '',
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : '',
    targetCountry: row.target_country ? String(row.target_country) : 'BR',
    dailyBudget: Number(row.daily_budget || 0),
    currency: row.currency ? String(row.currency) : 'BRL',
    status: row.status === 'paused' ? 'paused' : 'active',
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToClickEvent(row: Record<string, unknown>): ClickEvent {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    pageId: row.page_id ? String(row.page_id) : '',
    publicKey: String(row.public_key || ''),
    productId: row.product_id ? String(row.product_id) : '',
    eventType: (row.event_type as ClickEvent['eventType']) || 'page_view',
    variant: row.variant === 'B' ? 'B' : 'A',
    language: String(row.language || 'pt'),
    country: String(row.country || 'BR'),
    device: (row.device as ClickEvent['device']) || 'desktop',
    utmSource: row.utm_source ? String(row.utm_source) : 'direct',
    utmMedium: row.utm_medium ? String(row.utm_medium) : 'none',
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : '',
    gateway: row.gateway ? String(row.gateway) : '',
    revenue: Number(row.revenue || 0),
    currency: row.currency ? String(row.currency) : 'BRL',
    createdAt: toTimestampLike(row.created_at),
  };
}

export function mapRowToWhatsappWidget(row: Record<string, unknown>): WhatsappWidget {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    name: String(row.name || ''),
    phoneNumber: String(row.phone_number || ''),
    prefilledMessage: row.prefilled_message ? String(row.prefilled_message) : '',
    position: row.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    buttonLabel: row.button_label ? String(row.button_label) : '',
    isActive: row.is_active !== false,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToPaymentGateway(row: Record<string, unknown>): PaymentGateway {
  return {
    id: String(row.id || ''),
    ownerId: String(row.owner_id || ''),
    provider: (row.provider as PaymentProvider) || 'stripe',
    displayName: String(row.display_name || ''),
    publicKeyOrAccount: row.public_key_or_account ? String(row.public_key_or_account) : '',
    checkoutBaseUrl: row.checkout_base_url ? String(row.checkout_base_url) : '',
    pixKey: row.pix_key ? String(row.pix_key) : '',
    supportedCurrencies: Array.isArray(row.supported_currencies)
      ? (row.supported_currencies as string[])
      : ['BRL'],
    mode: row.mode === 'sandbox' ? 'sandbox' : 'live',
    isEnabled: row.is_enabled !== false,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
  };
}

export function mapRowToSettings(row: Record<string, unknown>): UserWorkspaceSettings {
  return {
    ownerId: String(row.owner_id || ''),
    ga4MeasurementId: row.ga4_measurement_id ? String(row.ga4_measurement_id) : '',
    gtmContainerId: row.gtm_container_id ? String(row.gtm_container_id) : '',
    googleAdsId: row.google_ads_id ? String(row.google_ads_id) : '',
    googleAdsConversionLabel: row.google_ads_conversion_label
      ? String(row.google_ads_conversion_label)
      : '',
    metaPixelId: row.meta_pixel_id ? String(row.meta_pixel_id) : '',
    headScripts: row.head_scripts ? String(row.head_scripts) : '',
    bodyScripts: row.body_scripts ? String(row.body_scripts) : '',
    customDomain: row.custom_domain ? String(row.custom_domain) : '',
    autoDetectVisitorLang: row.auto_detect_visitor_lang !== false,
    defaultVisitorLang: (row.default_visitor_lang as LanguageCode) || 'pt',
    preserveAffiliateParams: row.preserve_affiliate_params !== false,
    robotsIndexDefault: row.robots_index_default !== false,
    cookieConsentTextPt: row.cookie_consent_text_pt ? String(row.cookie_consent_text_pt) : '',
    cookieConsentTextEn: row.cookie_consent_text_en ? String(row.cookie_consent_text_en) : '',
    updatedAt: toTimestampLike(row.updated_at),
  };
}
