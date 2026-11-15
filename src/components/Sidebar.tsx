import React from 'react';
import {
  BarChart3,
  FileCode2,
  FolderTree,
  Globe,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  LogOut,
  Menu,
  MousePointerClick,
  Package,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react';
import { UI_LABELS } from '../lib/i18n';
import { ActiveModule, LanguageCode } from '../types';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (mod: ActiveModule) => void;
  uiLang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  userName: string;
  userPhoto?: string;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: Array<{
  groupLabelPt: string;
  groupLabelEn: string;
  items: Array<{ id: ActiveModule; labelKey: string; icon: React.FC<{ className?: string }> }>;
}> = [
  {
    groupLabelPt: 'Visão Geral',
    groupLabelEn: 'Overview',
    items: [
      { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      { id: 'products', labelKey: 'products', icon: Package },
      { id: 'pages', labelKey: 'pages', icon: Layers },
    ],
  },
  {
    groupLabelPt: 'Criação & Páginas',
    groupLabelEn: 'Creation & Pages',
    items: [
      { id: 'presell-wizard', labelKey: 'presellWizard', icon: Wand2 },
      { id: 'landing-creator', labelKey: 'landingCreator', icon: Sparkles },
      { id: 'page-builder', labelKey: 'pageBuilder', icon: FileCode2 },
      { id: 'templates', labelKey: 'templates', icon: LayoutTemplate },
      { id: 'categories', labelKey: 'categories', icon: FolderTree },
    ],
  },
  {
    groupLabelPt: 'Afiliados & Tráfego',
    groupLabelEn: 'Affiliates & Traffic',
    items: [
      { id: 'affiliate-links', labelKey: 'affiliateLinks', icon: Link2 },
      { id: 'click-tracking', labelKey: 'clickTracking', icon: MousePointerClick },
      { id: 'analytics', labelKey: 'analytics', icon: BarChart3 },
    ],
  },
  {
    groupLabelPt: 'Global, SEO & Sistema',
    groupLabelEn: 'Global, SEO & System',
    items: [
      { id: 'languages', labelKey: 'languages', icon: Globe },
      { id: 'seo', labelKey: 'seo', icon: Search },
      { id: 'marketing', labelKey: 'marketing', icon: TrendingUp },
      { id: 'settings', labelKey: 'settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  uiLang,
  userName,
  userPhoto,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}) => {
  const t = UI_LABELS[uiLang] || UI_LABELS.pt;

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 w-64 shrink-0 border-r border-slate-800">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={() => {
            onSelectModule('dashboard');
            onCloseMobile();
          }}
          className="text-left font-display font-bold text-base tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          Global Presell
        </button>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-slate-800/80">
        <button
          onClick={() => {
            onSelectModule('presell-wizard');
            onCloseMobile();
          }}
          className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{t.createNewPresell}</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupLabelEn} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-400 tracking-wide">
              {uiLang === 'pt' ? group.groupLabelPt : group.groupLabelEn}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{t[item.labelKey] || item.labelKey}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover shrink-0 bg-slate-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {uiLang === 'pt' ? 'Conta Pro' : 'Pro Workspace'}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          title={t.signOut}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block h-screen sticky top-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};

interface TopBarProps {
  activeModule: ActiveModule;
  uiLang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  onOpenMobileMenu: () => void;
  onQuickCreate: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeModule,
  uiLang,
  onChangeLang,
  onOpenMobileMenu,
  onQuickCreate,
}) => {
  const t = UI_LABELS[uiLang] || UI_LABELS.pt;
  const labelMap: Record<ActiveModule, string> = {
    dashboard: t.dashboard,
    products: t.products,
    pages: t.pages,
    'presell-wizard': t.presellWizard,
    'landing-creator': t.landingCreator,
    'page-builder': t.pageBuilder,
    templates: t.templates,
    categories: t.categories,
    'affiliate-links': t.affiliateLinks,
    'click-tracking': t.clickTracking,
    analytics: t.analytics,
    languages: t.languages,
    seo: t.seo,
    marketing: t.marketing,
    settings: t.settings,
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
            Global Presell Commerce
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {labelMap[activeModule]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['pt', 'en', 'es'] as LanguageCode[]).map((lang) => (
            <button
              key={lang}
              onClick={() => onChangeLang(lang)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                uiLang === lang
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        <button
          onClick={onQuickCreate}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.createNewPresell}</span>
        </button>
      </div>
    </header>
  );
};
