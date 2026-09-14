import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Check, X, Film, Eye, Filter, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Product, DvdFormat, AgeRating, ProductStatus } from '../../types';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { BbfcBadge } from '../../components/common/BbfcBadge';
import { ImdbBadge } from '../../components/common/ImdbBadge';
import { useUiStore } from '../../stores/useUiStore';
import { AdminDataState } from '../../components/admin/AdminDataState';

export const AdminProducts: React.FC = () => {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: () => adminApi.getProducts() });
  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => adminApi.getCategories() });
  const genresQuery = useQuery({ queryKey: ['admin', 'genres'], queryFn: () => adminApi.getGenres() });
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminApi.getStoreSettings() });
  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const genres = genresQuery.data || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const addToast = useUiStore((state) => state.addToast);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProd, setIsDeletingProd] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [format, setFormat] = useState<DvdFormat | ''>('');
  const [spineNumber, setSpineNumber] = useState('');
  const [director, setDirector] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [audioFormat, setAudioFormat] = useState('');
  const [imdbRating, setImdbRating] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [runtimeMinutes, setRuntimeMinutes] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating | ''>('');
  const [regionCode, setRegionCode] = useState('');
  const [language, setLanguage] = useState('');
  const [subtitles, setSubtitles] = useState('');
  const [condition, setCondition] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewRelease, setIsNewRelease] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormat('');
    setTitle('');
    setSku('');
    setCategoryId('');
    setSelectedGenreIds([]);
    setSpineNumber('');
    setDirector('');
    setAspectRatio('');
    setAudioFormat('');
    setImdbRating('');
    setPrice('');
    setComparePrice('');
    setStockQuantity('');
    setReleaseYear('');
    setRuntimeMinutes('');
    setAgeRating('');
    setRegionCode('');
    setLanguage('');
    setSubtitles('');
    setCondition('');
    setCoverImageUrl('');
    setDescription('');
    setStatus('');
    setIsFeatured(false);
    setIsNewRelease(false);
    setIsBestSeller(false);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setSku(prod.sku);
    setCategoryId(prod.category_id || '');
    setSelectedGenreIds((prod.genres || []).map((genre) => genre.id));
    setFormat(prod.format);
    setSpineNumber(prod.spine_number || '');
    setDirector(prod.director || '');
    setAspectRatio(prod.aspect_ratio || '');
    setAudioFormat(prod.audio_format || '');
    setImdbRating(prod.imdb_rating != null ? prod.imdb_rating.toString() : '');
    setPrice(prod.price.toString());
    setComparePrice(prod.compare_at_price ? prod.compare_at_price.toString() : '');
    setStockQuantity(prod.stock_quantity.toString());
    setReleaseYear(prod.release_year.toString());
    setRuntimeMinutes(prod.runtime_minutes.toString());
    setAgeRating(prod.age_rating);
    setRegionCode(prod.region_code);
    setLanguage(prod.language);
    setSubtitles(prod.subtitles);
    setCondition(prod.condition);
    setCoverImageUrl(prod.cover_image_url);
    setDescription(prod.description);
    setStatus(prod.status);
    setIsFeatured(prod.is_featured);
    setIsNewRelease(prod.is_new_release);
    setIsBestSeller(prod.is_best_seller);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(price);
    const parsedStock = Number(stockQuantity);
    const parsedYear = Number(releaseYear);
    const parsedRuntime = Number(runtimeMinutes);
    const parsedImdb = imdbRating.trim() ? Number(imdbRating) : null;
    if (!title.trim() || !sku.trim() || !coverImageUrl.trim() || !language.trim() || !subtitles.trim()
      || !format || !ageRating || !regionCode.trim() || !condition || !status
      || !Number.isFinite(parsedPrice) || parsedPrice < 0
      || !Number.isInteger(parsedStock) || parsedStock < 0
      || !Number.isInteger(parsedYear) || parsedYear < 1888
      || !Number.isInteger(parsedRuntime) || parsedRuntime < 1
      || (parsedImdb != null && (!Number.isFinite(parsedImdb) || parsedImdb < 0 || parsedImdb > 10))) {
      addToast('Complete all required product, price, stock, release, language, and media fields with valid values.', 'error');
      return;
    }

    const slug = title
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    setIsSaving(true);
    try {
      if (editingProduct) {
        const updated = await adminApi.updateProduct(editingProduct.id, {
        title,
        sku,
        slug,
        category_id: categoryId || null,
        format: format as DvdFormat,
        spine_number: spineNumber.trim() || undefined,
        director: director.trim() || undefined,
        aspect_ratio: aspectRatio.trim() || undefined,
        audio_format: audioFormat.trim() || undefined,
        imdb_rating: parsedImdb,
        price: parsedPrice,
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        stock_quantity: parsedStock,
        release_year: parsedYear,
        runtime_minutes: parsedRuntime,
        age_rating: ageRating as AgeRating,
        region_code: regionCode,
        language,
        subtitles,
        condition,
        cover_image_url: coverImageUrl,
        description,
        status: status as ProductStatus,
        is_featured: isFeatured,
        is_new_release: isNewRelease,
        is_best_seller: isBestSeller,
      });
        await adminApi.setProductGenres(updated.id, selectedGenreIds);
        addToast(`Updated product "${updated.title}" successfully`, 'success');
      } else {
        const created = await adminApi.createProduct({
        title,
        sku,
        slug,
        category_id: categoryId || null,
        format: format as DvdFormat,
        spine_number: spineNumber.trim() || undefined,
        director: director.trim() || undefined,
        aspect_ratio: aspectRatio.trim() || undefined,
        audio_format: audioFormat.trim() || undefined,
        imdb_rating: parsedImdb,
        price: parsedPrice,
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        stock_quantity: parsedStock,
        release_year: parsedYear,
        runtime_minutes: parsedRuntime,
        age_rating: ageRating as AgeRating,
        region_code: regionCode,
        language,
        subtitles,
        condition,
        cover_image_url: coverImageUrl,
        description,
        short_description: description.trim().slice(0, 160) || null,
        status: status as ProductStatus,
        is_featured: isFeatured,
        is_new_release: isNewRelease,
        is_best_seller: isBestSeller,
      });
        await adminApi.setProductGenres(created.id, selectedGenreIds);
        addToast(`Added new title "${created.title}" to DVD catalogue`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      setIsModalOpen(false);
    } catch (saveError) {
      addToast(saveError instanceof Error ? saveError.message : 'Product could not be saved', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmArchiveProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProd(true);
    try {
      await adminApi.archiveProduct(productToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      addToast(`Archived "${productToDelete.title}"`, 'info');
      setProductToDelete(null);
    } catch (archiveError) {
      addToast(archiveError instanceof Error ? archiveError.message : 'Product could not be archived', 'error');
    } finally {
      setIsDeletingProd(false);
    }
  };

  const confirmPermanentDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProd(true);
    try {
      await adminApi.deleteProduct(productToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      addToast(`Permanently deleted "${productToDelete.title}"`, 'success');
      setProductToDelete(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Product could not be deleted', 'error');
    } finally {
      setIsDeletingProd(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesFormat = filterFormat === 'all' || p.format === filterFormat;
    return matchesSearch && matchesFormat;
  });

  if (productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading || productsQuery.error || categoriesQuery.error || genresQuery.error) {
    return (
      <AdminDataState
        loading={productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading}
        error={productsQuery.error || categoriesQuery.error || genresQuery.error}
        onRetry={() => { productsQuery.refetch(); categoriesQuery.refetch(); genresQuery.refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            CATALOGUE MANAGEMENT
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
            Products & Media Inventory ({products.length})
          </h1>
        </div>

        <Button variant="primary" onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or SKU..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
          >
            <option value="all">All Formats</option>
            <option value="DVD">Standard DVD</option>
            <option value="Box Set">Box Set</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <tr>
                <th className="p-3.5">Cover</th>
                <th className="p-3.5">Title & SKU</th>
                <th className="p-3.5">Format</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="p-3.5">
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      className="w-10 aspect-dvd object-cover rounded-xs border border-gray-200"
                    />
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-dark line-clamp-1 max-w-xs">{p.title}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{p.sku}</span>
                      {p.spine_number && (
                        <span className="text-brand-blue font-bold">#SPINE {p.spine_number}</span>
                      )}
                      {p.director && <span>• Dir. {p.director}</span>}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono">{p.format}</td>
                  <td className="p-3.5">
                    <div className="flex flex-col gap-1.5 items-start">
                      <BbfcBadge rating={p.age_rating} size="xs" showLabel />
                      <ImdbBadge product={p} size="xs" />
                    </div>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-dark">{formatGBP(p.price)}</td>
                  <td className="p-3.5">
                    <span
                      className={`font-mono font-bold ${
                        settingsQuery.data && p.stock_quantity <= settingsQuery.data.low_stock_threshold ? 'text-amber-600' : 'text-emerald-700'
                      }`}
                    >
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-gray-500 hover:text-brand-blue hover:bg-gray-100 rounded transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      className="p-1.5 text-gray-500 hover:text-brand-red hover:bg-gray-100 rounded transition-colors"
                      title="Remove / Archive Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Film: ${editingProduct.title}` : 'Add New DVD Edition'}
        description="Fill in physical disc details, boutique spine, audio transfer, pricing, and stock."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Film Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gladiator (Special Edition)"
              required
            />
            <Input
              label="SKU Code *"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. DVD-ACT-021"
              required
            />
          </div>

          <fieldset className="rounded-md border border-gray-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-700">Genres</legend>
            {genres.length ? (
              <div className="flex flex-wrap gap-3">
                {genres.map((genre) => (
                  <label key={genre.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedGenreIds.includes(genre.id)}
                      onChange={(event) => setSelectedGenreIds((current) => event.target.checked ? [...current, genre.id] : current.filter((id) => id !== genre.id))}
                      className="accent-brand-blue"
                    />
                    {genre.name}
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Create genres in Categories & Genres first.</p>}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Director / Filmmaker"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              placeholder="e.g. Christopher Nolan, Denis Villeneuve"
            />
            <Input
              label="Collector Spine # (Optional)"
              value={spineNumber}
              onChange={(e) => setSpineNumber(e.target.value)}
              placeholder="e.g. 014 (Criterion / Boutique style)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Aspect Ratio Transfer"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              placeholder="e.g. 2.39:1 Anamorphic Widescreen"
            />
            <Input
              label="Audio Format / Master"
              value={audioFormat}
              onChange={(e) => setAudioFormat(e.target.value)}
              placeholder="e.g. Dolby Digital 5.1 Surround"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Media Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as DvdFormat)}
                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
              >
                <option value="" disabled>Select format</option>
                <option value="DVD">DVD</option>
                <option value="Box Set">Box Set</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                BBFC Age Rating
              </label>
              <select
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value as AgeRating)}
                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
              >
                <option value="" disabled>Select rating</option>
                <option value="U">U (Universal)</option>
                <option value="PG">PG (Parental Guidance)</option>
                <option value="12">12</option>
                <option value="15">15</option>
                <option value="18">18</option>
              </select>
            </div>

            <Input
              label="IMDb Rating (1 - 10)"
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={imdbRating}
              onChange={(e) => setImdbRating(e.target.value)}
              placeholder="e.g. 8.7 (hidden if blank)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Price (£ GBP) *"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9.99"
              required
            />
            <Input
              label="Original Compare Price (£)"
              type="number"
              step="0.01"
              value={comparePrice}
              onChange={(e) => setComparePrice(e.target.value)}
              placeholder="e.g. 14.99 (Optional for Sale)"
            />
            <Input
              label="Warehouse Stock Qty *"
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="30"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Language *" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Enter soundtrack language" required />
            <Input label="Subtitles *" value={subtitles} onChange={(e) => setSubtitles(e.target.value)} placeholder="Enter subtitle availability" required />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Condition *</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full h-11 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue">
                <option value="" disabled>Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Collector Edition">Collector Edition</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">Publication Status *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className="w-full h-11 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue">
              <option value="" disabled>Select publication status</option>
              <option value="draft">Draft — hidden from storefront</option>
              <option value="active">Active — visible for sale</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Release Year"
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
            />
            <Input
              label="Runtime (Minutes)"
              type="number"
              value={runtimeMinutes}
              onChange={(e) => setRuntimeMinutes(e.target.value)}
            />
            <Input
              label="Region Code"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
            />
          </div>

          <Input
            label="Cover Image URL *"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
              Description & Special Features
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Film synopsis and collector features..."
              className="w-full p-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
            />
          </div>

          {/* Flags */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isNewRelease}
                onChange={(e) => setIsNewRelease(e.target.checked)}
                className="accent-brand-blue"
              />
              <span className="font-semibold text-gray-700">New Release Badge</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="accent-brand-blue"
              />
              <span className="font-semibold text-gray-700">Best Seller Badge</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="accent-brand-blue"
              />
              <span className="font-semibold text-gray-700">Featured on Homepage</span>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete or Archive Product */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Manage Title Removal"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs">
              <p className="font-semibold">Manage removal for &ldquo;{productToDelete?.title}&rdquo;</p>
              <p className="mt-1 text-amber-700 font-mono">SKU: {productToDelete?.sku}</p>
              <p className="mt-2 text-gray-600">
                You can either <strong>Archive</strong> (hides from customer storefront while preserving sales and audit history) or <strong>Delete Permanently</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={confirmArchiveProduct}
              isLoading={isDeletingProd}
            >
              Archive Title (Recommended)
            </Button>
            <Button
              type="button"
              onClick={confirmPermanentDeleteProduct}
              isLoading={isDeletingProd}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            >
              Delete Permanently
            </Button>
            <button
              type="button"
              onClick={() => setProductToDelete(null)}
              className="mt-1 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
