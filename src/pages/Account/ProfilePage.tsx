import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { StoreDataState } from '../../components/common/StoreDataState';
import { publicApi } from '../../lib/publicApi';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useUiStore } from '../../stores/useUiStore';
import { Seo } from '../../components/common/Seo';

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { customer, updateProfileState } = useCustomerAuth();
  const profileQuery = useQuery({
    queryKey: ['account', 'profile'],
    queryFn: publicApi.getMyProfile,
    retry: false,
    initialData: customer || undefined,
  });

  const currentProfile = profileQuery.data || customer;
  const [fullName, setFullName] = useState(currentProfile?.full_name || '');
  const [phone, setPhone] = useState(currentProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  useEffect(() => {
    if (currentProfile) {
      setFullName(currentProfile.full_name || '');
      setPhone(currentProfile.phone || '');
    }
  }, [currentProfile?.full_name, currentProfile?.phone]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) return addToast('Full name is required.', 'error');
    setSaving(true);
    try {
      await publicApi.updateMyProfile({ full_name: fullName.trim(), phone: phone.trim() || null });
      updateProfileState({ full_name: fullName.trim(), phone: phone.trim() || null });
      await queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
      addToast('Profile changes saved successfully', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Profile could not be saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentProfile) {
    if (profileQuery.isLoading) {
      return <StoreDataState loading={true} />;
    }
    return (
      <StoreDataState
        error={profileQuery.error || new Error('Please sign in to view your profile.')}
        retry={() => profileQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Seo
        title="Profile Details — DVDs Zone UK"
        description="Manage your DVDs Zone personal details and contact preferences."
        canonicalPath="/account"
        noIndex={true}
        siteName="DVDs Zone"
      />
      <div>
        <h2 className="font-display text-lg font-bold text-dark dark:text-white">Profile Details</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Your live account details used for order communication.</p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <Input label="Full Name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        <Input label="Email Address" type="email" value={currentProfile.email} readOnly helperText="Email changes require an authenticated account flow." />
        <Input label="Phone Number" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+44 7400 123456" />
        <div className="pt-2"><Button type="submit" isLoading={saving}>Save Profile</Button></div>
      </form>
    </div>
  );
};

