import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  SlidersHorizontal,
  Search,
  X,
  Filter,
  Boxes,
  PackageX,
  RotateCcw,
  Film,
  Package,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { publicApi } from '../../lib/publicApi';
import { Product } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/useUiStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { formatGBP, cn } from '../../lib/formatters';

type StockHealthFilter = 'all' | 'critical' | 'low_stock' | 'out_of_stock' | 'healthy';
type SortOption = 'stock_asc' | 'stock_desc' | 'title_asc' | 'title_desc' | 'price_asc' | 'price_desc';

export const AdminInventory: React.FC = () => {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: adminApi.getProducts });
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.getStoreSettings });
  const categoriesQuery = useQuery({ queryKey: ['store', 'categories'], queryFn: publicApi.getCategories });

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  // Filter States
  const [search, setSearch] = useState('');
  const [stockHealthFilter, setStockHealthFilter] = useState<StockHealthFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>('stock_asc');

  // Adjustment Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const threshold = settingsQuery.data?.low_stock_threshold ?? 3;

  // KPI Statistics
  const stats = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let healthy = 0;
    let totalUnits = 0;

    for (const p of products) {
      const qty = p.stock_quantity ?? 0;
      totalUnits += qty;
      if (qty <= 0) {
        outOfStock++;
      } else if (qty <= threshold) {
        lowStock++;
      } else {
        healthy++;
      }
    }

    return {
      total: products.length,
      outOfStock,
      lowStock,
      healthy,
      totalUnits,
    };
  }, [products, threshold]);

  // Unique Formats from products
  const availableFormats = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.format) set.add(p.format);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products
      .filter((product) => {
        // 1. Text Search
        if (q) {
          const titleMatch = product.title?.toLowerCase().includes(q);
          const skuMatch = product.sku?.toLowerCase().includes(q);
          const formatMatch = product.format?.toLowerCase().includes(q);
          const catName = product.category?.name?.toLowerCase();
          const categoryMatch = catName ? catName.includes(q) : false;
          if (!titleMatch && !skuMatch && !formatMatch && !categoryMatch) {
            return false;
          }
        }

        // 2. Stock Health
        const qty = product.stock_quantity ?? 0;
        if (stockHealthFilter === 'out_of_stock' && qty > 0) return false;
        if (stockHealthFilter === 'low_stock' && (qty <= 0 || qty > threshold)) return false;
        if (stockHealthFilter === 'critical' && qty > threshold) return false;
        if (stockHealthFilter === 'healthy' && qty <= threshold) return false;

        // 3. Category
        if (categoryFilter !== 'all') {
          const catId = product.category_id || product.category?.id;
          if (catId !== categoryFilter) return false;
        }

        // 4. Format
        if (formatFilter !== 'all') {
          if (product.format !== formatFilter) return false;
        }

        // 5. Product Status
        if (statusFilter !== 'all') {
          if (product.status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'stock_asc':
            return (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
          case 'stock_desc':
            return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0);
          case 'title_asc':
            return a.title.localeCompare(b.title);
          case 'title_desc':
            return b.title.localeCompare(a.title);
          case 'price_asc':
            return Number(a.price) - Number(b.price);
          case 'price_desc':
            return Number(b.price) - Number(a.price);
          default:
            return 0;
        }
      });
  }, [
    products,
    search,
    stockHealthFilter,
    categoryFilter,
    formatFilter,
    statusFilter,
    sortOption,
    threshold,
  ]);

  const isAnyFilterActive =
    search.trim() !== '' ||
    stockHealthFilter !== 'all' ||
    categoryFilter !== 'all' ||
    formatFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortOption !== 'stock_asc';

  const resetFilters = () => {
    setSearch('');
    setStockHealthFilter('all');
    setCategoryFilter('all');
    setFormatFilter('all');
    setStatusFilter('all');
    setSortOption('stock_asc');
  };

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedProducts,
    totalItems: totalFilteredCount,
  } = useAdminPagination(filtered, 25);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || updating) return;
    const delta = Number(adjustment);
    if (!Number.isInteger(delta) || delta === 0) {
      addToast('Enter a non-zero whole number to adjust inventory', 'error');
      return;
    }
    if (!reason.trim()) {
      addToast('A reason must be logged for inventory auditing', 'error');
      return;
    }

    setUpdating(true);
    try {
      const updated = await adminApi.adjustStock(selectedProduct.id, delta, reason.trim());
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      addToast(`Updated stock for "${selectedProduct.title}" to ${updated.stock_quantity}`, 'success');

      // Dispatch real-time low-stock or adjustment notification
      const currentThreshold = settingsQuery.data?.low_stock_threshold ?? 3;
      if (updated.stock_quantity <= currentThreshold) {
        useNotificationStore.getState().addNotification(
          {
            target: 'admin',
            type: 'stock',
            title: 'Low Stock Alert',
            message: `Product "${updated.title}" has reached ${updated.stock_quantity} units remaining (Threshold: ${currentThreshold}).`,
            link: '/admin/inventory',
          },
          { showToast: false }
        );
      } else {
        useNotificationStore.getState().addNotification(
          {
            target: 'admin',
            type: 'stock',
            title: 'Inventory Adjusted',
            message: `"${selectedProduct.title}" stock changed by ${delta > 0 ? `+${delta}` : delta} (New level: ${updated.stock_quantity}).`,
            link: '/admin/inventory',
          },
          { showToast: false }
        );
      }

      setSelectedProduct(null);
      setAdjustment('');
      setReason('');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Stock could not be updated', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (productsQuery.isLoading || settingsQuery.isLoading) {
    return (
      <AdminDataState
        loading={true}
        error={null}
        onRetry={() => {
          productsQuery.refetch();
          settingsQuery.refetch();
        }}
      />
    );
  }

  if (productsQuery.error || settingsQuery.error) {
    return (
      <AdminDataState
        loading={false}
        error={productsQuery.error || settingsQuery.error}
        onRetry={() => {
          productsQuery.refetch();
          settingsQuery.refetch();
        }}
      />
    );
  }

  if (!settingsQuery.data) {
    return (
      <AdminDataState
        empty
        emptyTitle="Configure inventory alerts"
        emptyDescription="Save Store Settings to set the low-stock threshold before managing inventory."
      />
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-brand-blue">
            Warehouse control
          </span>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight text-dark dark:text-white">
            Physical Stock &amp; Alerts
          </h1>
        </div>
        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 px-3.5 py-2 rounded-lg shadow-2xs w-fit">
          Low-stock alert threshold:{' '}
          <strong className="text-amber-600 dark:text-amber-400 font-bold">
            &le; {threshold} units
          </strong>
        </div>
      </div>

      {/* ── KPI Inventory Overview Cards (Interactive Filters) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Titles */}
        <button
          type="button"
          onClick={() => setStockHealthFilter('all')}
          className={cn(
            'flex flex-col text-left rounded-xl border p-4 transition cursor-pointer shadow-2xs',
            stockHealthFilter === 'all'
              ? 'border-brand-blue bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-brand-blue/30'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total SKUs
            </span>
            <Boxes className="h-4 w-4 text-brand-blue" />
          </div>
          <span className="mt-2 font-display text-2xl font-black text-dark dark:text-white">
            {stats.total}
          </span>
          <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {stats.totalUnits.toLocaleString()} units in warehouse
          </span>
        </button>

        {/* Healthy Stock */}
        <button
          type="button"
          onClick={() =>
            setStockHealthFilter(stockHealthFilter === 'healthy' ? 'all' : 'healthy')
          }
          className={cn(
            'flex flex-col text-left rounded-xl border p-4 transition cursor-pointer shadow-2xs',
            stockHealthFilter === 'healthy'
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Healthy Stock
            </span>
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="mt-2 font-display text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.healthy}
          </span>
          <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Above alert level (&gt; {threshold})
          </span>
        </button>

        {/* Low Stock Warning */}
        <button
          type="button"
          onClick={() =>
            setStockHealthFilter(stockHealthFilter === 'low_stock' ? 'all' : 'low_stock')
          }
          className={cn(
            'flex flex-col text-left rounded-xl border p-4 transition cursor-pointer shadow-2xs',
            stockHealthFilter === 'low_stock'
              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/30'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Low Stock Alert
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="mt-2 font-display text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.lowStock}
          </span>
          <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            &le; {threshold} units remaining
          </span>
        </button>

        {/* Out of Stock */}
        <button
          type="button"
          onClick={() =>
            setStockHealthFilter(stockHealthFilter === 'out_of_stock' ? 'all' : 'out_of_stock')
          }
          className={cn(
            'flex flex-col text-left rounded-xl border p-4 transition cursor-pointer shadow-2xs',
            stockHealthFilter === 'out_of_stock'
              ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/30'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:bg-gray-50 dark:hover:bg-white/5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Out of Stock
            </span>
            <PackageX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="mt-2 font-display text-2xl font-black text-rose-700 dark:text-rose-400">
            {stats.outOfStock}
          </span>
          <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            0 units in warehouse
          </span>
        </button>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter stock by title, SKU, or category..."
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#131826] pl-9 pr-8 text-xs text-dark dark:text-white placeholder:text-gray-400 focus:border-brand-blue focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark dark:hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Stock Condition Dropdown */}
          <div>
            <select
              value={stockHealthFilter}
              onChange={(e) => setStockHealthFilter(e.target.value as StockHealthFilter)}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#131826] px-3 text-xs font-medium text-dark dark:text-white focus:border-brand-blue focus:outline-hidden"
            >
              <option value="all">Stock: All Levels</option>
              <option value="critical">🚨 Action Needed (&le; {threshold})</option>
              <option value="out_of_stock">🚫 Out of Stock (0)</option>
              <option value="low_stock">⚠️ Low Stock (1 - {threshold})</option>
              <option value="healthy">✅ Healthy Stock (&gt; {threshold})</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#131826] px-3 text-xs font-medium text-dark dark:text-white focus:border-brand-blue focus:outline-hidden"
            >
              <option value="all">Category: All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Format Dropdown */}
          <div>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#131826] px-3 text-xs font-medium text-dark dark:text-white focus:border-brand-blue focus:outline-hidden"
            >
              <option value="all">Format: All</option>
              {availableFormats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-10 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#131826] px-3 text-xs font-medium text-dark dark:text-white focus:border-brand-blue focus:outline-hidden"
            >
              <option value="stock_asc">Sort: Lowest Stock First</option>
              <option value="stock_desc">Sort: Highest Stock First</option>
              <option value="title_asc">Sort: Title (A - Z)</option>
              <option value="title_desc">Sort: Title (Z - A)</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span>
              Showing <strong className="text-dark dark:text-white">{filtered.length}</strong> of{' '}
              {products.length} products
            </span>

            {isAnyFilterActive && (
              <>
                <span className="text-gray-300 dark:text-white/20">|</span>
                <span className="text-[11px] uppercase tracking-wider text-gray-400">Active:</span>

                {search && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-[11px] font-medium text-dark dark:text-white">
                    Keyword: "{search}"
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {stockHealthFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded text-[11px] font-medium">
                    Stock: {stockHealthFilter.replace('_', ' ')}
                    <button
                      type="button"
                      onClick={() => setStockHealthFilter('all')}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {categoryFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded text-[11px] font-medium">
                    Category: {categories.find((c) => c.id === categoryFilter)?.name || categoryFilter}
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {formatFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 px-2 py-0.5 rounded text-[11px] font-medium">
                    Format: {formatFilter}
                    <button
                      type="button"
                      onClick={() => setFormatFilter('all')}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {sortOption !== 'stock_asc' && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-[11px] font-medium text-dark dark:text-white">
                    Custom Sort
                    <button
                      type="button"
                      onClick={() => setSortOption('stock_asc')}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Content ── */}
      {products.length === 0 ? (
        <AdminDataState
          empty
          emptyTitle="No inventory records"
          emptyDescription="Create a product before recording warehouse stock."
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-10 text-center shadow-2xs">
          <PackageX className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-3 font-display text-base font-bold text-dark dark:text-white">
            No products match the selected filters
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Try adjusting your search terms or clearing active filters to see all inventory records.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#141A26] font-semibold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Format</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Stock Level</th>
                  <th className="p-3.5">Health</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedProducts.map((product) => {
                  const qty = product.stock_quantity ?? 0;
                  const isOut = qty <= 0;
                  const isLow = qty > 0 && qty <= threshold;
                  const categoryName =
                    product.category?.name ||
                    categories.find((c) => c.id === product.category_id)?.name;

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'transition-colors',
                        isOut
                          ? 'bg-rose-50/25 hover:bg-rose-50/50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20'
                          : isLow
                          ? 'bg-amber-50/25 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
                          : 'hover:bg-gray-50/70 dark:hover:bg-white/5'
                      )}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {product.cover_image_url ? (
                            <img
                              src={product.cover_image_url}
                              alt=""
                              className="h-12 w-9 rounded object-cover border border-gray-200 dark:border-white/10 shrink-0 shadow-2xs bg-gray-100"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-12 w-9 items-center justify-center rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-400 shrink-0">
                              <Film className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-dark dark:text-white line-clamp-1 block">
                              {product.title}
                            </span>
                            {categoryName && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                {categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                        {product.sku || '—'}
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-white/10 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-white/5">
                          {product.format || 'Standard'}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-gray-700 dark:text-gray-300 font-semibold">
                        {formatGBP(product.price)}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={cn(
                            'font-mono text-sm font-extrabold',
                            isOut
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-dark dark:text-white'
                          )}
                        >
                          {qty} units
                        </span>
                      </td>

                      <td className="p-3.5">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                            <PackageX className="h-3 w-3" />
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            <AlertTriangle className="h-3 w-3" />
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                            <Check className="h-3 w-3" />
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalFilteredCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="products"
          />
        </div>
      )}

      {/* ── Adjust Stock Modal ── */}
      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={`Adjust stock: ${selectedProduct?.title || ''}`}
        description="Every adjustment is atomic and written to the inventory audit ledger."
        maxWidth="md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="rounded-lg bg-gray-50 dark:bg-[#131826] p-3 border border-gray-200 dark:border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block">Current Stock:</span>
              <span className="font-mono text-base font-bold text-dark dark:text-white">
                {selectedProduct?.stock_quantity ?? 0} units
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 dark:text-gray-400 block">SKU / Format:</span>
              <span className="font-mono text-xs font-semibold text-dark dark:text-white">
                {selectedProduct?.sku || '—'} • {selectedProduct?.format || 'Standard'}
              </span>
            </div>
          </div>

          <Input
            label="Quantity change *"
            type="number"
            step="1"
            value={adjustment}
            onChange={(event) => setAdjustment(event.target.value)}
            placeholder="Positive number (e.g. 5) or negative (e.g. -2)"
            required
            helperText="Enter a positive number to add stock, or negative number to reduce."
          />

          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Operational reason *
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 min-h-24 w-full rounded-md border border-gray-300 dark:border-white/15 bg-white dark:bg-[#131826] text-gray-900 dark:text-white p-3 text-sm normal-case outline-none focus:border-brand-blue"
              placeholder="e.g. Restock shipment receipt #RM-2026, Damaged disc write-off, Physical stocktake discrepancy..."
              required
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-white/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedProduct(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updating}>
              Apply adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default AdminInventory;
