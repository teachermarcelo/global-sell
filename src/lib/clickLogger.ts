import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { detectVisitorDevice } from './i18n';
import { GPC_TABLES, getSupabaseClient, isSupabaseConfigured } from './supabase';
import {
  detectBrowserAndOs,
  detectTrafficSource,
  getBrowserLocale,
  getCachedVisitorGeoSync,
  resolveVisitorGeo,
} from './visitorInfo';
import { ClickEvent } from '../types';

export interface RecordVisitorEventInput {
  ownerId: string;
  pageId?: string;
  publicKey: string;
  productId?: string;
  eventType: ClickEvent['eventType'];
  variant?: 'A' | 'B';
  language?: string;
  defaultUtmSource?: string;
  defaultUtmMedium?: string;
  defaultUtmCampaign?: string;
  gateway?: string;
  revenue?: number;
  currency?: string;
  clickedElement?: string;
  clickedLabel?: string;
  clickedUrl?: string;
  pageTitle?: string;
  pageSlug?: string;
  awaitGeoMs?: number;
}

export async function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function recordVisitorEvent(input: RecordVisitorEventInput): Promise<void> {
  if (!input.ownerId || !input.publicKey) return;

  const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const searchParams = new URLSearchParams(search);
  const referrerRaw = typeof document !== 'undefined' ? document.referrer || '' : '';

  const utmSource = (
    searchParams.get('utm_source') ||
    input.defaultUtmSource ||
    'direct'
  ).slice(0, 100);
  const utmMedium = (
    searchParams.get('utm_medium') ||
    input.defaultUtmMedium ||
    'none'
  ).slice(0, 100);
  const utmCampaign = (
    searchParams.get('utm_campaign') ||
    input.defaultUtmCampaign ||
    ''
  ).slice(0, 100);

  const geo =
    (await waitWithTimeout(resolveVisitorGeo(), input.awaitGeoMs ?? 800)) ||
    getCachedVisitorGeoSync();

  const { browser, os } = detectBrowserAndOs();
  const { trafficSource } = detectTrafficSource(search, referrerRaw, utmSource);
  const device = detectVisitorDevice();
  const language = (input.language || 'pt').slice(0, 16);
  const browserLanguage = getBrowserLocale().slice(0, 24);
  const country = (geo.country || 'BR').toUpperCase().slice(0, 16);
  const region = (geo.region || '').slice(0, 80);
  const city = (geo.city || '').slice(0, 80);
  const timezone = (geo.timezone || '').slice(0, 64);
  const referrer = referrerRaw.slice(0, 500);
  const clickedElement = (input.clickedElement || '').slice(0, 60);
  const clickedLabel = (input.clickedLabel || '').slice(0, 160);
  const clickedUrl = (input.clickedUrl || '').slice(0, 1000);
  const pageTitle = (input.pageTitle || '').slice(0, 160);
  const pageSlug = (input.pageSlug || '').slice(0, 120);
  const gateway = (input.gateway || '').slice(0, 40);
  const revenue = Number.isFinite(Number(input.revenue)) ? Number(input.revenue) : 0;
  const currency = (input.currency || 'BRL').slice(0, 10);
  const variant = input.variant === 'B' ? 'B' : 'A';

  if (isSupabaseConfigured) {
    const supabase = getSupabaseClient();
    const baseRow = {
      id: eventId,
      owner_id: input.ownerId.slice(0, 128),
      page_id: (input.pageId || '').slice(0, 128),
      public_key: input.publicKey.slice(0, 128),
      product_id: (input.productId || '').slice(0, 128),
      event_type: input.eventType,
      variant,
      language,
      country,
      device,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      gateway,
      revenue,
      currency,
    };

    const enrichedRow = {
      ...baseRow,
      browser_language: browserLanguage,
      region,
      city,
      timezone,
      browser: browser.slice(0, 60),
      os: os.slice(0, 60),
      referrer,
      traffic_source: trafficSource.slice(0, 80),
      clicked_element: clickedElement,
      clicked_label: clickedLabel,
      clicked_url: clickedUrl,
      page_title: pageTitle,
      page_slug: pageSlug,
    };

    try {
      const { error } = await supabase.from(GPC_TABLES.clickEvents).insert(enrichedRow);
      if (error) {
        // Backward compatibility if migration 002 columns are not yet applied in Supabase
        await supabase.from(GPC_TABLES.clickEvents).insert(baseRow);
      }
    } catch {
      // Non-blocking
    }
    return;
  }

  try {
    await setDoc(doc(db, 'clickEvents', eventId), {
      ownerId: input.ownerId.slice(0, 128),
      pageId: (input.pageId || '').slice(0, 128),
      publicKey: input.publicKey.slice(0, 128),
      productId: (input.productId || '').slice(0, 128),
      eventType: input.eventType,
      variant,
      language,
      browserLanguage,
      country,
      region,
      city,
      timezone,
      device,
      browser: browser.slice(0, 60),
      os: os.slice(0, 60),
      referrer,
      trafficSource: trafficSource.slice(0, 80),
      clickedElement,
      clickedLabel,
      clickedUrl,
      pageTitle,
      pageSlug,
      utmSource,
      utmMedium,
      utmCampaign,
      gateway,
      revenue,
      currency,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking
  }
}
