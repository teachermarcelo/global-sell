import React, { useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  GitBranch,
  MapPin,
  MousePointerClick,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrency, getPublicBaseUrl, slugify } from '../../lib/i18n';
import {
  buildClickEventsCsv,
  formatClickedElementLabel,
  formatEventTypeLabel,
  formatLocationSummary,
} from '../../lib/visitorInfo';
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
  customDomain?: string;
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
  customDomain,
  onSaveLink,
  onDeleteLink,
}) => {
  const isPt = uiLang === 'pt';
  const publicBaseUrl = getPublicBaseUrl(customDomain);
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
    const url = `${publicBaseUrl}/go/${l.shortCode}`;
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
                            href={`${publicBaseUrl}/go/${l.shortCode}`}
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
  products?: Product[];
  affiliateLinks?: AffiliateLink[];
}

export const ClickTrackingView: React.FC<ClickTrackingViewProps> = ({
  uiLang,
  clickEvents,
  pages,
  products = [],
  affiliateLinks = [],
}) => {
  const isPt = uiLang === 'pt';
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [pageFilter, setPageFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<ClickEvent | null>(null);

  const pageById = useMemo(() => {
    const map = new Map<string, PageItem>();
    pages.forEach((p) => map.set(p.id, p));
    return map;
  }, [pages]);

  const pageByPublicKey = useMemo(() => {
    const map = new Map<string, PageItem>();
    pages.forEach((p) => {
      if (p.publicKey) map.set(p.publicKey, p);
    });
    return map;
  }, [pages]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const linkByShortKey = useMemo(() => {
    const map = new Map<string, AffiliateLink>();
    affiliateLinks.forEach((l) => map.set(`go_${l.shortCode}`, l));
    return map;
  }, [affiliateLinks]);

  const enrichedEvents = useMemo(() => {
    return clickEvents.map((ev) => {
      const pg =
        (ev.pageId ? pageById.get(ev.pageId) : undefined) ||
        (ev.publicKey ? pageByPublicKey.get(ev.publicKey) : undefined);
      const link = ev.publicKey ? linkByShortKey.get(ev.publicKey) : undefined;
      const resolvedProductId = ev.productId || pg?.productId || link?.productId || '';
      const prod = resolvedProductId ? productById.get(resolvedProductId) : undefined;
      const productName = prod?.name || '';
      const pageTitle =
        pg?.title ||
        ev.pageTitle ||
        (link
          ? `Link /go/${link.shortCode}`
          : ev.publicKey.startsWith('go_')
          ? `Link /${ev.publicKey.replace(/^go_/, 'go/')}`
          : ev.pageId || 'Página Pública');
      const pageSlug =
        pg?.slug ||
        ev.pageSlug ||
        (link ? `go/${link.shortCode}` : '');
      const resolvedPageKey = pg?.id || ev.pageId || ev.publicKey;
      return {
        ev,
        pg,
        link,
        prod,
        resolvedProductId,
        productName,
        pageTitle,
        pageSlug,
        resolvedPageKey,
      };
    });
  }, [clickEvents, pageById, pageByPublicKey, linkByShortKey, productById]);

  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    clickEvents.forEach((e) => {
      if (e.country) set.add(e.country.toUpperCase());
    });
    return [...set].sort();
  }, [clickEvents]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedEvents
      .filter(({ ev, resolvedProductId, productName, pageTitle, pageSlug, resolvedPageKey }) => {
        const matchEv =
          eventFilter === 'all'
            ? true
            : eventFilter === 'clicks_only'
            ? ev.eventType !== 'page_view'
            : ev.eventType === eventFilter;
        const matchProd =
          productFilter === 'all' || resolvedProductId === productFilter;
        const matchPage =
          pageFilter === 'all' || resolvedPageKey === pageFilter;
        const matchCountry =
          countryFilter === 'all' || (ev.country || 'BR').toUpperCase() === countryFilter;
        const matchDev = deviceFilter === 'all' || ev.device === deviceFilter;

        if (!matchEv || !matchProd || !matchPage || !matchCountry || !matchDev) return false;
        if (!q) return true;

        const haystack = [
          productName,
          pageTitle,
          pageSlug,
          ev.city,
          ev.region,
          ev.country,
          ev.language,
          ev.browserLanguage,
          ev.clickedElement,
          ev.clickedLabel,
          ev.clickedUrl,
          ev.trafficSource,
          ev.browser,
          ev.os,
          ev.referrer,
          ev.utmSource,
          ev.utmCampaign,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const ta = a.ev.createdAt?.toMillis ? a.ev.createdAt.toMillis() : 0;
        const tb = b.ev.createdAt?.toMillis ? b.ev.createdAt.toMillis() : 0;
        return tb - ta;
      });
  }, [
    enrichedEvents,
    eventFilter,
    productFilter,
    pageFilter,
    countryFilter,
    deviceFilter,
    searchTerm,
  ]);

  const summary = useMemo(() => {
    const views = filteredEvents.filter((x) => x.ev.eventType === 'page_view').length;
    const outboundClicks = filteredEvents.filter(
      (x) => x.ev.eventType === 'affiliate_click' || x.ev.eventType === 'whatsapp_click'
    ).length;
    const countries = new Set(filteredEvents.map((x) => (x.ev.country || 'BR').toUpperCase()));
    const cities = new Set(filteredEvents.map((x) => x.ev.city).filter(Boolean));
    const sourceCounts = new Map<string, number>();
    filteredEvents.forEach((x) => {
      const src =
        x.ev.trafficSource ||
        (x.ev.utmSource && x.ev.utmSource !== 'direct' ? x.ev.utmSource : 'Direct');
      sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    });
    const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const ctr = views > 0 ? (outboundClicks / views) * 100 : 0;
    return {
      total: filteredEvents.length,
      views,
      outboundClicks,
      ctr,
      countryCount: countries.size,
      cityCount: cities.size,
      topSource,
    };
  }, [filteredEvents]);

  const handleExportCsv = () => {
    const csv = buildClickEventsCsv(
      filteredEvents.map(({ ev, productName, pageTitle, pageSlug }) => ({
        timestamp: ev.createdAt?.toDate ? ev.createdAt.toDate().toISOString() : '',
        eventType: ev.eventType,
        clickedElement: ev.clickedElement || '',
        clickedLabel: ev.clickedLabel || '',
        clickedUrl: ev.clickedUrl || '',
        productName: productName || '',
        pageTitle,
        pageSlug,
        city: ev.city || '',
        region: ev.region || '',
        country: (ev.country || 'BR').toUpperCase(),
        language: (ev.language || 'pt').toUpperCase(),
        browserLanguage: ev.browserLanguage || '',
        device: ev.device,
        browser: ev.browser || '',
        os: ev.os || '',
        trafficSource: ev.trafficSource || ev.utmSource || 'Direct',
        referrer: ev.referrer || '',
        utmSource: ev.utmSource || '',
        utmMedium: ev.utmMedium || '',
        utmCampaign: ev.utmCampaign || '',
        variant: ev.variant,
        gateway: ev.gateway || '',
        revenue: ev.revenue || 0,
        currency: ev.currency || 'BRL',
      }))
    );
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-presell-cliques-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedContext = useMemo(() => {
    if (!selectedEvent) return null;
    return enrichedEvents.find((x) => x.ev.id === selectedEvent.id) || null;
  }, [selectedEvent, enrichedEvents]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Rastreamento Detalhado de Cliques & Origens' : 'Detailed Click & Origin Tracking'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Identifique exatamente qual botão foi clicado, qual produto e página, cidade, estado, país, idioma, navegador/app e origem.'
              : 'Inspect exact button clicked, product, page, city, region, country, language, browser/app, and traffic origin.'}
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredEvents.length === 0}
          className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 self-start cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isPt ? 'Exportar CSV' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">{isPt ? 'Eventos Filtrados' : 'Filtered Events'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 mt-1">
            {summary.total}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {summary.views} {isPt ? 'visualizações' : 'views'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">{isPt ? 'Cliques de Saída' : 'Outbound Clicks'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-blue-700 mt-1">
            {summary.outboundClicks}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            CTR {summary.ctr.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">{isPt ? 'Alcance Geográfico' : 'Geo Reach'}</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 mt-1">
            {summary.countryCount} <span className="text-sm font-normal text-slate-400">{isPt ? 'países' : 'countries'}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {summary.cityCount} {isPt ? 'cidades identificadas' : 'cities detected'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">{isPt ? 'Principal Origem' : 'Top Origin'}</p>
          <p className="font-display text-lg font-bold text-slate-900 mt-1.5 truncate">
            {summary.topSource}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isPt ? 'Canal com mais registros' : 'Most frequent source'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isPt
                ? 'Buscar cidade, produto, página, botão ou UTM...'
                : 'Search city, product, page, button, or UTM...'
            }
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
        >
          <option value="all">{isPt ? 'Todos os Produtos' : 'All Products'}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white max-w-[190px]"
        >
          <option value="all">{isPt ? 'Todas as Páginas' : 'All Pages'}</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
        >
          <option value="all">{isPt ? 'Todos os Eventos' : 'All Events'}</option>
          <option value="clicks_only">{isPt ? 'Apenas Cliques & Conversões' : 'Clicks & Conversions Only'}</option>
          <option value="page_view">{isPt ? 'Visualização (page_view)' : 'Page View'}</option>
          <option value="affiliate_click">{isPt ? 'Clique Afiliado' : 'Affiliate Click'}</option>
          <option value="whatsapp_click">{isPt ? 'Clique WhatsApp' : 'WhatsApp Click'}</option>
          <option value="checkout_start">{isPt ? 'Início Checkout' : 'Checkout Start'}</option>
          <option value="conversion">{isPt ? 'Conversão' : 'Conversion'}</option>
        </select>

        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
        >
          <option value="all">{isPt ? 'Todos Países' : 'All Countries'}</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
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

      {/* Detailed Events Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {isPt
              ? 'Nenhum evento encontrado para os filtros atuais.'
              : 'No events match the selected filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-medium">{isPt ? 'Data/Hora' : 'Timestamp'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'O que foi clicado' : 'What was clicked'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Produto & Página' : 'Product & Page'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Localização & Idioma' : 'Location & Language'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Dispositivo / App' : 'Device / Browser'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Origem / UTM / A/B' : 'Origin / UTM / A/B'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEvents.slice(0, 150).map(({ ev, productName, pageTitle, pageSlug }) => {
                  const isOutbound =
                    ev.eventType === 'affiliate_click' || ev.eventType === 'whatsapp_click';
                  const isConv = ev.eventType === 'conversion';
                  let destHost = '';
                  if (ev.clickedUrl) {
                    try {
                      destHost = new URL(ev.clickedUrl).hostname.replace(/^www\./, '');
                    } catch {
                      destHost = '';
                    }
                  }
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-slate-50/80 cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {ev.createdAt?.toDate
                          ? ev.createdAt.toDate().toLocaleString(isPt ? 'pt-BR' : 'en-US')
                          : 'Agora'}
                      </td>
                      <td className="py-3 px-4">
                        <p
                          className={`font-semibold ${
                            isConv
                              ? 'text-emerald-700'
                              : isOutbound
                              ? 'text-blue-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatEventTypeLabel(ev.eventType, isPt)}
                        </p>
                        <p className="text-[11px] text-slate-600 truncate max-w-[230px]">
                          {ev.clickedElement
                            ? formatClickedElementLabel(ev.clickedElement, isPt)
                            : isPt
                            ? 'Registro padrão'
                            : 'Standard event'}
                          {ev.clickedLabel ? ` · "${ev.clickedLabel}"` : ''}
                        </p>
                        {destHost && ev.eventType !== 'page_view' && (
                          <p className="text-[10px] font-mono text-slate-400 truncate max-w-[230px]">
                            → {destHost}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {productName || (isPt ? 'Sem produto' : 'No product')}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[210px]">
                          {pageTitle}
                          {pageSlug ? ` · /${pageSlug}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{formatLocationSummary(ev)}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {(ev.language || 'pt').toUpperCase()}
                          {ev.browserLanguage ? ` (${ev.browserLanguage})` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-700 capitalize">
                          {ev.device}
                          {ev.os ? ` · ${ev.os}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {ev.browser || (isPt ? 'Navegador padrão' : 'Browser')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">
                          {ev.trafficSource || ev.utmSource || 'Direct'}
                          <span className="ml-1.5 font-mono text-[10px] text-blue-700">
                            [{ev.variant}]
                          </span>
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate max-w-[180px]">
                          {ev.utmCampaign || ev.gateway || ev.utmMedium || '—'}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Click Detail Inspector Modal */}
      {selectedContext && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-4">
              <div>
                <p className="text-xs font-mono text-blue-700 font-semibold">
                  {formatEventTypeLabel(selectedContext.ev.eventType, isPt)} · {isPt ? 'Variante' : 'Variant'}{' '}
                  {selectedContext.ev.variant}
                </p>
                <h3 className="font-display font-bold text-lg text-slate-900 mt-0.5">
                  {selectedContext.productName || selectedContext.pageTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedContext.ev.createdAt?.toDate
                    ? selectedContext.ev.createdAt.toDate().toLocaleString(isPt ? 'pt-BR' : 'en-US')
                    : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">
                  {isPt ? 'O que foi clicado' : 'Clicked Element'}
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedContext.ev.clickedElement
                    ? formatClickedElementLabel(selectedContext.ev.clickedElement, isPt)
                    : formatEventTypeLabel(selectedContext.ev.eventType, isPt)}
                </p>
                {selectedContext.ev.clickedLabel && (
                  <p className="text-slate-700">
                    {isPt ? 'Texto do botão:' : 'Button label:'}{' '}
                    <span className="font-medium">"{selectedContext.ev.clickedLabel}"</span>
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">
                  {isPt ? 'Produto & Página' : 'Product & Page'}
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedContext.productName || (isPt ? 'Sem produto vinculado' : 'No linked product')}
                </p>
                <p className="text-slate-700">
                  {selectedContext.pageTitle}
                  {selectedContext.pageSlug ? ` (/${selectedContext.pageSlug})` : ''}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">
                  {isPt ? 'Geolocalização & Idioma' : 'Geolocation & Language'}
                </p>
                <p className="font-semibold text-slate-900">
                  {formatLocationSummary(selectedContext.ev)}
                </p>
                <p className="text-slate-600">
                  {isPt ? 'Idioma da página:' : 'Page language:'}{' '}
                  <span className="font-mono uppercase">{selectedContext.ev.language}</span>
                  {selectedContext.ev.browserLanguage
                    ? ` · ${isPt ? 'Navegador:' : 'Browser:'} ${selectedContext.ev.browserLanguage}`
                    : ''}
                </p>
                {selectedContext.ev.timezone && (
                  <p className="text-slate-500 font-mono text-[11px]">
                    {selectedContext.ev.timezone}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">
                  {isPt ? 'Dispositivo, App & Origem' : 'Device, App & Source'}
                </p>
                <p className="font-semibold text-slate-900">
                  {selectedContext.ev.trafficSource || selectedContext.ev.utmSource || 'Direct'}
                </p>
                <p className="text-slate-700 capitalize">
                  {selectedContext.ev.device}
                  {selectedContext.ev.browser ? ` · ${selectedContext.ev.browser}` : ''}
                  {selectedContext.ev.os ? ` · ${selectedContext.ev.os}` : ''}
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  utm_source={selectedContext.ev.utmSource || 'direct'} · utm_medium=
                  {selectedContext.ev.utmMedium || 'none'}
                  {selectedContext.ev.utmCampaign
                    ? ` · utm_campaign=${selectedContext.ev.utmCampaign}`
                    : ''}
                </p>
              </div>
            </div>

            {(selectedContext.ev.clickedUrl || selectedContext.ev.referrer) && (
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                {selectedContext.ev.clickedUrl && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">
                      {isPt ? 'URL de Destino Clicada' : 'Clicked Destination URL'}
                    </p>
                    <p className="font-mono text-[11px] text-blue-700 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {selectedContext.ev.clickedUrl}
                    </p>
                  </div>
                )}
                {selectedContext.ev.referrer && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Referrer</p>
                    <p className="font-mono text-[11px] text-slate-600 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {selectedContext.ev.referrer}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
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

interface AnalyticsConversionsViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  products?: Product[];
  affiliateLinks?: AffiliateLink[];
  clickEvents: ClickEvent[];
  campaigns: Campaign[];
  customDomain?: string;
  onSaveCampaign: (
    input: Omit<Campaign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteCampaign: (id: string) => Promise<void>;
}

export const AnalyticsConversionsView: React.FC<AnalyticsConversionsViewProps> = ({
  uiLang,
  pages,
  products = [],
  clickEvents,
  campaigns,
  customDomain,
  onSaveCampaign,
  onDeleteCampaign,
}) => {
  const isPt = uiLang === 'pt';
  const publicBaseUrl = getPublicBaseUrl(customDomain);
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

  const byClickedElement = useMemo(() => {
    const map = new Map<string, { label: string; count: number; sampleButton: string }>();
    clickEvents
      .filter((e) => e.eventType !== 'page_view')
      .forEach((ev) => {
        const key = ev.clickedElement || ev.eventType;
        const label = ev.clickedElement
          ? formatClickedElementLabel(ev.clickedElement, isPt)
          : formatEventTypeLabel(ev.eventType, isPt);
        const cur = map.get(key) || { label, count: 0, sampleButton: '' };
        cur.count += 1;
        if (!cur.sampleButton && ev.clickedLabel) cur.sampleButton = ev.clickedLabel;
        map.set(key, cur);
      });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [clickEvents, isPt]);

  const byGeoAndOrigin = useMemo(() => {
    const cityMap = new Map<string, { views: number; clicks: number }>();
    const originMap = new Map<string, { views: number; clicks: number }>();
    clickEvents.forEach((ev) => {
      const loc = formatLocationSummary(ev);
      const c = cityMap.get(loc) || { views: 0, clicks: 0 };
      if (ev.eventType === 'page_view') c.views += 1;
      if (ev.eventType === 'affiliate_click' || ev.eventType === 'whatsapp_click') c.clicks += 1;
      cityMap.set(loc, c);

      const src =
        ev.trafficSource ||
        (ev.utmSource && ev.utmSource !== 'direct' ? ev.utmSource : 'Direct');
      const o = originMap.get(src) || { views: 0, clicks: 0 };
      if (ev.eventType === 'page_view') o.views += 1;
      if (ev.eventType === 'affiliate_click' || ev.eventType === 'whatsapp_click') o.clicks += 1;
      originMap.set(src, o);
    });
    return {
      locations: [...cityMap.entries()]
        .sort((a, b) => b[1].clicks + b[1].views - (a[1].clicks + a[1].views))
        .slice(0, 8),
      origins: [...originMap.entries()]
        .sort((a, b) => b[1].clicks + b[1].views - (a[1].clicks + a[1].views))
        .slice(0, 8),
    };
  }, [clickEvents]);

  const byPagePerformance = useMemo(() => {
    const prodMap = new Map(products.map((p) => [p.id, p]));
    return pages
      .map((pg) => {
        const evs = clickEvents.filter(
          (e) => e.pageId === pg.id || (pg.publicKey && e.publicKey === pg.publicKey)
        );
        const views = evs.filter((e) => e.eventType === 'page_view').length;
        const clicks = evs.filter(
          (e) => e.eventType === 'affiliate_click' || e.eventType === 'whatsapp_click'
        ).length;
        const ctr = views > 0 ? (clicks / views) * 100 : 0;
        const prod = pg.productId ? prodMap.get(pg.productId) : undefined;
        return { pg, prod, views, clicks, ctr };
      })
      .sort((a, b) => b.clicks - a.clicks || b.views - a.views);
  }, [pages, products, clickEvents]);

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
            ? 'Funil completo de conversão em tempo real, cliques por botão/elemento, geolocalização, desempenho por página e testes A/B.'
            : 'Live conversion funnel, clicks by element/button, geolocation, page performance, and A/B split testing.'}
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

      {/* Granular Breakdowns: Clicked Elements, Locations, Origins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-bold text-sm text-slate-900 inline-flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-blue-600" />
            <span>{isPt ? 'Cliques por Botão / Elemento' : 'Clicks by Button / Element'}</span>
          </h3>
          {byClickedElement.length === 0 ? (
            <p className="text-xs text-slate-500">
              {isPt ? 'Nenhum clique registrado ainda.' : 'No clicks recorded yet.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byClickedElement.map((row) => (
                <div key={row.label} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{row.label}</p>
                    {row.sampleButton && (
                      <p className="text-[11px] text-slate-500 truncate">"{row.sampleButton}"</p>
                    )}
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-blue-700 shrink-0">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-bold text-sm text-slate-900 inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{isPt ? 'Cidades, Estados & Países' : 'Cities, Regions & Countries'}</span>
          </h3>
          {byGeoAndOrigin.locations.length === 0 ? (
            <p className="text-xs text-slate-500">
              {isPt ? 'Aguardando acessos.' : 'Awaiting visits.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byGeoAndOrigin.locations.map(([loc, st]) => (
                <div key={loc} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800 truncate">{loc}</span>
                  <span className="font-mono tabular-nums text-slate-500 shrink-0">
                    {st.views} vis · {st.clicks} clq
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display font-bold text-sm text-slate-900 inline-flex items-center gap-2">
            <Compass className="w-4 h-4 text-slate-700" />
            <span>{isPt ? 'Origens & Apps' : 'Sources & Apps'}</span>
          </h3>
          {byGeoAndOrigin.origins.length === 0 ? (
            <p className="text-xs text-slate-500">
              {isPt ? 'Aguardando acessos.' : 'Awaiting visits.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {byGeoAndOrigin.origins.map(([src, st]) => (
                <div key={src} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800 truncate">{src}</span>
                  <span className="font-mono tabular-nums text-slate-500 shrink-0">
                    {st.views} vis · {st.clicks} clq
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance by Page & Product */}
      {byPagePerformance.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-display font-bold text-base text-slate-900">
              {isPt ? 'Desempenho por Página & Produto' : 'Performance by Page & Product'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-6 font-medium">{isPt ? 'Página' : 'Page'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Produto' : 'Product'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Idioma / País' : 'Lang / Country'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Visitantes' : 'Views'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Cliques' : 'Clicks'}</th>
                  <th className="py-3 px-6 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {byPagePerformance.map(({ pg, prod, views, clicks, ctr }) => (
                  <tr key={pg.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6">
                      <p className="font-medium text-slate-900">{pg.title}</p>
                      <p className="text-xs font-mono text-slate-500">/{pg.slug}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {prod?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {pg.language.toUpperCase()} · {pg.targetCountry || 'BR'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {views}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {clicks}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {ctr.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  ? `${publicBaseUrl}/${pg.language === 'auto' ? 'pt' : pg.language}/${pg.slug}?utm_source=${c.utmSource}&utm_medium=${c.utmMedium}&utm_campaign=${c.utmCampaign}`
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
