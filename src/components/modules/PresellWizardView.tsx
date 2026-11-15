import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { getPublicPagePath, slugify } from '../../lib/i18n';
import { BUILTIN_TEMPLATES, BuiltInTemplate } from '../../lib/templates';
import {
  AffiliateLink,
  Category,
  FunnelStage,
  LanguageCode,
  PageBlock,
  PageItem,
  PageKind,
  PageLanguageSetting,
  PageTheme,
  PaymentGateway,
  PaymentProvider,
  PresellType,
  Product,
  UserTemplate,
  UserWorkspaceSettings,
  WhatsappWidget,
} from '../../types';

interface PresellWizardViewProps {
  uiLang: LanguageCode;
  mode: 'presell' | 'landing';
  initialProduct?: Product | null;
  products: Product[];
  categories: Category[];
  affiliateLinks: AffiliateLink[];
  userTemplates: UserTemplate[];
  whatsappWidgets: WhatsappWidget[];
  paymentGateways: PaymentGateway[];
  settings: UserWorkspaceSettings | null;
  onSavePage: (
    pageInput: Omit<PageItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingPage?: PageItem,
    publishNow?: boolean,
    versionNote?: string
  ) => Promise<string>;
  onToggleFavoriteTemplate: (tpl: BuiltInTemplate) => Promise<void>;
  onOpenBuilder: (pageId: string) => void;
  onDoneGoToPages: () => void;
}

export const PresellWizardView: React.FC<PresellWizardViewProps> = ({
  uiLang,
  mode,
  initialProduct,
  products,
  categories,
  affiliateLinks,
  userTemplates,
  whatsappWidgets,
  paymentGateways,
  settings,
  onSavePage,
  onToggleFavoriteTemplate,
  onOpenBuilder,
  onDoneGoToPages,
}) => {
  const isPt = uiLang === 'pt';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 state (Super Presell Ultimate fields)
  const [pageTitle, setPageTitle] = useState(
    initialProduct
      ? `${initialProduct.name} — ${mode === 'landing' ? 'Oferta Oficial' : 'Presell Oficial'}`
      : ''
  );
  const [slug, setSlug] = useState(initialProduct ? slugify(initialProduct.name) : '');
  const [slugEditedManually, setSlugEditedManually] = useState(Boolean(initialProduct));
  const [productId, setProductId] = useState(initialProduct?.id || '');
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('bottom');
  const [presellType, setPresellType] = useState<PresellType>(
    mode === 'landing' ? 'commercial_landing' : 'cookies_centered'
  );
  const [affiliateUrl, setAffiliateUrl] = useState(initialProduct?.affiliateUrl || '');
  const [affiliateLinkId, setAffiliateLinkId] = useState('');
  const [originCountry, setOriginCountry] = useState(initialProduct?.originCountry || 'US');
  const [targetCountry, setTargetCountry] = useState(initialProduct?.country || 'BR');
  const [language, setLanguage] = useState<PageLanguageSetting>(
    initialProduct?.language || 'auto'
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId || categories[0]?.id || ''
  );
  const [policyEmailMode, setPolicyEmailMode] = useState<'producer' | 'custom'>('producer');
  const [policyEmail, setPolicyEmail] = useState(initialProduct?.producerEmail || '');
  const [ghostMode, setGhostMode] = useState(false);

  // Step 2 state
  const defaultTpl =
    BUILTIN_TEMPLATES.find((t) => t.presellType === presellType) || BUILTIN_TEMPLATES[0];
  const [selectedTplId, setSelectedTplId] = useState<string>(defaultTpl.id);
  const [previewModalTpl, setPreviewModalTpl] = useState<BuiltInTemplate | null>(null);

  // Step 3 state
  const [blocks, setBlocks] = useState<PageBlock[]>(() =>
    JSON.parse(JSON.stringify(isPt ? defaultTpl.blocksPt : defaultTpl.blocksEn))
  );
  const [theme, setTheme] = useState<PageTheme>(() => ({ ...defaultTpl.theme }));
  const [enableWhatsapp, setEnableWhatsapp] = useState(false);
  const [whatsappWidgetId, setWhatsappWidgetId] = useState(whatsappWidgets[0]?.id || '');
  const [enableDirectPay, setEnableDirectPay] = useState(mode === 'landing');
  const [payProvider, setPayProvider] = useState<PaymentProvider>(
    paymentGateways[0]?.provider || 'mercadopago'
  );
  const [payPrice, setPayPrice] = useState<number>(initialProduct?.price || 197);
  const [payCurrency, setPayCurrency] = useState<'BRL' | 'USD' | 'EUR' | 'GBP'>(
    initialProduct?.currency || 'BRL'
  );
  const [enableAbTest, setEnableAbTest] = useState(false);
  const [variantBHeadline, setVariantBHeadline] = useState('');
  const [variantBCtaText, setVariantBCtaText] = useState('');

  // Step 4 state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [readyModal, setReadyModal] = useState<{
    pageId: string;
    publicUrl: string;
    enUrl: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const handleProductChange = (pid: string) => {
    setProductId(pid);
    const p = products.find((x) => x.id === pid);
    if (p) {
      if (!pageTitle) setPageTitle(`${p.name} — Presell Oficial`);
      if (!slugEditedManually) setSlug(slugify(p.name));
      setAffiliateUrl(p.affiliateUrl);
      setOriginCountry(p.originCountry || p.country || 'US');
      setTargetCountry(p.country || 'BR');
      if (p.categoryId) setCategoryId(p.categoryId);
      if (p.producerEmail && policyEmailMode === 'producer') setPolicyEmail(p.producerEmail);
      setPayPrice(p.price);
      setPayCurrency(p.currency);
    }
  };

  const handleAffiliateLinkSelect = (lid: string) => {
    setAffiliateLinkId(lid);
    const link = affiliateLinks.find((l) => l.id === lid);
    if (link) {
      setAffiliateUrl(link.destinationUrl);
    }
  };

  const applyTemplate = (tpl: BuiltInTemplate) => {
    setSelectedTplId(tpl.id);
    setPresellType(tpl.presellType);
    const sourceBlocks = language === 'en' ? tpl.blocksEn : tpl.blocksPt;
    setBlocks(JSON.parse(JSON.stringify(sourceBlocks)));
    setTheme({ ...tpl.theme });
  };

  const handlePublishOrDraft = async (publishNow: boolean) => {
    setErrorMsg(null);
    if (!pageTitle.trim()) {
      setErrorMsg(isPt ? 'Informe o nome da página.' : 'Please enter a page title.');
      return;
    }
    const finalSlug = slugify(slug || pageTitle);
    const pageKind: PageKind =
      mode === 'landing'
        ? 'landing'
        : presellType === 'comparison'
        ? 'comparison'
        : presellType === 'review_page'
        ? 'review'
        : 'presell';

    const selectedWa = whatsappWidgets.find((w) => w.id === whatsappWidgetId);
    const selectedGw = paymentGateways.find((g) => g.provider === payProvider);
    const chosenTpl = BUILTIN_TEMPLATES.find((t) => t.id === selectedTplId) || BUILTIN_TEMPLATES[0];

    setSubmitting(true);
    try {
      const createdId = await onSavePage(
        {
          productId,
          categoryId,
          templateId: selectedTplId,
          title: pageTitle.trim(),
          slug: finalSlug,
          pageKind,
          presellType,
          funnelStage,
          language,
          originCountry,
          targetCountry,
          affiliateLinkId,
          affiliateUrl: affiliateUrl.trim(),
          policyEmailMode,
          policyEmail:
            policyEmailMode === 'producer'
              ? selectedProduct?.producerEmail || policyEmail
              : policyEmail,
          ghostMode,
          status: publishNow ? 'published' : 'draft',
          sortOrder: 0,
          blocks,
          theme,
          seo: {
            metaTitle: pageTitle.trim(),
            metaDescription: blocks[0]?.subtitle || blocks[0]?.body || pageTitle.trim(),
            robotsIndex: settings?.robotsIndexDefault ?? true,
            protectedBrandTerms: selectedProduct ? [selectedProduct.name] : [],
          },
          tracking: {
            ga4Id: settings?.ga4MeasurementId || '',
            gtmId: settings?.gtmContainerId || '',
            googleAdsId: settings?.googleAdsId || '',
            googleAdsLabel: settings?.googleAdsConversionLabel || '',
            metaPixelId: settings?.metaPixelId || '',
            utmSource: 'google',
            utmMedium: 'cpc',
            utmCampaign: finalSlug,
          },
          whatsapp: enableWhatsapp && selectedWa
            ? {
                enabled: true,
                widgetId: selectedWa.id,
                phoneNumber: selectedWa.phoneNumber,
                message: selectedWa.prefilledMessage,
                buttonLabel: selectedWa.buttonLabel,
                position: selectedWa.position,
              }
            : { enabled: false },
          paymentConfig: enableDirectPay
            ? {
                enabled: true,
                provider: payProvider,
                price: payPrice,
                currency: payCurrency,
                checkoutUrl: selectedGw?.checkoutBaseUrl || '',
                pixKey: selectedGw?.pixKey || '',
                buttonLabel: isPt ? 'Comprar Agora' : 'Buy Now',
              }
            : { enabled: false },
          abTest: {
            enabled: enableAbTest,
            splitPercent: 50,
            variantBName: 'Variante B',
            variantBHeadline: variantBHeadline || blocks[0]?.title || pageTitle,
            variantBCtaText: variantBCtaText || blocks[0]?.buttonText || '',
            variantBPrimaryColor: '#2563EB',
          },
          translations: {
            pt: {
              title: pageTitle.trim(),
              slug: finalSlug,
              metaTitle: pageTitle.trim(),
              metaDescription: chosenTpl.descriptionPt,
              blocks: language === 'pt' || language === 'auto' ? blocks : chosenTpl.blocksPt,
            },
            en: {
              title: pageTitle.trim(),
              slug: finalSlug,
              metaTitle: pageTitle.trim(),
              metaDescription: chosenTpl.descriptionEn,
              blocks: language === 'en' ? blocks : chosenTpl.blocksEn,
            },
          },
        },
        undefined,
        publishNow,
        publishNow ? 'Publicação pelo Assistente' : 'Rascunho pelo Assistente'
      );

      if (publishNow) {
        const ptUrl = `${window.location.origin}${getPublicPagePath(
          language === 'auto' ? 'pt' : language,
          finalSlug
        )}`;
        const enUrl = `${window.location.origin}/en/${finalSlug}`;
        setReadyModal({ pageId: createdId, publicUrl: ptUrl, enUrl });
      } else {
        onDoneGoToPages();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao publicar página.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    { num: 1, label: isPt ? '1. Configurações Iniciais' : '1. Initial Setup' },
    { num: 2, label: isPt ? '2. Escolha do Modelo' : '2. Choose Template' },
    { num: 3, label: isPt ? '3. Personalização' : '3. Customize' },
    { num: 4, label: isPt ? '4. Publicação' : '4. Publish' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {mode === 'landing'
              ? isPt
                ? 'Criador de Landing Pages Comerciais'
                : 'Commercial Landing Page Creator'
              : isPt
              ? 'Assistente de Criação de Presell'
              : 'Presell Creation Wizard'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Configure funil, link de afiliado, idioma automático e publique em segundos.'
              : 'Configure funnel stage, affiliate tracking, auto-language detection, and publish in seconds.'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white border border-slate-200 rounded-xl p-2">
        {stepLabels.map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
            className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors text-center cursor-pointer ${
              step === s.num
                ? 'bg-slate-900 text-white'
                : step > s.num
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Initial Config (matching Super Presell Ultimate screenshot) */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Nome da Página *' : 'Page Name *'}
              </label>
              <input
                type="text"
                value={pageTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageTitle(val);
                  if (!slugEditedManually) setSlug(val.trim() ? slugify(val) : '');
                }}
                placeholder="Ex: Katori — Oferta Oficial"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Produto Associado' : 'Associated Product'}
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">{isPt ? 'Selecionar produto cadastrado...' : 'Select registered product...'}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Estágio de Funil' : 'Funnel Stage'}
              </label>
              <select
                value={funnelStage}
                onChange={(e) => setFunnelStage(e.target.value as FunnelStage)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="bottom">{isPt ? 'Fundo de funil' : 'Bottom of funnel'}</option>
                <option value="middle">{isPt ? 'Meio de funil' : 'Middle of funnel'}</option>
                <option value="top">{isPt ? 'Topo de funil' : 'Top of funnel'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Selecionar Tipo da Presell' : 'Presell / Page Type'}
              </label>
              <select
                value={presellType}
                onChange={(e) => {
                  const val = e.target.value as PresellType;
                  setPresellType(val);
                  const matched = BUILTIN_TEMPLATES.find((t) => t.presellType === val);
                  if (matched) applyTemplate(matched);
                }}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="cookies_centered">Cookies (Centralizado)</option>
                <option value="cookies_premium">Cookies Premium</option>
                <option value="cookies_footer">Cookies no Rodapé</option>
                <option value="review_page">{isPt ? 'Página de Avaliações' : 'Review Page'}</option>
                <option value="recommendation">{isPt ? 'Página de Recomendação' : 'Recommendation Page'}</option>
                <option value="comparison">{isPt ? 'Página de Comparação' : 'Comparison Page'}</option>
                <option value="product_showcase">{isPt ? 'Apresentação de Produto' : 'Product Showcase'}</option>
                <option value="commercial_landing">{isPt ? 'Landing Page Comercial' : 'Commercial Landing Page'}</option>
                <option value="product_analysis">{isPt ? 'Análise de Produto' : 'Product Analysis'}</option>
              </select>
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isPt ? 'Link de Afiliado da Página de Vendas' : 'Sales Page Affiliate URL'}
                </label>
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://www.treejammer.com/..."
                  className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isPt ? 'Ou Link Centralizado' : 'Or Saved Affiliate Link'}
                </label>
                <select
                  value={affiliateLinkId}
                  onChange={(e) => handleAffiliateLinkSelect(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">{isPt ? 'Selecionar...' : 'Select...'}</option>
                  {affiliateLinks.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label} (/go/{l.shortCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'E-mail das Páginas de Política' : 'Policy Pages Email'}
              </label>
              <select
                value={policyEmailMode}
                onChange={(e) => setPolicyEmailMode(e.target.value as 'producer' | 'custom')}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="producer">
                  {isPt
                    ? 'Usar e-mail do produtor (padrão da oferta)'
                    : 'Use producer email (default)'}
                </option>
                <option value="custom">
                  {isPt ? 'Informar e-mail personalizado' : 'Enter custom email'}
                </option>
              </select>
              {policyEmailMode === 'custom' && (
                <input
                  type="email"
                  value={policyEmail}
                  onChange={(e) => setPolicyEmail(e.target.value)}
                  placeholder="contato@seudominio.com"
                  className="mt-2 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isPt
                  ? 'Usado no rodapé das páginas de Privacidade, Termos e Contato.'
                  : 'Shown in the footer for Privacy Policy, Terms & Contact.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Idioma da Página (opcional)' : 'Page Language (optional)'}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as PageLanguageSetting)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="auto">{isPt ? 'Detectar automaticamente' : 'Auto-detect visitor language'}</option>
                <option value="pt">Português (PT)</option>
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {isPt
                  ? 'Detecta automaticamente o idioma do navegador do visitante ou fixa o idioma da campanha.'
                  : 'Automatically detects browser language or locks to campaign language.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Modo Fantasma' : 'Ghost Mode'}
              </label>
              <select
                value={ghostMode ? 'yes' : 'no'}
                onChange={(e) => setGhostMode(e.target.value === 'yes')}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="no">{isPt ? 'Não' : 'No'}</option>
                <option value="yes">{isPt ? 'Sim' : 'Yes'}</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {isPt
                  ? 'Exibe acesso rápido ao link de afiliado ao detectar interação humana na página.'
                  : 'Surfaces instant affiliate continuation upon genuine human interaction.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'País de Origem & País de Destino' : 'Origin Country & Target Country'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">
                    {isPt ? 'País de Origem' : 'Origin Country'}
                  </span>
                  <select
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="BR">BR (Brasil)</option>
                    <option value="US">US (Estados Unidos)</option>
                    <option value="PT">PT (Portugal)</option>
                    <option value="ES">ES (Espanha)</option>
                    <option value="GB">GB (Reino Unido)</option>
                    <option value="CA">CA (Canadá)</option>
                    <option value="DE">DE (Alemanha)</option>
                    <option value="FR">FR (França)</option>
                    <option value="MX">MX (México)</option>
                    <option value="GL">GL (Global)</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">
                    {isPt ? 'País de Destino' : 'Target Country'}
                  </span>
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="BR">BR (Brasil)</option>
                    <option value="US">US (Estados Unidos)</option>
                    <option value="PT">PT (Portugal)</option>
                    <option value="ES">ES (Espanha)</option>
                    <option value="GB">GB (Reino Unido)</option>
                    <option value="CA">CA (Canadá)</option>
                    <option value="DE">DE (Alemanha)</option>
                    <option value="FR">FR (França)</option>
                    <option value="MX">MX (México)</option>
                    <option value="GL">GL (Global)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'Categoria' : 'Category'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">{isPt ? 'Geral' : 'General'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isPt ? 'URL Personalizada (Slug)' : 'Custom URL Slug'}
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                <span className="px-3 py-2.5 bg-slate-50 text-xs font-mono text-slate-500 border-r border-slate-200 truncate max-w-[180px]">
                  /{language === 'auto' ? 'pt' : language}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugEditedManually(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="meu-produto-oficial"
                  className="flex-1 px-3 py-2.5 text-sm font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{isPt ? 'Próximo passo' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Choose Visual Template */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">
                {isPt ? 'Escolher Modelo da Presell' : 'Choose Presell Template'}
              </h3>
              <p className="text-xs text-slate-500">
                {isPt
                  ? 'Selecione um modelo otimizado, pré-visualize ou favorite para reutilizar.'
                  : 'Select a conversion-tested template, preview layout, or favorite for reuse.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUILTIN_TEMPLATES.map((tpl) => {
              const isSelected = selectedTplId === tpl.id;
              const isFav = userTemplates.some(
                (ut) => ut.presellType === tpl.presellType && ut.isFavorite
              );
              return (
                <div
                  key={tpl.id}
                  className={`rounded-xl border overflow-hidden flex flex-col transition-colors ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-slate-200'
                  }`}
                >
                  <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={tpl.previewImage}
                      alt={isPt ? tpl.namePt : tpl.nameEn}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400">{tpl.categoryLabel}</p>
                      <h4 className="font-display font-bold text-sm text-slate-900 mt-0.5">
                        {isPt ? tpl.namePt : tpl.nameEn}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {isPt ? tpl.descriptionPt : tpl.descriptionEn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => applyTemplate(tpl)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isSelected
                          ? isPt
                            ? 'Selecionado'
                            : 'Selected'
                          : isPt
                          ? 'Usar Modelo'
                          : 'Select'}
                      </button>
                      <button
                        onClick={() => setPreviewModalTpl(tpl)}
                        title={isPt ? 'Pré-visualizar' : 'Preview'}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleFavoriteTemplate(tpl)}
                        title={isPt ? 'Favoritar' : 'Favorite'}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPt ? 'Voltar' : 'Back'}</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{isPt ? 'Personalizar Página' : 'Customize Page'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Customization */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900">
                {isPt ? 'Textos & Blocos Principais' : 'Primary Content & Blocks'}
              </h3>

              {blocks[0] && (
                <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Bloco Principal ({blocks[0].type})
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isPt ? 'Título Principal' : 'Headline'}
                    </label>
                    <input
                      type="text"
                      value={blocks[0].title || ''}
                      onChange={(e) => {
                        const next = [...blocks];
                        next[0] = { ...next[0], title: e.target.value };
                        setBlocks(next);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isPt ? 'Texto / Subtítulo' : 'Body / Subtitle'}
                    </label>
                    <textarea
                      rows={3}
                      value={blocks[0].subtitle ?? blocks[0].body ?? ''}
                      onChange={(e) => {
                        const next = [...blocks];
                        if (next[0].type === 'cookie_consent') {
                          next[0] = { ...next[0], body: e.target.value };
                        } else {
                          next[0] = { ...next[0], subtitle: e.target.value };
                        }
                        setBlocks(next);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isPt ? 'Texto do Botão CTA' : 'CTA Button Label'}
                    </label>
                    <input
                      type="text"
                      value={blocks[0].buttonText || ''}
                      onChange={(e) => {
                        const next = [...blocks];
                        next[0] = { ...next[0], buttonText: e.target.value };
                        setBlocks(next);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700">
                  {isPt ? 'Cores, Logotipo & Estrutura' : 'Colors, Logo & Layout'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      {isPt ? 'Cor do Botão CTA' : 'CTA Accent Color'}
                    </label>
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="h-9 w-full rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      {isPt ? 'Cor de Fundo' : 'Background Color'}
                    </label>
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="h-9 w-full rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {isPt ? 'Texto do Logotipo (Cabeçalho)' : 'Header Brand Logo Text'}
                  </label>
                  <input
                    type="text"
                    value={theme.logoText || ''}
                    onChange={(e) => setTheme({ ...theme, logoText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={theme.showHeader}
                      onChange={(e) => setTheme({ ...theme, showHeader: e.target.checked })}
                    />
                    <span>{isPt ? 'Exibir Cabeçalho' : 'Show Header'}</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={theme.showFooter}
                      onChange={(e) => setTheme({ ...theme, showFooter: e.target.checked })}
                    />
                    <span>{isPt ? 'Exibir Rodapé Legal' : 'Show Legal Footer'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Conversion Add-ons: WhatsApp, Direct Payment Gateway, A/B Split Test */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900">
                {isPt ? 'Conversão, Pagamento & Teste A/B' : 'Conversion, Payments & A/B Test'}
              </h3>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-800">
                    {isPt ? 'Ativar Gateway de Pagamento Nativo (Venda Direta)' : 'Enable Native Direct Payment Gateway'}
                  </span>
                  <input
                    type="checkbox"
                    checked={enableDirectPay}
                    onChange={(e) => setEnableDirectPay(e.target.checked)}
                  />
                </label>
                {enableDirectPay && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <select
                      value={payProvider}
                      onChange={(e) => setPayProvider(e.target.value as PaymentProvider)}
                      className="px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="mercadopago">Mercado Pago / Pix</option>
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                      <option value="hotmart">Hotmart</option>
                      <option value="kiwify">Kiwify</option>
                      <option value="pagseguro">PagSeguro</option>
                    </select>
                    <input
                      type="number"
                      value={payPrice}
                      onChange={(e) => setPayPrice(Number(e.target.value))}
                      className="px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                    <select
                      value={payCurrency}
                      onChange={(e) =>
                        setPayCurrency(e.target.value as 'BRL' | 'USD' | 'EUR' | 'GBP')
                      }
                      className="px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-800">
                    {isPt ? 'Ativar Botão Flutuante WhatsApp' : 'Enable Floating WhatsApp Button'}
                  </span>
                  <input
                    type="checkbox"
                    checked={enableWhatsapp}
                    onChange={(e) => setEnableWhatsapp(e.target.checked)}
                  />
                </label>
                {enableWhatsapp && (
                  <select
                    value={whatsappWidgetId}
                    onChange={(e) => setWhatsappWidgetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {whatsappWidgets.length === 0 ? (
                      <option value="">
                        {isPt
                          ? 'Nenhum botão cadastrado (configure em Marketing)'
                          : 'No widget found (configure in Marketing)'}
                      </option>
                    ) : (
                      whatsappWidgets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.phoneNumber})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="p-4 rounded-lg border border-slate-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-800">
                    {isPt ? 'Ativar Teste A/B (50% / 50%)' : 'Enable A/B Split Test (50% / 50%)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={enableAbTest}
                    onChange={(e) => setEnableAbTest(e.target.checked)}
                  />
                </label>
                {enableAbTest && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={variantBHeadline}
                      onChange={(e) => setVariantBHeadline(e.target.value)}
                      placeholder={isPt ? 'Título alternativo da Variante B' : 'Variant B alternative headline'}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={variantBCtaText}
                      onChange={(e) => setVariantBCtaText(e.target.value)}
                      placeholder={isPt ? 'Texto CTA alternativo da Variante B' : 'Variant B CTA label'}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPt ? 'Voltar' : 'Back'}</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{isPt ? 'Revisar e Publicar' : 'Review & Publish'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Publish */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-slate-900">
              {isPt ? 'Resumo da Publicação' : 'Ready to Publish'}
            </h3>
            <p className="text-sm text-slate-500">
              {isPt
                ? 'Revise os detalhes e publique sua página com URL multilíngue exclusiva.'
                : 'Review details below and generate your live multilingual public URLs.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <div>
              <p className="text-xs text-slate-500">{isPt ? 'Nome da Página' : 'Page Title'}</p>
              <p className="font-semibold text-slate-900">{pageTitle || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">URL (PT / EN)</p>
              <p className="font-mono text-xs text-slate-700">
                /pt/{slugify(slug || pageTitle)} · /en/{slugify(slug || pageTitle)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{isPt ? 'Funil & Tipo' : 'Funnel & Type'}</p>
              <p className="text-slate-800">
                {funnelStage} · {presellType}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                {isPt ? 'Idioma & Modo Fantasma' : 'Language & Ghost Mode'}
              </p>
              <p className="text-slate-800">
                {language.toUpperCase()} · {ghostMode ? 'Modo Fantasma ON' : 'Padrão'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                {isPt ? 'País de Origem → Destino' : 'Origin → Target Country'}
              </p>
              <p className="text-slate-800 font-mono text-xs">
                {originCountry} → {targetCountry}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPt ? 'Voltar' : 'Back'}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePublishOrDraft(false)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {isPt ? 'Salvar como Rascunho' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handlePublishOrDraft(true)}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {submitting
                    ? isPt
                      ? 'Publicando...'
                      : 'Publishing...'
                    : isPt
                    ? 'Gerar e Publicar Página'
                    : 'Generate & Publish Page'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewModalTpl && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {isPt ? previewModalTpl.namePt : previewModalTpl.nameEn}
              </h3>
              <button
                onClick={() => setPreviewModalTpl(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>
            <img
              src={previewModalTpl.previewImage}
              alt={previewModalTpl.namePt}
              className="w-full max-h-72 object-cover rounded-lg border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm text-slate-600">
              {isPt ? previewModalTpl.descriptionPt : previewModalTpl.descriptionEn}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  applyTemplate(previewModalTpl);
                  setPreviewModalTpl(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                {isPt ? 'Selecionar este Modelo' : 'Use This Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Presell Ultimate "Página Pronta!" Confirmation Modal */}
      {readyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-7 text-center space-y-5 border border-slate-200 shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                {isPt ? 'Página Pronta!' : 'Page Ready!'}
              </h3>
              <p className="text-sm text-slate-600">
                {isPt
                  ? 'Sua página presell foi gerada com sucesso!'
                  : 'Your presell page has been generated and published!'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-700 truncate">
                  {readyModal.publicUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(readyModal.publicUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? (isPt ? 'Copiado' : 'Copied') : isPt ? 'Copiar' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate">
                EN: {readyModal.enUrl}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href={readyModal.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>{isPt ? 'Ver página' : 'View page'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  const pid = readyModal.pageId;
                  setReadyModal(null);
                  onOpenBuilder(pid);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isPt ? 'Editor Visual' : 'Visual Builder'}</span>
              </button>
              <button
                onClick={() => {
                  setReadyModal(null);
                  onDoneGoToPages();
                }}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
