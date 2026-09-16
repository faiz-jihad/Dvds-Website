import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderTree,
  Tags,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Category, Genre } from '../../types';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/useUiStore';

const makeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const AdminTaxonomy: React.FC = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.getCategories(),
  });
  const genresQuery = useQuery({
    queryKey: ['admin', 'genres'],
    queryFn: () => adminApi.getGenres(),
  });

  const categories = categoriesQuery.data || [];
  const genres = genresQuery.data || [];

  // Search filters
  const [categorySearch, setCategorySearch] = useState('');
  const [genreSearch, setGenreSearch] = useState('');
  const [genreViewMode, setGenreViewMode] = useState<'pills' | 'table'>('pills');

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // New Genre form state
  const [newGenreName, setNewGenreName] = useState('');
  const [creatingGenre, setCreatingGenre] = useState(false);

  // Edit Category Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatOrder, setEditCatOrder] = useState('0');
  const [editCatActive, setEditCatActive] = useState(true);
  const [savingCat, setSavingCat] = useState(false);

  // Delete Category Confirmation
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  // Edit Genre Modal
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [editGenreName, setEditGenreName] = useState('');
  const [editGenreSlug, setEditGenreSlug] = useState('');
  const [savingGenre, setSavingGenre] = useState(false);

  // Delete Genre Confirmation
  const [deletingGenre, setDeletingGenre] = useState<Genre | null>(null);
  const [isDeletingGenre, setIsDeletingGenre] = useState(false);

  // Filtered lists
  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    );
  }, [categories, categorySearch]);

  const filteredGenres = useMemo(() => {
    const q = genreSearch.toLowerCase().trim();
    if (!q) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q));
  }, [genres, genreSearch]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] }),
      queryClient.invalidateQueries({ queryKey: ['store', 'categories'] }),
      queryClient.invalidateQueries({ queryKey: ['store', 'genres'] }),
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] }),
      queryClient.invalidateQueries({ queryKey: ['store', 'product'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
    ]);
  };

  // --- Category Actions ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    setCreatingCat(true);
    try {
      const slug = makeSlug(name);
      await adminApi.createCategory({
        name,
        slug,
        description: newCatDesc.trim() || null,
        image_url: null,
        is_active: true,
        sort_order: (categories.length + 1) * 10,
      });
      setNewCatName('');
      setNewCatDesc('');
      await refreshAll();
      addToast(`Category "${name}" created`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Category could not be created', 'error');
    } finally {
      setCreatingCat(false);
    }
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatSlug(cat.slug);
    setEditCatDesc(cat.description || '');
    setEditCatOrder(String(cat.sort_order ?? 0));
    setEditCatActive(cat.is_active);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const name = editCatName.trim();
    const slug = editCatSlug.trim() || makeSlug(name);
    if (!name || !slug) {
      addToast('Category name and slug are required', 'error');
      return;
    }

    setSavingCat(true);
    try {
      await adminApi.updateCategory(editingCategory.id, {
        name,
        slug,
        description: editCatDesc.trim() || null,
        sort_order: Number(editCatOrder) || 0,
        is_active: editCatActive,
      });
      setEditingCategory(null);
      await refreshAll();
      addToast(`Category "${name}" updated`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Category could not be updated', 'error');
    } finally {
      setSavingCat(false);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await adminApi.updateCategory(cat.id, { is_active: !cat.is_active });
      await refreshAll();
      addToast(`Category "${cat.name}" is now ${!cat.is_active ? 'active' : 'hidden'}`, 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Status could not be updated', 'error');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeletingCat(true);
    try {
      await adminApi.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      await refreshAll();
      addToast(`Category "${deletingCategory.name}" deleted`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Category could not be deleted', 'error');
    } finally {
      setIsDeletingCat(false);
    }
  };

  // --- Genre Actions ---
  const handleCreateGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGenreName.trim();
    if (!name) return;

    setCreatingGenre(true);
    try {
      const slug = makeSlug(name);
      await adminApi.createGenre({ name, slug });
      setNewGenreName('');
      await refreshAll();
      addToast(`Genre "${name}" added`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Genre could not be created', 'error');
    } finally {
      setCreatingGenre(false);
    }
  };

  const openEditGenre = (genre: Genre) => {
    setEditingGenre(genre);
    setEditGenreName(genre.name);
    setEditGenreSlug(genre.slug);
  };

  const handleSaveGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGenre) return;
    const name = editGenreName.trim();
    const slug = editGenreSlug.trim() || makeSlug(name);
    if (!name || !slug) {
      addToast('Genre name and slug are required', 'error');
      return;
    }

    setSavingGenre(true);
    try {
      await adminApi.updateGenre(editingGenre.id, { name, slug });
      setEditingGenre(null);
      await refreshAll();
      addToast(`Genre "${name}" updated`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Genre could not be updated', 'error');
    } finally {
      setSavingGenre(false);
    }
  };

  const confirmDeleteGenre = async () => {
    if (!deletingGenre) return;
    setIsDeletingGenre(true);
    try {
      await adminApi.deleteGenre(deletingGenre.id);
      setDeletingGenre(null);
      await refreshAll();
      addToast(`Genre "${deletingGenre.name}" removed`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Genre could not be deleted', 'error');
    } finally {
      setIsDeletingGenre(false);
    }
  };

  if (categoriesQuery.isLoading || genresQuery.isLoading) {
    return <AdminDataState loading error={null} onRetry={refreshAll} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-blue">Catalogue structure</p>
        <div className="mt-1 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h1 className="font-display text-3xl font-extrabold text-dark">Categories & Genres</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
              {categories.length} Categories
            </span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {genres.length} Genres
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Maintain live navigation, sorting, and product taxonomy with complete CRUD operations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ================= CATEGORIES SECTION ================= */}
        <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                <FolderTree className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-dark">Categories</h2>
                <p className="text-xs text-gray-400">Main departmental navigation</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-500">{categories.length} items</span>
          </div>

          {/* New Category Form */}
          <form onSubmit={handleCreateCategory} className="mb-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="New category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. 4K Ultra HD"
                  required
                />
              </div>
              <Button type="submit" isLoading={creatingCat} className="h-11 shrink-0 px-4">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {newCatName.trim() && (
              <p className="font-mono text-[11px] text-gray-500">
                Slug preview: <span className="font-semibold text-brand-blue">/{makeSlug(newCatName)}</span>
              </p>
            )}
          </form>

          {/* Search bar */}
          {categories.length > 3 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-brand-blue"
              />
            </div>
          )}

          {/* Categories List */}
          <div className="flex-1 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
            {filteredCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                {categorySearch ? 'No categories matching search' : 'No categories created yet'}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="group flex items-center justify-between p-3.5 transition-colors hover:bg-gray-50/80">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-dark text-sm">{category.name}</p>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                        #{category.sort_order ?? 0}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11px] text-gray-400">/{category.slug}</p>
                    {category.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{category.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryActive(category)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                        category.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title="Click to toggle visibility"
                    >
                      {category.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span>{category.is_active ? 'Active' : 'Hidden'}</span>
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-dark"
                      title="Edit category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(category)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ================= GENRES SECTION ================= */}
        <section className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Tags className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-dark">Genres</h2>
                <p className="text-xs text-gray-400">Film genres & browsing taxonomy</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGenreViewMode('pills')}
                className={`rounded p-1.5 transition-colors ${genreViewMode === 'pills' ? 'bg-gray-200 text-dark' : 'text-gray-400 hover:text-dark'}`}
                title="Pill view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setGenreViewMode('table')}
                className={`rounded p-1.5 transition-colors ${genreViewMode === 'table' ? 'bg-gray-200 text-dark' : 'text-gray-400 hover:text-dark'}`}
                title="Table view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* New Genre Form */}
          <form onSubmit={handleCreateGenre} className="mb-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="New genre name"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  placeholder="e.g. Romance, Anime, Classic Western"
                  required
                />
              </div>
              <Button type="submit" isLoading={creatingGenre} className="h-11 shrink-0 px-4">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {newGenreName.trim() && (
              <p className="font-mono text-[11px] text-gray-500">
                Slug preview: <span className="font-semibold text-indigo-600">{makeSlug(newGenreName)}</span>
              </p>
            )}
          </form>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              placeholder="Search genres..."
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-brand-blue"
            />
          </div>

          {/* Genres Content */}
          {genreViewMode === 'pills' ? (
            <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50/40 p-4">
              {filteredGenres.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  {genreSearch ? 'No genres match your search' : 'No genres created yet'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredGenres.map((genre) => (
                    <div
                      key={genre.id}
                      className="group flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1.5 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
                    >
                      <span className="text-xs font-semibold text-gray-700">{genre.name}</span>
                      <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEditGenre(genre)}
                          className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-indigo-600"
                          title={`Edit ${genre.name}`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGenre(genre)}
                          className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-red-600"
                          title={`Delete ${genre.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto rounded-lg border border-gray-100 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500">
                  <tr>
                    <th className="p-3">Genre Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredGenres.map((genre) => (
                    <tr key={genre.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-semibold text-dark">{genre.name}</td>
                      <td className="p-3 font-mono text-[11px] text-gray-400">{genre.slug}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditGenre(genre)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-dark"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingGenre(genre)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ================= EDIT CATEGORY MODAL ================= */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title={`Edit Category: ${editingCategory?.name || ''}`}
        description="Update category name, URL slug, description, and display order."
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name *"
            value={editCatName}
            onChange={(e) => {
              setEditCatName(e.target.value);
              if (!editCatSlug || editCatSlug === makeSlug(editCatName)) {
                setEditCatSlug(makeSlug(e.target.value));
              }
            }}
            required
          />
          <Input
            label="URL Slug *"
            value={editCatSlug}
            onChange={(e) => setEditCatSlug(makeSlug(e.target.value))}
            placeholder="film"
            required
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Description
            </label>
            <textarea
              value={editCatDesc}
              onChange={(e) => setEditCatDesc(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-md border border-gray-300 p-2.5 text-xs outline-none focus:border-brand-blue"
              placeholder="Brief summary of titles in this category..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sort Order"
              type="number"
              value={editCatOrder}
              onChange={(e) => setEditCatOrder(e.target.value)}
              placeholder="10"
            />
            <div className="flex items-center pt-6">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={editCatActive}
                  onChange={(e) => setEditCatActive(e.target.checked)}
                  className="h-4 w-4 accent-brand-blue"
                />
                <span>Active in storefront</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={savingCat}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DELETE CATEGORY MODAL ================= */}
      <Modal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title="Delete Category"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs">
              <p className="font-semibold">Are you sure you want to delete this category?</p>
              <p className="mt-1 text-amber-700">
                Category: <strong>{deletingCategory?.name}</strong> (/{deletingCategory?.slug})
              </p>
              <p className="mt-1 text-amber-700">
                Products currently assigned to this category will remain, but will no longer have a primary category.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeleteCategory}
              isLoading={isDeletingCat}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= EDIT GENRE MODAL ================= */}
      <Modal
        isOpen={Boolean(editingGenre)}
        onClose={() => setEditingGenre(null)}
        title={`Edit Genre: ${editingGenre?.name || ''}`}
        description="Change genre display name and filter slug."
        maxWidth="sm"
      >
        <form onSubmit={handleSaveGenre} className="space-y-4">
          <Input
            label="Genre Name *"
            value={editGenreName}
            onChange={(e) => {
              setEditGenreName(e.target.value);
              if (!editGenreSlug || editGenreSlug === makeSlug(editGenreName)) {
                setEditGenreSlug(makeSlug(e.target.value));
              }
            }}
            required
          />
          <Input
            label="Slug *"
            value={editGenreSlug}
            onChange={(e) => setEditGenreSlug(makeSlug(e.target.value))}
            placeholder="romance"
            required
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditingGenre(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={savingGenre}>
              Save Genre
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DELETE GENRE MODAL ================= */}
      <Modal
        isOpen={Boolean(deletingGenre)}
        onClose={() => setDeletingGenre(null)}
        title="Delete Genre"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="text-xs">
              <p className="font-semibold">Delete genre &ldquo;{deletingGenre?.name}&rdquo;?</p>
              <p className="mt-1 text-red-700">
                This genre will be unlinked from all titles and removed from catalog filter tags.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setDeletingGenre(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeleteGenre}
              isLoading={isDeletingGenre}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete Genre
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
