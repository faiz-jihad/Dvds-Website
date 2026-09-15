import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pause, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Promotion } from '../../types';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP } from '../../lib/formatters';

export const AdminPromotions: React.FC = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'promotions'], queryFn: () => adminApi.getPromotions() });
  const promotions = query.data || [];
  const addToast = useUiStore((state) => state.addToast);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<Promotion['type'] | ''>('');
  const [value, setValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [activateNow, setActivateNow] = useState(false);

  const resetForm = () => {
    setCode('');
    setType('');
    setValue('');
    setMinimumOrder('');
    setStartsAt('');
    setEndsAt('');
    setActivateNow(false);
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
    setMinimumOrder(String(promo.minimum_order));
    const localDateTime = (value?: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    };
    setStartsAt(localDateTime(promo.starts_at));
    setEndsAt(localDateTime(promo.ends_at));
    setActivateNow(promo.is_active);
    setModalOpen(true);
  };

  const handleSavePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericValue = Number(value);
    const numericMinimum = Number(minimumOrder);
    if (!code.trim() || !type || value === '' || minimumOrder === '' || !Number.isFinite(numericValue) || numericValue <= 0 || !Number.isFinite(numericMinimum) || numericMinimum < 0) {
      addToast('Complete the promotion code, discount type, value, and minimum order.', 'error');
      return;
    }
    if (type === 'percentage' && numericValue > 100) {
      addToast('A percentage discount cannot exceed 100%.', 'error');
      return;
    }
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      addToast('The promotion end time must be after its start time.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingPromotion) {
        await adminApi.updatePromotion(editingPromotion.id, {
          code: code.trim().toUpperCase(),
          type,
          value: numericValue,
          minimum_order: numericMinimum,
          is_active: activateNow,
          starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        });
        addToast(`Promotion "${code.toUpperCase()}" updated successfully`, 'success');
      } else {
        await adminApi.createPromotion({
          code: code.trim().toUpperCase(),
          type,
          value: numericValue,
          minimum_order: numericMinimum,
          is_active: activateNow,
          starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        });
        addToast(`Promotion "${code.toUpperCase()}" created successfully`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
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
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      addToast(`Promotion "${deletingPromotion.code}" deleted`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Promotion could not be deleted', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (query.isLoading || query.error) {
    return <AdminDataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-brand-blue">MARKETING & DISCOUNT CODES</span>
          <h1 className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">
            Store Promotions ({promotions.length})
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage promo codes, percentages, fixed discounts, and active campaign rules.</p>
        </div>
        <Button onClick={openCreateModal}><Plus className="h-4 w-4" /> New promotion</Button>
      </div>

      {promotions.length === 0 ? (
        <AdminDataState empty emptyTitle="No promotions configured" emptyDescription="Create the first promotion when the campaign is ready." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                <tr>
                  <th className="p-3.5">Promo Code</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Value</th>
                  <th className="p-3.5">Minimum</th>
                  <th className="p-3.5">Validity</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50/70">
                    <td className="p-3.5 font-mono text-sm font-bold text-brand-blue">{promotion.code}</td>
                    <td className="p-3.5 font-mono text-[11px] uppercase text-gray-600">{promotion.type.replace('_', ' ')}</td>
                    <td className="p-3.5 font-mono font-bold text-dark">
                      {promotion.type === 'percentage' ? `${promotion.value}% OFF` : `${formatGBP(promotion.value)} OFF`}
                    </td>
                    <td className="p-3.5 font-mono text-gray-600">{formatGBP(promotion.minimum_order)}</td>
                    <td className="p-3.5 text-gray-500">
                      {promotion.ends_at ? `Ends ${new Date(promotion.ends_at).toLocaleDateString('en-GB')}` : 'No expiry'}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => togglePromotion(promotion)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-colors ${
                          promotion.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="Click to toggle active state"
                      >
                        {promotion.is_active ? <Check className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        {promotion.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(promotion)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-dark"
                          title="Edit promotion"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPromotion(promotion)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete promotion"
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
        </div>
      )}

      {/* CREATE / EDIT PROMOTION MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingPromotion ? `Edit Promotion: ${editingPromotion.code}` : 'Create promotion'}
        description="Campaign rules are active across storefront checkout."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePromotion} className="space-y-4">
          <Input
            label="Promotion code *"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AUTUMN15"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Discount type
              <select
                value={type}
                onChange={(event) => setType(event.target.value as Promotion['type'])}
                className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-xs normal-case outline-none focus:border-brand-blue"
              >
                <option value="" disabled>Select discount type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed amount</option>
              </select>
            </label>
            <Input
              label="Value *"
              type="number"
              min="0.01"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
            <Input
              label="Minimum order"
              type="number"
              min="0"
              step="0.01"
              value={minimumOrder}
              onChange={(event) => setMinimumOrder(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Starts at"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={activateNow}
              onChange={(event) => setActivateNow(event.target.checked)}
              className="accent-brand-blue"
            />
            <span>Active immediately</span>
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
              {editingPromotion ? 'Save Changes' : 'Create promotion'}
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
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="text-xs">
              <p className="font-semibold">Delete promotion code &ldquo;{deletingPromotion?.code}&rdquo;?</p>
              <p className="mt-1 text-red-700">
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete Promotion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
