import React, { useState } from 'react';
import {
  Copy,
  Edit3,
  Eye,
  FolderPlus,
  Heart,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { BUILTIN_TEMPLATES, BuiltInTemplate } from '../../lib/templates';
import { Category, LanguageCode, PageItem, Product, UserTemplate } from '../../types';

interface TemplatesViewProps {
  uiLang: LanguageCode;
  userTemplates: UserTemplate[];
  onUseBuiltinTemplate: (tpl: BuiltInTemplate) => void;
  onSaveUserTemplate: (
    input: Omit<UserTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<string>;
  onDeleteUserTemplate: (id: string) => Promise<void>;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  uiLang,
  userTemplates,
  onUseBuiltinTemplate,
  onSaveUserTemplate,
  onDeleteUserTemplate,
}) => {
  const isPt = uiLang === 'pt';
  const [filter, setFilter] = useState<'all' | 'favorites' | 'mine'>('all');
  const [previewTpl, setPreviewTpl] = useState<BuiltInTemplate | null>(null);

  const handleToggleFav = async (tpl: BuiltInTemplate) => {
    const existing = userTemplates.find((u) => u.presellType === tpl.presellType);
    if (existing) {
      await onSaveUserTemplate(
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
      await onSaveUserTemplate({
        name: isPt ? tpl.namePt : tpl.nameEn,
        presellType: tpl.presellType,
        description: isPt ? tpl.descriptionPt : tpl.descriptionEn,
        isFavorite: true,
        blocks: isPt ? tpl.blocksPt : tpl.blocksEn,
        theme: tpl.theme,
      });
    }
  };

  const handleDuplicate = async (tpl: BuiltInTemplate) => {
    await onSaveUserTemplate({
      name: `${isPt ? tpl.namePt : tpl.nameEn} (Personalizado)`,
      presellType: tpl.presellType,
      description: isPt ? tpl.descriptionPt : tpl.descriptionEn,
      isFavorite: false,
      blocks: isPt ? tpl.blocksPt : tpl.blocksEn,
      theme: tpl.theme,
    });
    setFilter('mine');
  };

  const visibleBuiltin = BUILTIN_TEMPLATES.filter((tpl) => {
    if (filter === 'mine') return false;
    if (filter === 'favorites') {
      return userTemplates.some((u) => u.presellType === tpl.presellType && u.isFavorite);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            {isPt ? 'Biblioteca de Templates' : 'Template Library'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isPt
              ? 'Modelos visuais inspirados no Super Presell Ultimate e landing pages comerciais prontas para usar.'
              : 'Visual presell and commercial landing page templates ready to duplicate, favorite, and launch.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {([
            { id: 'all', label: isPt ? 'Todos (9)' : 'All (9)' },
            { id: 'favorites', label: isPt ? 'Favoritos' : 'Favorites' },
            { id: 'mine', label: `${isPt ? 'Meus Modelos' : 'My Templates'} (${userTemplates.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                filter === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filter !== 'mine' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleBuiltin.map((tpl) => {
            const isFav = userTemplates.some(
              (u) => u.presellType === tpl.presellType && u.isFavorite
            );
            return (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={tpl.previewImage}
                    alt={isPt ? tpl.namePt : tpl.nameEn}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">{tpl.categoryLabel}</p>
                    <h3 className="font-display font-bold text-base text-slate-900 mt-0.5">
                      {isPt ? tpl.namePt : tpl.nameEn}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5">
                      {isPt ? tpl.descriptionPt : tpl.descriptionEn}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onUseBuiltinTemplate(tpl)}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isPt ? 'Usar Modelo' : 'Use Template'}
                    </button>
                    <button
                      onClick={() => setPreviewTpl(tpl)}
                      title={isPt ? 'Pré-visualizar' : 'Preview'}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(tpl)}
                      title={isPt ? 'Duplicar para Meus Modelos' : 'Duplicate'}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleFav(tpl)}
                      title={isPt ? 'Favoritar' : 'Favorite'}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(filter === 'mine' || (filter === 'all' && userTemplates.length > 0)) && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-slate-900">
            {isPt ? 'Meus Modelos Salvos & Duplicados' : 'My Saved Templates'}
          </h3>
          {userTemplates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              {isPt
                ? 'Duplique ou favorite qualquer modelo acima para salvá-lo aqui.'
                : 'Duplicate or favorite any template above to save it to your personal library.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userTemplates.map((ut) => (
                <div
                  key={ut.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <p className="text-xs font-mono text-slate-400">{ut.presellType}</p>
                    <h4 className="font-display font-bold text-sm text-slate-900 mt-1">{ut.name}</h4>
                    {ut.description && (
                      <p className="text-xs text-slate-500 mt-1">{ut.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const matched =
                          BUILTIN_TEMPLATES.find((b) => b.presellType === ut.presellType) ||
                          BUILTIN_TEMPLATES[0];
                        onUseBuiltinTemplate(matched);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isPt ? 'Reutilizar' : 'Reuse'}
                    </button>
                    <button
                      onClick={() => onDeleteUserTemplate(ut.id)}
                      className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {previewTpl && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {isPt ? previewTpl.namePt : previewTpl.nameEn}
              </h3>
              <button
                onClick={() => setPreviewTpl(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewTpl.previewImage}
              alt={previewTpl.namePt}
              className="w-full max-h-72 object-cover rounded-lg border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                {isPt ? 'Blocos incluídos:' : 'Included blocks:'}
              </p>
              <p className="text-xs font-mono text-slate-500">
                {(isPt ? previewTpl.blocksPt : previewTpl.blocksEn).map((b) => b.type).join(' · ')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const t = previewTpl;
                  setPreviewTpl(null);
                  onUseBuiltinTemplate(t);
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                {isPt ? 'Criar Página com este Modelo' : 'Create Page from Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CategoriesViewProps {
  uiLang: LanguageCode;
  categories: Category[];
  pages: PageItem[];
  products: Product[];
  onCreateCategory: (input: { name: string; description?: string; color?: string }) => Promise<string>;
  onUpdateCategory: (id: string, input: { name: string; description?: string; color?: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  uiLang,
  categories,
  pages,
  products,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const isPt = uiLang === 'pt';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await onUpdateCategory(editing.id, { name, description, color });
        setEditing(null);
      } else {
        await onCreateCategory({ name, description, color });
      }
      setName('');
      setDescription('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          {isPt ? 'Gerenciador de Categorias & Pastas' : 'Categories & Folders Manager'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isPt
            ? 'Organize suas presells, landing pages e produtos por nicho ou país de campanha.'
            : 'Organize presells, landing pages, and products into structured folders.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>
              {editing
                ? isPt
                  ? 'Editar Categoria'
                  : 'Edit Category'
                : isPt
                ? 'Nova Categoria'
                : 'New Category'}
            </span>
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt ? 'Nome da Categoria *' : 'Category Name *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Emagrecimento EUA"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt ? 'Descrição' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isPt ? 'Cor de Identificação' : 'Color Tag'}
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-full rounded border border-slate-300 cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editing ? (isPt ? 'Atualizar' : 'Update') : isPt ? 'Criar Categoria' : 'Create'}</span>
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName('');
                  setDescription('');
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 cursor-pointer"
              >
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
            )}
          </div>
        </form>

        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {isPt ? 'Nenhuma categoria cadastrada.' : 'No categories yet.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-5 font-medium">{isPt ? 'Categoria' : 'Category'}</th>
                  <th className="py-3 px-4 font-medium">Slug</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Páginas' : 'Pages'}</th>
                  <th className="py-3 px-4 font-medium text-right">{isPt ? 'Produtos' : 'Products'}</th>
                  <th className="py-3 px-5 font-medium text-right">{isPt ? 'Ações' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {categories.map((cat) => {
                  const pCount = pages.filter((p) => p.categoryId === cat.id).length;
                  const prodCount = products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: cat.color || '#2563EB' }}
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{cat.name}</p>
                            {cat.description && (
                              <p className="text-xs text-slate-500">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{cat.slug}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {pCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {prodCount}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditing(cat);
                              setName(cat.name);
                              setDescription(cat.description || '');
                              setColor(cat.color || '#2563EB');
                            }}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCategory(cat.id)}
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
          )}
        </div>
      </div>
    </div>
  );
};
