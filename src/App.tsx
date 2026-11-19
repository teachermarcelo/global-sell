/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWorkspaceData } from './hooks/useWorkspaceData';
import { UI_LABELS } from './lib/i18n';
import { BUILTIN_TEMPLATES, BuiltInTemplate } from './lib/templates';
import { ActiveModule, LanguageCode, Product, PublishedPage } from './types';
import { PublicPageView } from './components/PublicPageView';
import { RedirectHandler } from './components/RedirectHandler';
import { Sidebar, TopBar } from './components/Sidebar';
import { DashboardView } from './components/modules/DashboardView';
import { ProductsView } from './components/modules/ProductsView';
import { MyPagesView } from './components/modules/MyPagesView';
import { PresellWizardView } from './components/modules/PresellWizardView';
import { PageBuilderView } from './components/modules/PageBuilderView';
import { CategoriesView, TemplatesView } from './components/modules/TemplatesCategoriesView';
import {
  AffiliateLinksView,
  AnalyticsConversionsView,
  ClickTrackingView,
} from './components/modules/AffiliateLinksTrackingView';
import {
  GeneralSettingsBackupView,
  LanguagesView,
  MarketingGatewaysView,
  SeoScriptsView,
} from './components/modules/GlobalSettingsModules';

function parsePublicRoute(pathname: string):
  | { kind: 'public-page'; slug: string; lang?: LanguageCode }
  | { kind: 'redirect'; shortCode: string }
  | { kind: 'app' } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const prefix = parts[0].toLowerCase();
    const rest = parts.slice(1).join('/');
    if (prefix === 'pt' || prefix === 'en' || prefix === 'es') {
      return { kind: 'public-page', slug: rest, lang: prefix };
    }
    if (prefix === 'p') {
      return { kind: 'public-page', slug: rest };
    }
    if (prefix === 'go') {
      return { kind: 'redirect', shortCode: rest };
    }
  }
  return { kind: 'app' };
}

const AuthGateScreen: React.FC = () => {
  const {
    uiLang,
    setUiLang,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    supportsEmailAuth,
    authError,
    unauthorizedDomain,
  } = useAuth();
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const t = UI_LABELS[uiLang] || UI_LABELS.pt;
  const isPt = uiLang === 'pt';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    setSubmittingEmail(true);
    try {
      if (emailMode === 'signup') {
        const msg = await signUpWithEmail(emailInput, passwordInput, nameInput);
        if (msg) setEmailFeedback(msg);
      } else {
        await signInWithEmail(emailInput, passwordInput);
      }
    } finally {
      setSubmittingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 sm:px-10 py-4 flex items-center justify-between gap-8">
        <span className="font-display font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Global Presell Commerce
        </span>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['pt', 'en', 'es'] as LanguageCode[]).map((l) => (
              <button
                key={l}
                onClick={() => setUiLang(l)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md uppercase cursor-pointer ${
                  uiLang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={signInWithGoogle}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.signInGoogle}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span>{isPt ? 'SaaS Independente' : 'WordPress-Free SaaS'}</span>
            <span>·</span>
            <span>{isPt ? 'Multilíngue PT / EN / ES' : 'Multilingual PT / EN / ES'}</span>
            <span>·</span>
            <span>Google Ads Ready</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance]">
            {t.signInTitle}
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-xl">
            {t.signInSubtitle}
          </p>

          {authError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2.5">
              <p className="font-semibold text-rose-900">{authError}</p>
              {unauthorizedDomain && (
                <div className="space-y-2 text-slate-700 bg-white/80 rounded-lg p-3 border border-rose-200">
                  <p className="font-medium text-slate-900">
                    {isPt
                      ? 'Como liberar o login Google neste domínio (leva 30 segundos):'
                      : 'How to authorize Google Sign-In on this domain (takes 30s):'}
                  </p>
                  <div className="flex items-center justify-between gap-2 bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                    <code className="font-mono text-[11px] text-slate-900 select-all">
                      {unauthorizedDomain}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(unauthorizedDomain);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                      }}
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedDomain ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedDomain ? (isPt ? 'Copiado' : 'Copied') : isPt ? 'Copiar' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isPt
                      ? '1. Abra o Firebase Console → Authentication → Settings → Authorized domains → Add domain e cole o domínio acima.'
                      : '1. Open Firebase Console → Authentication → Settings → Authorized domains → Add domain and paste the domain above.'}
                  </p>
                  <p className="text-[11px] leading-relaxed text-emerald-700 font-medium">
                    {isPt
                      ? 'Nota: Suas páginas públicas (/pt/slug, /en/slug, /go/codigo) já funcionam sem precisar de login.'
                      : 'Note: Public presell & redirect URLs (/pt/slug, /en/slug, /go/code) already work without sign-in.'}
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0776430449/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold"
                  >
                    <span>
                      {isPt ? 'Abrir Firebase Authorized Domains' : 'Open Firebase Authorized Domains'}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {emailFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
              {emailFeedback}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={signInWithGoogle}
              className="px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <span>{t.signInGoogle}</span>
            </button>
          </div>

          {supportsEmailAuth && (
            <form
              onSubmit={handleEmailAuth}
              className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 max-w-md"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  {emailMode === 'login'
                    ? isPt
                      ? 'Ou entrar com e-mail e senha'
                      : 'Or sign in with email'
                    : isPt
                    ? 'Criar nova conta com e-mail'
                    : 'Create account with email'}
                </span>
                <button
                  type="button"
                  onClick={() => setEmailMode((m) => (m === 'login' ? 'signup' : 'login'))}
                  className="text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  {emailMode === 'login'
                    ? isPt
                      ? 'Criar conta'
                      : 'Sign up'
                    : isPt
                    ? 'Já tenho conta'
                    : 'Sign in'}
                </button>
              </div>
              {emailMode === 'signup' && (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={isPt ? 'Seu nome' : 'Your name'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              )}
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="password"
                required
                minLength={6}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={isPt ? 'Senha (mín. 6 caracteres)' : 'Password (min. 6 chars)'}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={submittingEmail}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
              >
                {submittingEmail
                  ? isPt
                    ? 'Autenticando...'
                    : 'Signing in...'
                  : emailMode === 'login'
                  ? isPt
                    ? 'Entrar com E-mail'
                    : 'Sign In'
                  : isPt
                  ? 'Cadastrar Conta'
                  : 'Create Account'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {isPt
                  ? 'Assistente de Presell em 4 etapas + Construtor Visual arrastável'
                  : '4-Step Presell Wizard + Drag-and-Drop Page Builder'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {isPt
                  ? 'Detecção automática de idioma & hreflang SEO'
                  : 'Automatic visitor language detection & hreflang SEO'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {isPt
                  ? 'Métricas em tempo real, UTMs, GA4, Google Ads e Testes A/B'
                  : 'Real-time conversions, UTMs, GA4, Google Ads & A/B split testing'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {isPt
                  ? 'Gateways nativos: Stripe, Mercado Pago, Pix, PayPal, Hotmart e Kiwify'
                  : 'Native checkouts: Stripe, Mercado Pago, Pix, PayPal, Hotmart & Kiwify'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col">
          <img
            src="/images/presell_hero_editorial_1794756577028.jpg"
            alt="Global Presell Commerce Workspace"
            className="w-full h-72 lg:h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </main>
    </div>
  );
};

const WorkspaceShell: React.FC = () => {
  const { user, profile, loading, uiLang, setUiLang, signOut } = useAuth();
  const data = useWorkspaceData(user?.uid);

  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wizardInitialProduct, setWizardInitialProduct] = useState<Product | null>(null);
  const [builderPageId, setBuilderPageId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<PublishedPage | null>(null);

  if (loading || (user && data.dataLoading)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mx-auto" />
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGateScreen />;
  }

  if (previewPage) {
    return (
      <PublicPageView
        slugOrKey={previewPage.slug}
        previewPage={previewPage}
        onExitPreview={() => setPreviewPage(null)}
      />
    );
  }

  const handleToggleFavoriteTemplate = async (tpl: BuiltInTemplate) => {
    const existing = data.userTemplates.find((u) => u.presellType === tpl.presellType);
    if (existing) {
      await data.saveUserTemplate(
        {
          name: existing.name,
          presellType: existing.presellType,
          description: existing.description,
          isFavorite: !existing.isFavorite,
          blocks: existing.blocks,
          theme: existing.theme,
        },
        existing.id
      );
    } else {
      await data.saveUserTemplate({
        name: uiLang === 'pt' ? tpl.namePt : tpl.nameEn,
        presellType: tpl.presellType,
        description: uiLang === 'pt' ? tpl.descriptionPt : tpl.descriptionEn,
        isFavorite: true,
        blocks: uiLang === 'pt' ? tpl.blocksPt : tpl.blocksEn,
        theme: tpl.theme,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          if (mod !== 'presell-wizard') setWizardInitialProduct(null);
          setActiveModule(mod);
        }}
        uiLang={uiLang}
        onChangeLang={setUiLang}
        userName={profile?.displayName || user.displayName || user.email || 'Workspace'}
        userPhoto={profile?.photoUrl || user.photoURL || undefined}
        onSignOut={signOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeModule={activeModule}
          uiLang={uiLang}
          onChangeLang={setUiLang}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickCreate={() => {
            setWizardInitialProduct(null);
            setActiveModule('presell-wizard');
          }}
        />

        <main className="flex-1 p-4 sm:p-8">
          {activeModule === 'dashboard' && (
            <DashboardView
              uiLang={uiLang}
              pages={data.pages}
              products={data.products}
              affiliateLinks={data.affiliateLinks}
              clickEvents={data.clickEvents}
              onNavigate={setActiveModule}
              onBootstrapStarter={data.bootstrapStarterCatalog}
            />
          )}

          {activeModule === 'products' && (
            <ProductsView
              uiLang={uiLang}
              products={data.products}
              categories={data.categories}
              pages={data.pages}
              onCreateProduct={data.createProduct}
              onUpdateProduct={data.updateProduct}
              onDeleteProduct={data.deleteProduct}
              onCreatePresellForProduct={(prod) => {
                setWizardInitialProduct(prod);
                setActiveModule('presell-wizard');
              }}
            />
          )}

          {activeModule === 'pages' && (
            <MyPagesView
              uiLang={uiLang}
              pages={data.pages}
              products={data.products}
              categories={data.categories}
              clickEvents={data.clickEvents}
              customDomain={data.settings?.customDomain}
              onCreateNewPresell={() => {
                setWizardInitialProduct(null);
                setActiveModule('presell-wizard');
              }}
              onManageCategories={() => setActiveModule('categories')}
              onEditInBuilder={(pg) => {
                setBuilderPageId(pg.id);
                setActiveModule('page-builder');
              }}
              onDuplicate={data.duplicatePage}
              onTogglePublish={data.togglePublishPage}
              onDelete={data.deletePage}
              onPreviewPage={(pg) =>
                setPreviewPage({
                  ownerId: pg.ownerId,
                  pageId: pg.id,
                  productId: pg.productId,
                  publicKey: pg.publicKey || 'preview',
                  slug: pg.slug,
                  title: pg.title,
                  pageKind: pg.pageKind,
                  presellType: pg.presellType,
                  funnelStage: pg.funnelStage,
                  language: pg.language,
                  targetCountry: pg.targetCountry,
                  affiliateUrl: pg.affiliateUrl,
                  policyEmail: pg.policyEmail,
                  ghostMode: pg.ghostMode,
                  status: 'published',
                  blocks: pg.blocks,
                  theme: pg.theme,
                  seo: pg.seo,
                  tracking: pg.tracking,
                  whatsapp: pg.whatsapp,
                  paymentConfig: pg.paymentConfig,
                  abTest: pg.abTest,
                  translations: pg.translations,
                  createdAt: pg.createdAt,
                  updatedAt: pg.updatedAt,
                })
              }
              onOpenAnalytics={() => setActiveModule('analytics')}
            />
          )}

          {(activeModule === 'presell-wizard' || activeModule === 'landing-creator') && (
            <PresellWizardView
              key={`${activeModule}_${wizardInitialProduct?.id || 'none'}`}
              uiLang={uiLang}
              mode={activeModule === 'landing-creator' ? 'landing' : 'presell'}
              initialProduct={wizardInitialProduct}
              products={data.products}
              categories={data.categories}
              affiliateLinks={data.affiliateLinks}
              userTemplates={data.userTemplates}
              whatsappWidgets={data.whatsappWidgets}
              paymentGateways={data.paymentGateways}
              settings={data.settings}
              onSavePage={data.savePage}
              onToggleFavoriteTemplate={handleToggleFavoriteTemplate}
              onOpenBuilder={(pid) => {
                setBuilderPageId(pid);
                setActiveModule('page-builder');
              }}
              onDoneGoToPages={() => setActiveModule('pages')}
            />
          )}

          {activeModule === 'page-builder' && (
            <PageBuilderView
              uiLang={uiLang}
              pages={data.pages}
              products={data.products}
              selectedPageId={builderPageId}
              onSelectPage={setBuilderPageId}
              onSavePage={data.savePage}
              onGetVersions={data.getPageVersions}
              onPreviewPublished={setPreviewPage}
            />
          )}

          {activeModule === 'templates' && (
            <TemplatesView
              uiLang={uiLang}
              userTemplates={data.userTemplates}
              onUseBuiltinTemplate={() => {
                setWizardInitialProduct(null);
                setActiveModule('presell-wizard');
              }}
              onSaveUserTemplate={data.saveUserTemplate}
              onDeleteUserTemplate={data.deleteUserTemplate}
            />
          )}

          {activeModule === 'categories' && (
            <CategoriesView
              uiLang={uiLang}
              categories={data.categories}
              pages={data.pages}
              products={data.products}
              onCreateCategory={data.createCategory}
              onUpdateCategory={data.updateCategory}
              onDeleteCategory={data.deleteCategory}
            />
          )}

          {activeModule === 'affiliate-links' && (
            <AffiliateLinksView
              uiLang={uiLang}
              links={data.affiliateLinks}
              products={data.products}
              customDomain={data.settings?.customDomain}
              onSaveLink={data.saveAffiliateLink}
              onDeleteLink={data.deleteAffiliateLink}
            />
          )}

          {activeModule === 'click-tracking' && (
            <ClickTrackingView
              uiLang={uiLang}
              clickEvents={data.clickEvents}
              pages={data.pages}
              products={data.products}
              affiliateLinks={data.affiliateLinks}
            />
          )}

          {activeModule === 'analytics' && (
            <AnalyticsConversionsView
              uiLang={uiLang}
              pages={data.pages}
              products={data.products}
              affiliateLinks={data.affiliateLinks}
              clickEvents={data.clickEvents}
              campaigns={data.campaigns}
              customDomain={data.settings?.customDomain}
              onSaveCampaign={data.saveCampaign}
              onDeleteCampaign={data.deleteCampaign}
            />
          )}

          {activeModule === 'languages' && (
            <LanguagesView
              uiLang={uiLang}
              pages={data.pages}
              settings={data.settings}
              onUpdateSettings={data.updateWorkspaceSettings}
              onSavePage={data.savePage}
            />
          )}

          {activeModule === 'seo' && (
            <SeoScriptsView
              uiLang={uiLang}
              pages={data.pages}
              settings={data.settings}
              onUpdateSettings={data.updateWorkspaceSettings}
              onSavePage={data.savePage}
            />
          )}

          {activeModule === 'marketing' && (
            <MarketingGatewaysView
              uiLang={uiLang}
              settings={data.settings}
              whatsappWidgets={data.whatsappWidgets}
              paymentGateways={data.paymentGateways}
              onUpdateSettings={data.updateWorkspaceSettings}
              onSaveWhatsapp={data.saveWhatsappWidget}
              onDeleteWhatsapp={data.deleteWhatsappWidget}
              onSaveGateway={data.savePaymentGateway}
              onDeleteGateway={data.deletePaymentGateway}
            />
          )}

          {activeModule === 'settings' && (
            <GeneralSettingsBackupView
              uiLang={uiLang}
              settings={data.settings}
              categories={data.categories}
              products={data.products}
              pages={data.pages}
              affiliateLinks={data.affiliateLinks}
              campaigns={data.campaigns}
              onUpdateSettings={data.updateWorkspaceSettings}
              onImportProductsAndCategories={async (backup) => {
                const catMap = new Map<string, string>();
                const prodMap = new Map<string, string>();
                const pageMap = new Map<string, string>();

                if (backup.categories) {
                  for (const c of backup.categories) {
                    if (c.name) {
                      const newId = await data.createCategory(c);
                      if (c.id && newId) catMap.set(c.id, newId);
                    }
                  }
                }
                if (backup.products) {
                  for (const p of backup.products) {
                    if (p.name && p.affiliateUrl) {
                      const mappedCatId = p.categoryId ? catMap.get(p.categoryId) || p.categoryId : '';
                      const newId = await data.createProduct({
                        ...p,
                        categoryId: mappedCatId,
                      });
                      if (p.id && newId) prodMap.set(p.id, newId);
                    }
                  }
                }
                if (backup.affiliateLinks) {
                  for (const l of backup.affiliateLinks) {
                    if (l.label && l.destinationUrl) {
                      const mappedProdId = l.productId ? prodMap.get(l.productId) || l.productId : '';
                      await data.saveAffiliateLink({
                        ...l,
                        productId: mappedProdId,
                      });
                    }
                  }
                }
                if (backup.pages) {
                  for (const pg of backup.pages) {
                    if (pg.title && pg.slug) {
                      const mappedProdId = pg.productId ? prodMap.get(pg.productId) || pg.productId : '';
                      const mappedCatId = pg.categoryId ? catMap.get(pg.categoryId) || pg.categoryId : '';
                      const newPageId = await data.savePage(
                        {
                          ...pg,
                          productId: mappedProdId,
                          categoryId: mappedCatId,
                          publicKey: undefined,
                          publishedAt: null,
                        },
                        undefined,
                        pg.status === 'published',
                        'Importação de backup'
                      );
                      if (pg.id && newPageId) pageMap.set(pg.id, newPageId);
                    }
                  }
                }
                if (backup.campaigns) {
                  for (const cmp of backup.campaigns) {
                    if (cmp.name) {
                      const mappedPageId = cmp.pageId ? pageMap.get(cmp.pageId) || cmp.pageId : '';
                      await data.saveCampaign({
                        ...cmp,
                        pageId: mappedPageId,
                      });
                    }
                  }
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const route = useMemo(() => parsePublicRoute(window.location.pathname), []);

  if (route.kind === 'public-page') {
    return <PublicPageView slugOrKey={route.slug} forcedLang={route.lang} />;
  }

  if (route.kind === 'redirect') {
    return <RedirectHandler shortCode={route.shortCode} />;
  }

  return (
    <AuthProvider>
      <WorkspaceShell />
    </AuthProvider>
  );
}
