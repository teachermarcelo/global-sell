import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  GitBranch,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrency, slugify } from '../../lib/i18n';
import {
  AffiliateLink,
  Campaign,
  ClickEvent,
  LanguageCode,
  PageItem,
  Product,
} from '../../types';

interface AffiliateLinksViewProps {
  uiLang: LanguageCode;
  links: AffiliateLink[];
  products: Product[];
  onSaveLink: (
    input: Omit<AffiliateLink, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteLink: (link: AffiliateLink) => Promise<void>;
}

export const AffiliateLinksView: React.FC<AffiliateLinksViewProps> = ({
  uiLang,
  links,
  products,
  onSaveLink,
  onDeleteLink,
}) => {
  const isPt = uiLang === 'pt';
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: '',
    label: '',
    shortCode: '',
    destinationUrl: '',
    country: 'BR',
    network: 'Hotmart',
    affiliateTag: '',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: '',
    buttonText: 'Acessar Oferta Oficial',
    isPrimary: true,
    isActive: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      productId: products[0]?.id || '',
      label: '',
      shortCode: '',
      destinationUrl: products[0]?.affiliateUrl || '',
      country: 'BR',
      network: 'Hotmart',
      affiliateTag: '',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: '',
      buttonText: 'Acessar Oferta Oficial',
      isPrimary: true,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (l: AffiliateLink) => {
    setEditing(l);
    setForm({
      productId: l.productId || '',
      label: l.label,
      shortCode: l.shortCode,
      destinationUrl: l.destinationUrl,
      country: l.country || 'BR',
      network: l.network || 'Hotmart',
      affiliateTag: l.affiliateTag || '',
      utmSource: l.utmSource || 'google',
      utmMedium: l.utmMedium || 'cpc',
      utmCampaign: l.utmCampaign || '',
      buttonText: l.buttonText || '',
      isPrimary: Boolean(l.isPrimary),
      isActive: l.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveLink(
      {
        ...form,
        shortCode: slugify(form.shortCode || form.label),
        alternativeUrls: [],
      },
      editing?.id
    );
    setModalOpen(false);
  };

  const copyGoUrl = (l: AffiliateLink) => {
    const url = `${window.location.origin}/go/${l.shortCode}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(l.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Links de Afiliados Centralizados' : 'Centralized Affiliate Links'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Cadastre seus links uma única vez e reutilize com redirecionamento rastreável (/go/codigo) preservando parâmetros de afiliado.'
              : 'Manage affiliate links once with traceable /go/code redirects that preserve all affiliate and UTM parameters.'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isPt ? 'Novo Link Rastreável' : 'New Trackable Link'}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {links.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {isPt ? 'Nenhum link de afiliado cadastrado ainda.' : 'No affiliate links registered yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-5 font-medium">{isPt ? 'Rótulo / Produto' : 'Label / Product'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Link Curto Rastreável' : 'Short Redirect'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Rede / País / UTMs' : 'Network / UTMs'}</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-5 font-medium text-right">{isPt ? 'Ações' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {links.map((l) => {
                  const prodName = products.find((p) => p.id === l.productId)?.name;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900">{l.label}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">
                          {prodName ? `${prodName} · ` : ''}
                          {l.destinationUrl}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-700">
                        /go/{l.shortCode}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {l.network || 'Direto'} · {l.country || 'BR'}
                        {l.utmCampaign ? ` · utm:${l.utmCampaign}` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={l.isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {l.isActive ? (isPt ? 'Ativo' : 'Active') : isPt ? 'Inativo' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => copyGoUrl(l)}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title={isPt ? 'Copiar /go/ link' : 'Copy /go/ link'}
                          >
                            {copiedId === l.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={`/go/${l.shortCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded border border-slate-200 text-blue-600 hover:bg-blue-50"
                            title={isPt ? 'Testar redirecionamento' : 'Test redirect'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => openEdit(l)}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteLink(l)}
                            className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {editing ? (isPt ? 'Editar Link' : 'Edit Link') : isPt ? 'Novo Link de Afiliado' : 'New Affiliate Link'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Nome de Identificação *' : 'Link Label *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Código Curto (/go/codigo) *' : 'Short Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.shortCode}
                    onChange={(e) => setForm({ ...form, shortCode: slugify(e.target.value) })}
                    placeholder="katori-us"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Produto Vinculado' : 'Product'}
                  </label>
                  <select
                    value={form.productId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      setForm({
                        ...form,
                        productId: e.target.value,
                        destinationUrl: prod?.affiliateUrl || form.destinationUrl,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">{isPt ? 'Geral' : 'General'}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'URL de Destino (Afiliado) *' : 'Destination Affiliate URL *'}
                  </label>
                  <input
                    type="url"
                    required
                    value={form.destinationUrl}
                    onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">utm_source</label>
                  <input
                    type="text"
                    value={form.utmSource}
                    onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">utm_campaign</label>
                  <input
                    type="text"
                    value={form.utmCampaign}
                    onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Plataforma' : 'Network'}
                  </label>
                  <input
                    type="text"
                    value={form.network}
                    onChange={(e) => setForm({ ...form, network: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'País' : 'Country'}
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>{isPt ? 'Link ativo para redirecionamento' : 'Active redirect'}</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 cursor-pointer"
                >
                  {isPt ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  {isPt ? 'Salvar Link' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ClickTrackingViewProps {
  uiLang: LanguageCode;
  clickEvents: ClickEvent[];
  pages: PageItem[];
}

export const ClickTrackingView: React.FC<ClickTrackingViewProps> = ({
  uiLang,
  clickEvents,
  pages,
}) => {
  const isPt = uiLang === 'pt';
  const [eventFilter, setEventFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');

  const sortedEvents = useMemo(() => {
    return clickEvents
      .filter((ev) => {
        const matchEv = eventFilter === 'all' || ev.eventType === eventFilter;
        const matchDev = deviceFilter === 'all' || ev.device === deviceFilter;
        return matchEv && matchDev;
      })
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
  }, [clickEvents, eventFilter, deviceFilter]);

  const getPageTitle = (pageId?: string) =>
    pages.find((p) => p.id === pageId)?.title || pageId || 'Página Pública';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Rastreamento de Cliques & Origens' : 'Live Click & Origin Tracking'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Registro em tempo real de visualizações, cliques nos botões de afiliados, WhatsApp e checkouts.'
              : 'Real-time stream of visitor views, outbound affiliate clicks, WhatsApp taps, and checkouts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
          >
            <option value="all">{isPt ? 'Todos os Eventos' : 'All Events'}</option>
            <option value="page_view">page_view</option>
            <option value="affiliate_click">affiliate_click</option>
            <option value="whatsapp_click">whatsapp_click</option>
            <option value="checkout_start">checkout_start</option>
            <option value="conversion">conversion</option>
          </select>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
          >
            <option value="all">{isPt ? 'Todos Dispositivos' : 'All Devices'}</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {sortedEvents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {isPt
              ? 'Nenhum evento registrado ainda. Visite qualquer página publicada para ver os dados em tempo real.'
              : 'No events recorded yet. Visit any published page to see live click telemetry.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-5 font-medium">{isPt ? 'Data/Hora' : 'Timestamp'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Evento' : 'Event'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Página' : 'Page'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'País / Idioma' : 'Country / Lang'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Dispositivo' : 'Device'}</th>
                  <th className="py-3 px-4 font-medium">A/B</th>
                  <th className="py-3 px-5 font-medium">UTM / Gateway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedEvents.slice(0, 100).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-5 font-mono tabular-nums text-slate-500">
                      {ev.createdAt?.toDate
                        ? ev.createdAt.toDate().toLocaleString(isPt ? 'pt-BR' : 'en-US')
                        : 'Agora'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {ev.eventType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {getPageTitle(ev.pageId)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ev.country} · {ev.language.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{ev.device}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      {ev.variant}
                    </td>
                    <td className="py-3 px-5 font-mono text-slate-500">
                      {ev.utmSource || 'direct'}
                      {ev.utmCampaign ? ` / ${ev.utmCampaign}` : ''}
                      {ev.gateway ? ` · ${ev.gateway}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

interface AnalyticsConversionsViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  clickEvents: ClickEvent[];
  campaigns: Campaign[];
  onSaveCampaign: (
    input: Omit<Campaign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteCampaign: (id: string) => Promise<void>;
}

export const AnalyticsConversionsView: React.FC<AnalyticsConversionsViewProps> = ({
  uiLang,
  pages,
  clickEvents,
  campaigns,
  onSaveCampaign,
  onDeleteCampaign,
}) => {
  const isPt = uiLang === 'pt';
  const [cmpName, setCmpName] = useState('');
  const [cmpPlatform, setCmpPlatform] = useState<Campaign['platform']>('google_ads');
  const [cmpPageId, setCmpPageId] = useState(pages[0]?.id || '');
  const [cmpUtm, setCmpUtm] = useState('');

  const funnel = useMemo(() => {
    const views = clickEvents.filter((e) => e.eventType === 'page_view').length;
    const clicks = clickEvents.filter(
      (e) => e.eventType === 'affiliate_click' || e.eventType === 'whatsapp_click'
    ).length;
    const checkouts = clickEvents.filter((e) => e.eventType === 'checkout_start').length;
    const conversions = clickEvents.filter((e) => e.eventType === 'conversion').length;
    return { views, clicks, checkouts, conversions };
  }, [clickEvents]);

  const abResults = useMemo(() => {
    return pages
      .filter((p) => p.abTest?.enabled)
      .map((p) => {
        const evs = clickEvents.filter((e) => e.pageId === p.id);
        const aViews = evs.filter((e) => e.variant === 'A' && e.eventType === 'page_view').length;
        const aClicks = evs.filter((e) => e.variant === 'A' && e.eventType === 'affiliate_click').length;
        const bViews = evs.filter((e) => e.variant === 'B' && e.eventType === 'page_view').length;
        const bClicks = evs.filter((e) => e.variant === 'B' && e.eventType === 'affiliate_click').length;
        const aCtr = aViews > 0 ? (aClicks / aViews) * 100 : 0;
        const bCtr = bViews > 0 ? (bClicks / bViews) * 100 : 0;
        return { page: p, aViews, aClicks, aCtr, bViews, bClicks, bCtr };
      });
  }, [pages, clickEvents]);

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpName.trim()) return;
    await onSaveCampaign({
      name: cmpName.trim(),
      platform: cmpPlatform,
      pageId: cmpPageId,
      utmSource: cmpPlatform === 'google_ads' ? 'google' : cmpPlatform === 'meta_ads' ? 'facebook' : 'direct',
      utmMedium: 'cpc',
      utmCampaign: slugify(cmpUtm || cmpName),
      targetCountry: 'BR',
      dailyBudget: 100,
      currency: 'BRL',
      status: 'active',
    });
    setCmpName('');
    setCmpUtm('');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          {isPt ? 'Analytics, Conversões & Testes A/B' : 'Real-Time Conversions & A/B Split Tests'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isPt
            ? 'Funil completo de conversão em tempo real, desempenho de variantes A/B e campanhas de tráfego pago.'
            : 'Live conversion funnel, A/B variant lift analysis, and paid traffic campaign performance.'}
        </p>
      </div>

      {/* Funnel Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">{isPt ? '1. Visualizações' : '1. Page Views'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 mt-1">
            {funnel.views}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">{isPt ? '2. Cliques Afiliado / WA' : '2. Affiliate / WA Clicks'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-blue-700 mt-1">
            {funnel.clicks}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">{isPt ? '3. Checkouts Iniciados' : '3. Checkouts Started'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 mt-1">
            {funnel.checkouts}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">{isPt ? '4. Conversões Confirmadas' : '4. Confirmed Conversions'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700 mt-1">
            {funnel.conversions}
          </p>
        </div>
      </div>

      {/* A/B Tests Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <h3 className="font-display font-bold text-base text-slate-900">
            {isPt ? 'Resultados dos Testes A/B Integrados' : 'Integrated A/B Test Results'}
          </h3>
        </div>
        {abResults.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {isPt
              ? 'Ative o Teste A/B em qualquer página no Construtor Visual para comparar variantes.'
              : 'Enable A/B testing on any page in the Visual Builder to compare variants.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-6 font-medium">{isPt ? 'Página' : 'Page'}</th>
                  <th className="py-3 px-4 font-medium text-right">Variante A (CTR)</th>
                  <th className="py-3 px-4 font-medium text-right">Variante B (CTR)</th>
                  <th className="py-3 px-6 font-medium text-right">{isPt ? 'Líder' : 'Leader'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {abResults.map((row) => {
                  const winner =
                    row.aCtr === row.bCtr ? 'Empate' : row.bCtr > row.aCtr ? 'Variante B' : 'Variante A';
                  return (
                    <tr key={row.page.id}>
                      <td className="py-3.5 px-6 font-medium text-slate-900">{row.page.title}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {row.aCtr.toFixed(1)}% ({row.aClicks}/{row.aViews})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-blue-700">
                        {row.bCtr.toFixed(1)}% ({row.bClicks}/{row.bViews})
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold text-emerald-700">
                        {winner}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paid Traffic Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddCampaign}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3"
        >
          <h3 className="font-display font-bold text-sm text-slate-900">
            {isPt ? 'Nova Campanha de Tráfego Pago' : 'New Paid Traffic Campaign'}
          </h3>
          <input
            type="text"
            required
            value={cmpName}
            onChange={(e) => setCmpName(e.target.value)}
            placeholder={isPt ? 'Ex: Google Search — Katori BR' : 'Ex: Google Search — US'}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <select
            value={cmpPlatform}
            onChange={(e) => setCmpPlatform(e.target.value as Campaign['platform'])}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="google_ads">Google Ads</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="tiktok_ads">TikTok Ads</option>
            <option value="native">Native Ads (Taboola/Outbrain)</option>
          </select>
          <select
            value={cmpPageId}
            onChange={(e) => setCmpPageId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="">{isPt ? 'Vincular página...' : 'Link page...'}</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={cmpUtm}
            onChange={(e) => setCmpUtm(e.target.value)}
            placeholder="utm_campaign"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            {isPt ? 'Registrar Campanha' : 'Save Campaign'}
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-display font-bold text-slate-900">
            {isPt ? 'Campanhas Ativas & Parâmetros UTM' : 'Active Campaigns & UTM Parameters'}
          </div>
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isPt ? 'Nenhuma campanha registrada.' : 'No campaigns registered.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const pg = pages.find((p) => p.id === c.pageId);
                const fullUtmUrl = pg
                  ? `${window.location.origin}/${pg.language === 'auto' ? 'pt' : pg.language}/${pg.slug}?utm_source=${c.utmSource}&utm_medium=${c.utmMedium}&utm_campaign=${c.utmCampaign}`
                  : '';
                return (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.platform} · utm_campaign: <span className="font-mono">{c.utmCampaign}</span>
                      </p>
                      {fullUtmUrl && (
                        <p className="text-[11px] font-mono text-blue-600 truncate mt-1">
                          {fullUtmUrl}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {fullUtmUrl && (
                        <button
                          onClick={() => navigator.clipboard?.writeText(fullUtmUrl)}
                          className="px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {isPt ? 'Copiar URL UTM' : 'Copy UTM URL'}
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteCampaign(c.id)}
                        className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
