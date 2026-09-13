import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pause, Plus } from 'lucide-react';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<Promotion['type'] | ''>('');
  const [value, setValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [activateNow, setActivateNow] = useState(false);

  const createPromotion = async (event: React.FormEvent) => {
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
      await adminApi.createPromotion({
        code: code.trim().toUpperCase(), type, value: numericValue, minimum_order: numericMinimum, is_active: activateNow,
        starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
        ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      setModalOpen(false);
      setCode('');
      setType('');
      setValue('');
      setMinimumOrder('');
      setStartsAt('');
      setEndsAt('');
      setActivateNow(false);
      addToast('Promotion created in the operational database', 'success');
    } catch (promotionError) {
      addToast(promotionError instanceof Error ? promotionError.message : 'Promotion could not be created', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: Promotion) => {
    try {
      await adminApi.updatePromotion(promotion.id, { is_active: !promotion.is_active });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
      addToast(`${promotion.code} is now ${promotion.is_active ? 'paused' : 'active'}`, 'success');
    } catch (promotionError) {
      addToast(promotionError instanceof Error ? promotionError.message : 'Promotion could not be updated', 'error');
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
          <h1 className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">Store Promotions</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New promotion</Button>
      </div>

      {promotions.length === 0 ? (
        <AdminDataState empty emptyTitle="No promotions configured" emptyDescription="Create the first promotion when the campaign is ready." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                <tr><th className="p-3.5">Promo Code</th><th className="p-3.5">Type</th><th className="p-3.5">Value</th><th className="p-3.5">Minimum</th><th className="p-3.5">Validity</th><th className="p-3.5 text-right">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50/70">
                    <td className="p-3.5 font-mono text-sm font-bold text-brand-blue">{promotion.code}</td>
                    <td className="p-3.5 font-mono text-[11px] uppercase text-gray-600">{promotion.type.replace('_', ' ')}</td>
                    <td className="p-3.5 font-mono font-bold text-dark">{promotion.type === 'percentage' ? `${promotion.value}% OFF` : `${formatGBP(promotion.value)} OFF`}</td>
                    <td className="p-3.5 font-mono text-gray-600">{formatGBP(promotion.minimum_order)}</td>
                    <td className="p-3.5 text-gray-500">{promotion.ends_at ? `Ends ${new Date(promotion.ends_at).toLocaleDateString('en-GB')}` : 'No expiry'}</td>
                    <td className="p-3.5 text-right">
                      <button onClick={() => togglePromotion(promotion)} className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 font-semibold ${promotion.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {promotion.is_active ? <Check className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        {promotion.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create promotion" description="Campaign rules are stored in the operational database." maxWidth="lg">
        <form onSubmit={createPromotion} className="space-y-4">
          <Input label="Promotion code *" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AUTUMN15" required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Discount type
              <select value={type} onChange={(event) => setType(event.target.value as Promotion['type'])} className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-xs normal-case outline-none focus:border-brand-blue">
                <option value="" disabled>Select discount type</option>
                <option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option>
              </select>
            </label>
            <Input label="Value *" type="number" min="0.01" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} required />
            <Input label="Minimum order" type="number" min="0" step="0.01" value={minimumOrder} onChange={(event) => setMinimumOrder(event.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Starts at" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <Input label="Ends at" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={activateNow} onChange={(event) => setActivateNow(event.target.checked)} className="accent-brand-blue" /> Activate this promotion after saving</label>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving} disabled={!code.trim()}>Create promotion</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
