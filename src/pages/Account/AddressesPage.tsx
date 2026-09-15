import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Edit3, Check, Star } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { useUiStore } from '../../stores/useUiStore';
import { Address } from '../../types';

interface AddressFormState {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  is_default: boolean;
}

const initialForm: AddressFormState = {
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  county: '',
  postcode: '',
  country: 'United Kingdom',
  is_default: false,
};

export const AddressesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addressesQuery = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: publicApi.getMyAddresses,
    retry: false,
  });
  const addToast = useUiStore((state) => state.addToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(initialForm);

  const setField = <K extends keyof AddressFormState>(field: K, value: AddressFormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const openAddModal = () => {
    setEditingAddress(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    setForm({
      full_name: address.full_name,
      phone: address.phone || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      county: address.county || '',
      postcode: address.postcode,
      country: address.country || 'United Kingdom',
      is_default: Boolean(address.is_default),
    });
    setModalOpen(true);
  };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (![form.full_name, form.address_line_1, form.city, form.postcode, form.country].every((v) => v.trim())) {
      addToast('Please complete all required fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address_line_1: form.address_line_1.trim(),
        address_line_2: form.address_line_2.trim() || undefined,
        city: form.city.trim(),
        county: form.county.trim() || undefined,
        postcode: form.postcode.trim().toUpperCase(),
        country: form.country.trim() || 'United Kingdom',
      };

      if (editingAddress) {
        await publicApi.updateMyAddress(editingAddress.id, payload);
        addToast('Address successfully updated', 'success');
      } else {
        await publicApi.createMyAddress(payload);
        addToast('New delivery address saved', 'success');
      }

      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      setModalOpen(false);
      setEditingAddress(null);
      setForm(initialForm);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Address could not be saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await publicApi.setDefaultAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      addToast('Default delivery address updated', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not set default address', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const removeAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this saved delivery address?')) return;
    try {
      await publicApi.deleteMyAddress(id);
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      addToast('Address removed from account', 'info');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Address could not be removed', 'error');
    }
  };

  if (addressesQuery.isLoading || addressesQuery.error) {
    return (
      <StoreDataState
        loading={addressesQuery.isLoading}
        error={addressesQuery.error}
        retry={() => addressesQuery.refetch()}
      />
    );
  }

  const addresses = addressesQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-dark">Saved Addresses</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Manage your personal delivery locations for rapid, one-click checkout.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openAddModal} className="gap-1.5 shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>Add New Address</span>
        </Button>
      </div>

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-dark">No saved addresses yet</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Add your primary home or office delivery address to speed up future Royal Mail orders.
          </p>
          <div className="mt-5">
            <Button variant="secondary" size="sm" onClick={openAddModal} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Your First Address</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                address.is_default
                  ? 'border-brand-blue/60 bg-blue-50/20 shadow-xs ring-1 ring-brand-blue/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
              }`}
            >
              {/* Header inside Card: Badges & Top Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {address.is_default ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Check className="w-3 h-3" />
                      Default Delivery
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={settingDefaultId === address.id}
                      onClick={() => handleSetDefault(address.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-brand-blue transition-colors cursor-pointer"
                    >
                      <Star className="w-3 h-3" />
                      <span>{settingDefaultId === address.id ? 'Setting...' : 'Set as default'}</span>
                    </button>
                  )}

                  {/* Edit and Delete action icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(address)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Edit address"
                      aria-label="Edit address"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(address.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-brand-red transition-colors"
                      title="Remove address"
                      aria-label="Remove address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recipient details */}
                <div>
                  <h4 className="font-display text-sm font-bold text-dark">{address.full_name}</h4>
                  {address.phone && (
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">Tel: {address.phone}</p>
                  )}
                </div>

                {/* Address text */}
                <div className="text-xs leading-relaxed text-gray-600 space-y-0.5 pt-1 border-t border-gray-100">
                  <p className="font-medium text-gray-800">{address.address_line_1}</p>
                  {address.address_line_2 && <p>{address.address_line_2}</p>}
                  <p>
                    {address.city}
                    {address.county ? `, ${address.county}` : ''}
                  </p>
                  <p className="font-mono font-bold text-gray-900">{address.postcode}</p>
                  <p className="text-gray-500">{address.country || 'United Kingdom'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
        description="Saved addresses are stored securely and automatically available at checkout."
        maxWidth="lg"
      >
        <form onSubmit={saveAddress} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full recipient name *"
            placeholder="e.g. John Doe"
            value={form.full_name}
            onChange={(e) => setField('full_name', e.target.value)}
            required
          />
          <Input
            label="Phone number (for Royal Mail SMS updates)"
            type="tel"
            placeholder="e.g. 07123 456789"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Address line 1 (House number & street) *"
              placeholder="e.g. 10 Downing Street"
              value={form.address_line_1}
              onChange={(e) => setField('address_line_1', e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 2 (Flat, suite, unit - optional)"
              placeholder="e.g. Flat 4B"
              value={form.address_line_2}
              onChange={(e) => setField('address_line_2', e.target.value)}
            />
          </div>
          <Input
            label="City / Town *"
            placeholder="e.g. London"
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            required
          />
          <Input
            label="County / Region"
            placeholder="e.g. Greater London"
            value={form.county}
            onChange={(e) => setField('county', e.target.value)}
          />
          <Input
            label="Postcode *"
            placeholder="e.g. SW1A 2AA"
            value={form.postcode}
            onChange={(e) => setField('postcode', e.target.value.toUpperCase())}
            required
          />
          <Input
            label="Country *"
            value={form.country}
            onChange={(e) => setField('country', e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-xs text-gray-700 sm:col-span-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setField('is_default', e.target.checked)}
              className="accent-brand-blue h-4 w-4 rounded"
            />
            <span>Set as default address for future orders</span>
          </label>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingAddress ? 'Save Changes' : 'Save Address'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
