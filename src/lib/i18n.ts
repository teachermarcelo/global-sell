import { LanguageCode } from '../types';

export const UI_LABELS: Record<LanguageCode, Record<string, string>> = {
  pt: {
    appName: 'Global Presell Commerce',
    dashboard: 'Dashboard',
    products: 'Central de Produtos',
    pages: 'Minhas Páginas',
    presellWizard: 'Criador de Presells',
    landingCreator: 'Criador de Landing Pages',
    pageBuilder: 'Páginas & Subpáginas',
    templates: 'Biblioteca de Templates',
    categories: 'Gerenciador de Categorias',
    affiliateLinks: 'Links de Afiliados',
    clickTracking: 'Rastreamento de Cliques',
    analytics: 'Analytics & Conversões',
    languages: 'Configurações de Idiomas',
    seo: 'SEO & Indexação',
    marketing: 'Marketing & Gateways',
    settings: 'Configurações & Backup',
    signInTitle: 'Plataforma Internacional de Pré-Venda & Afiliados',
    signInSubtitle:
      'Crie presells de alta conversão, landing pages multilíngues com detecção automática de idioma, testes A/B em tempo real e checkout nativo.',
    signInGoogle: 'Entrar com Google',
    signOut: 'Sair',
    published: 'Publicada',
    draft: 'Rascunho',
    processing: 'Em processamento',
    unpublished: 'Despublicada',
    createNewPresell: 'Criar Nova Presell',
    manageCategories: 'Gerenciar Categorias',
    viewPage: 'Ver página',
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    duplicate: 'Duplicar',
    copyUrl: 'Copiar URL',
    edit: 'Editar',
    preview: 'Visualizar',
    publish: 'Publicar',
    unpublish: 'Despublicar',
    searchPlaceholder: 'Buscar presell ou produto...',
    totalPages: 'Total de Páginas',
    publishedPages: 'Páginas Publicadas',
    draftPages: 'Em Rascunho',
    totalProducts: 'Total de Produtos',
    visitors: 'Visitantes',
    clicks: 'Cliques nos Links',
    ctr: 'Taxa de Cliques (CTR)',
    conversions: 'Conversões',
    revenue: 'Receita Direta',
  },
  en: {
    appName: 'Global Presell Commerce',
    dashboard: 'Dashboard',
    products: 'Product Hub',
    pages: 'My Pages',
    presellWizard: 'Presell Wizard',
    landingCreator: 'Landing Page Creator',
    pageBuilder: 'Pages & Subpages',
    templates: 'Template Library',
    categories: 'Categories Manager',
    affiliateLinks: 'Affiliate Links',
    clickTracking: 'Click Tracking',
    analytics: 'Analytics & Conversions',
    languages: 'Language Settings',
    seo: 'SEO & Indexing',
    marketing: 'Marketing & Gateways',
    settings: 'Settings & Backup',
    signInTitle: 'International Presell & Affiliate Commerce Platform',
    signInSubtitle:
      'Build high-converting presells, multilingual landing pages with automatic browser detection, real-time A/B tests, and native payment gateways.',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign out',
    published: 'Published',
    draft: 'Draft',
    processing: 'Processing',
    unpublished: 'Unpublished',
    createNewPresell: 'Create New Presell',
    manageCategories: 'Manage Categories',
    viewPage: 'View page',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    duplicate: 'Duplicate',
    copyUrl: 'Copy URL',
    edit: 'Edit',
    preview: 'Preview',
    publish: 'Publish',
    unpublish: 'Unpublish',
    searchPlaceholder: 'Search presell or product...',
    totalPages: 'Total Pages',
    publishedPages: 'Published Pages',
    draftPages: 'Drafts',
    totalProducts: 'Total Products',
    visitors: 'Visitors',
    clicks: 'Affiliate Clicks',
    ctr: 'Click-Through Rate',
    conversions: 'Conversions',
    revenue: 'Direct Revenue',
  },
  es: {
    appName: 'Global Presell Commerce',
    dashboard: 'Panel Principal',
    products: 'Central de Productos',
    pages: 'Mis Páginas',
    presellWizard: 'Creador de Presells',
    landingCreator: 'Creador de Landing Pages',
    pageBuilder: 'Páginas y Subpáginas',
    templates: 'Biblioteca de Plantillas',
    categories: 'Gestor de Categorías',
    affiliateLinks: 'Enlaces de Afiliados',
    clickTracking: 'Rastreo de Clics',
    analytics: 'Analytics y Conversiones',
    languages: 'Configuración de Idiomas',
    seo: 'SEO e Indexación',
    marketing: 'Marketing y Pasarelas',
    settings: 'Configuración y Backup',
    signInTitle: 'Plataforma Internacional de Presell y Afiliados',
    signInSubtitle:
      'Crea páginas de preventa de alta conversión, landing pages multilingües, pruebas A/B en tiempo real y pagos nativos.',
    signInGoogle: 'Iniciar sesión con Google',
    signOut: 'Salir',
    published: 'Publicada',
    draft: 'Borrador',
    processing: 'Procesando',
    unpublished: 'No publicada',
    createNewPresell: 'Crear Nueva Presell',
    manageCategories: 'Gestionar Categorías',
    viewPage: 'Ver página',
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    duplicate: 'Duplicar',
    copyUrl: 'Copiar URL',
    edit: 'Editar',
    preview: 'Vista previa',
    publish: 'Publicar',
    unpublish: 'Despublicar',
    searchPlaceholder: 'Buscar presell o producto...',
    totalPages: 'Total de Páginas',
    publishedPages: 'Páginas Publicadas',
    draftPages: 'En Borrador',
    totalProducts: 'Total de Productos',
    visitors: 'Visitantes',
    clicks: 'Clics',
    ctr: 'Tasa de Clics (CTR)',
    conversions: 'Conversiones',
    revenue: 'Ingresos Directos',
  },
};

export function detectVisitorLanguage(defaultLang: LanguageCode = 'pt'): LanguageCode {
  if (typeof navigator === 'undefined') return defaultLang;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const code = raw?.toLowerCase().slice(0, 2);
    if (code === 'pt') return 'pt';
    if (code === 'en') return 'en';
    if (code === 'es') return 'es';
  }
  return defaultLang;
}

export function detectVisitorCountry(): string {
  if (typeof navigator === 'undefined') return 'BR';
  const lang = navigator.language || 'pt-BR';
  const parts = lang.split('-');
  if (parts.length > 1 && parts[1].length === 2) {
    return parts[1].toUpperCase();
  }
  if (lang.startsWith('pt')) return 'BR';
  if (lang.startsWith('es')) return 'ES';
  return 'US';
}

export function detectVisitorDevice(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const localeMap: Record<string, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
  };
  try {
    return new Intl.NumberFormat(localeMap[currency] || 'en-US', {
      style: 'currency',
      currency,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page';
}

export function sanitizeId(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

/**
 * Preserves ALL essential affiliate parameters from baseUrl while merging
 * tracking UTM parameters from campaign/incoming query string.
 */
export function buildAffiliateRedirectUrl(
  baseUrl: string,
  extraParams?: Record<string, string | undefined>,
  incomingSearch?: string
): string {
  if (!baseUrl) return '#';
  try {
    const target = new URL(baseUrl);
    if (incomingSearch) {
      const incoming = new URLSearchParams(incomingSearch);
      incoming.forEach((val, key) => {
        if (!target.searchParams.has(key)) {
          target.searchParams.set(key, val);
        }
      });
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v && !target.searchParams.has(k)) {
          target.searchParams.set(k, v);
        }
      });
    }
    return target.toString();
  } catch {
    return baseUrl;
  }
}

export function getPublicPagePath(lang: string, slug: string): string {
  const cleanLang = lang === 'auto' ? 'p' : lang;
  return `/${cleanLang}/${slug}`;
}

export function generatePixPayload(pixKey: string, merchantName: string, amount: number): string {
  const cleanKey = (pixKey || 'pix@globalpresell.com').slice(0, 72);
  const cleanName = (merchantName || 'GLOBAL PRESELL').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 25);
  const amtStr = amount > 0 ? amount.toFixed(2) : '0.00';
  return `00020126580014BR.GOV.BCB.PIX0136${cleanKey}520400005303986540${amtStr.length}${amtStr}5802BR5913${cleanName}6009SAO PAULO62070503***6304A1B2`;
}

export function extractGoogleDriveFileId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim().replace(/^["']+|["']+$/g, '');
  if (!trimmed) return null;

  const candidate = /^(?:https?:)?\/\//i.test(trimmed)
    ? trimmed.startsWith('//')
      ? `https:${trimmed}`
      : trimmed
    : /^(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com)\//i.test(trimmed)
    ? `https://${trimmed}`
    : '';

  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    const isGoogleDriveHost =
      host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host === 'drive.usercontent.google.com' ||
      host === 'lh3.googleusercontent.com';

    if (!isGoogleDriveHost) return null;

    // /file/d/<ID>/... or /d/<ID> (including lh3.googleusercontent.com/d/<ID>=w1600)
    const pathMatch = parsed.pathname.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }

    // ?id=<ID> (open?id=..., uc?id=..., thumbnail?id=..., download?id=...)
    const queryId = parsed.searchParams.get('id');
    if (queryId && /^[a-zA-Z0-9_-]{10,}$/.test(queryId)) {
      return queryId;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeAssetUrl(url?: string): string {
  if (!url) return '';
  const cleaned = url.trim().replace(/^["']+|["']+$/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('/src/assets/images/')) {
    return cleaned.replace('/src/assets/images/', '/images/');
  }

  if (
    cleaned.startsWith('/') && !cleaned.startsWith('//') ||
    cleaned.startsWith('./') ||
    cleaned.startsWith('../') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:')
  ) {
    return cleaned;
  }

  let candidate = cleaned;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate) && /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/|$|\?)/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  const driveId = extractGoogleDriveFileId(candidate);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
  }

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();

    // Dropbox share links -> direct raw image
    if (host === 'dropbox.com' || host === 'www.dropbox.com') {
      parsed.searchParams.delete('dl');
      parsed.searchParams.set('raw', '1');
      return parsed.toString();
    }

    // Imgur single-image page -> direct i.imgur.com image
    if (host === 'imgur.com' || host === 'www.imgur.com') {
      const imgurMatch = parsed.pathname.match(/^\/([a-zA-Z0-9]{5,12})\/?$/);
      if (imgurMatch?.[1]) {
        return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
      }
    }

    return parsed.toString();
  } catch {
    return candidate;
  }
}

export function getAssetUrlFallbacks(url?: string): string[] {
  if (!url || !url.trim()) return [];
  const driveId = extractGoogleDriveFileId(url);
  if (driveId) {
    return [
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
      `https://drive.google.com/uc?export=view&id=${driveId}`,
    ];
  }
  const normalized = normalizeAssetUrl(url);
  return normalized ? [normalized] : [];
}

export function getPublicBaseUrl(customDomain?: string): string {
  const raw = (customDomain || '').trim().replace(/\/+$/, '');
  if (raw) {
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}


