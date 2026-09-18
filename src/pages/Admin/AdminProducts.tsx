import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, Check, X, Film, AlertTriangle,
  Upload, Loader2, Star, Layers, DollarSign, BookOpen,
  Link2, Sparkles, TrendingUp, CheckCircle2, FileEdit, Archive,
  Wand2, ArrowLeft, ArrowRight, Save, Eye, ChevronDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { uploadAdminImage } from '../../lib/adminMedia';
import { Product, DvdFormat, AgeRating, ProductStatus } from '../../types';
import { formatGBP } from '../../lib/formatters';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { BbfcBadge } from '../../components/common/BbfcBadge';
import { ImdbBadge } from '../../components/common/ImdbBadge';
import { useUiStore } from '../../stores/useUiStore';
import { AdminDataState } from '../../components/admin/AdminDataState';

// ─── Form Tab definition ──────────────────────────────────────────────────────
type FormTab = 'essentials' | 'media' | 'pricing' | 'publishing';

const FORM_TABS: { id: FormTab; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'essentials', label: 'Essentials', icon: Film, desc: 'Title, cover, genres' },
  { id: 'media',     label: 'Media Specs', icon: Layers, desc: 'Format, specs, ratings' },
  { id: 'pricing',   label: 'Pricing & Stock', icon: DollarSign, desc: 'Price, stock, discounts' },
  { id: 'publishing',label: 'Publishing',  icon: BookOpen, desc: 'Status, badges, preview' },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ label: string; required?: boolean; hint?: string }> = ({ label, required, hint }) => (
  <div className="mb-1.5 flex items-baseline justify-between">
    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {hint && <span className="text-[10px] text-gray-400 font-normal">{hint}</span>}
  </div>
);

const StyledSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ value, onChange, children, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50 disabled:text-gray-400"
  >
    {children}
  </select>
);

const QuickChips: React.FC<{
  options: string[];
  current: string;
  onSelect: (val: string) => void;
}> = ({ options, current, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 mt-1.5">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onSelect(opt)}
        className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
          current === opt
            ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const GenrePills: React.FC<{
  genres: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}> = ({ genres, selected, onToggle }) => (
  <div className="flex flex-wrap gap-1.5">
    {genres.map((g) => {
      const active = selected.includes(g.id);
      return (
        <button
          key={g.id}
          type="button"
          onClick={() => onToggle(g.id)}
          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer select-none flex items-center gap-1 ${
            active
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {active && <Check className="w-3 h-3 shrink-0" />}
          <span>{g.name}</span>
        </button>
      );
    })}
  </div>
);

const ToggleFlag: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
  icon: React.ReactNode;
}> = ({ checked, onChange, label, desc, icon }) => (
  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition group">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg transition-colors ${checked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold text-gray-800">{label}</span>
        {desc && <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </div>
    <div
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </div>
  </label>
);

const TabBar: React.FC<{
  tabs: typeof FORM_TABS;
  active: FormTab;
  completed: Record<FormTab, boolean>;
  onSelect: (t: FormTab) => void;
}> = ({ tabs, active, completed, onSelect }) => (
  <div className="flex border-b border-gray-200 bg-gray-50/70 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-5 overflow-x-auto">
    {tabs.map((tab, idx) => {
      const isActive = tab.id === active;
      const isDone = completed[tab.id];
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
            isActive
              ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
          }`}
        >
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : isDone
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {isDone && !isActive ? <Check className="w-3 h-3" /> : idx + 1}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 opacity-70 hidden sm:inline" />
            <span>{tab.label}</span>
          </span>
        </button>
      );
    })}
  </div>
);

// ─── Main AdminProducts Component ─────────────────────────────────────────────
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const addToast = useUiStore((state) => state.addToast);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('essentials');

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
  const [format, setFormat] = useState<DvdFormat | ''>('DVD');
  const [spineNumber, setSpineNumber] = useState('');
  const [director, setDirector] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9 Anamorphic Widescreen');
  const [audioFormat, setAudioFormat] = useState('Dolby Digital 5.1');
  const [imdbRating, setImdbRating] = useState('');
  const [price, setPrice] = useState('9.99');
  const [comparePrice, setComparePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('20');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear().toString());
  const [runtimeMinutes, setRuntimeMinutes] = useState('110');
  const [ageRating, setAgeRating] = useState<AgeRating | ''>('15');
  const [regionCode, setRegionCode] = useState('2 (UK/Europe)');
  const [language, setLanguage] = useState('English');
  const [subtitles, setSubtitles] = useState('English');
  const [condition, setCondition] = useState('Brand New (Sealed)');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewRelease, setIsNewRelease] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);

  const handleUpdateStatus = async (product: Product, newStatus: ProductStatus) => {
    if (product.status === newStatus) {
      setStatusMenuOpenId(null);
      return;
    }
    if (newStatus === 'active' && (!product.price || Number(product.price) <= 0)) {
      addToast(`Cannot set "${product.title}" to Active: price must be greater than £0.00. Please edit and specify a price first.`, 'error');
      setStatusMenuOpenId(null);
      return;
    }
    setUpdatingStatusId(product.id);
    setStatusMenuOpenId(null);
    try {
      await adminApi.updateProduct(product.id, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      addToast(`"${product.title}" is now ${newStatus}.`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleToggleProductStatus = (product: Product) => {
    const nextStatus: ProductStatus = product.status === 'active' ? 'draft' : 'active';
    handleUpdateStatus(product, nextStatus);
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WEBP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size exceeds 5MB limit', 'error');
      return;
    }
    setIsUploadingImage(true);
    try {
      const url = await uploadAdminImage(file);
      setCoverImageUrl(url);
      addToast('Cover image uploaded successfully', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to upload image', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const autoGenerateSku = () => {
    const prefix = format === 'Blu-ray' ? 'BR' : format === '4K UHD' ? 'UHD' : format === 'Box Set' ? 'BOX' : 'DVD';
    const clean = (title.trim() || 'FILM')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    const newSku = `${prefix}-${clean}-${rand}`;
    setSku(newSku);
    addToast(`Generated SKU: ${newSku}`, 'info');
  };

  const resetForm = () => {
    setActiveTab('essentials');
    setTitle('');
    setSku('');
    setCategoryId('');
    setSelectedGenreIds([]);
    setFormat('DVD');
    setSpineNumber('');
    setDirector('');
    setAspectRatio('16:9 Anamorphic Widescreen');
    setAudioFormat('Dolby Digital 5.1');
    setImdbRating('');
    setPrice('9.99');
    setComparePrice('');
    setStockQuantity('20');
    setReleaseYear(new Date().getFullYear().toString());
    setRuntimeMinutes('110');
    setAgeRating('15');
    setRegionCode('2 (UK/Europe)');
    setLanguage('English');
    setSubtitles('English');
    setCondition('Brand New (Sealed)');
    setCoverImageUrl('');
    setDescription('');
    setStatus('active');
    setIsFeatured(false);
    setIsNewRelease(true);
    setIsBestSeller(false);
    setUploadMode('upload');
  };

  const openCreateModal = () => {
    resetForm();
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setActiveTab('essentials');
    setTitle(prod.title || '');
    setSku(prod.sku || '');
    setCategoryId(prod.category_id || '');
    setSelectedGenreIds((prod.genres || []).map((g) => g.id));
    setFormat(prod.format || 'DVD');
    setSpineNumber(prod.spine_number || '');
    setDirector(prod.director || '');
    setAspectRatio(prod.aspect_ratio || '16:9 Anamorphic Widescreen');
    setAudioFormat(prod.audio_format || 'Dolby Digital 5.1');
    setImdbRating(prod.imdb_rating != null ? prod.imdb_rating.toString() : '');
    setPrice(prod.price != null ? prod.price.toString() : '9.99');
    setComparePrice(prod.compare_at_price != null ? prod.compare_at_price.toString() : '');
    setStockQuantity(prod.stock_quantity != null ? prod.stock_quantity.toString() : '20');
    setReleaseYear(prod.release_year ? prod.release_year.toString() : new Date().getFullYear().toString());
    setRuntimeMinutes(prod.runtime_minutes ? prod.runtime_minutes.toString() : '110');
    setAgeRating(prod.age_rating || '15');
    setRegionCode(prod.region_code || '2 (UK/Europe)');
    setLanguage(prod.language || 'English');
    setSubtitles(prod.subtitles || 'English');
    setCondition(prod.condition || 'Brand New (Sealed)');
    setCoverImageUrl(prod.cover_image_url || '');
    setDescription(prod.description || '');
    setStatus(prod.status || 'active');
    setIsFeatured(Boolean(prod.is_featured));
    setIsNewRelease(Boolean(prod.is_new_release));
    setIsBestSeller(Boolean(prod.is_best_seller));
    setUploadMode('upload');
    setIsModalOpen(true);
  };

  // Completion check per tab
  const tabCompleted: Record<FormTab, boolean> = {
    essentials: Boolean(title.trim() && sku.trim() && coverImageUrl.trim()),
    media: Boolean(format && ageRating && language.trim() && subtitles.trim() && releaseYear && runtimeMinutes),
    pricing: Boolean(price && Number(price) > 0 && (editingProduct || (stockQuantity && Number(stockQuantity) >= 0))),
    publishing: Boolean(status),
  };

  // Step-by-step navigation validation
  const handleNextStep = () => {
    if (activeTab === 'essentials') {
      if (!title.trim()) {
        addToast('Please enter the film title.', 'error');
        return;
      }
      if (!sku.trim()) {
        autoGenerateSku();
      }
      if (!coverImageUrl.trim()) {
        addToast('Please upload a cover image or enter an image URL.', 'error');
        return;
      }
      setActiveTab('media');
    } else if (activeTab === 'media') {
      if (!format) setFormat('DVD');
      if (!ageRating) setAgeRating('15');
      if (!regionCode.trim()) setRegionCode('2 (UK/Europe)');
      if (!language.trim()) setLanguage('English');
      if (!subtitles.trim()) setSubtitles('English');
      if (!releaseYear.trim() || Number(releaseYear) < 1888) {
        setReleaseYear(new Date().getFullYear().toString());
      }
      if (!runtimeMinutes.trim() || Number(runtimeMinutes) < 1) {
        setRuntimeMinutes('110');
      }
      setActiveTab('pricing');
    } else if (activeTab === 'pricing') {
      const cleanPriceStr = price.toString().replace(/[^0-9.]/g, '').trim();
      const parsedPrice = cleanPriceStr ? Number(cleanPriceStr) : 0;
      if (status === 'active' && parsedPrice <= 0) {
        addToast('Active films require a price greater than £0.00. Please enter a valid sale price.', 'error');
        return;
      }
      const parsedCompareNum = comparePrice.trim() ? Number(comparePrice.replace(/[^0-9.]/g, '')) : null;
      if (parsedCompareNum && parsedCompareNum > 0 && parsedPrice > 0 && parsedCompareNum <= parsedPrice) {
        addToast('Compare-at price must be greater than sale price, or leave it blank.', 'error');
        return;
      }
      if (!editingProduct && (!stockQuantity.trim() || Number(stockQuantity) < 0)) {
        setStockQuantity('20');
      }
      setActiveTab('publishing');
    }
  };

  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Tab Essentials Validation
    if (!title.trim()) {
      setActiveTab('essentials');
      addToast('Please enter the film title in Essentials.', 'error');
      return;
    }
    if (!sku.trim()) {
      setActiveTab('essentials');
      addToast('Please enter or auto-generate a SKU code in Essentials.', 'error');
      return;
    }
    if (!coverImageUrl.trim()) {
      setActiveTab('essentials');
      addToast('Please upload a cover image or provide an image URL in Essentials.', 'error');
      return;
    }

    // 2. Tab Media Specs Validation
    if (!format) {
      setActiveTab('media');
      addToast('Please select the media format in Media Specs.', 'error');
      return;
    }
    if (!ageRating) {
      setActiveTab('media');
      addToast('Please select the BBFC age rating in Media Specs.', 'error');
      return;
    }
    const parsedYear = Number(releaseYear);
    if (!releaseYear.trim() || !Number.isInteger(parsedYear) || parsedYear < 1888) {
      setActiveTab('media');
      addToast('Please enter a valid release year (e.g. 2023) in Media Specs.', 'error');
      return;
    }
    const parsedRuntime = Number(runtimeMinutes);
    if (!runtimeMinutes.trim() || !Number.isInteger(parsedRuntime) || parsedRuntime < 1) {
      setActiveTab('media');
      addToast('Please enter runtime in minutes in Media Specs.', 'error');
      return;
    }

    // 3. Tab Pricing Validation
    const cleanPriceStr = price.toString().replace(/[^0-9.]/g, '').trim();
    const parsedPrice = cleanPriceStr ? Number(cleanPriceStr) : 0;
    if (status === 'active') {
      if (!cleanPriceStr || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setActiveTab('pricing');
        addToast('Active films require a price greater than £0.00. Please enter a valid sale price in Pricing or select Draft status.', 'error');
        return;
      }
    } else {
      if (cleanPriceStr && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        setActiveTab('pricing');
        addToast('Please enter a valid sale price in Pricing.', 'error');
        return;
      }
    }
    const parsedComparePrice = comparePrice.trim() ? Number(comparePrice.replace(/[^0-9.]/g, '')) : null;
    if (parsedComparePrice !== null && (!Number.isFinite(parsedComparePrice) || parsedComparePrice <= parsedPrice)) {
      setActiveTab('pricing');
      addToast('Compare-at price must be greater than sale price.', 'error');
      return;
    }
    const parsedStock = Number(stockQuantity);
    if (!editingProduct && (!stockQuantity.trim() || !Number.isInteger(parsedStock) || parsedStock < 0)) {
      setActiveTab('pricing');
      addToast('Please enter a valid initial stock quantity in Pricing.', 'error');
      return;
    }

    // 4. Tab Publishing Validation
    if (!status) {
      setActiveTab('publishing');
      addToast('Please select a publication status in Publishing.', 'error');
      return;
    }

    const parsedImdb = imdbRating.trim() ? Number(imdbRating) : null;
    if (parsedImdb !== null && (!Number.isFinite(parsedImdb) || parsedImdb < 0 || parsedImdb > 10)) {
      setActiveTab('media');
      addToast('IMDb rating must be between 1.0 and 10.0.', 'error');
      return;
    }

    const slug = title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    if (isUploadingImage || isSaving) return;
    setIsSaving(true);

    try {
      const saved = await adminApi.saveProductWithGenres(editingProduct?.id || null, {
        title: title.trim(),
        sku: sku.trim(),
        slug,
        category_id: categoryId || null,
        format: format as DvdFormat,
        spine_number: spineNumber.trim() || null,
        director: director.trim() || null,
        aspect_ratio: aspectRatio.trim() || null,
        audio_format: audioFormat.trim() || null,
        imdb_rating: parsedImdb,
        price: parsedPrice,
        compare_at_price: parsedComparePrice,
        ...(!editingProduct ? { stock_quantity: parsedStock } : {}),
        release_year: parsedYear,
        runtime_minutes: parsedRuntime,
        age_rating: ageRating as AgeRating,
        region_code: regionCode || 'Region 2',
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
      }, selectedGenreIds);

      addToast(`${editingProduct ? 'Updated' : 'Added'} "${saved.title}" successfully`, 'success');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      setIsModalOpen(false);
    } catch (saveError) {
      addToast(saveError instanceof Error ? saveError.message : 'Product could not be saved', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmArchiveProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProd(true);
    try {
      await adminApi.archiveProduct(productToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      addToast(`Archived "${productToDelete.title}"`, 'info');
      setProductToDelete(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Product could not be archived', 'error');
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
      await queryClient.invalidateQueries({ queryKey: ['store'] });
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
    return (p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      && (filterFormat === 'all' || p.format === filterFormat);
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  if (productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading || productsQuery.error || categoriesQuery.error || genresQuery.error) {
    return (
      <AdminDataState
        loading={productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading}
        error={productsQuery.error || categoriesQuery.error || genresQuery.error}
        onRetry={() => {
          productsQuery.refetch();
          categoriesQuery.refetch();
          genresQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">CATALOGUE MANAGEMENT</span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
            Products &amp; Media Inventory ({products.length})
          </h1>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add New Film</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title or SKU..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
          />
        </div>
        <select
          value={filterFormat}
          onChange={(e) => {
            setFilterFormat(e.target.value);
            setCurrentPage(1);
          }}
          className="h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-brand-blue"
        >
          <option value="all">All Formats</option>
          <option value="DVD">DVD</option>
          <option value="Box Set">Box Set</option>
          <option value="Blu-ray">Blu-ray</option>
          <option value="4K UHD">4K UHD</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
              <tr>
                <th className="p-3.5">Cover</th>
                <th className="p-3.5">Title &amp; SKU</th>
                <th className="p-3.5">Format</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="p-3.5">
                    <img src={p.cover_image_url} alt={p.title} className="w-10 aspect-dvd object-cover rounded-xs border border-gray-200" />
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-dark line-clamp-1 max-w-xs">{p.title}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{p.sku}</span>
                      {p.spine_number && <span className="text-brand-blue font-bold">#SPINE {p.spine_number}</span>}
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
                    <span className={`font-mono font-bold ${settingsQuery.data && p.stock_quantity <= settingsQuery.data.low_stock_threshold ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => handleToggleProductStatus(p)}
                        disabled={updatingStatusId === p.id}
                        title={
                          p.status === 'active'
                            ? 'Click to set as Draft (hide from storefront)'
                            : p.status === 'draft'
                            ? 'Click to set as Active (show in storefront)'
                            : 'Click to restore as Active'
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-l-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-y border-l ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : p.status === 'draft'
                            ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {updatingStatusId === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                        ) : (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'active'
                                ? 'bg-emerald-600'
                                : p.status === 'draft'
                                ? 'bg-gray-400'
                                : 'bg-amber-500'
                            }`}
                          />
                        )}
                        <span>{p.status}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusMenuOpenId(statusMenuOpenId === p.id ? null : p.id)}
                        disabled={updatingStatusId === p.id}
                        title="Change status"
                        className={`px-1.5 py-1 rounded-r-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : p.status === 'draft'
                            ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {statusMenuOpenId === p.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setStatusMenuOpenId(null)}
                          />
                          <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 text-xs">
                            {(['active', 'draft', 'archived'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleUpdateStatus(p, st)}
                                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-[11px] font-medium hover:bg-gray-50 cursor-pointer capitalize ${
                                  p.status === st ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'
                                }`}
                              >
                                <span>{st}</span>
                                {p.status === st && <Check className="w-3 h-3 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button onClick={() => openEditModal(p)} className="p-1.5 text-gray-500 hover:text-brand-blue hover:bg-gray-100 rounded transition-colors" title="Edit Product">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setProductToDelete(p)} className="p-1.5 text-gray-500 hover:text-brand-red hover:bg-gray-100 rounded transition-colors" title="Remove / Archive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 px-4">
            <Film className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs font-semibold text-gray-700">No films found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {searchQuery || filterFormat !== 'all'
                ? 'Try adjusting your search query or format filter.'
                : 'Get started by adding your first title to the catalogue.'}
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-600">
            {/* Left: Summary and Page Size */}
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-gray-500">
                Showing <strong className="font-bold text-dark">{startIndex + 1}</strong> to{' '}
                <strong className="font-bold text-dark">{endIndex}</strong> of{' '}
                <strong className="font-bold text-dark">{totalItems}</strong> titles
              </span>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-gray-200 rounded text-[11px] font-semibold text-dark focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('ellipsis');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ell-${idx}`} className="px-1 text-gray-400 font-mono">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`min-w-[28px] h-7 px-2 rounded text-xs font-bold transition cursor-pointer ${
                          safeCurrentPage === item
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Add / Edit Product Modal — Tabbed & Professional ═══════════════ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Title: ${editingProduct.title}` : 'Add New Title'}
        description={editingProduct ? 'Update catalogue entry, technical details, pricing, and merchandising.' : 'Quick 4-step wizard to register a new film in your inventory.'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct}>
          {/* Tab Navigation */}
          <TabBar
            tabs={FORM_TABS}
            active={activeTab}
            completed={tabCompleted}
            onSelect={setActiveTab}
          />

          {/* ── TAB 1: ESSENTIALS ─────────────────────────────── */}
          {activeTab === 'essentials' && (
            <div className="space-y-5">
              {/* Title & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                <div>
                  <FieldLabel label="Film Title" required hint="Full official title" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Dark Knight (Special Edition)"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    required
                  />
                </div>
                <div className="sm:w-44">
                  <div className="flex items-center justify-between">
                    <FieldLabel label="SKU Code" required />
                    <button
                      type="button"
                      onClick={autoGenerateSku}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      title="Auto-generate SKU from Title and Format"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="DVD-DKNI-104"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs font-mono text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    required
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel label="Cover Artwork" required hint="Standard DVD / Blu-ray ratio" />
                  <div className="flex rounded-lg bg-gray-100 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUploadMode('upload')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        uploadMode === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-dark'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                        uploadMode === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-dark'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Image URL</span>
                    </button>
                  </div>
                </div>

                {uploadMode === 'upload' ? (
                  <label className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition group">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2 text-blue-600 py-2">
                        <Loader2 className="h-7 w-7 animate-spin" />
                        <span className="text-xs font-medium">Uploading image...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-gray-700">Click or drag &amp; drop artwork</p>
                        <p className="text-[10px] text-gray-400">PNG, JPG or WEBP · Max 5MB</p>
                      </div>
                    )}
                  </label>
                ) : (
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.example.com/covers/film.jpg"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                )}

                {/* Image Preview */}
                {coverImageUrl && (
                  <div className="flex items-center gap-3 mt-2.5 p-2.5 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <img src={coverImageUrl} alt="Preview" className="h-14 w-10 object-cover rounded border border-gray-200 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-emerald-700">Artwork ready</span>
                      <span className="block font-mono text-[10px] text-gray-400 truncate">{coverImageUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Genres */}
              <div>
                <FieldLabel label="Genres" hint="Click to select multiple" />
                {genres.length ? (
                  <GenrePills
                    genres={genres}
                    selected={selectedGenreIds}
                    onToggle={(id) =>
                      setSelectedGenreIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
                    }
                  />
                ) : (
                  <p className="text-xs text-gray-400">No genres found in system.</p>
                )}
              </div>

              {/* Director & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Director" hint="Optional" />
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="e.g. Christopher Nolan"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <FieldLabel label="Category" hint="Primary catalogue shelf" />
                  <StyledSelect value={categoryId} onChange={setCategoryId}>
                    <option value="">No specific category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </StyledSelect>
                </div>
              </div>

              {/* Description */}
              <div>
                <FieldLabel label="Synopsis & Special Features" hint="Displayed on the film detail page" />
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official synopsis, disc bonus materials, audio commentary details..."
                  className="w-full p-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>
            </div>
          )}

          {/* ── TAB 2: MEDIA INFO ───────────────────────────────── */}
          {activeTab === 'media' && (
            <div className="space-y-5">
              {/* Format, BBFC Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Media Format" required />
                  <StyledSelect value={format} onChange={(v) => setFormat(v as DvdFormat)}>
                    <option value="DVD">DVD</option>
                    <option value="Box Set">Box Set</option>
                    <option value="Blu-ray">Blu-ray</option>
                    <option value="4K UHD">4K UHD</option>
                  </StyledSelect>
                </div>
                <div>
                  <FieldLabel label="BBFC Age Rating" required />
                  <StyledSelect value={ageRating} onChange={(v) => setAgeRating(v as AgeRating)}>
                    <option value="U">U — Universal (All Ages)</option>
                    <option value="PG">PG — Parental Guidance</option>
                    <option value="12">12 — Suitable for 12+</option>
                    <option value="15">15 — Suitable for 15+</option>
                    <option value="18">18 — Adults Only</option>
                  </StyledSelect>
                </div>
              </div>

              {/* Release Year, Runtime, IMDb */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel label="Release Year" required hint="Film release year" />
                  <input
                    type="number"
                    min="1888"
                    max={new Date().getFullYear() + 2}
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value)}
                    placeholder={new Date().getFullYear().toString()}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <FieldLabel label="Runtime (minutes)" required />
                  <input
                    type="number"
                    min="1"
                    value={runtimeMinutes}
                    onChange={(e) => setRuntimeMinutes(e.target.value)}
                    placeholder="120"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <QuickChips
                    options={['90', '105', '120', '145']}
                    current={runtimeMinutes}
                    onSelect={setRuntimeMinutes}
                  />
                </div>
                <div>
                  <FieldLabel label="IMDb Rating" hint="1.0 – 10.0 (optional)" />
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={imdbRating}
                    onChange={(e) => setImdbRating(e.target.value)}
                    placeholder="8.5"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Aspect Ratio" hint="Video transfer ratio" />
                  <input
                    type="text"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    placeholder="16:9 Anamorphic Widescreen"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <QuickChips
                    options={['16:9 Anamorphic Widescreen', '2.39:1 Anamorphic Widescreen', '4:3 Full Frame']}
                    current={aspectRatio}
                    onSelect={setAspectRatio}
                  />
                </div>
                <div>
                  <FieldLabel label="Audio Format" hint="Soundtrack specification" />
                  <input
                    type="text"
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    placeholder="Dolby Digital 5.1"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <QuickChips
                    options={['Dolby Digital 5.1', 'Stereo 2.0', 'DTS-HD Master Audio 5.1', 'Dolby Atmos']}
                    current={audioFormat}
                    onSelect={setAudioFormat}
                  />
                </div>
              </div>

              {/* Language, Subtitles, Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel label="Audio Language" required />
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="English"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    required
                  />
                  <QuickChips
                    options={['English', 'English 5.1', 'Japanese', 'French']}
                    current={language}
                    onSelect={setLanguage}
                  />
                </div>
                <div>
                  <FieldLabel label="Subtitles" required />
                  <input
                    type="text"
                    value={subtitles}
                    onChange={(e) => setSubtitles(e.target.value)}
                    placeholder="English"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    required
                  />
                  <QuickChips
                    options={['English', 'English (SDH)', 'English, French', 'None']}
                    current={subtitles}
                    onSelect={setSubtitles}
                  />
                </div>
                <div>
                  <FieldLabel label="Disc Condition" required />
                  <StyledSelect value={condition} onChange={setCondition}>
                    <option value="Brand New (Sealed)">Brand New (Sealed)</option>
                    <option value="Like New">Like New</option>
                    <option value="Collector Edition">Collector Edition</option>
                  </StyledSelect>
                </div>
              </div>

              {/* Spine Number */}
              <div className="sm:w-1/2">
                <FieldLabel label="Collector Spine Number" hint="Optional boutique index (e.g. 024)" />
                <input
                  type="text"
                  value={spineNumber}
                  onChange={(e) => setSpineNumber(e.target.value)}
                  placeholder="e.g. 024"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs font-mono text-dark focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>
          )}

          {/* ── TAB 3: PRICING ─────────────────────────────────── */}
          {activeTab === 'pricing' && (
            <div className="space-y-5">
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <FieldLabel label="Sale Price (GBP)" required hint="Price charged at checkout" />
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-blue-600 font-bold text-sm">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="9.99"
                      className="w-full h-10 pl-7 pr-3 border border-blue-200 rounded-lg text-sm font-bold text-blue-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                      required
                    />
                  </div>
                  <QuickChips
                    options={['7.99', '9.99', '14.99', '19.99', '24.99']}
                    current={price}
                    onSelect={setPrice}
                  />
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <FieldLabel label="Compare-at Price (GBP)" hint="Original RRP for strikethrough" />
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                      placeholder="14.99"
                      className="w-full h-10 pl-7 pr-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  {comparePrice && price && Number(comparePrice) > Number(price) && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                      {Math.round(((Number(comparePrice) - Number(price)) / Number(comparePrice)) * 100)}% discount badge will show
                    </p>
                  )}
                </div>

                <div className={`p-4 border rounded-xl ${editingProduct ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-emerald-50/60 border-emerald-200'}`}>
                  <FieldLabel
                    label={editingProduct ? 'Stock (Managed in Inventory)' : 'Initial Stock Qty'}
                    required={!editingProduct}
                    hint={editingProduct ? 'Use Inventory section for adjustments' : 'Physical units available'}
                  />
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="25"
                    disabled={Boolean(editingProduct)}
                    className="w-full h-10 px-3 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-100"
                  />
                  {!editingProduct && (
                    <QuickChips
                      options={['10', '25', '50', '100']}
                      current={stockQuantity}
                      onSelect={setStockQuantity}
                    />
                  )}
                </div>
              </div>

              {/* Price Calculation Summary */}
              {price && (
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl text-sm">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer View</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-black text-dark">£{Number(price).toFixed(2)}</span>
                      {comparePrice && Number(comparePrice) > Number(price) && (
                        <span className="text-gray-400 line-through text-sm">£{Number(comparePrice).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  {comparePrice && Number(comparePrice) > Number(price) && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      Customer saves £{(Number(comparePrice) - Number(price)).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: PUBLISHING ──────────────────────────────── */}
          {activeTab === 'publishing' && (
            <div className="space-y-6">
              {/* Publication Status */}
              <div>
                <FieldLabel label="Publication Status" required hint="Controls storefront visibility" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      v: 'draft' as const,
                      label: 'Draft',
                      desc: 'Hidden from storefront',
                      icon: <FileEdit className="w-5 h-5 text-gray-500" />,
                      activeClass: 'border-blue-500 bg-blue-50/50 text-blue-900',
                    },
                    {
                      v: 'active' as const,
                      label: 'Active',
                      desc: 'Live and available to purchase',
                      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
                      activeClass: 'border-emerald-500 bg-emerald-50/50 text-emerald-900',
                    },
                    {
                      v: 'archived' as const,
                      label: 'Archived',
                      desc: 'Removed from catalogue',
                      icon: <Archive className="w-5 h-5 text-amber-600" />,
                      activeClass: 'border-gray-400 bg-gray-100 text-gray-800',
                    },
                  ].map(({ v, label, desc, icon, activeClass }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStatus(v)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                        status === v
                          ? activeClass
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-xs">
                        {icon}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-dark block">{label}</span>
                        <span className="text-[10px] text-gray-500">{desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Merchandising Flags */}
              <div className="space-y-2">
                <FieldLabel label="Merchandising Flags" hint="Controls homepage display and promotional filters" />
                <ToggleFlag
                  checked={isNewRelease}
                  onChange={setIsNewRelease}
                  label="New Release"
                  desc="Displays 'New' badge and appears in the New Releases section"
                  icon={<Sparkles className="w-4 h-4" />}
                />
                <ToggleFlag
                  checked={isBestSeller}
                  onChange={setIsBestSeller}
                  label="Best Seller"
                  desc="Highlights item with Best Seller indicator"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <ToggleFlag
                  checked={isFeatured}
                  onChange={setIsFeatured}
                  label="Featured on Homepage"
                  desc="Pins the film to the curated homepage showcase"
                  icon={<Star className="w-4 h-4" />}
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Catalogue Preview</span>
                </div>
                <div className="flex items-start gap-4 bg-white p-3 rounded-lg border border-gray-200">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt={title || 'Preview'} className="w-14 aspect-dvd object-cover rounded border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-14 aspect-dvd bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">{format || 'DVD'}</span>
                      {ageRating && <BbfcBadge rating={ageRating as AgeRating} size="xs" />}
                    </div>
                    <h4 className="text-xs font-bold text-dark truncate">{title || 'Untitled Film'}</h4>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">SKU: {sku || 'DVD-XXXX-000'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-black text-dark">£{price ? Number(price).toFixed(2) : '0.00'}</span>
                      {comparePrice && Number(comparePrice) > Number(price) && (
                        <span className="text-xs text-gray-400 line-through">£{Number(comparePrice).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation Footer ────────────────────────────────── */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div>
              {activeTab !== 'essentials' ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = FORM_TABS.findIndex((t) => t.id === activeTab);
                    if (idx > 0) setActiveTab(FORM_TABS[idx - 1].id);
                  }}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              {/* Direct Save Changes button on any tab when editing an existing product */}
              {editingProduct && activeTab !== 'publishing' && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleSaveProduct()}
                  isLoading={isSaving}
                  disabled={isUploadingImage}
                  className="gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </Button>
              )}

              {activeTab !== 'publishing' ? (
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleNextStep}
                  className="gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button variant="primary" type="submit" isLoading={isSaving} disabled={isUploadingImage} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingProduct ? 'Save Changes' : 'Publish Film'}</span>
                </Button>
              )}
            </div>
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
                <strong>Archive</strong> (hides from storefront, preserves history) or <strong>Delete Permanently</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={confirmArchiveProduct} isLoading={isDeletingProd}>
              Archive Title (Recommended)
            </Button>
            <Button type="button" onClick={confirmPermanentDeleteProduct} isLoading={isDeletingProd} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500">
              Delete Permanently
            </Button>
            <button type="button" onClick={() => setProductToDelete(null)} className="mt-1 text-xs text-gray-400 hover:text-gray-600 text-center cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
