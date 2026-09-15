import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, SlidersHorizontal } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Product } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/useUiStore';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

export const AdminInventory: React.FC = () => {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: adminApi.getProducts });
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.getStoreSettings });
  const products = productsQuery.data || [];
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const delta = parseInt(adjustment, 10);
    if (isNaN(delta) || delta === 0) {
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
      setSelectedProduct(null);
      setAdjustment('');
      setReason('');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Stock could not be updated', 'error');
    } finally { setUpdating(false); }
  };

  if (productsQuery.isLoading) {
    return <AdminDataState loading={true} error={null} onRetry={() => { productsQuery.refetch(); settingsQuery.refetch(); }} />;
  }

  if (productsQuery.error) {
    return <AdminDataState loading={false} error={productsQuery.error} onRetry={() => { productsQuery.refetch(); settingsQuery.refetch(); }} />;
  }

  const threshold = settingsQuery.data?.low_stock_threshold ?? DEFAULT_STORE_SETTINGS.low_stock_threshold;
  const filtered = products.filter((product) => product.title.toLowerCase().includes(search.toLowerCase()) || product.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-brand-blue">Warehouse control</span>
        <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight text-dark">Physical Stock & Alerts</h1>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter stock by title or SKU..." className="h-10 w-full max-w-sm rounded-md border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:border-brand-blue" />
        <div className="font-mono text-xs text-gray-500">Live low-stock threshold: <strong className="text-amber-600">≤ {threshold} units</strong></div>
      </div>

      {products.length === 0 ? <AdminDataState empty emptyTitle="No inventory records" emptyDescription="Create a product before recording warehouse stock." /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700"><tr><th className="p-3.5">Film</th><th className="p-3.5">SKU</th><th className="p-3.5">Format</th><th className="p-3.5">Current stock</th><th className="p-3.5">Health</th><th className="p-3.5 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/70">
                  <td className="p-3.5 font-semibold text-dark">{product.title}</td>
                  <td className="p-3.5 font-mono text-gray-500">{product.sku}</td>
                  <td className="p-3.5 font-mono">{product.format}</td>
                  <td className="p-3.5 font-mono text-sm font-bold text-dark">{product.stock_quantity}</td>
                  <td className="p-3.5">{product.stock_quantity <= threshold ? <span className="inline-flex items-center gap-1.5 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800"><AlertTriangle className="h-3 w-3" />Low stock</span> : <span className="inline-flex items-center gap-1.5 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800"><Check className="h-3 w-3" />Healthy</span>}</td>
                  <td className="p-3.5 text-right"><Button size="sm" variant="secondary" onClick={() => setSelectedProduct(product)}><SlidersHorizontal className="mr-1 h-3.5 w-3.5" />Adjust</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} title={`Adjust stock: ${selectedProduct?.title || ''}`} description="Every adjustment is atomic and written to the inventory ledger." maxWidth="md">
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <Input label="Quantity change *" type="number" step="1" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="Positive receipt or negative correction" required />
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">Operational reason *<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-md border border-gray-300 p-3 text-sm normal-case outline-none focus:border-brand-blue" placeholder="Receipt reference, damage report, stocktake correction..." required /></label>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><Button type="button" variant="secondary" onClick={() => setSelectedProduct(null)}>Cancel</Button><Button type="submit" isLoading={updating}>Apply adjustment</Button></div>
        </form>
      </Modal>
    </div>
  );
};
