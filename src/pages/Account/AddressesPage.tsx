import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { useUiStore } from '../../stores/useUiStore';

export const AddressesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addressesQuery = useQuery({ queryKey: ['account', 'addresses'], queryFn: publicApi.getMyAddresses, retry: false });
  const addToast = useUiStore((state) => state.addToast);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', address_line_1: '', address_line_2: '', city: '', county: '', postcode: '', country: '', is_default: false });

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [field]: value }));

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (![form.full_name, form.address_line_1, form.city, form.postcode, form.country].every((value) => value.trim())) {
      addToast('Complete all required address fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      await publicApi.createMyAddress({ ...form, postcode: form.postcode.trim().toUpperCase() });
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      setModalOpen(false);
      setForm({ full_name: '', phone: '', address_line_1: '', address_line_2: '', city: '', county: '', postcode: '', country: '', is_default: false });
      addToast('Address saved', 'success');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Address could not be saved', 'error'); }
    finally { setSaving(false); }
  };

  const removeAddress = async (id: string) => {
    if (!window.confirm('Remove this saved address?')) return;
    try {
      await publicApi.deleteMyAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      addToast('Address removed', 'info');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Address could not be removed', 'error'); }
  };

  if (addressesQuery.isLoading || addressesQuery.error) {
    return <StoreDataState loading={addressesQuery.isLoading} error={addressesQuery.error} retry={() => addressesQuery.refetch()} />;
  }
  const addresses = addressesQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-dark">Saved Addresses</h2><p className="mt-0.5 text-xs text-gray-500">Addresses loaded from your authenticated account.</p></div><Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Add Address</Button></div>
      {addresses.length === 0 ? <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center"><MapPin className="mx-auto h-7 w-7 text-gray-300" /><p className="mt-3 text-sm font-semibold text-dark">No saved addresses</p><p className="mt-1 text-xs text-gray-500">Add an address to speed up future checkout.</p></div> : (
        <div className="grid gap-4 sm:grid-cols-2">{addresses.map((address) => (
          <div key={address.id} className="relative space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
            {address.is_default && <span className="inline-block rounded-sm bg-brand-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Default delivery</span>}
            <h4 className="font-display text-sm font-bold text-dark">{address.full_name}</h4>
            <div className="text-xs leading-relaxed text-gray-600"><p>{address.address_line_1}</p>{address.address_line_2 && <p>{address.address_line_2}</p>}<p>{address.city}{address.county ? `, ${address.county}` : ''}</p><p className="font-mono">{address.postcode}</p><p>{address.country}</p></div>
            <button onClick={() => removeAddress(address.id)} className="absolute right-3 top-3 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-brand-red" aria-label="Remove address"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}</div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add delivery address" description="Saved directly to your authenticated account." maxWidth="lg">
        <form onSubmit={saveAddress} className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name *" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          <div className="sm:col-span-2"><Input label="Address line 1 *" value={form.address_line_1} onChange={(e) => setField('address_line_1', e.target.value)} required /></div>
          <div className="sm:col-span-2"><Input label="Address line 2" value={form.address_line_2} onChange={(e) => setField('address_line_2', e.target.value)} /></div>
          <Input label="City *" value={form.city} onChange={(e) => setField('city', e.target.value)} required />
          <Input label="County" value={form.county} onChange={(e) => setField('county', e.target.value)} />
          <Input label="Postcode *" value={form.postcode} onChange={(e) => setField('postcode', e.target.value)} required />
          <Input label="Country *" value={form.country} onChange={(e) => setField('country', e.target.value)} required />
          <label className="flex items-center gap-2 text-xs text-gray-600 sm:col-span-2"><input type="checkbox" checked={form.is_default} onChange={(e) => setField('is_default', e.target.checked)} className="accent-brand-blue" />Set as default address</label>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Save address</Button></div>
        </form>
      </Modal>
    </div>
  );
};
