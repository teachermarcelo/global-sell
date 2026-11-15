import React, { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  Globe,
  MessageCircle,
  Plus,
  Save,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AffiliateLink,
  Campaign,
  Category,
  LanguageCode,
  PageItem,
  PaymentGateway,
  PaymentProvider,
  Product,
  UserWorkspaceSettings,
  WhatsappWidget,
} from '../../types';

/* ── MODULE 12: LANGUAGES ── */
interface LanguagesViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  settings: UserWorkspaceSettings | null;
  onUpdateSettings: (patch: Partial<UserWorkspaceSettings>) => Promise<void>;
  onSavePage: (
    pageInput: Omit<PageItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingPage?: PageItem,
    publishNow?: boolean,
    versionNote?: string
  ) => Promise<string>;
}

export const LanguagesView: React.FC<LanguagesViewProps> = ({
  uiLang,
  pages,
  settings,
  onUpdateSettings,
  onSavePage,
}) => {
  const isPt = uiLang === 'pt';
  const [autoDetect, setAutoDetect] = useState(settings?.autoDetectVisitorLang ?? true);
  const [defaultLang, setDefaultLang] = useState<LanguageCode>(settings?.defaultVisitorLang ?? 'pt');
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id || '');
  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  const [ptTitle, setPtTitle] = useState(selectedPage?.translations?.pt?.title || selectedPage?.title || '');
  const [enTitle, setEnTitle] = useState(selectedPage?.translations?.en?.title || selectedPage?.title || '');
  const [esTitle, setEsTitle] = useState(selectedPage?.translations?.es?.title || selectedPage?.title || '');
  const [protectedTerms, setProtectedTerms] = useState(
    (selectedPage?.seo?.protectedBrandTerms || []).join(', ')
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoDetect(settings.autoDetectVisitorLang ?? true);
      setDefaultLang(settings.defaultVisitorLang ?? 'pt');
    }
  }, [settings]);

  useEffect(() => {
    if (selectedPage && !selectedPageId) {
      setSelectedPageId(selectedPage.id);
      setPtTitle(selectedPage.translations?.pt?.title || selectedPage.title);
      setEnTitle(selectedPage.translations?.en?.title || selectedPage.title);
      setEsTitle(selectedPage.translations?.es?.title || selectedPage.title);
      setProtectedTerms((selectedPage.seo?.protectedBrandTerms || []).join(', '));
    }
  }, [selectedPage, selectedPageId]);

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const pg = pages.find((p) => p.id === id);
    if (pg) {
      setPtTitle(pg.translations?.pt?.title || pg.title);
      setEnTitle(pg.translations?.en?.title || pg.title);
      setEsTitle(pg.translations?.es?.title || pg.title);
      setProtectedTerms((pg.seo?.protectedBrandTerms || []).join(', '));
    }
  };

  const handleSaveGlobalLang = async () => {
    await onUpdateSettings({
      autoDetectVisitorLang: autoDetect,
      defaultVisitorLang: defaultLang,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSavePageTranslations = async () => {
    if (!selectedPage) return;
    const terms = protectedTerms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await onSavePage(
      {
        ...selectedPage,
        seo: { ...selectedPage.seo, protectedBrandTerms: terms },
        translations: {
          ...selectedPage.translations,
          pt: {
            title: ptTitle || selectedPage.title,
            slug: selectedPage.slug,
            blocks: selectedPage.translations?.pt?.blocks || selectedPage.blocks,
          },
          en: {
            title: enTitle || selectedPage.title,
            slug: selectedPage.slug,
            blocks: selectedPage.translations?.en?.blocks || selectedPage.blocks,
          },
          es: {
            title: esTitle || selectedPage.title,
            slug: selectedPage.slug,
            blocks: selectedPage.translations?.es?.blocks || selectedPage.blocks,
          },
        },
      },
      selectedPage,
      selectedPage.status === 'published',
      'Atualização multilíngue'
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Sistema Multilíngue Inteligente' : 'Smart Multilingual System'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Detecção automática pelo idioma do navegador e país, URLs dedicadas (/pt/, /en/, /es/) e proteção de marcas.'
              : 'Automatic browser language detection, dedicated regional URLs (/pt/, /en/, /es/), and protected brand terms.'}
          </p>
        </div>
        {savedNotice && (
          <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-4 h-4" />
            {isPt ? 'Salvo!' : 'Saved!'}
          </span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>{isPt ? 'Regras Globais de Detecção' : 'Global Detection Rules'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            <span>
              {isPt
                ? 'Detectar automaticamente idioma do navegador do visitante'
                : 'Auto-detect visitor browser language'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              {isPt ? 'Idioma Padrão (Fallback):' : 'Default Language:'}
            </label>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value as LanguageCode)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="pt">Português (PT)</option>
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveGlobalLang}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
        >
          {isPt ? 'Salvar Preferências Globais' : 'Save Global Preferences'}
        </button>
      </div>

      {selectedPage && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display font-bold text-base text-slate-900">
              {isPt ? 'Versões Independentes & Hreflang por Página' : 'Per-Page Language Versions & Hreflang'}
            </h3>
            <select
              value={selectedPage.id}
              onChange={(e) => handleSelectPage(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs font-mono font-bold text-slate-700">PT · /pt/{selectedPage.slug}</p>
              <input
                type="text"
                value={ptTitle}
                onChange={(e) => setPtTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs font-mono font-bold text-slate-700">EN · /en/{selectedPage.slug}</p>
              <input
                type="text"
                value={enTitle}
                onChange={(e) => setEnTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="p-4 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs font-mono font-bold text-slate-700">ES · /es/{selectedPage.slug}</p>
              <input
                type="text"
                value={esTitle}
                onChange={(e) => setEsTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt
                ? 'Marcas e Termos Protegidos (não traduzir automaticamente, separados por vírgula)'
                : 'Protected Brand & Product Terms (comma-separated)'}
            </label>
            <input
              type="text"
              value={protectedTerms}
              onChange={(e) => setProtectedTerms(e.target.value)}
              placeholder="Katori, Lumina Serum, VitalBotanics"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <button
            onClick={handleSavePageTranslations}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            {isPt ? 'Atualizar Versões & Hreflang' : 'Save Language Versions'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ── MODULE 13: SEO & SCRIPTS ── */
interface SeoScriptsViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  settings: UserWorkspaceSettings | null;
  onUpdateSettings: (patch: Partial<UserWorkspaceSettings>) => Promise<void>;
  onSavePage: (
    pageInput: Omit<PageItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingPage?: PageItem,
    publishNow?: boolean,
    versionNote?: string
  ) => Promise<string>;
}

export const SeoScriptsView: React.FC<SeoScriptsViewProps> = ({
  uiLang,
  pages,
  settings,
  onUpdateSettings,
  onSavePage,
}) => {
  const isPt = uiLang === 'pt';
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id || '');
  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  const [metaTitle, setMetaTitle] = useState(selectedPage?.seo?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(selectedPage?.seo?.metaDescription || '');
  const [robotsIndex, setRobotsIndex] = useState(selectedPage?.seo?.robotsIndex ?? true);
  const [headScripts, setHeadScripts] = useState(settings?.headScripts || '');
  const [bodyScripts, setBodyScripts] = useState(settings?.bodyScripts || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setHeadScripts(settings.headScripts || '');
      setBodyScripts(settings.bodyScripts || '');
    }
  }, [settings]);

  useEffect(() => {
    if (selectedPage && !selectedPageId) {
      setSelectedPageId(selectedPage.id);
      setMetaTitle(selectedPage.seo?.metaTitle || selectedPage.title);
      setMetaDesc(selectedPage.seo?.metaDescription || '');
      setRobotsIndex(selectedPage.seo?.robotsIndex ?? true);
    }
  }, [selectedPage, selectedPageId]);

  const handleSave = async () => {
    await onUpdateSettings({ headScripts, bodyScripts });
    if (selectedPage) {
      await onSavePage(
        {
          ...selectedPage,
          seo: {
            ...selectedPage.seo,
            metaTitle,
            metaDescription: metaDesc,
            robotsIndex,
          },
        },
        selectedPage,
        selectedPage.status === 'published',
        'Atualização de SEO'
      );
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'SEO, Indexação & Scripts' : 'SEO, Indexation & Custom Scripts'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Gerencie meta tags, diretivas robots, tags hreflang e scripts personalizados de cabeçalho/rodapé.'
              : 'Configure meta tags, search indexation rules, hreflang links, and custom head/body tracking scripts.'}
          </p>
        </div>
        {saved && (
          <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-4 h-4" />
            {isPt ? 'Salvo!' : 'Saved!'}
          </span>
        )}
      </div>

      {selectedPage && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              {isPt ? 'SEO da Página' : 'Page-Level SEO'}
            </h3>
            <select
              value={selectedPage.id}
              onChange={(e) => {
                setSelectedPageId(e.target.value);
                const pg = pages.find((x) => x.id === e.target.value);
                if (pg) {
                  setMetaTitle(pg.seo?.metaTitle || pg.title);
                  setMetaDesc(pg.seo?.metaDescription || '');
                  setRobotsIndex(pg.seo?.robotsIndex ?? true);
                }
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Meta Description</label>
              <textarea
                rows={2}
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={robotsIndex}
                onChange={(e) => setRobotsIndex(e.target.checked)}
              />
              <span>
                {isPt
                  ? 'Permitir indexação no Google (index, follow) — desmarque para noindex em presells exclusivas de tráfego pago'
                  : 'Allow search indexation (index, follow) — uncheck for paid-traffic-only noindex'}
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900">
          {isPt ? 'Scripts Globais (Head & Body)' : 'Global Scripts (Head & Body)'}
        </h3>
        <div>
          <label className="block text-xs font-mono text-slate-600 mb-1">&lt;head&gt; scripts</label>
          <textarea
            rows={4}
            value={headScripts}
            onChange={(e) => setHeadScripts(e.target.value)}
            placeholder="<!-- Verification meta tags, GTM snippet, etc. -->"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-slate-600 mb-1">&lt;body&gt; scripts</label>
          <textarea
            rows={4}
            value={bodyScripts}
            onChange={(e) => setBodyScripts(e.target.value)}
            placeholder="<!-- Custom conversion scripts -->"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
          />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isPt ? 'Salvar SEO e Scripts' : 'Save SEO & Scripts'}</span>
        </button>
      </div>
    </div>
  );
};

/* ── MODULE 14: MARKETING, WHATSAPP BUTTONS & PAYMENT GATEWAYS ── */
interface MarketingGatewaysViewProps {
  uiLang: LanguageCode;
  settings: UserWorkspaceSettings | null;
  whatsappWidgets: WhatsappWidget[];
  paymentGateways: PaymentGateway[];
  onUpdateSettings: (patch: Partial<UserWorkspaceSettings>) => Promise<void>;
  onSaveWhatsapp: (
    input: Omit<WhatsappWidget, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteWhatsapp: (id: string) => Promise<void>;
  onSaveGateway: (
    input: Omit<PaymentGateway, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteGateway: (id: string) => Promise<void>;
}

export const MarketingGatewaysView: React.FC<MarketingGatewaysViewProps> = ({
  uiLang,
  settings,
  whatsappWidgets,
  paymentGateways,
  onUpdateSettings,
  onSaveWhatsapp,
  onDeleteWhatsapp,
  onSaveGateway,
  onDeleteGateway,
}) => {
  const isPt = uiLang === 'pt';
  const [ga4, setGa4] = useState(settings?.ga4MeasurementId || '');
  const [gtm, setGtm] = useState(settings?.gtmContainerId || '');
  const [gads, setGads] = useState(settings?.googleAdsId || '');
  const [gadsLabel, setGadsLabel] = useState(settings?.googleAdsConversionLabel || '');
  const [metaPixel, setMetaPixel] = useState(settings?.metaPixelId || '');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (settings) {
      setGa4(settings.ga4MeasurementId || '');
      setGtm(settings.gtmContainerId || '');
      setGads(settings.googleAdsId || '');
      setGadsLabel(settings.googleAdsConversionLabel || '');
      setMetaPixel(settings.metaPixelId || '');
    }
  }, [settings]);

  // WhatsApp Form
  const [waName, setWaName] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waMsg, setWaMsg] = useState('Olá! Gostaria de tirar uma dúvida sobre a oferta.');
  const [waLabel, setWaLabel] = useState('Falar no WhatsApp');

  // Gateway Form
  const [gwProvider, setGwProvider] = useState<PaymentProvider>('stripe');
  const [gwDisplay, setGwDisplay] = useState('Stripe Checkout');
  const [gwPublicKey, setGwPublicKey] = useState('');
  const [gwCheckoutUrl, setGwCheckoutUrl] = useState('');
  const [gwPixKey, setGwPixKey] = useState('');
  const [gwMode, setGwMode] = useState<'live' | 'sandbox'>('live');

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      ga4MeasurementId: ga4.trim(),
      gtmContainerId: gtm.trim(),
      googleAdsId: gads.trim(),
      googleAdsConversionLabel: gadsLabel.trim(),
      metaPixelId: metaPixel.trim(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCreateWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waName.trim() || !waPhone.trim()) return;
    await onSaveWhatsapp({
      name: waName.trim(),
      phoneNumber: waPhone.trim(),
      prefilledMessage: waMsg.trim(),
      buttonLabel: waLabel.trim(),
      position: 'bottom-right',
      isActive: true,
    });
    setWaName('');
    setWaPhone('');
  };

  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gwDisplay.trim()) return;
    await onSaveGateway({
      provider: gwProvider,
      displayName: gwDisplay.trim(),
      publicKeyOrAccount: gwPublicKey.trim(),
      checkoutBaseUrl: gwCheckoutUrl.trim(),
      pixKey: gwPixKey.trim(),
      supportedCurrencies: gwProvider === 'mercadopago' || gwProvider === 'pagseguro' ? ['BRL'] : ['USD', 'BRL', 'EUR'],
      mode: gwMode,
      isEnabled: true,
    });
    setGwPublicKey('');
    setGwCheckoutUrl('');
    setGwPixKey('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Integrações de Marketing, WhatsApp & Gateways' : 'Marketing, WhatsApp & Payment Gateways'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Configure Google Analytics 4, GTM, Google Ads, Botões WhatsApp e gateways nativos para vendas diretas.'
              : 'Configure GA4, Tag Manager, Google Ads conversions, WhatsApp widgets, and direct payment gateways.'}
          </p>
        </div>
        {savedNotice && (
          <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-4 h-4" />
            {isPt ? 'Salvo!' : 'Saved!'}
          </span>
        )}
      </div>

      {/* Google Ads / GA4 / GTM / Meta Pixel */}
      <form
        onSubmit={handleSaveTracking}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <h3 className="font-display font-bold text-base text-slate-900">
          {isPt ? 'Google Ads, GA4, Tag Manager & Meta Pixel' : 'Google Ads, GA4, Tag Manager & Meta Pixel'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Analytics 4 (Measurement ID)
            </label>
            <input
              type="text"
              value={ga4}
              onChange={(e) => setGa4(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Tag Manager (Container ID)
            </label>
            <input
              type="text"
              value={gtm}
              onChange={(e) => setGtm(e.target.value)}
              placeholder="GTM-XXXXXXX"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Ads ID
            </label>
            <input
              type="text"
              value={gads}
              onChange={(e) => setGads(e.target.value)}
              placeholder="AW-123456789"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Ads Conversion Label
            </label>
            <input
              type="text"
              value={gadsLabel}
              onChange={(e) => setGadsLabel(e.target.value)}
              placeholder="AbCdEfGhIjK"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Meta Pixel ID</label>
            <input
              type="text"
              value={metaPixel}
              onChange={(e) => setMetaPixel(e.target.value)}
              placeholder="123456789012345"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          {isPt ? 'Salvar IDs de Rastreamento' : 'Save Tracking IDs'}
        </button>
      </form>

      {/* Native Payment Gateways */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="font-display font-bold text-base text-slate-900">
            {isPt ? 'Gateways de Pagamento Nativos (Vendas Diretas)' : 'Native Payment Gateways (Direct Sales)'}
          </h3>
        </div>

        <form onSubmit={handleCreateGateway} className="grid grid-cols-1 sm:grid-cols-6 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <select
            value={gwProvider}
            onChange={(e) => {
              const p = e.target.value as PaymentProvider;
              setGwProvider(p);
              setGwDisplay(p.charAt(0).toUpperCase() + p.slice(1));
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="stripe">Stripe</option>
            <option value="mercadopago">Mercado Pago / Pix</option>
            <option value="paypal">PayPal</option>
            <option value="hotmart">Hotmart</option>
            <option value="kiwify">Kiwify</option>
            <option value="pagseguro">PagSeguro</option>
          </select>
          <input
            type="text"
            required
            value={gwDisplay}
            onChange={(e) => setGwDisplay(e.target.value)}
            placeholder={isPt ? 'Nome da conta' : 'Display name'}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="text"
            value={gwPublicKey}
            onChange={(e) => setGwPublicKey(e.target.value)}
            placeholder={isPt ? 'Chave Pública / ID' : 'Public Key / Client ID'}
            className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="url"
            value={gwCheckoutUrl}
            onChange={(e) => setGwCheckoutUrl(e.target.value)}
            placeholder="https://checkout..."
            className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="text"
            value={gwPixKey}
            onChange={(e) => setGwPixKey(e.target.value)}
            placeholder={isPt ? 'Chave Pix (opcional)' : 'Pix Key (optional)'}
            className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isPt ? 'Conectar' : 'Connect'}</span>
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paymentGateways.map((gw) => (
            <div
              key={gw.id}
              className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900">
                  {gw.displayName}{' '}
                  <span className="text-xs font-mono text-slate-400">({gw.provider})</span>
                </p>
                <p className="text-xs font-mono text-slate-500 truncate">
                  {gw.publicKeyOrAccount || gw.checkoutBaseUrl || gw.pixKey || 'Configurado'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSaveGateway({ ...gw, isEnabled: !gw.isEnabled }, gw.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    gw.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {gw.isEnabled ? (isPt ? 'Ativo' : 'Enabled') : isPt ? 'Pausado' : 'Paused'}
                </button>
                <button
                  onClick={() => onDeleteGateway(gw.id)}
                  className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Floating Buttons (Super Presell Ultimate "Botões WhatsApp") */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <h3 className="font-display font-bold text-base text-slate-900">
            {isPt ? 'Botões WhatsApp Flutuantes' : 'Floating WhatsApp Buttons'}
          </h3>
        </div>

        <form onSubmit={handleCreateWa} className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <input
            type="text"
            required
            value={waName}
            onChange={(e) => setWaName(e.target.value)}
            placeholder={isPt ? 'Nome do Botão' : 'Widget Name'}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="text"
            required
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value)}
            placeholder="5511999999999"
            className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="text"
            value={waLabel}
            onChange={(e) => setWaLabel(e.target.value)}
            placeholder={isPt ? 'Rótulo (ex: Tirar Dúvidas)' : 'Button Label'}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <input
            type="text"
            value={waMsg}
            onChange={(e) => setWaMsg(e.target.value)}
            placeholder={isPt ? 'Mensagem inicial' : 'Prefilled message'}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
          >
            {isPt ? 'Adicionar Botão' : 'Add Widget'}
          </button>
        </form>

        {whatsappWidgets.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {whatsappWidgets.map((w) => (
              <div key={w.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">
                    {w.name} · <span className="font-mono text-emerald-700">{w.phoneNumber}</span>
                  </p>
                  <p className="text-slate-500">{w.prefilledMessage}</p>
                </div>
                <button
                  onClick={() => onDeleteWhatsapp(w.id)}
                  className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── MODULE 15: GENERAL SETTINGS & BACKUP ── */
interface GeneralSettingsBackupViewProps {
  uiLang: LanguageCode;
  settings: UserWorkspaceSettings | null;
  categories: Category[];
  products: Product[];
  pages: PageItem[];
  affiliateLinks: AffiliateLink[];
  campaigns: Campaign[];
  onUpdateSettings: (patch: Partial<UserWorkspaceSettings>) => Promise<void>;
  onImportProductsAndCategories: (backup: {
    categories?: Array<{ name: string; description?: string; color?: string }>;
    products?: Array<Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>;
  }) => Promise<void>;
}

export const GeneralSettingsBackupView: React.FC<GeneralSettingsBackupViewProps> = ({
  uiLang,
  settings,
  categories,
  products,
  pages,
  affiliateLinks,
  campaigns,
  onUpdateSettings,
  onImportProductsAndCategories,
}) => {
  const isPt = uiLang === 'pt';
  const [customDomain, setCustomDomain] = useState(settings?.customDomain || '');
  const [preserveParams, setPreserveParams] = useState(settings?.preserveAffiliateParams ?? true);
  const [cookiePt, setCookiePt] = useState(settings?.cookieConsentTextPt || '');
  const [cookieEn, setCookieEn] = useState(settings?.cookieConsentTextEn || '');
  const [savedNotice, setSavedNotice] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setCustomDomain(settings.customDomain || '');
      setPreserveParams(settings.preserveAffiliateParams ?? true);
      setCookiePt(settings.cookieConsentTextPt || '');
      setCookieEn(settings.cookieConsentTextEn || '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      customDomain: customDomain.trim(),
      preserveAffiliateParams: preserveParams,
      cookieConsentTextPt: cookiePt,
      cookieConsentTextEn: cookieEn,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'Global Presell Commerce',
      categories,
      products,
      pages,
      affiliateLinks,
      campaigns,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-presell-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onImportProductsAndCategories({
        categories: parsed.categories,
        products: parsed.products,
      });
      setImportStatus(
        isPt
          ? 'Backup importado com sucesso!'
          : 'Backup imported successfully!'
      );
    } catch {
      setImportStatus(isPt ? 'Arquivo JSON inválido.' : 'Invalid backup JSON file.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Configurações Gerais & Backup' : 'General Settings & Backup'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Domínio personalizado, preservação de parâmetros de afiliados, privacidade e cópia de segurança.'
              : 'Custom domain, affiliate parameter preservation, privacy notices, and workspace backup.'}
          </p>
        </div>
        {savedNotice && (
          <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
            <Check className="w-4 h-4" />
            {isPt ? 'Configurações salvas!' : 'Saved!'}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-700" />
          <h3 className="font-display font-bold text-base text-slate-900">
            {isPt ? 'Domínio & Parâmetros de Afiliado' : 'Domain & Affiliate Rules'}
          </h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {isPt
              ? 'Domínio Público / Personalizado (ex: https://global-sell-beta.vercel.app ou https://ofertas.seudominio.com)'
              : 'Public / Custom Domain (e.g. https://global-sell-beta.vercel.app)'}
          </label>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="https://global-sell-beta.vercel.app"
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            {isPt
              ? 'Quando preenchido, todos os botões de "Copiar URL" e "Ver página" usam este domínio público (ideal para abrir links em qualquer navegador e campanhas de tráfego pago).'
              : 'When set, all Copy URL and View Page links use this public domain across browsers and ad campaigns.'}
          </p>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={preserveParams}
            onChange={(e) => setPreserveParams(e.target.checked)}
          />
          <span>
            {isPt
              ? 'Preservar integralmente parâmetros originais de afiliados (hop, src, sck, gclid, utm_*) nos redirecionamentos'
              : 'Preserve all affiliate & ad parameters (hop, src, sck, gclid, utm_*) across redirects'}
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt ? 'Texto Padrão de Cookies (PT)' : 'Default Cookie Notice (PT)'}
            </label>
            <textarea
              rows={2}
              value={cookiePt}
              onChange={(e) => setCookiePt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt ? 'Texto Padrão de Cookies (EN)' : 'Default Cookie Notice (EN)'}
            </label>
            <textarea
              rows={2}
              value={cookieEn}
              onChange={(e) => setCookieEn(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          {isPt ? 'Salvar Configurações Gerais' : 'Save General Settings'}
        </button>
      </form>

      {/* Backup & Restore (Super Presell Ultimate "Backup") */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900">
          {isPt ? 'Backup & Restauração Completa' : 'Workspace Backup & Restore'}
        </h3>
        <p className="text-xs text-slate-600">
          {isPt
            ? 'Exporte seus produtos, páginas, categorias, links de afiliados e campanhas em JSON seguro.'
            : 'Download a full JSON snapshot of your products, pages, categories, links, and campaigns.'}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isPt ? 'Baixar Backup JSON' : 'Export JSON Backup'}</span>
          </button>

          <label className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{isPt ? 'Importar Backup JSON' : 'Import JSON Backup'}</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {importStatus && <p className="text-xs font-medium text-emerald-700">{importStatus}</p>}
      </div>
    </div>
  );
};
