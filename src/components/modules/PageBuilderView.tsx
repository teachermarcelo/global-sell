import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  FilePlus2,
  GripVertical,
  History,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { formatCurrency, slugify } from '../../lib/i18n';
import {
  BlockType,
  LanguageCode,
  PageBlock,
  PageItem,
  PageVersion,
  PaymentProvider,
  Product,
  PublishedPage,
} from '../../types';

const STUDIO_IMAGES = [
  '/images/product_skincare_serum_1794756575954.jpg',
  '/images/product_fitness_watch_1794756577239.jpg',
  '/images/product_supplement_bottle_1794756576809.jpg',
  '/images/presell_hero_editorial_1794756577028.jpg',
];

interface PageBuilderViewProps {
  uiLang: LanguageCode;
  pages: PageItem[];
  products: Product[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onSavePage: (
    pageInput: Omit<PageItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingPage?: PageItem,
    publishNow?: boolean,
    versionNote?: string
  ) => Promise<string>;
  onGetVersions: (pageId: string) => Promise<PageVersion[]>;
  onPreviewPublished: (preview: PublishedPage) => void;
}

const BLOCK_CATALOG: Array<{ type: BlockType; labelPt: string; labelEn: string }> = [
  { type: 'hero', labelPt: 'Hero / Capa Comercial', labelEn: 'Hero Banner' },
  { type: 'cookie_consent', labelPt: 'Box de Cookies', labelEn: 'Cookie Consent Box' },
  { type: 'text', labelPt: 'Bloco de Texto', labelEn: 'Rich Text Section' },
  { type: 'image', labelPt: 'Imagem', labelEn: 'Image' },
  { type: 'video', labelPt: 'Vídeo (YouTube/Vimeo)', labelEn: 'Video Embed' },
  { type: 'cta_button', labelPt: 'Botão de Afiliado', labelEn: 'Affiliate CTA Button' },
  { type: 'review_scorecard', labelPt: 'Avaliação & Prós/Contras', labelEn: 'Review Scorecard' },
  { type: 'comparison_table', labelPt: 'Tabela de Comparação', labelEn: 'Comparison Table' },
  { type: 'trust_badges', labelPt: 'Selos de Confiança', labelEn: 'Trust Badges' },
  { type: 'faq', labelPt: 'Perguntas Frequentes', labelEn: 'FAQ Accordion' },
  { type: 'payment_checkout', labelPt: 'Checkout Gateway Nativo', labelEn: 'Native Payment Checkout' },
  { type: 'legal_footer', labelPt: 'Aviso Legal / Privacidade', labelEn: 'Legal Disclaimer' },
];

export const PageBuilderView: React.FC<PageBuilderViewProps> = ({
  uiLang,
  pages,
  products,
  selectedPageId,
  onSelectPage,
  onSavePage,
  onGetVersions,
  onPreviewPublished,
}) => {
  const isPt = uiLang === 'pt';
  const activePage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) || pages[0] || null,
    [pages, selectedPageId]
  );

  const [draft, setDraft] = useState<PageItem | null>(activePage);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'block' | 'theme' | 'ab' | 'lang' | 'versions'>('block');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (activePage) {
      setDraft(JSON.parse(JSON.stringify(activePage)));
      setSelectedBlockId(activePage.blocks?.[0]?.id || null);
    } else {
      setDraft(null);
    }
  }, [activePage?.id]);

  useEffect(() => {
    if (inspectorTab === 'versions' && activePage) {
      onGetVersions(activePage.id).then(setVersions).catch(() => setVersions([]));
    }
  }, [inspectorTab, activePage?.id, onGetVersions]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreateSubpage = async (parent: PageItem) => {
    const newId = await onSavePage(
      {
        parentPageId: parent.id,
        productId: parent.productId || '',
        categoryId: parent.categoryId || '',
        templateId: parent.templateId || '',
        title: `${parent.title} — Subpágina`,
        slug: `${parent.slug}-sub-${Math.random().toString(36).slice(2, 5)}`,
        pageKind: 'subpage',
        presellType: parent.presellType,
        funnelStage: parent.funnelStage,
        language: parent.language,
        targetCountry: parent.targetCountry || 'BR',
        affiliateUrl: parent.affiliateUrl || '',
        policyEmail: parent.policyEmail || '',
        ghostMode: false,
        status: 'draft',
        blocks: [
          {
            id: `blk_${Date.now()}`,
            type: 'hero',
            title: `${parent.title} — Detalhes Complementares`,
            subtitle: 'Subpágina vinculada à página principal.',
            buttonText: isPt ? 'Acessar Oferta Principal' : 'Go to Main Offer',
            useAffiliateLink: true,
          },
        ],
        theme: parent.theme,
        seo: parent.seo,
        tracking: parent.tracking,
      },
      undefined,
      false,
      'Criação de subpágina'
    );
    onSelectPage(newId);
    showToast(isPt ? 'Subpágina criada!' : 'Subpage created!');
  };

  if (!draft || !activePage) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900">
          {isPt ? 'Nenhuma página selecionada' : 'No page selected'}
        </h2>
        <p className="text-sm text-slate-500">
          {isPt
            ? 'Crie uma página no Assistente de Presell ou selecione uma página existente.'
            : 'Create a page in the Presell Wizard first to edit blocks visually.'}
        </p>
      </div>
    );
  }

  const selectedBlock = draft.blocks.find((b) => b.id === selectedBlockId) || null;

  const addBlock = (type: BlockType) => {
    const id = `blk_${Date.now().toString(36)}`;
    const newBlock: PageBlock = {
      id,
      type,
      title:
        type === 'hero'
          ? 'Título de Destaque'
          : type === 'text'
          ? 'Novo Bloco Editorial'
          : type === 'payment_checkout'
          ? 'Finalizar Compra Segura'
          : type === 'cta_button'
          ? 'Garanta Sua Oferta Agora'
          : 'Novo Bloco',
      subtitle: type === 'hero' || type === 'payment_checkout' ? 'Subtítulo descritivo do produto.' : undefined,
      body:
        type === 'text' || type === 'cookie_consent' || type === 'legal_footer'
          ? 'Edite este texto diretamente no painel lateral.'
          : undefined,
      imageUrl: type === 'image' || type === 'hero' ? STUDIO_IMAGES[0] : undefined,
      videoUrl: type === 'video' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : undefined,
      buttonText:
        type === 'cta_button' || type === 'hero' || type === 'cookie_consent' || type === 'payment_checkout'
          ? isPt
            ? 'Continuar para Oferta Oficial'
            : 'Continue to Official Offer'
          : undefined,
      useAffiliateLink: true,
      paymentProvider: type === 'payment_checkout' ? 'mercadopago' : undefined,
      price: type === 'payment_checkout' ? 197 : undefined,
      currency: type === 'payment_checkout' ? 'BRL' : undefined,
      score: type === 'review_scorecard' ? 9.5 : undefined,
      pros: type === 'review_scorecard' ? ['Garantia oficial', 'Envio rápido'] : undefined,
      cons: type === 'review_scorecard' ? ['Estoque limitado'] : undefined,
      items:
        type === 'comparison_table' || type === 'trust_badges' || type === 'faq'
          ? [
              { label: 'Item 1', value: 'Descrição / Valor', highlight: true },
              { label: 'Item 2', value: 'Descrição / Valor', highlight: false },
            ]
          : undefined,
    };

    setDraft({ ...draft, blocks: [...draft.blocks, newBlock] });
    setSelectedBlockId(id);
    setInspectorTab('block');
  };

  const updateBlock = (id: string, patch: Partial<PageBlock>) => {
    setDraft({
      ...draft,
      blocks: draft.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= draft.blocks.length) return;
    const copy = [...draft.blocks];
    const [removed] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, removed);
    setDraft({ ...draft, blocks: copy });
  };

  const duplicateBlock = (index: number) => {
    const original = draft.blocks[index];
    const cloned = { ...JSON.parse(JSON.stringify(original)), id: `blk_${Date.now().toString(36)}` };
    const copy = [...draft.blocks];
    copy.splice(index + 1, 0, cloned);
    setDraft({ ...draft, blocks: copy });
    setSelectedBlockId(cloned.id);
  };

  const removeBlock = (id: string) => {
    const next = draft.blocks.filter((b) => b.id !== id);
    setDraft({ ...draft, blocks: next });
    if (selectedBlockId === id) {
      setSelectedBlockId(next[0]?.id || null);
    }
  };

  const handleSave = async (publishNow: boolean) => {
    setSaving(true);
    try {
      await onSavePage(
        {
          parentPageId: draft.parentPageId || '',
          productId: draft.productId || '',
          categoryId: draft.categoryId || '',
          templateId: draft.templateId || '',
          title: draft.title,
          slug: slugify(draft.slug || draft.title),
          pageKind: draft.pageKind,
          presellType: draft.presellType,
          funnelStage: draft.funnelStage,
          language: draft.language,
          targetCountry: draft.targetCountry || 'BR',
          affiliateLinkId: draft.affiliateLinkId || '',
          affiliateUrl: draft.affiliateUrl || '',
          policyEmailMode: draft.policyEmailMode || 'producer',
          policyEmail: draft.policyEmail || '',
          ghostMode: Boolean(draft.ghostMode),
          status: publishNow ? 'published' : draft.status,
          sortOrder: draft.sortOrder ?? 0,
          blocks: draft.blocks,
          theme: draft.theme,
          seo: draft.seo,
          tracking: draft.tracking,
          whatsapp: draft.whatsapp,
          paymentConfig: draft.paymentConfig,
          abTest: draft.abTest,
          translations: draft.translations,
        },
        activePage,
        publishNow,
        publishNow ? 'Atualização publicada no Construtor' : 'Alterações salvas no Construtor'
      );
      showToast(publishNow ? (isPt ? 'Página publicada!' : 'Published!') : isPt ? 'Salvo!' : 'Saved!');
    } finally {
      setSaving(false);
    }
  };

  const topLevelPages = pages.filter((p) => !p.parentPageId);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Builder Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="font-display font-bold text-sm text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 w-60 truncate"
          />
          <span className="text-xs font-mono text-slate-500 hidden md:inline">
            /{draft.language === 'auto' ? 'pt' : draft.language}/{draft.slug}
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded-md cursor-pointer ${viewport === 'desktop' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            title="Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded-md cursor-pointer ${viewport === 'tablet' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            title="Tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded-md cursor-pointer ${viewport === 'mobile' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            title="Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {toast && <span className="text-xs font-medium text-emerald-700 mr-2">{toast}</span>}
          <button
            onClick={() =>
              onPreviewPublished({
                ownerId: draft.ownerId,
                pageId: draft.id,
                productId: draft.productId,
                publicKey: draft.publicKey || 'preview',
                slug: draft.slug,
                title: draft.title,
                pageKind: draft.pageKind,
                presellType: draft.presellType,
                funnelStage: draft.funnelStage,
                language: draft.language,
                targetCountry: draft.targetCountry,
                affiliateUrl: draft.affiliateUrl,
                policyEmail: draft.policyEmail,
                ghostMode: draft.ghostMode,
                status: 'published',
                blocks: draft.blocks,
                theme: draft.theme,
                seo: draft.seo,
                tracking: draft.tracking,
                whatsapp: draft.whatsapp,
                paymentConfig: draft.paymentConfig,
                abTest: draft.abTest,
                translations: draft.translations,
                createdAt: draft.createdAt,
                updatedAt: draft.updatedAt,
              })
            }
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPt ? 'Visualizar' : 'Preview'}</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPt ? 'Salvar' : 'Save'}</span>
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isPt ? 'Publicar' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Pages & Subpages Tree + Block Palette */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-xs uppercase text-slate-500">
              {isPt ? 'Páginas & Subpáginas' : 'Pages & Subpages'}
            </h3>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {topLevelPages.map((pg) => {
                const subpages = pages.filter((s) => s.parentPageId === pg.id);
                return (
                  <div key={pg.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => onSelectPage(pg.id)}
                        className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-xs font-medium truncate cursor-pointer ${
                          pg.id === activePage.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pg.title}
                      </button>
                      <button
                        onClick={() => handleCreateSubpage(pg)}
                        title={isPt ? 'Adicionar subpágina' : 'Add subpage'}
                        className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {subpages.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => onSelectPage(sub.id)}
                        className={`w-[calc(100%-14px)] ml-3.5 text-left px-2.5 py-1 rounded-md text-xs truncate cursor-pointer ${
                          sub.id === activePage.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        ↳ {sub.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-xs uppercase text-slate-500">
              {isPt ? 'Adicionar Blocos' : 'Add Blocks'}
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {BLOCK_CATALOG.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addBlock(item.type)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-xs font-medium text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span>{isPt ? item.labelPt : item.labelEn}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Drag-and-Drop Live Block Canvas */}
        <div className="lg:col-span-5 bg-slate-100 border border-slate-200 rounded-xl p-4 min-h-[580px] flex justify-center overflow-x-auto">
          <div
            className={`w-full transition-all rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 ${
              viewport === 'mobile'
                ? 'max-w-[360px]'
                : viewport === 'tablet'
                ? 'max-w-[540px]'
                : 'max-w-full'
            }`}
            style={{ backgroundColor: draft.theme.backgroundColor }}
          >
            {draft.blocks.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                {isPt
                  ? 'Clique nos blocos à esquerda para construir sua página.'
                  : 'Click blocks on the left to start building.'}
              </div>
            ) : (
              draft.blocks.map((block, index) => {
                const isSel = block.id === selectedBlockId;
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return;
                      const copy = [...draft.blocks];
                      const [moved] = copy.splice(dragIndex, 1);
                      copy.splice(index, 0, moved);
                      setDraft({ ...draft, blocks: copy });
                      setDragIndex(null);
                    }}
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setInspectorTab('block');
                    }}
                    className={`rounded-lg border p-3.5 bg-white cursor-pointer transition-all ${
                      isSel
                        ? 'border-blue-600 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
                        <span>{block.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, -1);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, 1);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(index);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlock(block.id);
                          }}
                          className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Block Mini-Render */}
                    <div className="space-y-1.5">
                      {block.title && (
                        <p className="font-display font-bold text-sm text-slate-900">
                          {block.title}
                        </p>
                      )}
                      {(block.subtitle || block.body) && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {block.subtitle || block.body}
                        </p>
                      )}
                      {block.imageUrl && (
                        <img
                          src={block.imageUrl}
                          alt={block.title || 'Block'}
                          className="w-full h-24 object-cover rounded mt-1"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {block.type === 'payment_checkout' && (
                        <p className="font-mono text-xs font-semibold text-emerald-700">
                          {block.paymentProvider?.toUpperCase()} ·{' '}
                          {formatCurrency(block.price ?? 197, block.currency || 'BRL')}
                        </p>
                      )}
                      {block.buttonText && (
                        <span
                          className="inline-block mt-1 px-3 py-1 rounded text-[11px] font-semibold text-white"
                          style={{ backgroundColor: draft.theme.accentColor }}
                        >
                          {block.buttonText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Inspector Tabs */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {([
              { id: 'block', label: isPt ? 'Bloco' : 'Block' },
              { id: 'theme', label: isPt ? 'Tema' : 'Theme' },
              { id: 'ab', label: 'A/B' },
              { id: 'lang', label: isPt ? 'Idiomas' : 'Langs' },
              { id: 'versions', label: isPt ? 'Versões' : 'History' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInspectorTab(tab.id)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  inspectorTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {inspectorTab === 'block' && selectedBlock && (
            <div className="space-y-3">
              <p className="text-xs font-mono text-slate-500">
                Editando: {selectedBlock.type}
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isPt ? 'Título' : 'Title'}
                </label>
                <input
                  type="text"
                  value={selectedBlock.title || ''}
                  onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {(selectedBlock.type === 'hero' || selectedBlock.type === 'payment_checkout') && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Subtítulo' : 'Subtitle'}
                  </label>
                  <textarea
                    rows={2}
                    value={selectedBlock.subtitle || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {(selectedBlock.type === 'text' ||
                selectedBlock.type === 'cookie_consent' ||
                selectedBlock.type === 'legal_footer') && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Texto / Conteúdo' : 'Body Copy'}
                  </label>
                  <textarea
                    rows={4}
                    value={selectedBlock.body || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { body: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {(selectedBlock.type === 'hero' || selectedBlock.type === 'image') && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    {isPt ? 'Imagem' : 'Image'}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STUDIO_IMAGES.map((img) => (
                      <button
                        type="button"
                        key={img}
                        onClick={() => updateBlock(selectedBlock.id, { imageUrl: img })}
                        className={`rounded overflow-hidden border-2 aspect-square cursor-pointer ${
                          selectedBlock.imageUrl === img ? 'border-blue-600' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={img}
                          alt="Studio"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={selectedBlock.imageUrl || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {selectedBlock.type === 'video' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'URL Embed do Vídeo' : 'Video Embed URL'}
                  </label>
                  <input
                    type="url"
                    value={selectedBlock.videoUrl || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { videoUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {(selectedBlock.type === 'hero' ||
                selectedBlock.type === 'cookie_consent' ||
                selectedBlock.type === 'cta_button' ||
                selectedBlock.type === 'payment_checkout') && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-700">
                    {isPt ? 'Texto do Botão' : 'Button Text'}
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.buttonText || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { buttonText: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  {selectedBlock.type !== 'payment_checkout' && (
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBlock.useAffiliateLink !== false}
                        onChange={(e) =>
                          updateBlock(selectedBlock.id, { useAffiliateLink: e.target.checked })
                        }
                      />
                      <span>{isPt ? 'Usar Link de Afiliado da Página' : 'Use Page Affiliate Link'}</span>
                    </label>
                  )}
                </div>
              )}

              {selectedBlock.type === 'payment_checkout' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-700">
                    {isPt ? 'Gateway & Preço' : 'Gateway & Price'}
                  </label>
                  <select
                    value={selectedBlock.paymentProvider || 'mercadopago'}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        paymentProvider: e.target.value as PaymentProvider,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="mercadopago">Mercado Pago / Pix</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="hotmart">Hotmart</option>
                    <option value="kiwify">Kiwify</option>
                    <option value="pagseguro">PagSeguro</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedBlock.price ?? 197}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, { price: Number(e.target.value) })
                      }
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                    <select
                      value={selectedBlock.currency || 'BRL'}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          currency: e.target.value as 'BRL' | 'USD' | 'EUR' | 'GBP',
                        })
                      }
                      className="w-20 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {inspectorTab === 'theme' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isPt ? 'URL Personalizada (Slug)' : 'URL Slug'}
                </label>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isPt ? 'Link de Afiliado da Página' : 'Page Affiliate URL'}
                </label>
                <input
                  type="url"
                  value={draft.affiliateUrl || ''}
                  onChange={(e) => setDraft({ ...draft, affiliateUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isPt ? 'Produto Vinculado' : 'Linked Product'}
                </label>
                <select
                  value={draft.productId || ''}
                  onChange={(e) => setDraft({ ...draft, productId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">{isPt ? 'Nenhum' : 'None'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">CTA Color</label>
                  <input
                    type="color"
                    value={draft.theme.accentColor}
                    onChange={(e) =>
                      setDraft({ ...draft, theme: { ...draft.theme, accentColor: e.target.value } })
                    }
                    className="h-9 w-full rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Background</label>
                  <input
                    type="color"
                    value={draft.theme.backgroundColor}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        theme: { ...draft.theme, backgroundColor: e.target.value },
                      })
                    }
                    className="h-9 w-full rounded border border-slate-300"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={draft.ghostMode}
                  onChange={(e) => setDraft({ ...draft, ghostMode: e.target.checked })}
                />
                <span>{isPt ? 'Modo Fantasma Ativo' : 'Ghost Mode Enabled'}</span>
              </label>
            </div>
          )}

          {inspectorTab === 'ab' && (
            <div className="space-y-3">
              <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
                <span>{isPt ? 'Teste A/B Ativo' : 'A/B Test Active'}</span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.abTest?.enabled)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abTest: { ...draft.abTest, enabled: e.target.checked, splitPercent: draft.abTest?.splitPercent ?? 50 },
                    })
                  }
                />
              </label>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {isPt ? 'Divisão de Tráfego (% Variante B)' : 'Variant B Traffic Split (%)'}
                </label>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={draft.abTest?.splitPercent ?? 50}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abTest: { ...draft.abTest, enabled: Boolean(draft.abTest?.enabled), splitPercent: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {isPt ? 'Headline da Variante B' : 'Variant B Headline'}
                </label>
                <input
                  type="text"
                  value={draft.abTest?.variantBHeadline || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abTest: { ...draft.abTest, enabled: Boolean(draft.abTest?.enabled), splitPercent: draft.abTest?.splitPercent ?? 50, variantBHeadline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {isPt ? 'CTA da Variante B' : 'Variant B CTA Text'}
                </label>
                <input
                  type="text"
                  value={draft.abTest?.variantBCtaText || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abTest: { ...draft.abTest, enabled: Boolean(draft.abTest?.enabled), splitPercent: draft.abTest?.splitPercent ?? 50, variantBCtaText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {isPt ? 'Cor CTA Variante B' : 'Variant B CTA Color'}
                </label>
                <input
                  type="color"
                  value={draft.abTest?.variantBPrimaryColor || '#2563EB'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abTest: { ...draft.abTest, enabled: Boolean(draft.abTest?.enabled), splitPercent: draft.abTest?.splitPercent ?? 50, variantBPrimaryColor: e.target.value },
                    })
                  }
                  className="h-9 w-full rounded border border-slate-300"
                />
              </div>
            </div>
          )}

          {inspectorTab === 'lang' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                {isPt
                  ? 'Edite títulos específicos para PT e EN preservando marcas protegidas.'
                  : 'Configure independent PT and EN titles & slugs for automatic hreflang.'}
              </p>
              {(['pt', 'en'] as LanguageCode[]).map((l) => (
                <div key={l} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs font-mono font-bold uppercase text-slate-700">{l}</p>
                  <input
                    type="text"
                    value={draft.translations?.[l]?.title || draft.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        translations: {
                          ...draft.translations,
                          [l]: {
                            slug: draft.translations?.[l]?.slug || draft.slug,
                            blocks: draft.translations?.[l]?.blocks || draft.blocks,
                            ...draft.translations?.[l],
                            title: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              ))}
            </div>
          )}

          {inspectorTab === 'versions' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <History className="w-3.5 h-3.5" />
                <span>{isPt ? 'Histórico de Alterações' : 'Revision History'}</span>
              </div>
              {versions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {isPt ? 'Nenhuma versão anterior.' : 'No prior versions yet.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{v.note || 'Versão'}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {v.createdAt?.toDate
                            ? v.createdAt.toDate().toLocaleString(isPt ? 'pt-BR' : 'en-US')
                            : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const snap = v.snapshot as { blocks?: PageBlock[]; title?: string };
                          if (snap.blocks) {
                            setDraft({
                              ...draft,
                              title: snap.title || draft.title,
                              blocks: snap.blocks,
                            });
                            showToast(isPt ? 'Versão restaurada no editor!' : 'Version restored!');
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium shrink-0 cursor-pointer"
                      >
                        {isPt ? 'Restaurar' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
