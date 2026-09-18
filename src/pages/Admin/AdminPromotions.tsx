import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Pause,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Copy,
  Search,
  Tag,
  Clock,
  Percent,
  Coins,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Promotion } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP, cn } from '../../lib/formatters';

type PromoFilterStatus = 'all' | 'active' | 'paused' | 'expired';

export const AdminPromotions: React.FC = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'promotions'], queryFn: () => adminApi.getPromotions() });
  const promotions = query.data || [];
  const addToast = useUiStore((state) => state.addToast);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromoFilterStatus>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<Promotion['type']>('percentage');
  const [value, setValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('0');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [activateNow, setActivateNow] = useState(true);

  const resetForm = () => {
    setCode('');
    setType('percentage');
    setValue('');
    setMinimumOrder('0');
    setStartsAt('');
    setEndsAt('');
    setActivateNow(true);
    setEditingPromotion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromotion(promo);
    setCode(promo.code);
    setType(promo.type);
    setValue(String(promo.value));
    setMinimumOrder(String(promo.minimum_order ?? 0));
    const localDateTime = (val?: string | null) => {
      if (!val) return '';
      const date = new Date(val);
      if (isNaN(date.getTime())) return '';
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    };
    setStartsAt(localDateTime(promo.starts_at));
    setEndsAt(localDateTime(promo.ends_at));
    setActivateNow(promo.is_active);
    setModalOpen(true);
  };

  const copyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    addToast(`Code "${codeText}" copied to clipboard`, 'success');
  };

  const handleSavePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedCode = code.trim().toUpperCase();
    const numericValue = Number(value);
    const numericMinimum = Number(minimumOrder);

    if (!trimmedCode) {
      addToast('Please enter a promotion code.', 'error');
      return;
    }
    if (!type) {
      addToast('Please select a discount type.', 'error');
      return;
    }
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      addToast('Discount value must be a positive number greater than 0.', 'error');
      return;
    }
    if (!Number.isFinite(numericMinimum) || numericMinimum < 0) {
      addToast('Minimum qualifying order must be 0 or higher.', 'error');
      return;
    }
    if (type === 'percentage' && numericValue > 100) {
      addToast('A percentage discount cannot exceed 100%.', 'error');
      return;
    }
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      addToast('The promotion expiration date must be after its start date.', 'error');
      return;
    }

    // Check duplicate code on creation
    if (!editingPromotion) {
      const existing = promotions.find((p) => p.code.toUpperCase() === trimmedCode);
      if (existing) {
        addToast(`Promotion code "${trimmedCode}" already exists. Please use a unique code.`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingPromotion) {
        await adminApi.updatePromotion(editingPromotion.id, {
          code: trimmedCode,
          type,
          value: numericValue,
          minimum_order: numericMinimum,
          is_active: activateNow,
          starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        });
        addToast(`Promotion "${trimmedCode}" updated successfully`, 'success');
      } else {
        await adminApi.createPromotion({
          code: trimmedCode,
          type,
          value: numericValue,
          minimum_order: numericMinimum,
          is_active: activateNow,
          starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        });
        addToast(`Promotion "${trimmedCode}" created successfully`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      await queryClient.invalidateQueries({ queryKey: ['checkout-quote'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      setModalOpen(false);
      resetForm();
    } catch (promotionError) {
      addToast(promotionError instanceof Error ? promotionError.message : 'Promotion could not be saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: Promotion) => {
    try {
      await adminApi.updatePromotion(promotion.id, { is_active: !promotion.is_active });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      await queryClient.invalidateQueries({ queryKey: ['checkout-quote'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      addToast(`${promotion.code} is now ${promotion.is_active ? 'paused' : 'active'}`, 'success');
    } catch (promotionError) {
      addToast(promotionError instanceof Error ? promotionError.message : 'Promotion could not be updated', 'error');
    }
  };

  const confirmDeletePromotion = async () => {
    if (!deletingPromotion) return;
    setIsDeleting(true);
    try {
      await adminApi.deletePromotion(deletingPromotion.id);
      setDeletingPromotion(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      await queryClient.invalidateQueries({ queryKey: ['checkout-quote'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      addToast(`Promotion "${deletingPromotion.code}" deleted`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Promotion could not be deleted', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    const now = Date.now();
    return promotions.filter((promo) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        if (!promo.code.toUpperCase().includes(q)) return false;
      }
      // Status match
      const isExpired = promo.ends_at && new Date(promo.ends_at).getTime() < now;
      if (statusFilter === 'active') {
        return promo.is_active && !isExpired;
      }
      if (statusFilter === 'paused') {
        return !promo.is_active;
      }
      if (statusFilter === 'expired') {
        return Boolean(isExpired);
      }
      return true;
    });
  }, [promotions, searchQuery, statusFilter]);

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedPromotions,
    totalItems: totalPromotionsCount,
  } = useAdminPagination(filteredPromotions, 10);

  if (query.isLoading || query.error) {
    return <AdminDataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-brand-blue">
            <Tag className="h-3.5 w-3.5" />
            <span>Marketing &amp; Discount Campaigns</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">
            Store Promotions ({promotions.length})
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage checkout discount codes, percentage cuts, minimum spend thresholds, and campaign validity.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 cursor-pointer shadow-xs">
          <Plus className="h-4 w-4" />
          <span>New Promotion</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promotion code..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'active', 'paused', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap',
                statusFilter === filter
                  ? 'bg-brand-blue text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Promotions Table */}
      {promotions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-dark">No promotions configured yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Create promotional discount codes that customers can apply at checkout to receive percentage or fixed amount discounts.
          </p>
          <Button onClick={openCreateModal} className="mt-2 gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Create First Promotion</span>
          </Button>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
          No promotions match the search query &ldquo;{searchQuery}&rdquo; or selected filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/80 font-bold uppercase tracking-wider text-[10px] text-gray-500 select-none">
                <tr>
                  <th className="p-3.5">Promo Code</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Discount Value</th>
                  <th className="p-3.5">Min. Order</th>
                  <th className="p-3.5">Validity &amp; Schedule</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedPromotions.map((promotion) => {
                  const now = Date.now();
                  const isExpired = promotion.ends_at && new Date(promotion.ends_at).getTime() < now;
                  const isScheduled = promotion.starts_at && new Date(promotion.starts_at).getTime() > now;

                  return (
                    <tr key={promotion.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-brand-blue bg-blue-50 px-2 py-1 rounded border border-blue-200/80">
                            {promotion.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(promotion.code)}
                            className="text-gray-400 hover:text-dark transition-colors p-1 rounded hover:bg-gray-100 cursor-pointer"
                            title="Copy code to clipboard"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] capitalize text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          {promotion.type === 'percentage' ? (
                            <Percent size={12} className="text-emerald-600" />
                          ) : (
                            <Coins size={12} className="text-brand-blue" />
                          )}
                          <span>{promotion.type.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={cn(
                            'font-mono font-bold text-xs px-2 py-0.5 rounded-full border',
                            promotion.type === 'percentage'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-brand-blue border-blue-200'
                          )}
                        >
                          {promotion.type === 'percentage'
                            ? `${promotion.value}% OFF`
                            : `${formatGBP(promotion.value)} OFF`}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-gray-600">
                        {promotion.minimum_order > 0 ? (
                          <span>{formatGBP(promotion.minimum_order)}</span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">No min spend</span>
                        )}
                      </td>

                      <td className="p-3.5 text-gray-500">
                        <div className="space-y-0.5">
                          {promotion.ends_at ? (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock size={12} className="text-gray-400" />
                              <span>Until {new Date(promotion.ends_at).toLocaleDateString('en-GB')}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-mono">No expiration date</span>
                          )}
                          {isScheduled && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold block w-fit">
                              Starts {new Date(promotion.starts_at!).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Expired
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => togglePromotion(promotion)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer border',
                              promotion.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            )}
                            title="Click to toggle active/pause state"
                          >
                            {promotion.is_active ? <Check className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                            <span>{promotion.is_active ? 'Active' : 'Paused'}</span>
                          </button>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(promotion)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-dark transition-colors cursor-pointer"
                            title="Edit promotion"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPromotion(promotion)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete promotion"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
            totalItems={totalPromotionsCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            itemLabel="promotions"
          />
        </div>
      )}

      {/* CREATE / EDIT PROMOTION MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingPromotion ? `Edit Promotion: ${editingPromotion.code}` : 'Create Promotion Code'}
        description="Active codes are immediately verified and applied at customer checkout."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePromotion} className="space-y-4">
          <Input
            label="Promotion Code *"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="e.g. SPRING15 or FLASH20"
            helperText="Uppercase alphanumeric discount code (e.g. ZONE10)"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Discount Type *
              <select
                value={type}
                onChange={(event) => setType(event.target.value as Promotion['type'])}
                className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-xs normal-case outline-none focus:border-brand-blue"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (£ GBP)</option>
              </select>
            </label>

            <Input
              label={type === 'percentage' ? 'Discount Rate (%) *' : 'Discount (£ GBP) *'}
              type="number"
              min="0.01"
              max={type === 'percentage' ? '100' : undefined}
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={type === 'percentage' ? 'e.g. 15' : 'e.g. 5.00'}
              required
            />

            <Input
              label="Min. Qualifying Order (£)"
              type="number"
              min="0"
              step="0.01"
              value={minimumOrder}
              onChange={(event) => setMinimumOrder(event.target.value)}
              placeholder="0.00"
              helperText="Set 0.00 for no minimum"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Starts At (Optional)"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              helperText="Leave empty to start immediately"
            />

            <Input
              label="Ends At (Optional)"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              helperText="Leave empty for no expiry"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={activateNow}
              onChange={(event) => setActivateNow(event.target.checked)}
              className="accent-brand-blue h-4 w-4 rounded"
            />
            <span>Activate promotion immediately for customers</span>
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} disabled={!code.trim()}>
              {editingPromotion ? 'Save Changes' : 'Create Promotion'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE PROMOTION MODAL */}
      <Modal
        isOpen={Boolean(deletingPromotion)}
        onClose={() => setDeletingPromotion(null)}
        title="Delete Promotion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 text-rose-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="text-xs">
              <p className="font-semibold">
                Delete promotion code &ldquo;{deletingPromotion?.code}&rdquo;?
              </p>
              <p className="mt-1 text-rose-700">
                Customers will no longer be able to apply this discount code at checkout.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setDeletingPromotion(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeletePromotion}
              isLoading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            >
              Delete Promotion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
