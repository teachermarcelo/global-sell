import React, { useMemo, useState } from 'react';
import {
  Edit3,
  ExternalLink,
  Package,
  Plus,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { formatCurrency } from '../../lib/i18n';
import { Category, LanguageCode, PageItem, PageLanguageSetting, Product } from '../../types';
import { SmartImage } from '../SmartImage';

const STUDIO_IMAGES = [
  {
    label: 'Skincare Botanical Serum',
    url: '/images/product_skincare_serum_1794756575954.jpg',
  },
  {
    label: 'Biometric Smartwatch',
    url: '/images/product_fitness_watch_1794756577239.jpg',
  },
  {
    label: 'Nutraceutical Supplement',
    url: '/images/product_supplement_bottle_1794756576809.jpg',
  },
  {
    label: 'Editorial Lifestyle',
    url: '/images/presell_hero_editorial_1794756577028.jpg',
  },
];

interface ProductsViewProps {
  uiLang: LanguageCode;
  products: Product[];
  categories: Category[];
  pages: PageItem[];
  onCreateProduct: (input: Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  onUpdateProduct: (
    id: string,
    input: Partial<Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onCreatePresellForProduct: (product: Product) => void;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  imageUrl: STUDIO_IMAGES[0].url,
  categoryId: '',
  country: 'BR',
  language: 'pt' as PageLanguageSetting,
  network: 'Hotmart',
  affiliateUrl: '',
  price: 197,
  currency: 'BRL' as 'BRL' | 'USD' | 'EUR' | 'GBP',
  commissionRate: 50,
  producerEmail: '',
  status: 'active' as 'active' | 'paused' | 'archived',
};

export const ProductsView: React.FC<ProductsViewProps> = ({
  uiLang,
  products,
  categories,
  pages,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreatePresellForProduct,
}) => {
  const isPt = uiLang === 'pt';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.network || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [products, search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (prod: Product) => {
    setEditing(prod);
    setForm({
      name: prod.name,
      description: prod.description || '',
      imageUrl: prod.imageUrl || STUDIO_IMAGES[0].url,
      categoryId: prod.categoryId || '',
      country: prod.country || 'BR',
      language: prod.language || 'pt',
      network: prod.network || 'Hotmart',
      affiliateUrl: prod.affiliateUrl,
      price: prod.price,
      currency: prod.currency,
      commissionRate: prod.commissionRate ?? 50,
      producerEmail: prod.producerEmail || '',
      status: prod.status,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!form.name.trim() || !form.affiliateUrl.trim()) {
      setErrorMsg(isPt ? 'Nome e Link de Afiliado são obrigatórios.' : 'Name and Affiliate URL are required.');
      return;
    }
    try {
      new URL(form.affiliateUrl.trim());
    } catch {
      setErrorMsg(isPt ? 'Informe uma URL de afiliado válida (https://...).' : 'Enter a valid affiliate URL (https://...).');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await onUpdateProduct(editing.id, form);
      } else {
        await onCreateProduct(form);
      }
      setModalOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao salvar produto.';
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        setErrorMsg(parsed.error || raw);
      } catch {
        setErrorMsg(raw);
      }
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (catId?: string) =>
    categories.find((c) => c.id === catId)?.name || (isPt ? 'Sem categoria' : 'Uncategorized');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Central de Produtos' : 'Product Hub'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Cadastre produtos físicos e digitais com links de afiliado reutilizáveis em múltiplas páginas e idiomas.'
              : 'Manage physical and digital offers with centralized affiliate links reusable across multiple languages.'}
          </p>
        </div>

        <button
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isPt ? 'Cadastrar Produto' : 'Add Product'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPt ? 'Buscar produto ou rede...' : 'Search product or network...'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {(['all', 'active', 'paused', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'all'
                ? isPt
                  ? 'Todos'
                  : 'All'
                : st === 'active'
                ? isPt
                  ? 'Ativos'
                  : 'Active'
                : st === 'paused'
                ? isPt
                  ? 'Pausados'
                  : 'Paused'
                : isPt
                ? 'Arquivados'
                : 'Archived'}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-display font-semibold text-slate-900">
            {isPt ? 'Nenhum produto encontrado' : 'No products found'}
          </p>
          <p className="text-sm text-slate-500">
            {isPt
              ? 'Adicione seu primeiro produto para criar presells e landing pages com 1 clique.'
              : 'Register your first product to launch presells and landing pages in one click.'}
          </p>
          <button
            onClick={openNew}
            className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isPt ? 'Novo Produto' : 'New Product'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((prod) => {
            const linkedPages = pages.filter((pg) => pg.productId === prod.id);
            return (
              <div
                key={prod.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  {prod.imageUrl ? (
                    <SmartImage
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-10 h-10" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Package className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>{getCategoryName(prod.categoryId)}</span>
                      <span>·</span>
                      <span>{prod.network || 'Direto'}</span>
                      <span>·</span>
                      <span className="font-mono">{prod.country}</span>
                      <span>·</span>
                      <span className="uppercase font-mono">{prod.language}</span>
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900 leading-snug">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{prod.description}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-base tabular-nums text-slate-900">
                        {formatCurrency(prod.price, prod.currency)}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {isPt ? 'Comissão' : 'Comm.'}:{' '}
                        <strong className="text-emerald-700">{prod.commissionRate ?? 0}%</strong> ·{' '}
                        {linkedPages.length} {isPt ? 'páginas' : 'pages'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => onCreatePresellForProduct(prod)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>{isPt ? 'Criar Presell' : 'Create Presell'}</span>
                      </button>

                      <a
                        href={prod.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isPt ? 'Abrir link de afiliado' : 'Open affiliate link'}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => openEdit(prod)}
                        title={isPt ? 'Editar produto' : 'Edit product'}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteProduct(prod.id)}
                        title={isPt ? 'Excluir produto' : 'Delete product'}
                        className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {editing
                  ? isPt
                    ? 'Editar Produto'
                    : 'Edit Product'
                  : isPt
                  ? 'Cadastrar Novo Produto'
                  : 'Register New Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Nome do Produto *' : 'Product Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Katori Biometric Watch"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Link Principal de Afiliado *' : 'Primary Affiliate URL *'}
                  </label>
                  <input
                    type="url"
                    required
                    value={form.affiliateUrl}
                    onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                    placeholder="https://www.treejammer.com/..."
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Categoria' : 'Category'}
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">{isPt ? 'Sem categoria' : 'Uncategorized'}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Plataforma de Afiliados' : 'Affiliate Network'}
                  </label>
                  <select
                    value={form.network}
                    onChange={(e) => setForm({ ...form, network: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Hotmart">Hotmart</option>
                    <option value="ClickBank">ClickBank</option>
                    <option value="BuyGoods">BuyGoods</option>
                    <option value="Kiwify">Kiwify</option>
                    <option value="Braip">Braip</option>
                    <option value="DigiStore24">DigiStore24</option>
                    <option value="Amazon Associates">Amazon Associates</option>
                    <option value="Venda Direta">Venda Direta (Stripe / MP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'País de Destino' : 'Target Country'}
                  </label>
                  <select
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="BR">Brasil (BR)</option>
                    <option value="US">United States (US)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="PT">Portugal (PT)</option>
                    <option value="ES">España (ES)</option>
                    <option value="DE">Germany (DE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Idioma' : 'Language'}
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value as PageLanguageSetting })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="auto">{isPt ? 'Detectar automaticamente' : 'Auto-detect'}</option>
                    <option value="pt">Português (PT)</option>
                    <option value="en">English (EN)</option>
                    <option value="es">Español (ES)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Preço & Moeda' : 'Price & Currency'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currency: e.target.value as 'BRL' | 'USD' | 'EUR' | 'GBP',
                        })
                      }
                      className="w-24 px-2 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Comissão (%)' : 'Commission (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'E-mail Comercial do Produtor' : 'Producer Policy Email'}
                  </label>
                  <input
                    type="email"
                    value={form.producerEmail}
                    onChange={(e) => setForm({ ...form, producerEmail: e.target.value })}
                    placeholder="support@producer.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as 'active' | 'paused' | 'archived',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="active">{isPt ? 'Ativo' : 'Active'}</option>
                    <option value="paused">{isPt ? 'Pausado' : 'Paused'}</option>
                    <option value="archived">{isPt ? 'Arquivado' : 'Archived'}</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    {isPt ? 'Imagem do Produto (galeria local ou URL)' : 'Product Image (studio gallery or URL)'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {STUDIO_IMAGES.map((img) => (
                      <button
                        type="button"
                        key={img.url}
                        onClick={() => setForm({ ...form, imageUrl: img.url })}
                        className={`rounded-lg overflow-hidden border-2 aspect-[4/3] cursor-pointer ${
                          form.imageUrl === img.url ? 'border-blue-600' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/... ou qualquer link de imagem"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-500">
                    {isPt
                      ? 'Aceita qualquer link (URL direta, Google Drive ou Dropbox). No Drive, compartilhe como "Qualquer pessoa com o link".'
                      : 'Accepts any image URL (direct link, Google Drive, or Dropbox). In Drive, share as "Anyone with the link".'}
                  </p>
                  {form.imageUrl.trim() && (
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 h-28 flex items-center justify-center">
                      <SmartImage
                        src={form.imageUrl}
                        alt={form.name || 'Preview'}
                        className="w-full h-full object-cover"
                        fallback={
                          <span className="text-[11px] text-amber-700 px-3 text-center">
                            {isPt
                              ? 'Não foi possível carregar esta imagem. Verifique se o link está público ("Qualquer pessoa com o link" no Drive).'
                              : 'Could not load image preview. Verify the link is publicly accessible.'}
                          </span>
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isPt ? 'Descrição Comercial' : 'Description'}
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {isPt ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (isPt ? 'Salvando...' : 'Saving...') : isPt ? 'Salvar Produto' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
