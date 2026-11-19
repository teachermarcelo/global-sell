import { ClickEvent } from '../types';
import { detectVisitorCountry } from './i18n';

export interface VisitorGeo {
  country: string;
  region: string;
  city: string;
  timezone: string;
}

const GEO_STORAGE_KEY = 'gpc_visitor_geo_v1';
let memoryGeoCache: VisitorGeo | null = null;
let inflightGeoPromise: Promise<VisitorGeo> | null = null;

export function detectBrowserAndOs(uaInput?: string): { browser: string; os: string } {
  const ua = uaInput ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const lower = ua.toLowerCase();

  let browser = 'Unknown';
  if (/instagram/i.test(ua)) browser = 'Instagram App';
  else if (/fban|fbav|fb_iab/i.test(ua)) browser = 'Facebook App';
  else if (/musical_ly|tiktok|bytedance/i.test(ua)) browser = 'TikTok App';
  else if (/whatsapp/i.test(ua)) browser = 'WhatsApp';
  else if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/crios|chrome/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/iphone|ipad|ipod/i.test(lower)) os = 'iOS';
  else if (/android/i.test(lower)) os = 'Android';
  else if (/windows/i.test(lower)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(lower)) os = 'macOS';
  else if (/cros/i.test(lower)) os = 'ChromeOS';
  else if (/linux/i.test(lower)) os = 'Linux';

  return { browser, os };
}

export function extractReferrerHost(referrer?: string): string {
  if (!referrer) return '';
  try {
    const parsed = new URL(referrer);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function detectTrafficSource(
  search: string = '',
  referrer: string = '',
  explicitUtmSource?: string,
  userAgent?: string
): { trafficSource: string; referrerHost: string } {
  const params = new URLSearchParams(search || '');
  const utmSource = (params.get('utm_source') || explicitUtmSource || '').trim().toLowerCase();
  const referrerHost = extractReferrerHost(referrer);

  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) {
    return { trafficSource: 'Google Ads', referrerHost };
  }
  if (params.get('fbclid')) {
    if (utmSource.includes('ig') || utmSource.includes('insta') || referrerHost.includes('instagram')) {
      return { trafficSource: 'Instagram Ads', referrerHost };
    }
    return { trafficSource: 'Meta Ads', referrerHost };
  }
  if (params.get('ttclid')) {
    return { trafficSource: 'TikTok Ads', referrerHost };
  }
  if (params.get('msclkid')) {
    return { trafficSource: 'Microsoft Ads', referrerHost };
  }

  if (utmSource && utmSource !== 'direct') {
    if (utmSource.includes('google')) return { trafficSource: 'Google', referrerHost };
    if (utmSource.includes('insta') || utmSource === 'ig') return { trafficSource: 'Instagram', referrerHost };
    if (utmSource.includes('face') || utmSource === 'fb' || utmSource === 'meta') {
      return { trafficSource: 'Facebook / Meta', referrerHost };
    }
    if (utmSource.includes('tiktok')) return { trafficSource: 'TikTok', referrerHost };
    if (utmSource.includes('youtube') || utmSource === 'yt') return { trafficSource: 'YouTube', referrerHost };
    if (utmSource.includes('whatsapp') || utmSource === 'wa') return { trafficSource: 'WhatsApp', referrerHost };
    return { trafficSource: utmSource.slice(0, 40), referrerHost };
  }

  if (referrerHost) {
    if (referrerHost.includes('google.')) return { trafficSource: 'Google', referrerHost };
    if (referrerHost.includes('instagram.com') || referrerHost === 'l.instagram.com') {
      return { trafficSource: 'Instagram', referrerHost };
    }
    if (referrerHost.includes('facebook.com') || referrerHost.includes('fb.com') || referrerHost === 'l.facebook.com' || referrerHost === 'lm.facebook.com') {
      return { trafficSource: 'Facebook', referrerHost };
    }
    if (referrerHost.includes('youtube.com') || referrerHost === 'youtu.be') {
      return { trafficSource: 'YouTube', referrerHost };
    }
    if (referrerHost.includes('tiktok.com')) return { trafficSource: 'TikTok', referrerHost };
    if (referrerHost.includes('bing.com')) return { trafficSource: 'Bing', referrerHost };
    if (referrerHost.includes('whatsapp.com') || referrerHost === 'wa.me') {
      return { trafficSource: 'WhatsApp', referrerHost };
    }
    if (referrerHost.includes('t.co') || referrerHost.includes('x.com') || referrerHost.includes('twitter.com')) {
      return { trafficSource: 'X / Twitter', referrerHost };
    }
    return { trafficSource: referrerHost.slice(0, 40), referrerHost };
  }

  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (/instagram/i.test(ua)) return { trafficSource: 'Instagram App', referrerHost };
  if (/fban|fbav|fb_iab/i.test(ua)) return { trafficSource: 'Facebook App', referrerHost };
  if (/musical_ly|tiktok/i.test(ua)) return { trafficSource: 'TikTok App', referrerHost };
  if (/whatsapp/i.test(ua)) return { trafficSource: 'WhatsApp', referrerHost };

  return { trafficSource: 'Direct', referrerHost };
}

export function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'pt-BR';
  return (navigator.language || navigator.languages?.[0] || 'pt-BR').slice(0, 24);
}

export function getLocalTimezone(): string {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 64);
  } catch {
    return '';
  }
}

export function getCachedVisitorGeoSync(): VisitorGeo {
  if (memoryGeoCache) return memoryGeoCache;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(GEO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<VisitorGeo>;
        if (parsed.country) {
          memoryGeoCache = {
            country: String(parsed.country).slice(0, 16),
            region: String(parsed.region || '').slice(0, 80),
            city: String(parsed.city || '').slice(0, 80),
            timezone: String(parsed.timezone || getLocalTimezone()).slice(0, 64),
          };
          return memoryGeoCache;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return {
    country: detectVisitorCountry(),
    region: '',
    city: '',
    timezone: getLocalTimezone(),
  };
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T | null> {
  if (typeof fetch === 'undefined') return null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function resolveVisitorGeo(): Promise<VisitorGeo> {
  if (memoryGeoCache && (memoryGeoCache.city || memoryGeoCache.country)) {
    return Promise.resolve(memoryGeoCache);
  }
  if (inflightGeoPromise) return inflightGeoPromise;

  const fallback: VisitorGeo = {
    country: detectVisitorCountry(),
    region: '',
    city: '',
    timezone: getLocalTimezone(),
  };

  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(GEO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<VisitorGeo>;
        if (parsed.country && parsed.city) {
          memoryGeoCache = {
            country: String(parsed.country).slice(0, 16),
            region: String(parsed.region || '').slice(0, 80),
            city: String(parsed.city || '').slice(0, 80),
            timezone: String(parsed.timezone || fallback.timezone).slice(0, 64),
          };
          return Promise.resolve(memoryGeoCache);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  inflightGeoPromise = (async () => {
    // 1. Primary: Vercel Edge/Serverless Geo Headers (/api/geo)
    const edgeGeo = await fetchJsonWithTimeout<{
      country?: string;
      region?: string;
      city?: string;
      timezone?: string;
    }>('/api/geo', 1400);

    if (edgeGeo && (edgeGeo.city || edgeGeo.country)) {
      const resolved: VisitorGeo = {
        country: (edgeGeo.country || fallback.country).toUpperCase().slice(0, 16),
        region: (edgeGeo.region || '').slice(0, 80),
        city: (edgeGeo.city || '').slice(0, 80),
        timezone: (edgeGeo.timezone || fallback.timezone).slice(0, 64),
      };
      memoryGeoCache = resolved;
      try {
        sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(resolved));
      } catch {
        // Ignore storage errors
      }
      return resolved;
    }

    // 2. Fallback: Lightweight public IP geolocation (works outside Vercel / local preview)
    const ipGeo = await fetchJsonWithTimeout<{
      country_code?: string;
      region?: string;
      city?: string;
      timezone?: string;
    }>('https://get.geojs.io/v1/ip/geo.json', 1600);

    if (ipGeo && (ipGeo.city || ipGeo.country_code)) {
      const resolved: VisitorGeo = {
        country: (ipGeo.country_code || fallback.country).toUpperCase().slice(0, 16),
        region: (ipGeo.region || '').slice(0, 80),
        city: (ipGeo.city || '').slice(0, 80),
        timezone: (ipGeo.timezone || fallback.timezone).slice(0, 64),
      };
      memoryGeoCache = resolved;
      try {
        sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(resolved));
      } catch {
        // Ignore storage errors
      }
      return resolved;
    }

    memoryGeoCache = fallback;
    return fallback;
  })();

  return inflightGeoPromise;
}

export function formatEventTypeLabel(
  eventType: ClickEvent['eventType'],
  isPt: boolean
): string {
  switch (eventType) {
    case 'page_view':
      return isPt ? 'Visualização' : 'Page View';
    case 'affiliate_click':
      return isPt ? 'Clique Afiliado' : 'Affiliate Click';
    case 'whatsapp_click':
      return isPt ? 'Clique WhatsApp' : 'WhatsApp Click';
    case 'checkout_start':
      return isPt ? 'Início Checkout' : 'Checkout Start';
    case 'conversion':
      return isPt ? 'Conversão' : 'Conversion';
    default:
      return eventType;
  }
}

export function formatClickedElementLabel(element?: string, isPt: boolean = true): string {
  switch (element) {
    case 'cookie_consent':
      return isPt ? 'Card de Cookies (CTA)' : 'Cookie Consent CTA';
    case 'hero':
      return isPt ? 'Botão Principal (Hero)' : 'Hero CTA Button';
    case 'cta_button':
      return isPt ? 'Botão CTA' : 'CTA Button';
    case 'ghost_bar':
      return isPt ? 'Barra Modo Fantasma' : 'Ghost Mode Bar';
    case 'whatsapp':
      return isPt ? 'Botão Flutuante WhatsApp' : 'Floating WhatsApp';
    case 'payment_checkout':
      return isPt ? 'Checkout Direto' : 'Direct Checkout';
    case 'redirect_link':
      return isPt ? 'Link Curto /go/' : 'Short /go/ Link';
    case 'page_load':
      return isPt ? 'Abertura da Página' : 'Page Load';
    default:
      return element || (isPt ? 'Interação' : 'Interaction');
  }
}

export function formatLocationSummary(ev: Pick<ClickEvent, 'city' | 'region' | 'country'>): string {
  const parts: string[] = [];
  if (ev.city) parts.push(ev.city);
  if (ev.region && ev.region.toLowerCase() !== (ev.city || '').toLowerCase()) {
    parts.push(ev.region);
  }
  const country = (ev.country || 'BR').toUpperCase();
  if (parts.length > 0) {
    return `${parts.join(', ')} · ${country}`;
  }
  return country;
}

export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildClickEventsCsv(
  rows: Array<{
    timestamp: string;
    eventType: string;
    clickedElement: string;
    clickedLabel: string;
    clickedUrl: string;
    productName: string;
    pageTitle: string;
    pageSlug: string;
    city: string;
    region: string;
    country: string;
    language: string;
    browserLanguage: string;
    device: string;
    browser: string;
    os: string;
    trafficSource: string;
    referrer: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    variant: string;
    gateway: string;
    revenue: number;
    currency: string;
  }>
): string {
  const headers = [
    'Data/Hora',
    'Evento',
    'Bloco/Elemento',
    'Botão/Rótulo Clicado',
    'URL Destino',
    'Produto',
    'Página',
    'Slug',
    'Cidade',
    'Estado/Região',
    'País',
    'Idioma Página',
    'Idioma Navegador',
    'Dispositivo',
    'Navegador/App',
    'Sistema (OS)',
    'Origem Tráfego',
    'Referrer',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'Variante A/B',
    'Gateway',
    'Receita',
    'Moeda',
  ];
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.timestamp,
        r.eventType,
        r.clickedElement,
        r.clickedLabel,
        r.clickedUrl,
        r.productName,
        r.pageTitle,
        r.pageSlug,
        r.city,
        r.region,
        r.country,
        r.language,
        r.browserLanguage,
        r.device,
        r.browser,
        r.os,
        r.trafficSource,
        r.referrer,
        r.utmSource,
        r.utmMedium,
        r.utmCampaign,
        r.variant,
        r.gateway,
        r.revenue,
        r.currency,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}
