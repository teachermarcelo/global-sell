import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Cookie,
  CreditCard,
  ExternalLink,
  Globe,
  Lock,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  buildAffiliateRedirectUrl,
  detectVisitorCountry,
  detectVisitorDevice,
  detectVisitorLanguage,
  formatCurrency,
  generatePixPayload,
  normalizeAssetUrl,
  slugify,
} from '../lib/i18n';
import { LanguageCode, PageBlock, PublishedPage } from '../types';

interface PublicPageViewProps {
  slugOrKey: string;
  forcedLang?: LanguageCode;
  previewPage?: PublishedPage;
  onExitPreview?: () => void;
}

function logVisitorEvent(
  page: PublishedPage,
  eventType: 'page_view' | 'affiliate_click' | 'whatsapp_click' | 'checkout_start' | 'conversion',
  variant: 'A' | 'B',
  activeLang: string,
  extra?: { gateway?: string; revenue?: number; currency?: string }
) {
  if (!page.ownerId || !page.publicKey) return;
  const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const searchParams = new URLSearchParams(window.location.search);
  setDoc(doc(db, 'clickEvents', eventId), {
    ownerId: page.ownerId.slice(0, 128),
    pageId: (page.pageId || '').slice(0, 128),
    publicKey: page.publicKey.slice(0, 128),
    productId: (page.productId || '').slice(0, 128),
    eventType,
    variant,
    language: (activeLang || 'pt').slice(0, 16),
    country: (detectVisitorCountry() || 'BR').slice(0, 16),
    device: detectVisitorDevice(),
    utmSource: (searchParams.get('utm_source') || page.tracking?.utmSource || 'direct').slice(0, 100),
    utmMedium: (searchParams.get('utm_medium') || page.tracking?.utmMedium || 'none').slice(0, 100),
    utmCampaign: (searchParams.get('utm_campaign') || page.tracking?.utmCampaign || '').slice(0, 100),
    gateway: (extra?.gateway || '').slice(0, 40),
    revenue: Number(extra?.revenue ?? 0),
    currency: (extra?.currency || page.paymentConfig?.currency || 'BRL').slice(0, 10),
    createdAt: serverTimestamp(),
  }).catch(() => {
    // Non-blocking telemetry
  });
}

export const PublicPageView: React.FC<PublicPageViewProps> = ({
  slugOrKey,
  forcedLang,
  previewPage,
  onExitPreview,
}) => {
  const [page, setPage] = useState<PublishedPage | null>(previewPage || null);
  const [loading, setLoading] = useState(!previewPage);
  const [notFound, setNotFound] = useState(false);
  const [activeLang, setActiveLang] = useState<LanguageCode>(
    forcedLang || detectVisitorLanguage('pt')
  );
  const [variant, setVariant] = useState<'A' | 'B'>('A');
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [checkoutBlock, setCheckoutBlock] = useState<PageBlock | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'pix' | 'done'>('form');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [ghostTriggered, setGhostTriggered] = useState(false);
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    if (previewPage) {
      setPage(previewPage);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadPublished() {
      setLoading(true);
      setNotFound(false);
      const rawKey = decodeURIComponent(slugOrKey || '').split('/')[0].trim();
      const normalizedSlug = slugify(rawKey);
      try {
        // First try direct publicKey if valid Firestore ID
        if (/^[a-zA-Z0-9_-]{1,128}$/.test(rawKey)) {
          try {
            const directSnap = await getDoc(doc(db, 'publishedPages', rawKey));
            if (directSnap.exists() && directSnap.data()?.status === 'published') {
              if (!cancelled) {
                setPage(directSnap.data() as PublishedPage);
                setLoading(false);
              }
              return;
            }
          } catch {
            // Continue to slug query fallback
          }
        }

        // Fallback to normalized slug lookup
        const q = query(
          collection(db, 'publishedPages'),
          where('slug', '==', normalizedSlug),
          where('status', '==', 'published')
        );
        const snap = await getDocs(q);
        if (!snap.empty && !cancelled) {
          setPage(snap.docs[0].data() as PublishedPage);
          return;
        }

        // Secondary fallback if raw lowercase slug differs
        const lowerRaw = rawKey.toLowerCase();
        if (lowerRaw && lowerRaw !== normalizedSlug) {
          const q2 = query(
            collection(db, 'publishedPages'),
            where('slug', '==', lowerRaw),
            where('status', '==', 'published')
          );
          const snap2 = await getDocs(q2);
          if (!snap2.empty && !cancelled) {
            setPage(snap2.docs[0].data() as PublishedPage);
            return;
          }
        }

        if (!cancelled) {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load published page:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPublished();
    return () => {
      cancelled = true;
    };
  }, [slugOrKey, previewPage]);

  useEffect(() => {
    if (!page) return;
    if (forcedLang) {
      setActiveLang(forcedLang);
    } else if (page.language === 'auto') {
      const detected = detectVisitorLanguage('pt');
      setActiveLang(detected);
    } else {
      setActiveLang(page.language as LanguageCode);
    }
  }, [page, forcedLang]);

  useEffect(() => {
    if (!page) return;
    const storageKey = `gpc_ab_${page.publicKey}`;
    let assigned: 'A' | 'B' = 'A';
    if (page.abTest?.enabled) {
      const existing = sessionStorage.getItem(storageKey);
      if (existing === 'A' || existing === 'B') {
        assigned = existing;
      } else {
        const threshold = page.abTest.splitPercent ?? 50;
        assigned = Math.random() * 100 < threshold ? 'B' : 'A';
        sessionStorage.setItem(storageKey, assigned);
      }
    }
    setVariant(assigned);

    if (!previewPage && !viewLoggedRef.current) {
      viewLoggedRef.current = true;
      logVisitorEvent(page, 'page_view', assigned, activeLang);
    }
  }, [page, previewPage, activeLang]);

  // Inject SEO title, meta description, robots, and hreflang tags
  useEffect(() => {
    if (!page || previewPage) return;
    const translation = page.translations?.[activeLang];
    const title = translation?.metaTitle || page.seo?.metaTitle || translation?.title || page.title;
    const desc = translation?.metaDescription || page.seo?.metaDescription || '';
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (desc) setMeta('description', desc);
    setMeta('robots', page.seo?.robotsIndex === false ? 'noindex, nofollow' : 'index, follow');

    // Configure hreflang alternate links
    document.querySelectorAll('link[data-gpc-hreflang]').forEach((el) => el.remove());
    const origin = window.location.origin;
    const langs: LanguageCode[] = ['pt', 'en', 'es'];
    langs.forEach((l) => {
      if (l === page.language || page.translations?.[l]) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = l;
        link.href = `${origin}/${l}/${page.translations?.[l]?.slug || page.slug}`;
        link.setAttribute('data-gpc-hreflang', 'true');
        document.head.appendChild(link);
      }
    });
  }, [page, activeLang, previewPage]);

  // Ghost Mode (Modo Fantasma): detects genuine human interaction to surface quick redirect
  useEffect(() => {
    if (!page?.ghostMode || previewPage || ghostTriggered) return;
    const handleInteraction = () => {
      setGhostTriggered(true);
    };
    window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
    window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
    };
  }, [page?.ghostMode, previewPage, ghostTriggered]);

  const resolvedContent = useMemo(() => {
    if (!page) return null;
    const t = page.translations?.[activeLang];
    const blocks = t?.blocks?.length ? t.blocks : page.blocks || [];
    const title = t?.title || page.title;
    return { title, blocks };
  }, [page, activeLang]);

  const affiliateDestination = useMemo(() => {
    if (!page?.affiliateUrl) return '#';
    return buildAffiliateRedirectUrl(
      page.affiliateUrl,
      {
        utm_source: page.tracking?.utmSource,
        utm_medium: page.tracking?.utmMedium,
        utm_campaign: page.tracking?.utmCampaign,
      },
      window.location.search
    );
  }, [page]);

  const handleAffiliateClick = (customUrl?: string) => {
    if (!page) return;
    if (!previewPage) {
      logVisitorEvent(page, 'affiliate_click', variant, activeLang);
    }
    const target = customUrl
      ? buildAffiliateRedirectUrl(customUrl, undefined, window.location.search)
      : affiliateDestination;
    if (target && target !== '#') {
      window.location.assign(target);
    }
  };

  const handleOpenCheckout = (block: PageBlock) => {
    if (!page) return;
    if (!previewPage) {
      logVisitorEvent(page, 'checkout_start', variant, activeLang, {
        gateway: block.paymentProvider || page.paymentConfig?.provider || 'stripe',
      });
    }
    setCheckoutBlock(block);
    setCheckoutStep('form');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!page || !checkoutBlock) return;
    const provider = checkoutBlock.paymentProvider || page.paymentConfig?.provider || 'stripe';
    const price = checkoutBlock.price ?? page.paymentConfig?.price ?? 0;
    const currency = checkoutBlock.currency || page.paymentConfig?.currency || 'BRL';

    if (provider === 'mercadopago' || provider === 'pagseguro') {
      setCheckoutStep('pix');
    } else {
      setCheckoutStep('done');
    }

    if (!previewPage) {
      logVisitorEvent(page, 'conversion', variant, activeLang, {
        gateway: provider,
        revenue: price,
        currency,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-8 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mx-auto" />
          <div className="h-40 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !page || !resolvedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            {activeLang === 'pt' ? 'Página não encontrada ou despublicada' : 'Page not found or unpublished'}
          </h1>
          <p className="text-sm text-slate-600">
            {activeLang === 'pt'
              ? 'Verifique o endereço digitado ou publique esta página no painel administrativo.'
              : 'Verify the URL or publish this page from the admin workspace.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            {activeLang === 'pt' ? 'Ir para o Painel' : 'Go to Dashboard'}
          </a>
        </div>
      </div>
    );
  }

  const theme = page.theme || {
    primaryColor: '#0F172A',
    accentColor: '#16A34A',
    backgroundColor: '#F8FAFC',
    surfaceColor: '#FFFFFF',
    textColor: '#0F172A',
    showHeader: true,
    showFooter: true,
    borderRadius: 'md',
  };

  const activePrimary =
    variant === 'B' && page.abTest?.variantBPrimaryColor
      ? page.abTest.variantBPrimaryColor
      : theme.accentColor || '#16A34A';

  const availableLangs = (['pt', 'en', 'es'] as LanguageCode[]).filter(
    (l) => l === page.language || Boolean(page.translations?.[l])
  );

  const isPt = activeLang === 'pt';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      {previewPage && (
        <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              {isPt ? 'Pré-visualização da Página' : 'Live Page Preview'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-slate-300">/{activeLang}/{page.slug}</span>
            {page.abTest?.enabled && (
              <>
                <span className="text-slate-400">·</span>
                <button
                  onClick={() => setVariant((v) => (v === 'A' ? 'B' : 'A'))}
                  className="underline text-blue-300 hover:text-blue-200 cursor-pointer"
                >
                  A/B: {isPt ? `Variação ${variant}` : `Variant ${variant}`} ({isPt ? 'alternar' : 'switch'})
                </button>
              </>
            )}
          </div>
          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="px-3 py-1 rounded bg-white text-slate-900 font-medium hover:bg-slate-100 cursor-pointer"
            >
              {isPt ? 'Voltar ao Editor' : 'Back to Editor'}
            </button>
          )}
        </div>
      )}

      {theme.showHeader && (
        <header
          className="border-b border-slate-200/80 px-6 py-4"
          style={{ backgroundColor: theme.surfaceColor }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {theme.logoUrl ? (
                <img
                  src={normalizeAssetUrl(theme.logoUrl)}
                  alt={theme.logoText || page.title}
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className="font-display font-bold text-lg tracking-tight">
                {theme.logoText || resolvedContent.title}
              </span>
            </div>

            {availableLangs.length > 1 && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
                {availableLangs.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md uppercase transition-colors cursor-pointer ${
                      activeLang === lang
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      )}

      {page.ghostMode && ghostTriggered && (
        <div className="bg-slate-900 text-white px-4 py-3 text-center text-sm flex flex-wrap items-center justify-center gap-4">
          <span>
            {isPt
              ? 'Interação verificada. Continue com segurança para o portal oficial do produto:'
              : 'Interaction verified. Proceed securely to the official product portal:'}
          </span>
          <button
            onClick={() => handleAffiliateClick()}
            className="px-4 py-1.5 rounded-md font-semibold text-white cursor-pointer"
            style={{ backgroundColor: activePrimary }}
          >
            {isPt ? 'Acessar Site Oficial Agora' : 'Proceed to Official Site'}
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {resolvedContent.blocks.map((block, index) => {
          const isFirstHero = block.type === 'hero' && index === 0;
          const displayTitle =
            isFirstHero && variant === 'B' && page.abTest?.variantBHeadline
              ? page.abTest.variantBHeadline
              : block.title;
          const displaySubtitle =
            isFirstHero && variant === 'B' && page.abTest?.variantBSubheadline
              ? page.abTest.variantBSubheadline
              : block.subtitle;
          const displayBtnText =
            isFirstHero && variant === 'B' && page.abTest?.variantBCtaText
              ? page.abTest.variantBCtaText
              : block.buttonText;

          if (block.type === 'cookie_consent') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-10 shadow-sm max-w-2xl mx-auto text-center space-y-5"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-700 mx-auto">
                  <Cookie className="w-6 h-6" />
                </div>
                {block.badgeText && (
                  <p className="text-xs font-medium text-slate-500">{block.badgeText}</p>
                )}
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {displayTitle}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
                  {block.body}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() =>
                      handleAffiliateClick(block.useAffiliateLink ? undefined : block.buttonUrl)
                    }
                    className="w-full sm:w-auto px-6 py-3.5 rounded-lg text-white font-semibold text-sm sm:text-base transition-opacity hover:opacity-95 inline-flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: activePrimary }}
                  >
                    <span>{displayBtnText || (isPt ? 'Aceitar e Continuar' : 'Accept & Continue')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </section>
            );
          }

          if (block.type === 'hero') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 overflow-hidden"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                  <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-5">
                    {block.badgeText && (
                      <span className="text-xs font-semibold text-slate-500">
                        {block.badgeText}
                      </span>
                    )}
                    <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight text-slate-900">
                      {displayTitle}
                    </h1>
                    {displaySubtitle && (
                      <p className="text-base text-slate-600 leading-relaxed">{displaySubtitle}</p>
                    )}
                    {displayBtnText && (
                      <div className="pt-2">
                        <button
                          onClick={() =>
                            handleAffiliateClick(block.useAffiliateLink ? undefined : block.buttonUrl)
                          }
                          className="px-6 py-3.5 rounded-lg text-white font-semibold text-sm sm:text-base inline-flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
                          style={{ backgroundColor: activePrimary }}
                        >
                          <span>{displayBtnText}</span>
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {block.imageUrl && (
                    <div className="md:col-span-5 bg-slate-100 min-h-[240px]">
                      <img
                        src={normalizeAssetUrl(block.imageUrl)}
                        alt={displayTitle || page.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (block.type === 'text') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 space-y-3"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                {block.title && (
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    {block.title}
                  </h2>
                )}
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{block.body}</p>
              </section>
            );
          }

          if (block.type === 'image' && block.imageUrl) {
            return (
              <section key={block.id} className="rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={normalizeAssetUrl(block.imageUrl)}
                  alt={block.title || page.title}
                  className="w-full max-h-[460px] object-cover"
                  referrerPolicy="no-referrer"
                />
                {block.title && (
                  <p className="px-4 py-3 text-xs text-slate-500 bg-white border-t border-slate-100">
                    {block.title}
                  </p>
                )}
              </section>
            );
          }

          if (block.type === 'video' && block.videoUrl) {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 space-y-4"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                {block.title && (
                  <h2 className="font-display text-xl font-bold text-slate-900">{block.title}</h2>
                )}
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900">
                  <iframe
                    src={block.videoUrl}
                    title={block.title || 'Product Video'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            );
          }

          if (block.type === 'review_scorecard') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900">
                      {block.title || (isPt ? 'Resumo da Avaliação' : 'Review Scorecard')}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {isPt ? 'Critérios técnicos e verificação do consumidor' : 'Editorial criteria & buyer verification'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-mono text-2xl font-bold tabular-nums text-slate-900">
                      {(block.score ?? 9.2).toFixed(1)}/10
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-emerald-700">
                      {isPt ? 'Pontos Positivos' : 'Pros'}
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {(block.pros || []).map((pro, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {isPt ? 'Pontos de Atenção' : 'Cons'}
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {(block.cons || []).map((con, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-slate-400 font-bold">·</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === 'comparison_table') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                {block.title && (
                  <h2 className="font-display text-xl font-bold text-slate-900">{block.title}</h2>
                )}
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  {(block.items || []).map((item, i) => (
                    <div
                      key={i}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        item.highlight ? 'bg-blue-50/70' : 'bg-white'
                      }`}
                    >
                      <span className="font-semibold text-sm text-slate-900">
                        {item.label}
                        {item.highlight && (
                          <span className="ml-2 text-xs font-medium text-blue-700">
                            · {isPt ? 'Recomendado' : 'Top Pick'}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-slate-600 tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === 'trust_badges') {
            return (
              <section
                key={block.id}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {(block.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 p-5 flex items-start gap-3"
                    style={{ backgroundColor: theme.surfaceColor }}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      {item.value && <p className="text-xs text-slate-500 mt-0.5">{item.value}</p>}
                    </div>
                  </div>
                ))}
              </section>
            );
          }

          if (block.type === 'faq') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {block.title || (isPt ? 'Perguntas Frequentes' : 'FAQ')}
                </h2>
                <div className="divide-y divide-slate-200">
                  {(block.items || []).map((item, i) => (
                    <div key={i} className="py-3.5 space-y-1">
                      <p className="font-semibold text-sm text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-600">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === 'cta_button') {
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                {block.title && (
                  <h2 className="font-display text-xl font-bold text-slate-900">{block.title}</h2>
                )}
                <button
                  onClick={() =>
                    handleAffiliateClick(block.useAffiliateLink ? undefined : block.buttonUrl)
                  }
                  className="px-7 py-3.5 rounded-lg text-white font-semibold text-base inline-flex items-center gap-2 hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: activePrimary }}
                >
                  <span>{block.buttonText || (isPt ? 'Acessar Oferta Oficial' : 'Go to Official Offer')}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </section>
            );
          }

          if (block.type === 'payment_checkout') {
            const price = block.price ?? page.paymentConfig?.price ?? 197;
            const currency = block.currency || page.paymentConfig?.currency || 'BRL';
            const provider = block.paymentProvider || page.paymentConfig?.provider || 'stripe';
            return (
              <section
                key={block.id}
                className="rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
                style={{ backgroundColor: theme.surfaceColor }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="uppercase font-medium">{provider}</span>
                    <span>·</span>
                    <span>{isPt ? 'Checkout Direto Verificado' : 'Verified Direct Checkout'}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {block.title || (isPt ? 'Finalizar Compra Segura' : 'Direct Secure Checkout')}
                  </h2>
                  {block.subtitle && <p className="text-sm text-slate-600">{block.subtitle}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{isPt ? 'Valor Total' : 'Total'}</p>
                    <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">
                      {formatCurrency(price, currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenCheckout(block)}
                    className="px-6 py-3.5 rounded-lg text-white font-semibold text-sm inline-flex items-center gap-2 hover:opacity-95 cursor-pointer"
                    style={{ backgroundColor: activePrimary }}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{block.buttonText || (isPt ? 'Comprar Agora' : 'Buy Now')}</span>
                  </button>
                </div>
              </section>
            );
          }

          if (block.type === 'legal_footer') {
            return (
              <section
                key={block.id}
                className="pt-4 text-center text-xs text-slate-500 space-y-2 border-t border-slate-200"
              >
                <p className="max-w-2xl mx-auto leading-relaxed">{block.body}</p>
              </section>
            );
          }

          return null;
        })}
      </main>

      {theme.showFooter && (
        <footer className="border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span>{theme.logoText || page.title}</span>
              {page.policyEmail && (
                <>
                  <span>·</span>
                  <span>{page.policyEmail}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLegalModal('privacy')}
                className="hover:text-slate-900 underline cursor-pointer"
              >
                {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
              </button>
              <button
                onClick={() => setLegalModal('terms')}
                className="hover:text-slate-900 underline cursor-pointer"
              >
                {isPt ? 'Termos de Uso' : 'Terms of Use'}
              </button>
            </div>
          </div>
        </footer>
      )}

      {page.whatsapp?.enabled && page.whatsapp.phoneNumber && (
        <a
          href={`https://wa.me/${page.whatsapp.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
            page.whatsapp.message || ''
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (!previewPage) {
              logVisitorEvent(page, 'whatsapp_click', variant, activeLang);
            }
          }}
          className={`fixed bottom-5 ${
            page.whatsapp.position === 'bottom-left' ? 'left-5' : 'right-5'
          } z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 text-white font-semibold text-sm shadow-lg hover:bg-emerald-700 transition-colors`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>{page.whatsapp.buttonLabel || 'WhatsApp'}</span>
        </a>
      )}

      {/* Legal Policy Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {legalModal === 'privacy'
                  ? isPt
                    ? 'Política de Privacidade'
                    : 'Privacy Policy'
                  : isPt
                  ? 'Termos de Uso'
                  : 'Terms of Use'}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-600 space-y-3 leading-relaxed max-h-80 overflow-y-auto">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    {isPt
                      ? 'Respeitamos a sua privacidade. Este site utiliza cookies estritamente necessários para funcionamento técnico, medição de campanhas e redirecionamento seguro ao portal oficial.'
                      : 'We respect your privacy. This website uses essential cookies for technical operation, campaign attribution, and secure forwarding to the official product portal.'}
                  </p>
                  <p>
                    {isPt ? 'Contato do controlador:' : 'Policy contact:'}{' '}
                    <strong>{page.policyEmail || 'privacy@globalpresell.com'}</strong>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {isPt
                      ? 'As informações exibidas nesta página têm caráter informativo e comercial. Ao prosseguir para o site oficial ou checkout parceiro, aplicam-se os termos de venda e garantia do produtor.'
                      : 'Information on this page is provided for informational and commercial review purposes. Producer warranty and purchase terms apply at the official checkout.'}
                  </p>
                  <p>
                    {isPt ? 'Suporte:' : 'Support:'}{' '}
                    <strong>{page.policyEmail || 'support@globalpresell.com'}</strong>
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native Direct Payment Gateway Modal */}
      {checkoutBlock && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-mono uppercase text-slate-500">
                  Gateway: {checkoutBlock.paymentProvider || page.paymentConfig?.provider || 'stripe'}
                </p>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {isPt ? 'Checkout Seguro' : 'Secure Checkout'}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutBlock(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutStep === 'form' && (
              <form onSubmit={handleConfirmPayment} className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{page.title}</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(
                      checkoutBlock.price ?? page.paymentConfig?.price ?? 197,
                      checkoutBlock.currency || page.paymentConfig?.currency || 'BRL'
                    )}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Nome completo' : 'Full name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder={isPt ? 'Seu nome' : 'Your name'}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'E-mail para entrega e recibo' : 'Email for receipt & access'}
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm hover:opacity-95 cursor-pointer"
                  style={{ backgroundColor: activePrimary }}
                >
                  {isPt ? 'Confirmar & Gerar Pagamento' : 'Confirm & Proceed to Payment'}
                </button>
              </form>
            )}

            {checkoutStep === 'pix' && (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 mx-auto">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-slate-900">
                    {isPt ? 'Código Pix Copia e Cola Gerado' : 'Pix Payment Code Ready'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isPt
                      ? 'Conversão registrada em tempo real no painel de Analytics.'
                      : 'Conversion recorded in real time on Analytics.'}
                  </p>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={generatePixPayload(
                    page.paymentConfig?.pixKey || 'pix@globalpresell.com',
                    page.title,
                    checkoutBlock.price ?? page.paymentConfig?.price ?? 197
                  )}
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
                <button
                  onClick={() => setCheckoutBlock(null)}
                  className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium cursor-pointer"
                >
                  {isPt ? 'Concluir' : 'Done'}
                </button>
              </div>
            )}

            {checkoutStep === 'done' && (
              <div className="space-y-4 text-center py-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-base text-slate-900">
                    {isPt ? 'Pedido Iniciado no Gateway!' : 'Order Initiated via Gateway!'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isPt
                      ? `Conversão registrada para ${buyerEmail}.`
                      : `Conversion recorded for ${buyerEmail}.`}
                  </p>
                </div>
                {(checkoutBlock.checkoutUrl || page.paymentConfig?.checkoutUrl) && (
                  <a
                    href={checkoutBlock.checkoutUrl || page.paymentConfig?.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white font-semibold text-sm"
                    style={{ backgroundColor: activePrimary }}
                  >
                    <span>{isPt ? 'Abrir Checkout Externo' : 'Open Gateway Checkout'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setCheckoutBlock(null)}
                  className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-800 text-sm font-medium cursor-pointer"
                >
                  {isPt ? 'Fechar' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
