import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { useUiStore } from '../../stores/useUiStore';

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['account', 'profile'], queryFn: publicApi.getMyProfile, retry: false });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  useEffect(() => {
    if (profileQuery.data) {
      setFullName(profileQuery.data.full_name || '');
      setPhone(profileQuery.data.phone || '');
    }
  }, [profileQuery.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) return addToast('Full name is required.', 'error');
    setSaving(true);
    try {
      await publicApi.updateMyProfile({ full_name: fullName.trim(), phone: phone.trim() || null });
      await queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
      addToast('Profile changes saved successfully', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Profile could not be saved', 'error');
    } finally { setSaving(false); }
  };

  if (profileQuery.isLoading || profileQuery.error || !profileQuery.data) {
    return <StoreDataState loading={profileQuery.isLoading} error={profileQuery.error || (!profileQuery.data ? new Error('Profile is unavailable.') : null)} retry={() => profileQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-dark dark:text-white">Profile Details</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Your live account details used for order communication.</p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Input label="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        <Input label="Email Address" type="email" value={profileQuery.data.email} readOnly helperText="Email changes require an authenticated account flow." />
        <Input label="Phone Number" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <div className="pt-2"><Button type="submit" isLoading={saving}>Save Profile</Button></div>
      </form>
    </div>
  );
};
