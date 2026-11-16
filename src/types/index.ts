export interface TimestampLike {
  toMillis: () => number;
  toDate: () => Date;
  seconds?: number;
  nanoseconds?: number;
}

export type LanguageCode = 'pt' | 'en' | 'es';
export type PageLanguageSetting = LanguageCode | 'auto';
export type FunnelStage = 'top' | 'middle' | 'bottom';
export type PageKind = 'presell' | 'landing' | 'subpage' | 'comparison' | 'review';
export type PageStatus = 'draft' | 'published' | 'processing' | 'unpublished';

export type PresellType =
  | 'cookies_centered'
  | 'cookies_premium'
  | 'cookies_footer'
  | 'review_page'
  | 'recommendation'
  | 'comparison'
  | 'product_showcase'
  | 'commercial_landing'
  | 'product_analysis';

export type BlockType =
  | 'hero'
  | 'cookie_consent'
  | 'text'
  | 'image'
  | 'video'
  | 'cta_button'
  | 'comparison_table'
  | 'review_scorecard'
  | 'trust_badges'
  | 'faq'
  | 'payment_checkout'
  | 'legal_footer';

export type PaymentProvider =
  | 'stripe'
  | 'mercadopago'
  | 'paypal'
  | 'hotmart'
  | 'kiwify'
  | 'pagseguro';

export interface PageBlock {
  id: string;
  type: BlockType;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  useAffiliateLink?: boolean;
  badgeText?: string;
  items?: Array<{
    label: string;
    value?: string;
    highlight?: boolean;
  }>;
  score?: number;
  pros?: string[];
  cons?: string[];
  paymentProvider?: PaymentProvider;
  price?: number;
  currency?: 'BRL' | 'USD' | 'EUR' | 'GBP';
  checkoutUrl?: string;
}

export interface PageTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  logoText?: string;
  logoUrl?: string;
  showHeader: boolean;
  showFooter: boolean;
  borderRadius: 'sm' | 'md' | 'lg';
}

export interface PageSeo {
  metaTitle: string;
  metaDescription: string;
  robotsIndex: boolean;
  canonicalUrl?: string;
  protectedBrandTerms?: string[];
}

export interface PageTracking {
  ga4Id?: string;
  gtmId?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
  metaPixelId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface PageWhatsappConfig {
  enabled: boolean;
  widgetId?: string;
  phoneNumber?: string;
  message?: string;
  buttonLabel?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export interface PagePaymentConfig {
  enabled: boolean;
  provider?: PaymentProvider;
  price?: number;
  currency?: 'BRL' | 'USD' | 'EUR' | 'GBP';
  checkoutUrl?: string;
  pixKey?: string;
  buttonLabel?: string;
}

export interface ABTestConfig {
  enabled: boolean;
  splitPercent: number; // e.g., 50 means 50% A / 50% B
  variantBName?: string;
  variantBHeadline?: string;
  variantBSubheadline?: string;
  variantBCtaText?: string;
  variantBPrimaryColor?: string;
}

export interface PageTranslationContent {
  title: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  blocks: PageBlock[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoUrl?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  defaultLang: LanguageCode;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  originCountry?: string;
  country: string;
  language: PageLanguageSetting;
  network?: string;
  affiliateUrl: string;
  price: number;
  currency: 'BRL' | 'USD' | 'EUR' | 'GBP';
  commissionRate?: number;
  producerEmail?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface AffiliateLink {
  id: string;
  ownerId: string;
  productId?: string;
  label: string;
  shortCode: string;
  destinationUrl: string;
  alternativeUrls?: string[];
  country?: string;
  network?: string;
  affiliateTag?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  buttonText?: string;
  isPrimary?: boolean;
  isActive: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface PageItem {
  id: string;
  ownerId: string;
  parentPageId?: string;
  productId?: string;
  categoryId?: string;
  templateId?: string;
  title: string;
  slug: string;
  pageKind: PageKind;
  presellType: PresellType;
  funnelStage: FunnelStage;
  language: PageLanguageSetting;
  originCountry?: string;
  targetCountry?: string;
  affiliateLinkId?: string;
  affiliateUrl?: string;
  policyEmailMode?: 'producer' | 'custom';
  policyEmail?: string;
  ghostMode: boolean;
  status: PageStatus;
  sortOrder?: number;
  publicKey?: string;
  blocks: PageBlock[];
  theme: PageTheme;
  seo: PageSeo;
  tracking: PageTracking;
  whatsapp?: PageWhatsappConfig;
  paymentConfig?: PagePaymentConfig;
  abTest?: ABTestConfig;
  translations?: Partial<Record<LanguageCode, PageTranslationContent>>;
  publishedAt?: TimestampLike | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface PublishedPage {
  ownerId: string;
  pageId: string;
  productId?: string;
  publicKey: string;
  slug: string;
  title: string;
  pageKind: PageKind;
  presellType: PresellType;
  funnelStage?: FunnelStage;
  language: PageLanguageSetting;
  originCountry?: string;
  targetCountry?: string;
  affiliateUrl?: string;
  policyEmail?: string;
  ghostMode: boolean;
  status: 'published' | 'unpublished';
  blocks: PageBlock[];
  theme: PageTheme;
  seo: PageSeo;
  tracking: PageTracking;
  whatsapp?: PageWhatsappConfig;
  paymentConfig?: PagePaymentConfig;
  abTest?: ABTestConfig;
  translations?: Partial<Record<LanguageCode, PageTranslationContent>>;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface PageVersion {
  id: string;
  ownerId: string;
  pageId: string;
  versionNumber: number;
  note?: string;
  snapshot: Record<string, unknown>;
  createdAt: TimestampLike;
}

export interface UserTemplate {
  id: string;
  ownerId: string;
  name: string;
  presellType: PresellType;
  description?: string;
  isFavorite: boolean;
  blocks: PageBlock[];
  theme: PageTheme;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  platform: 'google_ads' | 'meta_ads' | 'tiktok_ads' | 'native' | 'seo';
  pageId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  targetCountry?: string;
  dailyBudget?: number;
  currency?: string;
  status: 'active' | 'paused';
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface ClickEvent {
  id: string;
  ownerId: string;
  pageId?: string;
  publicKey: string;
  productId?: string;
  eventType: 'page_view' | 'affiliate_click' | 'whatsapp_click' | 'checkout_start' | 'conversion';
  variant: 'A' | 'B';
  language: string;
  country: string;
  device: 'desktop' | 'tablet' | 'mobile';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gateway?: string;
  revenue?: number;
  currency?: string;
  createdAt: TimestampLike;
}

export interface WhatsappWidget {
  id: string;
  ownerId: string;
  name: string;
  phoneNumber: string;
  prefilledMessage?: string;
  position: 'bottom-right' | 'bottom-left';
  buttonLabel?: string;
  isActive: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface PaymentGateway {
  id: string;
  ownerId: string;
  provider: PaymentProvider;
  displayName: string;
  publicKeyOrAccount?: string;
  checkoutBaseUrl?: string;
  pixKey?: string;
  supportedCurrencies?: string[];
  mode: 'live' | 'sandbox';
  isEnabled: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface UserWorkspaceSettings {
  ownerId: string;
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  googleAdsId?: string;
  googleAdsConversionLabel?: string;
  metaPixelId?: string;
  headScripts?: string;
  bodyScripts?: string;
  customDomain?: string;
  autoDetectVisitorLang: boolean;
  defaultVisitorLang: LanguageCode;
  preserveAffiliateParams: boolean;
  robotsIndexDefault: boolean;
  cookieConsentTextPt?: string;
  cookieConsentTextEn?: string;
  updatedAt: TimestampLike;
}

export type ActiveModule =
  | 'dashboard'
  | 'products'
  | 'pages'
  | 'presell-wizard'
  | 'landing-creator'
  | 'page-builder'
  | 'templates'
  | 'categories'
  | 'affiliate-links'
  | 'click-tracking'
  | 'analytics'
  | 'languages'
  | 'seo'
  | 'marketing'
  | 'settings';
