import { InternationalShippingSettings } from '../../components/admin/InternationalShippingSettings';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Sliders,
  Flame,
  Award,
  Truck,
  Building2,
  Save,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { StoreSettings } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP } from '../../lib/formatters';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

const toLocalInputDateTime = (isoString?: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const AdminStoreSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminApi.getStoreSettings() });
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: () => adminApi.getProducts() });
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const dirty = useRef(false);
  const products = productsQuery.data || [];
  const [activeTab, setActiveTab] = useState<'hero' | 'deal' | 'curator' | 'logistics' | 'payments'>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  useEffect(() => {
    if (settingsQuery.isSuccess && !dirty.current) setSettings(settingsQuery.data || { ...DEFAULT_STORE_SETTINGS });
  }, [settingsQuery.data, settingsQuery.isSuccess]);

  const handleChange = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => {
    dirty.current = true;
    setSettings((prev) => prev ? ({
      ...prev,
      [field]: value,
    }) : prev);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Validate core storefront identity
    const storeName = (settings.store_name || '').trim();
    if (!storeName) {
      addToast('Please enter a store name.', 'error');
      setActiveTab('logistics');
      return;
    }

    const companyName = (settings.registered_company_name || '').trim();
    if (!companyName) {
      addToast('Please enter the registered company name.', 'error');
      setActiveTab('logistics');
      return;
    }

    // Database check constraint requires: company_number ~ '^[A-Z0-9]{8}$'
    const cleanCompanyNumber = (settings.company_number || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(cleanCompanyNumber)) {
      addToast('Company number must be exactly 8 alphanumeric characters (e.g. 13894195).', 'error');
      setActiveTab('logistics');
      return;
    }

    const supportEmail = (settings.support_email || '').trim();
    if (supportEmail && !/^\S+@\S+\.\S+$/.test(supportEmail)) {
      addToast('Please enter a valid customer support email address.', 'error');
      setActiveTab('logistics');
      return;
    }

    if (
      (settings.free_shipping_threshold ?? 0) < 0 ||
      (settings.standard_shipping_fee ?? 0) < 0 ||
      (settings.express_shipping_fee ?? 0) < 0 ||
      (settings.low_stock_threshold ?? 0) < 0 ||
      (settings.budget_collection_threshold ?? 0) < 0
    ) {
      addToast('Operational durations, shipping fees, and stock threshold values cannot be negative numbers.', 'error');
      setActiveTab('logistics');
      return;
    }

    // Validate Deal of the Day if active
    if (settings.deal_is_active) {
      if (!settings.deal_product_id) {
        addToast('Please select a featured product for the Deal of the Day.', 'error');
        setActiveTab('deal');
        return;
      }
      if (!settings.deal_discount_price || settings.deal_discount_price <= 0) {
        addToast('Deal promotional price must be greater than £0.00.', 'error');
        setActiveTab('deal');
        return;
      }
      if (!settings.deal_ends_at || Date.parse(settings.deal_ends_at) <= Date.now()) {
        addToast('The timed deal countdown must have a future expiration date and time.', 'error');
        setActiveTab('deal');
        return;
      }
      const dealProduct = products.find((product) => product.id === settings.deal_product_id);
      if (dealProduct && settings.deal_discount_price >= dealProduct.price) {
        addToast(`The promotional deal price (${formatGBP(settings.deal_discount_price)}) must be lower than the regular price (${formatGBP(dealProduct.price)}).`, 'error');
        setActiveTab('deal');
        return;
      }
    }

    // Validate Bank Transfer if enabled
    if (settings.payment_bank_transfer_enabled) {
      const cleanSortCode = (settings.bank_sort_code || '').replace(/\D/g, '');
      const cleanAccountNum = (settings.bank_account_number || '').trim();
      if (!settings.bank_name?.trim() || !settings.bank_account_name?.trim()) {
        addToast('Enter receiving bank name and account holder name for company bank transfers.', 'error');
        setActiveTab('payments');
        return;
      }
      if (cleanSortCode.length !== 6 || cleanAccountNum.length !== 8) {
        addToast('Company bank transfer requires a valid 6-digit sort code and 8-digit account number.', 'error');
        setActiveTab('payments');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: StoreSettings = {
        ...settings,
        company_number: cleanCompanyNumber,
        bank_sort_code: settings.bank_sort_code
          ? (settings.bank_sort_code.replace(/\D/g, '').length === 6
              ? `${settings.bank_sort_code.replace(/\D/g, '').slice(0, 2)}-${settings.bank_sort_code.replace(/\D/g, '').slice(2, 4)}-${settings.bank_sort_code.replace(/\D/g, '').slice(4, 6)}`
              : settings.bank_sort_code.trim())
          : '',
        bank_account_number: (settings.bank_account_number || '').trim(),
      };
      const updated = await adminApi.saveStoreSettings(payload);
      dirty.current = false;
      setSettings(updated);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['checkout-quote'] });
      await queryClient.invalidateQueries({ queryKey: ['checkout-config'] });
      await queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      addToast('Store settings saved successfully!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update store settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const initializeSettingsDraft = () => {
    setSettings({
      id: crypto.randomUUID(),
      seo_site_url: '',
      seo_site_title: '',
      seo_site_description: '',
      seo_social_image_url: '',
      seo_organization_description: '',
      hero_badge_text: '',
      hero_headline_line1: '',
      hero_headline_highlight: '',
      hero_subheadline: '',
      hero_cta_primary: '',
      hero_cta_secondary: '',
      hero_bg_image: '',
      announcement_left: '',
      announcement_center: '',
      announcement_link: '',
      deal_product_id: null,
      deal_discount_price: 0,
      deal_ends_at: null,
      deal_is_active: false,
      director_badge: '',
      director_name: '',
      director_quote: '',
      director_bio: '',
      director_product_ids: [],
      free_shipping_threshold: 0,
      standard_shipping_fee: 0,
      shipping_zones: [],
      checkout_currencies: ['GBP', 'EUR', 'USD'],
      international_duties_notice: '',
      express_shipping_fee: 0,
      standard_shipping_name: '',
      standard_shipping_eta: '',
      express_shipping_name: '',
      express_shipping_eta: '',
      low_stock_threshold: 0,
      budget_collection_threshold: 0,
      dispatch_cutoff_time: '',
      vip_promo_code: '',
      vip_promo_discount: 0,
      vip_min_spend: 0,
      store_name: 'DVDs Zone',
      registered_company_name: 'DVDs Zone Ltd',
      company_number: '13894195',
      registered_office_address: 'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
      companies_house_url: 'https://find-and-update.company-information.service.gov.uk/company/13894195',
      warehouse_location: '',
      support_email: '',
      support_phone: '',
      updated_at: new Date().toISOString(),
    });
  };

  if (settingsQuery.isLoading || productsQuery.isLoading || settingsQuery.error || productsQuery.error) {
    return <AdminDataState loading={settingsQuery.isLoading || productsQuery.isLoading} error={settingsQuery.error || productsQuery.error} onRetry={() => { settingsQuery.refetch(); productsQuery.refetch(); }} />;
  }

  if (!settings) {
    return (
      <div className="max-w-4xl space-y-5">
        <h1 className="font-display text-3xl font-extrabold text-dark">Storefront Settings</h1>
        <AdminDataState empty emptyTitle="Store settings have not been configured" emptyDescription="Create an operational configuration, review fields, then save it to Supabase." />
        <Button onClick={initializeSettingsDraft}>Create settings configuration</Button>
      </div>
    );
  }

  const selectedDealProduct = products.find((p) => p.id === settings.deal_product_id);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-brand-blue">
            <Sliders className="w-3.5 h-3.5" />
            <span>Store Operations & Content CMS</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-1">
            Storefront Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Control dynamic homepage banners, announcements, flash deals, curator spotlights, UK shipping thresholds, and bank payment instructions.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full gap-2 text-xs shadow-xs sm:w-auto cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 flex snap-x items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 pb-px sm:mx-0 sm:gap-2 sm:px-0">
        {[
          { id: 'hero', label: 'Hero & Announcements', icon: Sparkles },
          { id: 'deal', label: 'Deal of the Day & Promos', icon: Flame },
          { id: 'curator', label: 'Director Spotlight', icon: Award },
          { id: 'logistics', label: 'Shipping & Logistics', icon: Truck },
          { id: 'payments', label: 'Payment Methods & Bank', icon: Building2 },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex min-h-12 shrink-0 snap-start items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-brand-blue text-brand-blue bg-blue-50/40 rounded-t-md'
                : 'border-transparent text-gray-500 hover:text-dark hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ==========================================
            TAB 1: HERO & ANNOUNCEMENTS
        ========================================== */}
        {activeTab === 'hero' && (
          <div className="space-y-8">
            {/* Announcement Bar Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">Top Announcement Bar</h2>
                <p className="text-xs text-gray-500">
                  Visible across the header of every public storefront page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Left Announcement Pill"
                  value={settings.announcement_left}
                  onChange={(e) => handleChange('announcement_left', e.target.value)}
                  placeholder="e.g. New titles added every week"
                />

                <Input
                  label="Center Shipping Guarantee Banner"
                  value={settings.announcement_center}
                  onChange={(e) => handleChange('announcement_center', e.target.value)}
                  placeholder="e.g. Free UK delivery on all orders • Same-day dispatch before 2PM"
                />

                <div className="md:col-span-2">
                  <Input
                    label="Announcement Target Link"
                    value={settings.announcement_link}
                    onChange={(e) => handleChange('announcement_link', e.target.value)}
                    placeholder="e.g. /delivery or /shop?filter=new"
                  />
                </div>
              </div>
            </div>

            {/* Hero Section Copy */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">Homepage Hero Section</h2>
                <p className="text-xs text-gray-500">
                  Primary above-the-fold headline, branding pill, and call-to-action buttons.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Input
                    label="Editorial Badge Pill"
                    value={settings.hero_badge_text}
                    onChange={(e) => handleChange('hero_badge_text', e.target.value)}
                    placeholder="e.g. DVDS ZONE • UK STORE & PHYSICAL ARCHIVE"
                  />
                </div>

                <Input
                  label="Headline (Line 1)"
                  value={settings.hero_headline_line1}
                  onChange={(e) => handleChange('hero_headline_line1', e.target.value)}
                  placeholder="e.g. Films worth"
                />

                <Input
                  label="Headline (Highlighted Word)"
                  value={settings.hero_headline_highlight}
                  onChange={(e) => handleChange('hero_headline_highlight', e.target.value)}
                  placeholder="e.g. owning."
                />

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Subheadline Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={settings.hero_subheadline}
                    onChange={(e) => handleChange('hero_subheadline', e.target.value)}
                    className="w-full rounded-md border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                    placeholder="Editorial subheadline describing physical disc curation..."
                  />
                </div>

                <Input
                  label="Primary Button Label"
                  value={settings.hero_cta_primary}
                  onChange={(e) => handleChange('hero_cta_primary', e.target.value)}
                  placeholder="e.g. Shop DVDs"
                />

                <Input
                  label="Secondary Button Label"
                  value={settings.hero_cta_secondary}
                  onChange={(e) => handleChange('hero_cta_secondary', e.target.value)}
                  placeholder="e.g. New Releases"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: DEAL OF THE DAY & PROMOS
        ========================================== */}
        {activeTab === 'deal' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-5">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-dark">Flash Deal of the Day</h2>
                  <p className="text-xs text-gray-500">
                    Highlighted commercial urgency drop shown on the homepage with countdown timer.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.deal_is_active}
                    onChange={(e) => handleChange('deal_is_active', e.target.checked)}
                    className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-dark">Active on Homepage</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Featured Product
                  </label>
                  <select
                    value={settings.deal_product_id || ''}
                    onChange={(e) => handleChange('deal_product_id', e.target.value || null)}
                    className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs text-dark focus:border-brand-blue focus:outline-none"
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatGBP(p.price)}) • Format: {p.format}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Special Promotional Price (£ GBP)"
                  type="number"
                  step="0.01"
                  value={settings.deal_discount_price}
                  onChange={(e) => handleChange('deal_discount_price', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 19.99"
                />

                <Input
                  label="Deal Ends At *"
                  type="datetime-local"
                  value={toLocalInputDateTime(settings.deal_ends_at)}
                  onChange={(e) => handleChange('deal_ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>

              {/* Selected Deal Preview Card */}
              {selectedDealProduct && (
                <div className="mt-4 p-4 rounded-md border border-gray-200 bg-gray-50 flex items-center gap-4">
                  <img
                    src={selectedDealProduct.cover_image_url}
                    alt={selectedDealProduct.title}
                    className="w-16 aspect-dvd object-cover rounded-sm shadow-xs"
                  />
                  <div className="space-y-1 text-xs">
                    <div className="font-display font-bold text-dark text-sm">
                      {selectedDealProduct.title}
                    </div>
                    <div className="text-gray-500">
                      Standard Price: <span className="line-through">{formatGBP(selectedDealProduct.price)}</span> &rarr;{' '}
                      <strong className="text-brand-red font-mono text-sm">{formatGBP(settings.deal_discount_price)}</strong>
                    </div>
                    <div className="text-gray-400 font-mono text-[11px]">
                      Warehouse stock: {selectedDealProduct.stock_quantity} units available
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* VIP Coupon Promo Banner */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">VIP 10% Promo Banner</h2>
                <p className="text-xs text-gray-500">
                  Full-width conversion banner with one-click copy coupon code shown across the storefront.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input
                  label="Coupon Code"
                  value={settings.vip_promo_code}
                  onChange={(e) => handleChange('vip_promo_code', e.target.value.toUpperCase())}
                  placeholder="e.g. ZONE10"
                />

                <Input
                  label="Discount Percentage (%)"
                  type="number"
                  value={settings.vip_promo_discount}
                  onChange={(e) => handleChange('vip_promo_discount', parseInt(e.target.value, 10) || 0)}
                  placeholder="10"
                />

                <Input
                  label="Minimum Qualifying Order (£)"
                  type="number"
                  value={settings.vip_min_spend}
                  onChange={(e) => handleChange('vip_min_spend', parseFloat(e.target.value) || 0)}
                  placeholder="20.00"
                />
              </div>
            </div>

            {/* Link to Dedicated Promotions Manager */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-dark block">Manage Checkout Discount Codes</span>
                <span className="text-gray-600">Create, pause, or adjust active percentage and fixed amount discount codes applied during customer checkout.</span>
              </div>
              <Link
                to="/admin/promotions"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-blue text-white font-semibold text-xs shrink-0 hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Go to Promotions</span>
              </Link>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: DIRECTOR / CURATOR SPOTLIGHT
        ========================================== */}
        {activeTab === 'curator' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="font-display font-bold text-base text-dark">Director & Curator Spotlight</h2>
              <p className="text-xs text-gray-500">
                Editorial showcase module highlighting cinematic visionaries, physical media quotes, and 3 key titles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Director / Badge Title"
                value={settings.director_badge}
                onChange={(e) => handleChange('director_badge', e.target.value)}
                placeholder="e.g. DIRECTOR SPOTLIGHT"
              />

              <Input
                label="Director / Curator Name"
                value={settings.director_name}
                onChange={(e) => handleChange('director_name', e.target.value)}
                placeholder="e.g. Christopher Nolan"
              />

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Curatorial Statement / Quote
                </label>
                <textarea
                  rows={2}
                  value={settings.director_quote}
                  onChange={(e) => handleChange('director_quote', e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                  placeholder="Quote regarding uncompressed transfers or physical film dignity..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Curatorial Biography & Vault Overview
                </label>
                <textarea
                  rows={3}
                  value={settings.director_bio}
                  onChange={(e) => handleChange('director_bio', e.target.value)}
                  className="w-full rounded-md border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                  placeholder="Overview of the director's collection..."
                />
              </div>
            </div>

            {/* 3 Featured Titles in Spotlight */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="font-display font-bold text-sm text-dark">
                Featured 3 Titles in Showcase Grid
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">
                      Showcase Film #{idx + 1}
                    </label>
                    <select
                      value={settings.director_product_ids[idx] || products[idx]?.id || ''}
                      onChange={(e) => {
                        const newIds = [...settings.director_product_ids];
                        newIds[idx] = e.target.value;
                        handleChange('director_product_ids', newIds);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-md p-2.5 text-xs text-dark focus:border-brand-blue focus:outline-none"
                    >
                      <option value="">Select film</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: SHIPPING, FEES & LOGISTICS
        ========================================== */}
        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">UK Logistics, Royal Mail & Warehouse</h2>
                <p className="text-xs text-gray-500">
                  Configure delivery thresholds, fees, dispatch cutoff times, and official warehouse contact information.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input
                  label="Free UK Delivery Threshold (£)"
                  type="number"
                  step="0.01"
                  value={settings.free_shipping_threshold}
                  onChange={(e) => handleChange('free_shipping_threshold', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  helperText="Set to 0.00 for 100% Free UK Delivery on all orders."
                />

                <Input
                  label="Standard Tracked 48 Delivery Fee (£)"
                  type="number"
                  step="0.01"
                  value={settings.standard_shipping_fee}
                  onChange={(e) => handleChange('standard_shipping_fee', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  helperText="Set to 0.00 for complimentary delivery across the UK."
                />

                <Input
                  label="Express Tracked 24 Delivery Fee (£)"
                  type="number"
                  step="0.01"
                  value={settings.express_shipping_fee}
                  onChange={(e) => handleChange('express_shipping_fee', parseFloat(e.target.value) || 0)}
                  placeholder="4.99"
                />

                <Input
                  label="Low-stock Alert Threshold (units)"
                  type="number"
                  min="0"
                  step="1"
                  value={settings.low_stock_threshold}
                  onChange={(e) => handleChange('low_stock_threshold', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  helperText="Products at or below this value appear as low stock."
                />

                <Input
                  label="Budget Collection Maximum (£)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.budget_collection_threshold}
                  onChange={(e) => handleChange('budget_collection_threshold', Math.max(0, parseFloat(e.target.value) || 0))}
                  helperText="Controls the homepage budget collection using live product prices."
                />

                <Input
                  label="Same-Day Dispatch Cutoff Time"
                  value={settings.dispatch_cutoff_time}
                  onChange={(e) => handleChange('dispatch_cutoff_time', e.target.value)}
                  placeholder="e.g. 14:00 GMT"
                />

                <Input label="Standard Service Name" value={settings.standard_shipping_name} onChange={(e) => handleChange('standard_shipping_name', e.target.value)} placeholder="Carrier and service" />
                <Input label="Standard Delivery Estimate" value={settings.standard_shipping_eta} onChange={(e) => handleChange('standard_shipping_eta', e.target.value)} placeholder="Customer-facing estimate" />
                <Input label="Express Service Name" value={settings.express_shipping_name} onChange={(e) => handleChange('express_shipping_name', e.target.value)} placeholder="Carrier and service" />
                <Input label="Express Delivery Estimate" value={settings.express_shipping_eta} onChange={(e) => handleChange('express_shipping_eta', e.target.value)} placeholder="Customer-facing estimate" />

                <Input
                  label="Registered Company / Store Name *"
                  value={settings.store_name}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="DVDs Zone"
                  required
                />

                <Input
                  label="Registered Legal Entity *"
                  value={settings.registered_company_name}
                  onChange={(e) => handleChange('registered_company_name', e.target.value)}
                  placeholder="DVDs Zone Ltd"
                  required
                />

                <Input
                  label="Companies House Number (8 chars) *"
                  value={settings.company_number}
                  onChange={(e) => handleChange('company_number', e.target.value.toUpperCase())}
                  placeholder="13894195"
                  helperText="Must be 8 alphanumeric characters (e.g. 13894195)"
                  required
                />

                <div className="sm:col-span-3">
                  <Input
                    label="Registered Office Address"
                    value={settings.registered_office_address}
                    onChange={(e) => handleChange('registered_office_address', e.target.value)}
                    placeholder="Official Companies House registered office"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Companies House Public Record URL"
                    type="url"
                    value={settings.companies_house_url}
                    onChange={(e) => handleChange('companies_house_url', e.target.value)}
                    placeholder="https://find-and-update.company-information.service.gov.uk/company/..."
                  />
                </div>

                <Input
                  label="Store / Warehouse Location"
                  value={settings.warehouse_location}
                  onChange={(e) => handleChange('warehouse_location', e.target.value)}
                  placeholder="Operational dispatch location"
                />

                <Input
                  label="Customer Support Email"
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  placeholder="enquiries@dvdszone.co.uk"
                />

                <Input
                  label="Customer Support Phone"
                  value={settings.support_phone}
                  onChange={(e) => handleChange('support_phone', e.target.value)}
                  placeholder="+44 (0)121 496 0833"
                />
              </div>
            </div>

            <InternationalShippingSettings settings={settings} onChange={handleChange} />
          </div>
        )}

        {/* ==========================================
            TAB 5: PAYMENT METHODS & BANK DETAILS
        ========================================== */}
        {activeTab === 'payments' && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-lg font-semibold text-dark">Payment Methods & Gateway Settings</h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure enabled payment options shown at checkout. Card and PayPal use automated webhooks; Bank Transfer enables customer direct wire transfer.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {([
                ['payment_card_enabled', 'Card / Apple Pay / Stripe'],
                ['payment_paypal_enabled', 'PayPal Express'],
                ['payment_bank_transfer_enabled', 'Company Bank Transfer (Manual)'],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-brand-blue rounded"
                    checked={settings[field] ?? field !== 'payment_bank_transfer_enabled'}
                    onChange={(e) => handleChange(field, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-sm text-dark">Company Bank Account Details</h3>
              <p className="text-xs text-gray-500 mt-1">
                These details will be securely displayed to customers selecting Bank Transfer at checkout.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Input
                label="Bank Name *"
                value={settings.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="Barclays Bank UK"
              />
              <Input
                label="Account Holder Name *"
                value={settings.bank_account_name || ''}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                placeholder="DVDs Zone Ltd"
              />
              <Input
                label="Sort Code (6 digits) *"
                value={settings.bank_sort_code || ''}
                placeholder="20-00-00"
                onChange={(e) => handleChange('bank_sort_code', e.target.value)}
                helperText="Standard 6-digit UK bank sort code"
              />
              <Input
                label="Account Number (8 digits) *"
                value={settings.bank_account_number || ''}
                placeholder="12345678"
                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                helperText="Standard 8-digit UK account number"
              />
              <div className="sm:col-span-2">
                <Input
                  label="IBAN (Optional for International Payments)"
                  value={settings.bank_iban || ''}
                  placeholder="GB29BARC20000012345678"
                  onChange={(e) => handleChange('bank_iban', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Bank Transfer Instructions for Customers
              </label>
              <textarea
                rows={3}
                value={settings.bank_payment_instructions || ''}
                onChange={(e) => handleChange('bank_payment_instructions', e.target.value)}
                className="block w-full rounded-xl border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                placeholder="Provide instructions on referencing order numbers and uploading transfer receipts..."
              />
            </div>

            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-2">
              <span>Notice: When customers place orders via bank transfer, the inventory stock is reserved, and the order remains in &quot;awaiting payment&quot; until an admin verifies the incoming funds or receipts in the Admin Orders panel.</span>
            </div>
          </section>
        )}

        {/* Bottom Save Bar */}
        <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500 flex items-start gap-1.5 sm:items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings synchronize immediately with the storefront and Supabase database.</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isSaving}
            className="w-full gap-2 font-bold shadow-xs sm:w-auto cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save All Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
