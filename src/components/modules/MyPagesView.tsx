import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FolderCog,
  GitBranch,
  Globe,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { getPublicBaseUrl, getPublicPagePath } from '../../lib/i18n';
import { Category, ClickEvent, LanguageCode, PageItem, Product } from '../../types';

interface MyPagesViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  products: Product[];
  categories: Category[];
  clickEvents: ClickEvent[];
  customDomain?: string;
  onCreateNewPresell: () => void;
  onManageCategories: () => void;
  onEditInBuilder: (page: PageItem) => void;
  onDuplicate: (page: PageItem) => Promise<string>;
  onTogglePublish: (page: PageItem, shouldPublish: boolean) => Promise<void>;
  onDelete: (page: PageItem) => Promise<void>;
  onPreviewPage: (page: PageItem) => void;
  onOpenAnalytics: () => void;
}

export const MyPagesView: React.FC<MyPagesViewProps> = ({
  uiLang,
  pages,
  products,
  categories,
  clickEvents,
  customDomain,
  onCreateNewPresell,
  onManageCategories,
  onEditInBuilder,
  onDuplicate,
  onTogglePublish,
  onDelete,
  onPreviewPage,
  onOpenAnalytics,
}) => {
  const isPt = uiLang === 'pt';
  const publicBaseUrl = getPublicBaseUrl(customDomain);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'manual' | 'recent' | 'clicks'>('manual');
  const [onlyActive, setOnlyActive] = useState(false);
  const [onlyProcessing, setOnlyProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [abDrawerPage, setAbDrawerPage] = useState<PageItem | null>(null);

  const pageStats = useMemo(() => {
    const map: Record<string, { views: number; clicks: number; conversions: number }> = {};
    clickEvents.forEach((ev) => {
      const pid = ev.pageId || '';
      if (!pid) return;
      if (!map[pid]) map[pid] = { views: 0, clicks: 0, conversions: 0 };
      if (ev.eventType === 'page_view') map[pid].views += 1;
      if (ev.eventType === 'affiliate_click' || ev.eventType === 'whatsapp_click')
        map[pid].clicks += 1;
      if (ev.eventType === 'conversion') map[pid].conversions += 1;
    });
    return map;
  }, [clickEvents]);

  const filteredPages = useMemo(() => {
    return pages
      .filter((pg) => {
        const matchSearch =
          !search ||
          pg.title.toLowerCase().includes(search.toLowerCase()) ||
          pg.slug.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'all' || pg.presellType === typeFilter;
        const matchCat = categoryFilter === 'all' || pg.categoryId === categoryFilter;
        const matchProd = productFilter === 'all' || pg.productId === productFilter;
        const matchLang = langFilter === 'all' || pg.language === langFilter;
        const matchStatus = statusFilter === 'all' || pg.status === statusFilter;
        const matchOnlyActive = !onlyActive || pg.status === 'published';
        const matchOnlyProc = !onlyProcessing || pg.status === 'processing';
        return (
          matchSearch &&
          matchType &&
          matchCat &&
          matchProd &&
          matchLang &&
          matchStatus &&
          matchOnlyActive &&
          matchOnlyProc
        );
      })
      .sort((a, b) => {
        if (sortBy === 'clicks') {
          return (pageStats[b.id]?.clicks || 0) - (pageStats[a.id]?.clicks || 0);
        }
        if (sortBy === 'recent') {
          const ta = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tb = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tb - ta;
        }
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [
    pages,
    search,
    typeFilter,
    categoryFilter,
    productFilter,
    langFilter,
    statusFilter,
    onlyActive,
    onlyProcessing,
    sortBy,
    pageStats,
  ]);

  const toggleAll = () => {
    if (selectedIds.length === filteredPages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPages.map((p) => p.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCopyUrl = (page: PageItem) => {
    const path = getPublicPagePath(page.language === 'auto' ? 'pt' : page.language, page.slug);
    const fullUrl = `${publicBaseUrl}${path}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedId(page.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      const target = pages.find((p) => p.id === id);
      if (target) await onDelete(target);
    }
    setSelectedIds([]);
  };

  const getProductName = (id?: string) =>
    products.find((p) => p.id === id)?.name || (isPt ? 'Produto direto' : 'Direct offer');
  const getCatName = (id?: string) =>
    categories.find((c) => c.id === id)?.name || (isPt ? 'Geral' : 'General');

  const formatTs = (ts: PageItem['createdAt']) => {
    if (!ts || !ts.toDate) return '—';
    return ts.toDate().toLocaleDateString(isPt ? 'pt-BR' : 'en-US');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header matching Super Presell Ultimate Minhas Presells */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Minhas Páginas & Presells' : 'My Pages & Presells'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
            {pages.length} {isPt ? 'página(s) criada(s)' : 'page(s) created'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onManageCategories}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FolderCog className="w-4 h-4 text-slate-500" />
            <span>{isPt ? 'Gerenciar Categorias' : 'Manage Categories'}</span>
          </button>

          <button
            onClick={onCreateNewPresell}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isPt ? 'Criar Nova Presell' : 'Create New Presell'}</span>
          </button>
        </div>
      </div>

      {/* Super Presell Ultimate Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isPt ? 'Buscar presell...' : 'Search presell...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">{isPt ? 'Todos os tipos' : 'All types'}</option>
            <option value="cookies_centered">Cookies Centralizado</option>
            <option value="cookies_premium">Cookies Premium</option>
            <option value="cookies_footer">Cookies Rodapé</option>
            <option value="review_page">Avaliações (Review)</option>
            <option value="comparison">Comparação</option>
            <option value="commercial_landing">Landing Comercial</option>
            <option value="product_showcase">Apresentação</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">{isPt ? 'Todas categorias' : 'All categories'}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">{isPt ? 'Todos produtos' : 'All products'}</option>
            {products.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'manual' | 'recent' | 'clicks')}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="manual">{isPt ? 'Ordenar: Manual' : 'Sort: Manual'}</option>
            <option value="recent">{isPt ? 'Ordenar: Recentes' : 'Sort: Recent'}</option>
            <option value="clicks">{isPt ? 'Ordenar: Mais Cliques' : 'Sort: Top Clicks'}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === filteredPages.length}
                onChange={toggleAll}
                className="rounded border-slate-300"
              />
              <span>{isPt ? 'Selecionar todos' : 'Select all'}</span>
            </label>

            <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>{isPt ? 'Somente Ativas' : 'Active Only'}</span>
            </label>

            <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyProcessing}
                onChange={(e) => setOnlyProcessing(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>{isPt ? 'Em Processamento' : 'Processing'}</span>
            </label>

            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white"
            >
              <option value="all">{isPt ? 'Idioma: Todos' : 'Lang: All'}</option>
              <option value="auto">Auto (PT/EN/ES)</option>
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white"
            >
              <option value="all">{isPt ? 'Status: Todos' : 'Status: All'}</option>
              <option value="published">{isPt ? 'Publicada' : 'Published'}</option>
              <option value="draft">{isPt ? 'Rascunho' : 'Draft'}</option>
              <option value="unpublished">{isPt ? 'Despublicada' : 'Unpublished'}</option>
            </select>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isPt ? `Excluir (${selectedIds.length})` : `Delete (${selectedIds.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPages.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="font-display font-semibold text-slate-900">
              {isPt ? 'Nenhuma página corresponde aos filtros' : 'No pages match your filters'}
            </p>
            <p className="text-sm text-slate-500">
              {isPt
                ? 'Crie sua primeira página no Criador de Presells em menos de 1 minuto.'
                : 'Launch your first presell in under a minute using the Presell Wizard.'}
            </p>
            <button
              onClick={onCreateNewPresell}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isPt ? 'Criar Nova Presell' : 'Create New Presell'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 pl-4 pr-2 w-8" />
                  <th className="py-3 px-4 font-medium">{isPt ? 'Página & Produto' : 'Page & Product'}</th>
                  <th className="py-3 px-3 font-medium">{isPt ? 'Idioma / Cat.' : 'Lang / Cat.'}</th>
                  <th className="py-3 px-3 font-medium">Status</th>
                  <th className="py-3 px-3 font-medium text-right">{isPt ? 'Visitantes' : 'Visitors'}</th>
                  <th className="py-3 px-3 font-medium text-right">{isPt ? 'Cliques' : 'Clicks'}</th>
                  <th className="py-3 px-3 font-medium text-right">{isPt ? 'Conv.' : 'Conv.'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Ações' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPages.map((pg) => {
                  const stats = pageStats[pg.id] || { views: 0, clicks: 0, conversions: 0 };
                  const pubPath = getPublicPagePath(pg.language === 'auto' ? 'pt' : pg.language, pg.slug);
                  return (
                    <tr key={pg.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pl-4 pr-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(pg.id)}
                          onChange={() => toggleOne(pg.id)}
                          className="rounded border-slate-300"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{pg.title}</span>
                            {pg.parentPageId && (
                              <span className="text-[11px] font-mono text-slate-500">
                                · Subpágina
                              </span>
                            )}
                            {pg.ghostMode && (
                              <span className="text-[11px] font-mono text-amber-700">
                                · Modo Fantasma
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>{getProductName(pg.productId)}</span>
                            <span>·</span>
                            <span className="font-mono text-slate-600">{pubPath}</span>
                            <span>·</span>
                            <span>{formatTs(pg.createdAt)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span className="uppercase font-mono">{pg.language}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{getCatName(pg.categoryId)}</p>
                      </td>

                      <td className="py-3.5 px-3 text-xs">
                        {pg.status === 'published' ? (
                          <span className="text-emerald-700 font-semibold">
                            {isPt ? 'Publicada' : 'Published'}
                          </span>
                        ) : pg.status === 'draft' ? (
                          <span className="text-slate-600 font-medium">
                            {isPt ? 'Rascunho' : 'Draft'}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            {isPt ? 'Despublicada' : 'Unpublished'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {stats.views}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {stats.clicks}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {stats.conversions}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAbDrawerPage(pg)}
                            className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            title={isPt ? 'Ver variação A/B' : 'View A/B variation'}
                          >
                            <GitBranch className="w-3 h-3" />
                            <span>{isPt ? 'Ver variação' : 'Variation'}</span>
                          </button>

                          <button
                            onClick={() => onPreviewPage(pg)}
                            title={isPt ? 'Visualizar' : 'Preview'}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {pg.status === 'published' && (
                            <a
                              href={`${publicBaseUrl}${pubPath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={isPt ? 'Abrir URL pública' : 'Open public URL'}
                              className="p-1.5 rounded-md border border-slate-200 text-blue-600 hover:bg-blue-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => onEditInBuilder(pg)}
                            title={isPt ? 'Editar no Construtor Visual' : 'Edit in Builder'}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCopyUrl(pg)}
                            title={isPt ? 'Copiar link' : 'Copy link'}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            {copiedId === pg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => onDuplicate(pg)}
                            title={isPt ? 'Duplicar' : 'Duplicate'}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-medium cursor-pointer"
                          >
                            Dup
                          </button>

                          <button
                            onClick={() => onTogglePublish(pg, pg.status !== 'published')}
                            title={
                              pg.status === 'published'
                                ? isPt
                                  ? 'Despublicar'
                                  : 'Unpublish'
                                : isPt
                                ? 'Publicar'
                                : 'Publish'
                            }
                            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            {pg.status === 'published' ? (
                              <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>

                          <button
                            onClick={onOpenAnalytics}
                            title={isPt ? 'Abrir analytics' : 'Open analytics'}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDelete(pg)}
                            title={isPt ? 'Excluir' : 'Delete'}
                            className="p-1.5 rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
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

      {/* A/B Variation Quick Comparison Modal (matching "Ver variação >") */}
      {abDrawerPage && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs text-slate-500">{isPt ? 'Teste A/B Integrado' : 'Integrated A/B Split Test'}</p>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {abDrawerPage.title}
                </h3>
              </div>
              <button
                onClick={() => setAbDrawerPage(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>

            {(() => {
              const evs = clickEvents.filter((e) => e.pageId === abDrawerPage.id);
              const aViews = evs.filter((e) => e.variant === 'A' && e.eventType === 'page_view').length;
              const aClicks = evs.filter((e) => e.variant === 'A' && e.eventType === 'affiliate_click').length;
              const bViews = evs.filter((e) => e.variant === 'B' && e.eventType === 'page_view').length;
              const bClicks = evs.filter((e) => e.variant === 'B' && e.eventType === 'affiliate_click').length;
              const aCtr = aViews > 0 ? ((aClicks / aViews) * 100).toFixed(1) : '0.0';
              const bCtr = bViews > 0 ? ((bClicks / bViews) * 100).toFixed(1) : '0.0';

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                      <p className="text-xs font-semibold text-slate-500">Variante A (Original)</p>
                      <p className="font-mono text-xl font-bold tabular-nums text-slate-900">{aCtr}% CTR</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {aViews} views · {aClicks} cliques
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1">
                      <p className="text-xs font-semibold text-blue-700">
                        Variante B ({abDrawerPage.abTest?.enabled ? 'Ativa' : 'Inativa'})
                      </p>
                      <p className="font-mono text-xl font-bold tabular-nums text-slate-900">{bCtr}% CTR</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {bViews} views · {bClicks} cliques
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    {isPt
                      ? 'Para editar títulos, CTA ou cores da Variante B, abra a página no Construtor Visual.'
                      : 'Open the page in the Visual Builder to edit Variant B headlines, CTA text, or accent color.'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        const target = abDrawerPage;
                        setAbDrawerPage(null);
                        onEditInBuilder(target);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isPt ? 'Editar Variação no Construtor' : 'Edit Variation in Builder'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
