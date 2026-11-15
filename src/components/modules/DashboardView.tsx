import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ExternalLink,
  Layers,
  MousePointerClick,
  Package,
  Plus,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../lib/i18n';
import {
  ActiveModule,
  ClickEvent,
  LanguageCode,
  PageItem,
  Product,
} from '../../types';

interface DashboardViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  products: Product[];
  clickEvents: ClickEvent[];
  onNavigate: (mod: ActiveModule) => void;
  onBootstrapStarter: () => Promise<void>;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export const DashboardView: React.FC<DashboardViewProps> = ({
  uiLang,
  pages,
  products,
  clickEvents,
  onNavigate,
  onBootstrapStarter,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [seeding, setSeeding] = useState(false);
  const isPt = uiLang === 'pt';

  const filteredEvents = useMemo(() => {
    if (period === 'all') return clickEvents;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return clickEvents.filter((ev) => {
      const ts = ev.createdAt?.toMillis ? ev.createdAt.toMillis() : Date.now();
      return ts >= cutoff;
    });
  }, [clickEvents, period]);

  const metrics = useMemo(() => {
    const totalPages = pages.length;
    const publishedPages = pages.filter((p) => p.status === 'published').length;
    const draftPages = pages.filter((p) => p.status === 'draft').length;
    const totalProducts = products.length;

    const views = filteredEvents.filter((e) => e.eventType === 'page_view').length;
    const clicks = filteredEvents.filter(
      (e) => e.eventType === 'affiliate_click' || e.eventType === 'whatsapp_click'
    ).length;
    const conversions = filteredEvents.filter((e) => e.eventType === 'conversion').length;
    const ctr = views > 0 ? (clicks / views) * 100 : 0;
    const revenueBrl = filteredEvents
      .filter((e) => e.eventType === 'conversion' && (e.currency || 'BRL') === 'BRL')
      .reduce((acc, cur) => acc + (cur.revenue || 0), 0);
    const revenueUsd = filteredEvents
      .filter((e) => e.eventType === 'conversion' && e.currency === 'USD')
      .reduce((acc, cur) => acc + (cur.revenue || 0), 0);

    return {
      totalPages,
      publishedPages,
      draftPages,
      totalProducts,
      views,
      clicks,
      ctr,
      conversions,
      revenueBrl,
      revenueUsd,
    };
  }, [pages, products, filteredEvents]);

  const chartSeries = useMemo(() => {
    const buckets: Record<string, { label: string; views: number; clicks: number; conversions: number }> = {};
    const daysCount = period === '7d' ? 7 : 10;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = {
        label: d.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' }),
        views: 0,
        clicks: 0,
        conversions: 0,
      };
    }
    filteredEvents.forEach((ev) => {
      const ms = ev.createdAt?.toMillis ? ev.createdAt.toMillis() : Date.now();
      const key = new Date(ms).toISOString().slice(0, 10);
      if (buckets[key]) {
        if (ev.eventType === 'page_view') buckets[key].views += 1;
        if (ev.eventType === 'affiliate_click' || ev.eventType === 'whatsapp_click')
          buckets[key].clicks += 1;
        if (ev.eventType === 'conversion') buckets[key].conversions += 1;
      }
    });
    return Object.values(buckets);
  }, [filteredEvents, period, isPt]);

  const byCountry = useMemo(() => {
    const map: Record<string, { views: number; clicks: number; conversions: number }> = {};
    filteredEvents.forEach((ev) => {
      const k = ev.country || 'BR';
      if (!map[k]) map[k] = { views: 0, clicks: 0, conversions: 0 };
      if (ev.eventType === 'page_view') map[k].views += 1;
      if (ev.eventType === 'affiliate_click') map[k].clicks += 1;
      if (ev.eventType === 'conversion') map[k].conversions += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].views - a[1].views);
  }, [filteredEvents]);

  const byLanguage = useMemo(() => {
    const map: Record<string, { views: number; clicks: number }> = {};
    filteredEvents.forEach((ev) => {
      const k = (ev.language || 'pt').toUpperCase();
      if (!map[k]) map[k] = { views: 0, clicks: 0 };
      if (ev.eventType === 'page_view') map[k].views += 1;
      if (ev.eventType === 'affiliate_click') map[k].clicks += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].views - a[1].views);
  }, [filteredEvents]);

  const byProduct = useMemo(() => {
    return products
      .map((prod) => {
        const prodEvents = filteredEvents.filter((e) => e.productId === prod.id);
        const views = prodEvents.filter((e) => e.eventType === 'page_view').length;
        const clicks = prodEvents.filter((e) => e.eventType === 'affiliate_click').length;
        const conversions = prodEvents.filter((e) => e.eventType === 'conversion').length;
        return { prod, views, clicks, conversions };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
  }, [products, filteredEvents]);

  const maxChartVal = Math.max(1, ...chartSeries.map((d) => Math.max(d.views, d.clicks, 1)));

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onBootstrapStarter();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header + Period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Painel de Operações & Conversão' : 'Operations & Conversion Overview'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Métricas reais sincronizadas em tempo real com suas páginas publicadas e cliques de afiliados.'
              : 'Live metrics synchronized in real time across published presells, affiliate links, and direct checkouts.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {([
            { id: '7d', label: isPt ? '7 dias' : '7d' },
            { id: '30d', label: isPt ? '30 dias' : '30d' },
            { id: '90d', label: isPt ? '90 dias' : '90d' },
            { id: 'all', label: isPt ? 'Tudo' : 'All' },
          ] as Array<{ id: PeriodFilter; label: string }>).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                period === opt.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty Workspace Onboarding Banner */}
      {pages.length === 0 && products.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h3 className="font-display text-lg font-bold text-slate-900">
              {isPt ? 'Comece seu catálogo em segundos' : 'Initialize your workspace in seconds'}
            </h3>
            <p className="text-sm text-slate-600">
              {isPt
                ? 'Você pode cadastrar seu primeiro produto manualmente, iniciar o Assistente de Presell em 4 etapas ou carregar o catálogo inicial com 3 produtos, categorias, gateways configurados e uma presell multilíngue publicada.'
                : 'Register your first product, launch the 4-step Presell Wizard, or populate a starter catalog with products, categories, payment gateways, and a live multilingual presell.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {seeding
                  ? isPt
                    ? 'Carregando...'
                    : 'Loading...'
                  : isPt
                  ? 'Carregar Catálogo Inicial'
                  : 'Load Starter Catalog'}
              </span>
            </button>
            <button
              onClick={() => onNavigate('presell-wizard')}
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isPt ? 'Criar Presell do Zero' : 'Create Presell'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isPt ? 'Páginas Criadas' : 'Total Pages'}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.totalPages}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {metrics.publishedPages} {isPt ? 'publicadas' : 'published'} · {metrics.draftPages}{' '}
            {isPt ? 'rascunhos' : 'drafts'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isPt ? 'Produtos Ativos' : 'Total Products'}</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.totalProducts}
          </p>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{isPt ? 'Gerenciar produtos' : 'Manage products'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isPt ? 'Visitantes & Cliques' : 'Visitors & Clicks'}</span>
            <MousePointerClick className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">
            {metrics.views} <span className="text-base font-normal text-slate-400">/</span>{' '}
            {metrics.clicks}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            CTR {metrics.ctr.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isPt ? 'Conversões Registradas' : 'Recorded Conversions'}</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {metrics.conversions}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {formatCurrency(metrics.revenueBrl, 'BRL')} · {formatCurrency(metrics.revenueUsd, 'USD')}
          </p>
        </div>
      </div>

      {/* Interactive Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                {isPt ? 'Fluxo Diário de Visitantes vs. Cliques' : 'Daily Visitors vs. Outbound Clicks'}
              </h3>
              <p className="text-xs text-slate-500">
                {isPt ? 'Dados coletados em tempo real das páginas públicas' : 'Live telemetry from published pages'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block" />
                {isPt ? 'Visitantes' : 'Visitors'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                {isPt ? 'Cliques' : 'Clicks'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                {isPt ? 'Conversões' : 'Conversions'}
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end gap-2 sm:gap-3 pt-4 border-b border-slate-100 pb-2">
            {chartSeries.map((day) => {
              const vH = Math.round((day.views / maxChartVal) * 100);
              const cH = Math.round((day.clicks / maxChartVal) * 100);
              const convH = Math.round((day.conversions / maxChartVal) * 100);
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    <div
                      title={`${day.label} · Views: ${day.views}`}
                      style={{ height: `${Math.max(vH, day.views > 0 ? 8 : 3)}%` }}
                      className="w-2.5 sm:w-3.5 bg-slate-900 rounded-t transition-all"
                    />
                    <div
                      title={`${day.label} · Clicks: ${day.clicks}`}
                      style={{ height: `${Math.max(cH, day.clicks > 0 ? 8 : 3)}%` }}
                      className="w-2.5 sm:w-3.5 bg-blue-600 rounded-t transition-all"
                    />
                    <div
                      title={`${day.label} · Conversions: ${day.conversions}`}
                      style={{ height: `${Math.max(convH, day.conversions > 0 ? 8 : 2)}%` }}
                      className="w-2 sm:w-3 bg-emerald-600 rounded-t transition-all"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance by Country & Language */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm text-slate-900">
              {isPt ? 'Desempenho por País' : 'Performance by Country'}
            </h3>
            {byCountry.length === 0 ? (
              <p className="text-xs text-slate-500">
                {isPt
                  ? 'Nenhum evento registrado ainda. Abra uma página publicada para testar.'
                  : 'No visitor events yet. Open a published page to record live telemetry.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {byCountry.slice(0, 5).map(([country, st]) => (
                  <div key={country} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-slate-800">{country}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {st.views} vis · {st.clicks} clq · {st.conversions} conv
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-display font-semibold text-sm text-slate-900">
              {isPt ? 'Desempenho por Idioma' : 'Performance by Language'}
            </h3>
            {byLanguage.length === 0 ? (
              <p className="text-xs text-slate-500">
                {isPt ? 'Aguardando acessos multilíngues.' : 'Awaiting multilingual visits.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {byLanguage.map(([lang, st]) => (
                  <div key={lang} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-slate-800">{lang}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {st.views} vis · {st.clicks} clq
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display font-semibold text-base text-slate-900">
            {isPt ? 'Desempenho por Produto' : 'Performance by Product'}
          </h3>
          <button
            onClick={() => onNavigate('analytics')}
            className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
          >
            {isPt ? 'Ver Analytics Completo' : 'Full Analytics'}
          </button>
        </div>

        {byProduct.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {isPt ? 'Cadastre produtos na Central de Produtos para acompanhar conversões.' : 'Add products in Product Hub to track performance.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                  <th className="py-3 px-6 font-medium">{isPt ? 'Produto' : 'Product'}</th>
                  <th className="py-3 px-4 font-medium">{isPt ? 'Rede / País' : 'Network / Country'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Visitantes' : 'Visitors'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Cliques' : 'Clicks'}</th>
                  <th className="py-3 px-6 font-medium text-right">{isPt ? 'Conversões' : 'Conversions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {byProduct.map(({ prod, views, clicks, conversions }) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium text-slate-900">{prod.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {prod.network || 'Direto'} · {prod.country} · {prod.language.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {views}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {clicks}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {conversions}
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
