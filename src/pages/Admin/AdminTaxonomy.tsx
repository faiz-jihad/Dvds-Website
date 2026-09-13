import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Plus, Tags } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';

const makeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const AdminTaxonomy: React.FC = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);
  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.getCategories });
  const genresQuery = useQuery({ queryKey: ['admin', 'genres'], queryFn: adminApi.getGenres });
  const [categoryName, setCategoryName] = useState('');
  const [genreName, setGenreName] = useState('');
  const [saving, setSaving] = useState(false);

  if (categoriesQuery.isLoading || genresQuery.isLoading || categoriesQuery.error || genresQuery.error) {
    return <AdminDataState loading={categoriesQuery.isLoading || genresQuery.isLoading} error={categoriesQuery.error || genresQuery.error} onRetry={() => { categoriesQuery.refetch(); genresQuery.refetch(); }} />;
  }

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      await adminApi.createCategory({ name: categoryName.trim(), slug: makeSlug(categoryName), description: null, image_url: null, is_active: true, sort_order: (categoriesQuery.data || []).length });
      setCategoryName('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      addToast('Category created', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Category could not be created', 'error');
    } finally { setSaving(false); }
  };

  const createGenre = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!genreName.trim()) return;
    setSaving(true);
    try {
      await adminApi.createGenre({ name: genreName.trim(), slug: makeSlug(genreName) });
      setGenreName('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] });
      addToast('Genre created', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Genre could not be created', 'error');
    } finally { setSaving(false); }
  };

  const toggleCategory = async (id: string, active: boolean) => {
    try {
      await adminApi.updateCategory(id, { is_active: active });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    } catch (error) { addToast(error instanceof Error ? error.message : 'Category could not be updated', 'error'); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-blue">Catalogue structure</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-dark">Categories & Genres</h1>
        <p className="mt-1 text-sm text-gray-500">Maintain the live navigation and product taxonomy without code changes.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="mb-5 flex items-center gap-2"><FolderTree className="h-4 w-4 text-brand-blue" /><h2 className="font-display font-bold text-dark">Categories</h2></div>
          <form onSubmit={createCategory} className="mb-5 flex items-end gap-2">
            <Input label="New category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" required />
            <Button type="submit" isLoading={saving} className="mb-0 h-11 shrink-0"><Plus className="h-4 w-4" /></Button>
          </form>
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {(categoriesQuery.data || []).map((category) => (
              <div key={category.id} className="flex items-center justify-between py-3 text-xs">
                <div><p className="font-semibold text-dark">{category.name}</p><p className="font-mono text-[10px] text-gray-400">/{category.slug}</p></div>
                <label className="flex items-center gap-2 text-gray-500"><input type="checkbox" checked={category.is_active} onChange={(event) => toggleCategory(category.id, event.target.checked)} className="accent-brand-blue" /> Active</label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="mb-5 flex items-center gap-2"><Tags className="h-4 w-4 text-brand-blue" /><h2 className="font-display font-bold text-dark">Genres</h2></div>
          <form onSubmit={createGenre} className="mb-5 flex items-end gap-2">
            <Input label="New genre" value={genreName} onChange={(event) => setGenreName(event.target.value)} placeholder="Genre name" required />
            <Button type="submit" isLoading={saving} className="h-11 shrink-0"><Plus className="h-4 w-4" /></Button>
          </form>
          <div className="flex flex-wrap gap-2 border-y border-gray-100 py-4">
            {(genresQuery.data || []).map((genre) => <span key={genre.id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">{genre.name}</span>)}
          </div>
        </section>
      </div>
    </div>
  );
};
