import { InternationalShippingSettings } from '../../components/admin/InternationalShippingSettings';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Sliders,
  Award,
  Truck,
  Building2,
  Save,
  CheckCircle2,
  Eye,
  Film,
  Quote,
  ArrowRight,
  Disc,
  Star,
  Play,
  ExternalLink,
  Youtube,
  Volume2,
  VolumeX,
  Repeat,
  Plus,
  Trash2,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { extractYouTubeVideoId } from '../../components/landing/AzCinematicHero';
import { adminApi } from '../../lib/adminApi';
import { StoreSettings, HeroTrailerItem } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useUiStore } from '../../stores/useUiStore';
import { formatGBP } from '../../lib/formatters';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';
interface AdminHeroVideoPlayerProps {
  videoId: string;
  startSec: number;
  endSec: number;
}

const AdminHeroVideoPlayer: React.FC<AdminHeroVideoPlayerProps> = ({ videoId, startSec, endSec }) => {
  const [cycle, setCycle] = useState(0);
  const duration = endSec > startSec ? endSec - startSec : 0;

  // Loop timer for custom segment timing (minutes:seconds)
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setCycle((c) => c + 1);
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [duration, cycle, videoId, startSec]);

  // Listen to YouTube API postMessage for natural video end
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onStateChange' && data?.info === 0) {
          setCycle((c) => c + 1);
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Resume video immediately when user returns to this browser tab to prevent paused state icon
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
      <iframe
        ref={iframeRef}
        key={`${videoId}-${startSec}-${cycle}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[max(120%,190%)] h-[max(120%,62%)] scale-[1.25] origin-center aspect-video pointer-events-none select-none opacity-100"
        style={{ pointerEvents: 'none' }}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&start=${startSec}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
        title="Admin YouTube Preview"
        allow="autoplay; encrypted-media; picture-in-picture"
      />
      {/* Top crop guard gradient */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[6]" />
      {/* Click-shield overlay: intercepts all user interactions so YouTube player never pauses or displays play/pause icon */}
      <div className="absolute inset-0 z-[5] bg-transparent cursor-default pointer-events-auto" />
    </div>
  );
};

export const AdminStoreSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminApi.getStoreSettings() });
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: () => adminApi.getProducts() });
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const dirty = useRef(false);
  const products = productsQuery.data || [];
  const [activeTab, setActiveTab] = useState<'hero' | 'curator' | 'logistics' | 'payments'>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [previewTrailerIndex, setPreviewTrailerIndex] = useState(0);
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

    // Validate core storefront identity with sensible fallbacks
    const storeName = (settings.store_name || '').trim() || 'DVDs Zone';
    const companyName = (settings.registered_company_name || '').trim() || 'DVDs Zone Ltd';

    // Database check constraint requires: company_number ~ '^[A-Z0-9]{8}$'
    const cleanCompanyNumber = (settings.company_number || '13894195').trim().toUpperCase();
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
        store_name: storeName,
        registered_company_name: companyName,
        company_number: cleanCompanyNumber,
        director_product_ids: Array.isArray(settings.director_product_ids)
          ? settings.director_product_ids.filter(Boolean)
          : [],
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
      hero_badge_text: 'SPRING ARCHIVE RELEASE — MARCH 2026',
      hero_headline_line1: 'Films worth',
      hero_headline_highlight: 'owning.',
      hero_subheadline: 'Curated physical editions, uncompressed audio masters, and collector box sets delivered directly across the United Kingdom.',
      hero_cta_primary: 'Shop DVDs',
      hero_cta_secondary: 'Curator Picks',
      hero_bg_image: '',
      hero_youtube_enabled: false,
      hero_youtube_url: '',
      hero_youtube_mute: true,
      hero_youtube_loop: true,
      announcement_left: 'Free UK delivery on all orders',
      announcement_center: 'Free UK Tracked Delivery • Same-day dispatch before 2PM GMT',
      announcement_link: '/delivery',
      deal_product_id: null,
      deal_discount_price: 0,
      deal_ends_at: null,
      deal_is_active: false,
      director_badge: 'DIRECTOR SPOTLIGHT',
      director_name: 'Christopher Nolan',
      director_quote: 'Physical media is the only way to preserve the true cinematic experience without compression algorithms.',
      director_bio: 'Visionary British-American filmmaker celebrated for nonlinear storytelling, practical effects, and high-format 70mm archival preservation.',
      director_product_ids: [],
      free_shipping_threshold: 0,
      standard_shipping_fee: 0,
      shipping_zones: [],
      checkout_currencies: ['GBP', 'EUR', 'USD'],
      international_duties_notice: '',
      express_shipping_fee: 4.99,
      standard_shipping_name: 'Royal Mail Tracked 48',
      standard_shipping_eta: '2-3 Working Days',
      express_shipping_name: 'Royal Mail Tracked 24',
      express_shipping_eta: 'Next Working Day',
      low_stock_threshold: 5,
      budget_collection_threshold: 15,
      dispatch_cutoff_time: '14:00 GMT',
      vip_promo_code: 'ZONE10',
      vip_promo_discount: 10,
      vip_min_spend: 20,
      store_name: 'DVDs Zone',
      registered_company_name: 'DVDs Zone Ltd',
      company_number: '13894195',
      registered_office_address: 'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom',
      companies_house_url: 'https://find-and-update.company-information.service.gov.uk/company/13894195',
      warehouse_location: 'Birmingham Logistics Hub, UK',
      support_email: 'enquiries@dvdszone.co.uk',
      support_phone: '+44 (0)121 496 0833',
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

  const directorProductIds = Array.isArray(settings.director_product_ids) ? settings.director_product_ids : [];
  const detectedVideoId = extractYouTubeVideoId(settings.hero_youtube_url);

  const heroTrailers: HeroTrailerItem[] = Array.isArray(settings.hero_trailers) ? settings.hero_trailers : [];

  const handleAddTrailer = () => {
    if (!settings) return;
    const currentTrailers = settings.hero_trailers || [];
    const available = products.find((p) => !currentTrailers.some((t) => t.product_id === p.id)) || products[0];
    if (!available) return;
    const newTrailers: HeroTrailerItem[] = [
      ...currentTrailers,
      {
        product_id: available.id,
        youtube_url: '',
        start_minutes: 0,
        start_seconds: 0,
        end_minutes: 1,
        end_seconds: 30,
      },
    ];
    handleChange('hero_trailers', newTrailers);
    setPreviewTrailerIndex(newTrailers.length - 1);
  };

  const handleUpdateTrailer = (index: number, updates: Partial<HeroTrailerItem>) => {
    if (!settings) return;
    const currentTrailers = [...(settings.hero_trailers || [])];
    if (!currentTrailers[index]) return;
    currentTrailers[index] = { ...currentTrailers[index], ...updates };
    handleChange('hero_trailers', currentTrailers);
  };

  const handleRemoveTrailer = (index: number) => {
    if (!settings) return;
    const currentTrailers = (settings.hero_trailers || []).filter((_, i) => i !== index);
    handleChange('hero_trailers', currentTrailers);
    if (previewTrailerIndex >= currentTrailers.length) {
      setPreviewTrailerIndex(Math.max(0, currentTrailers.length - 1));
    }
  };

  const currentPreviewTrailer = heroTrailers[previewTrailerIndex] || heroTrailers[0];
  const activePreviewProduct = currentPreviewTrailer
    ? products.find((p) => p.id === currentPreviewTrailer.product_id)
    : products[0];
  const activePreviewVideoUrl = currentPreviewTrailer?.youtube_url?.trim() || settings.hero_youtube_url?.trim() || '';
  const activePreviewVideoId = extractYouTubeVideoId(activePreviewVideoUrl);
  const isUsingCustomPreviewTrailer = Boolean(currentPreviewTrailer?.youtube_url?.trim());
  const previewStartMinutes = isUsingCustomPreviewTrailer
    ? (currentPreviewTrailer?.start_minutes ?? 0)
    : (settings.hero_youtube_start_minutes ?? 0);
  const previewStartSeconds = isUsingCustomPreviewTrailer
    ? (currentPreviewTrailer?.start_seconds ?? 0)
    : (settings.hero_youtube_start_seconds ?? 0);
  const previewEndMinutes = isUsingCustomPreviewTrailer
    ? currentPreviewTrailer?.end_minutes
    : settings.hero_youtube_end_minutes;
  const previewEndSeconds = isUsingCustomPreviewTrailer
    ? currentPreviewTrailer?.end_seconds
    : settings.hero_youtube_end_seconds;

  const activePreviewStart = Math.max(0, (previewStartMinutes * 60) + previewStartSeconds);
  const activePreviewEnd =
    previewEndMinutes !== undefined || previewEndSeconds !== undefined
      ? ((previewEndMinutes ?? 0) * 60) + (previewEndSeconds ?? 0)
      : 0;

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
            Control dynamic homepage banners, announcements, curator spotlights, UK shipping thresholds, and bank payment instructions.
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

      {/* Tabs - 4 main storefront management tabs */}
      <div className="-mx-4 flex snap-x items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 pb-px sm:mx-0 sm:gap-2 sm:px-0">
        {[
          { id: 'hero', label: 'Hero & Announcements', icon: Sparkles },
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

            {/* Top Announcement Bar Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">Top Announcement Bar (Interior Pages)</h2>
                <p className="text-xs text-gray-500">
                  Visible across interior catalog, product, checkout, and information pages above the header (the homepage is kept clean with full cinematic focus).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Left Announcement Pill"
                  value={settings.announcement_left || ''}
                  onChange={(e) => handleChange('announcement_left', e.target.value)}
                  placeholder="e.g. Free UK delivery on all orders"
                />

                <Input
                  label="Center Guarantee Banner"
                  value={settings.announcement_center || ''}
                  onChange={(e) => handleChange('announcement_center', e.target.value)}
                  placeholder="e.g. Free UK Tracked Delivery • Same-day dispatch before 2PM GMT"
                />

                <div className="md:col-span-2">
                  <Input
                    label="Announcement Target Link"
                    value={settings.announcement_link || ''}
                    onChange={(e) => handleChange('announcement_link', e.target.value)}
                    placeholder="e.g. /delivery or /shop"
                  />
                </div>
              </div>

              {/* Announcement Bar Live Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Announcement Bar Live Preview (Interior Pages)</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F1115] text-gray-200 px-4 py-2.5 flex items-center justify-between text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-white truncate text-[11px] sm:text-xs">
                      {settings.announcement_left || 'Free UK delivery on all orders'}
                    </span>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-center text-xs font-medium text-gray-300">
                    <Truck className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    <span>{settings.announcement_center || 'Complimentary Royal Mail UK Delivery'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-blue">
                    <span>{settings.announcement_link || '/delivery'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Homepage Cinematic Hero Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">Homepage Cinematic Hero Section</h2>
                <p className="text-xs text-gray-500">
                  Controls the dynamic above-the-fold cinema slider, editorial badge pill, and action buttons shown on the current homepage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Input
                    label="Editorial Headline / Overline (Displayed above movie titles)"
                    value={settings.hero_badge_text || ''}
                    onChange={(e) => handleChange('hero_badge_text', e.target.value)}
                    placeholder="e.g. SPRING ARCHIVE RELEASE — MARCH 2029"
                    helperText="Editorial headline shown above the featured cinema hero title."
                  />
                </div>

                <Input
                  label="Primary Action Button Label"
                  value={settings.hero_cta_primary || ''}
                  onChange={(e) => handleChange('hero_cta_primary', e.target.value)}
                  placeholder="View Details"
                  helperText="Default: View Details"
                />

                <Input
                  label="Secondary Action Button Label"
                  value={settings.hero_cta_secondary || ''}
                  onChange={(e) => handleChange('hero_cta_secondary', e.target.value)}
                  placeholder="Add to Basket"
                  helperText="Default: Add to Basket"
                />

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Custom Editorial Synopsis / Subheadline (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.hero_subheadline || ''}
                    onChange={(e) => handleChange('hero_subheadline', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                    placeholder="Leave blank to automatically display each featured film's official synopsis, or enter custom curatorial copy here..."
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    When filled, this custom message replaces the default synopsis across hero slider slides.
                  </p>
                </div>
              </div>

              {/* Cinematic Hero Slider Live Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Homepage Cinematic Hero Live Preview</span>
                </div>
                <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-[#07090E] via-[#0B0F19] to-[#07090E] border border-white/10 p-6 sm:p-8 text-white relative shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                    {/* Left: Movie Info */}
                    <div className="flex-1 space-y-3 max-w-xl">
                      {settings.hero_badge_text && (
                        <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                          {settings.hero_badge_text}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-blue text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-md">
                          <Disc className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                          <span>4K ULTRA HD</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-brand-red text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                          New Release
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                        The Mandalorian: The Complete Seasons
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-semibold mb-4">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 text-amber-400 font-bold border border-amber-400/30">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>8.7 IMDb</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">12</span>
                        <span className="text-gray-400">&bull;</span>
                        <span className="text-gray-300">2023</span>
                        <span className="text-gray-400">&bull;</span>
                        <span className="text-gray-300">Sci-Fi &amp; Adventure</span>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="px-4 py-2.5 rounded-xl bg-white text-dark text-xs font-black shadow-md flex items-center gap-1.5 cursor-default">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{settings.hero_cta_primary || 'Browse Archive'}</span>
                        </span>
                        <span className="px-4 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-default">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{settings.hero_cta_secondary || 'Curator Picks'} &bull; £39.99</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Simulated 3D Case */}
                    <div className="hidden md:flex flex-col items-center justify-center shrink-0 relative">
                      <div className="absolute -inset-2 bg-gradient-to-tr from-brand-blue/20 via-white/10 to-amber-400/15 rounded-2xl blur-xl opacity-60 pointer-events-none" />
                      <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900 relative animate-hero-card-float">
                        <img
                          src="/catalog/the-mandalorian-seasons-1-3.jpeg"
                          alt="3D Case Mockup"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 p-1 rounded bg-black/80 backdrop-blur-xs text-[9px] font-bold text-white flex justify-between">
                          <span>Box Set</span>
                          <span className="text-emerald-400">£39.99</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cinematic Hero Video Background (YouTube Embed - Per Film 1 Link) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-bold text-base text-dark">
                        Homepage Hero Video Background (YouTube Embed)
                      </h2>
                      {settings.hero_youtube_enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pilih film yang akan ditampilkan di Hero slider dan pasang 1 video trailer YouTube untuk masing-masing film dengan pengaturan durasi menit &amp; detik tayang.
                    </p>
                  </div>
                </div>

                {/* Enable Switch */}
                <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto bg-gray-50 hover:bg-gray-100 p-2 sm:px-3 sm:py-2 rounded-xl border border-gray-200 transition-colors">
                  <span className="text-xs font-bold text-gray-700">Enable Video</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.hero_youtube_enabled)}
                      onChange={(e) => handleChange('hero_youtube_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue" />
                  </div>
                </label>
              </div>

              {/* Global Audio & Loop Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mute Audio */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors bg-white">
                  <input
                    type="checkbox"
                    checked={settings.hero_youtube_mute ?? true}
                    onChange={(e) => handleChange('hero_youtube_mute', e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-dark">
                      <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                      <span>Mute Audio by Default</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Disarankan aktif agar autoplay browser tidak diblokir. Pengunjung tetap bisa klik tombol suara di homepage untuk mendengarkan audio trailer.
                    </p>
                  </div>
                </label>

                {/* Loop Video */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors bg-white">
                  <input
                    type="checkbox"
                    checked={settings.hero_youtube_loop ?? true}
                    onChange={(e) => handleChange('hero_youtube_loop', e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-dark">
                      <Repeat className="w-3.5 h-3.5 text-gray-500" />
                      <span>Loop Video Continuously</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Mengulang video trailer secara otomatis sebagai efek video sinematik ambient di latar belakang hero.
                    </p>
                  </div>
                </label>
              </div>

              {/* Per-Film Trailer Manager Section (1 Film = 1 Link Trailer) */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-dark flex items-center gap-2">
                      <Film className="w-4 h-4 text-brand-blue" />
                      <span>Daftar Film Hero &amp; Trailer (1 Film = 1 Link Trailer)</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Tentukan film yang tampil di slider Hero dan link trailer masing-masing film beserta durasi tayang yang diinginkan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTrailer}
                    className="gap-1.5 text-xs cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Film Hero</span>
                  </Button>
                </div>

                {heroTrailers.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-center space-y-3">
                    <Film className="w-8 h-8 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-gray-700">Belum ada trailer per-film yang dikonfigurasi</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Klik tombol di bawah untuk menambahkan film hero pertama beserta link trailer YouTube-nya.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddTrailer}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Trailer Film Pertama</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {heroTrailers.map((trailer, idx) => {
                      const selectedProduct = products.find((p) => p.id === trailer.product_id);
                      const trailerVideoId = extractYouTubeVideoId(trailer.youtube_url);
                      return (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-4 transition-all hover:border-gray-300"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-dark">
                                  {selectedProduct?.title || 'Pilih Film'}
                                </h4>
                                <p className="text-[11px] text-gray-500">
                                  {selectedProduct ? `${selectedProduct.release_year} • ${selectedProduct.format || 'DVD'} • SKU: ${selectedProduct.sku}` : 'Pilih produk dari katalog'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewTrailerIndex(idx)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  previewTrailerIndex === idx
                                    ? 'bg-brand-blue text-white'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                Preview Ini
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveTrailer(idx)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Hapus trailer film ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Film selector */}
                            <div className="md:col-span-5">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Pilih Film dari Katalog
                              </label>
                              <select
                                value={trailer.product_id}
                                onChange={(e) => handleUpdateTrailer(idx, { product_id: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 p-2.5 text-xs text-dark focus:border-brand-blue focus:outline-none bg-white font-medium cursor-pointer"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title} ({p.release_year}) — {p.format || 'DVD'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* YouTube URL */}
                            <div className="md:col-span-7">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Link Trailer YouTube untuk Film Ini
                              </label>
                              <input
                                type="text"
                                value={trailer.youtube_url || ''}
                                onChange={(e) => handleUpdateTrailer(idx, { youtube_url: e.target.value })}
                                placeholder="e.g. https://youtu.be/AwwbhhjQ9Xk atau ID YouTube"
                                className="w-full rounded-lg border border-gray-200 p-2.5 text-xs text-dark focus:border-brand-blue focus:outline-none bg-white"
                              />
                              {trailerVideoId ? (
                                <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>ID Valid: <strong className="font-mono">{trailerVideoId}</strong></span>
                                </p>
                              ) : trailer.youtube_url?.trim() ? (
                                <p className="text-[10px] text-amber-600 font-medium mt-1">
                                  Format URL belum valid. Masukkan URL YouTube atau ID video 11 karakter.
                                </p>
                              ) : null}
                            </div>

                            {/* Start Time: Menit & Detik */}
                            <div className="md:col-span-6 bg-white p-3 rounded-lg border border-gray-200">
                              <span className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-brand-blue" />
                                <span>Waktu Mulai Tayang (Start)</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Menit</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={trailer.start_minutes ?? 0}
                                    onChange={(e) =>
                                      handleUpdateTrailer(idx, {
                                        start_minutes: Math.max(0, parseInt(e.target.value) || 0),
                                      })
                                    }
                                    className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                                    placeholder="0"
                                  />
                                </div>
                                <span className="font-bold text-gray-400 mt-4">:</span>
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Detik</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={trailer.start_seconds ?? 0}
                                    onChange={(e) =>
                                      handleUpdateTrailer(idx, {
                                        start_seconds: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
                                      })
                                    }
                                    className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                                    placeholder="00"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* End Time: Menit & Detik */}
                            <div className="md:col-span-6 bg-white p-3 rounded-lg border border-gray-200">
                              <span className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Waktu Selesai Tayang (End)</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Menit</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={trailer.end_minutes ?? 1}
                                    onChange={(e) =>
                                      handleUpdateTrailer(idx, {
                                        end_minutes: Math.max(0, parseInt(e.target.value) || 0),
                                      })
                                    }
                                    className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                                    placeholder="1"
                                  />
                                </div>
                                <span className="font-bold text-gray-400 mt-4">:</span>
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Detik</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={trailer.end_seconds ?? 30}
                                    onChange={(e) =>
                                      handleUpdateTrailer(idx, {
                                        end_seconds: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
                                      })
                                    }
                                    className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                                    placeholder="30"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fallback YouTube URL (if any film has no trailer) */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <Input
                  label="URL Trailer Cadangan / Global Fallback (Opsional)"
                  value={settings.hero_youtube_url || ''}
                  onChange={(e) => handleChange('hero_youtube_url', e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=1g3_CFmnU7k"
                  helperText="Digunakan jika ada film di hero yang tidak memiliki link trailer khusus."
                />

                {/* Global Trailer Start & End Timing */}
                {Boolean(settings.hero_youtube_url?.trim()) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
                    {/* Global Start Time */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Waktu Mulai Global (Start)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 mb-0.5">Menit</label>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={settings.hero_youtube_start_minutes ?? 0}
                            onChange={(e) =>
                              handleChange('hero_youtube_start_minutes', Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                        <span className="font-bold text-gray-400 mt-4">:</span>
                        <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 mb-0.5">Detik</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={settings.hero_youtube_start_seconds ?? 0}
                            onChange={(e) =>
                              handleChange('hero_youtube_start_seconds', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                            className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Global End Time */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Waktu Selesai Global (End)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 mb-0.5">Menit</label>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={settings.hero_youtube_end_minutes ?? 0}
                            onChange={(e) =>
                              handleChange('hero_youtube_end_minutes', Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                            placeholder="1"
                          />
                        </div>
                        <span className="font-bold text-gray-400 mt-4">:</span>
                        <div className="flex-1">
                          <label className="block text-[10px] text-gray-500 mb-0.5">Detik</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={settings.hero_youtube_end_seconds ?? 30}
                            onChange={(e) =>
                              handleChange('hero_youtube_end_seconds', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                            className="w-full rounded-md border border-gray-200 p-2 text-xs text-dark font-mono text-center focus:border-brand-blue focus:outline-none"
                            placeholder="30"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Section with Film Tabs & Unshadowed Video */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Live Preview Video Trailer Hero (Shadow Gelap Dihilangkan)</span>
                  </div>
                  {activePreviewVideoId && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Live Embed Ready
                    </span>
                  )}
                </div>

                {/* Film switcher in preview */}
                {heroTrailers.length > 1 && (
                  <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
                    {heroTrailers.map((item, idx) => {
                      const p = products.find((pr) => pr.id === item.product_id);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewTrailerIndex(idx)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                            previewTrailerIndex === idx
                              ? 'bg-brand-blue text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {p?.title || `Film ${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative rounded-2xl overflow-hidden bg-[#07090E] border border-white/10 aspect-[16/7] min-h-[220px] max-h-[340px] shadow-2xl flex items-center p-6 sm:p-8">
                  {/* YouTube Iframe or Fallback backdrop - Clear & Vibrant (No dark shadow overlays) */}
                  {settings.hero_youtube_enabled && activePreviewVideoId ? (
                    <AdminHeroVideoPlayer
                      videoId={activePreviewVideoId}
                      startSec={activePreviewStart}
                      endSec={activePreviewEnd}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#0E131F] via-[#151C2C] to-[#07090E] flex flex-col items-center justify-center p-4 text-center">
                      <Youtube className="w-10 h-10 text-gray-600 mb-2" />
                      <p className="text-xs font-bold text-gray-400">
                        {settings.hero_youtube_enabled
                          ? 'Masukkan link trailer YouTube pada film untuk melihat preview video'
                          : 'Video background dinonaktifkan (poster film akan digunakan)'}
                      </p>
                    </div>
                  )}

                  {/* Delicate subtle bottom shelf fade only - NO heavy black shadow curtains */}
                  {settings.hero_youtube_enabled && activePreviewVideoId && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#07090E] to-transparent pointer-events-none" />
                  )}

                  {/* Simulated Content On Top with Text Shadow for Crisp Readability */}
                  <div className="relative z-10 space-y-2 max-w-md text-white pointer-events-none">
                    {settings.hero_badge_text && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 drop-shadow-md">
                        <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                        <span>{settings.hero_badge_text}</span>
                      </div>
                    )}
                    <h4 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {activePreviewProduct?.title || 'THE EXPENDABLES'}
                    </h4>
                    <p className="text-[11px] text-gray-100 line-clamp-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] font-medium">
                      Trailer video YouTube berputar jernih dan terang tanpa tertutup bayangan gelap.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-lg bg-white text-dark text-[11px] font-black shadow-lg">
                        View Details
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-[11px] font-bold shadow-lg">
                        Add to Basket &bull; £9.99
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: DIRECTOR / CURATOR SPOTLIGHT
        ========================================== */}
        {activeTab === 'curator' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="font-display font-bold text-base text-dark">Director & Curator Spotlight</h2>
                <p className="text-xs text-gray-500">
                  Editorial showcase module highlighting cinematic visionaries, physical media quotes, and 3 featured titles on the homepage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Director / Badge Title"
                  value={settings.director_badge || ''}
                  onChange={(e) => handleChange('director_badge', e.target.value)}
                  placeholder="e.g. DIRECTOR SPOTLIGHT"
                />

                <Input
                  label="Director / Curator Name"
                  value={settings.director_name || ''}
                  onChange={(e) => handleChange('director_name', e.target.value)}
                  placeholder="e.g. Christopher Nolan"
                />

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Curatorial Statement / Quote
                  </label>
                  <textarea
                    rows={2}
                    value={settings.director_quote || ''}
                    onChange={(e) => handleChange('director_quote', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                    placeholder="Quote regarding uncompressed transfers or physical film dignity..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Curatorial Biography & Vault Overview
                  </label>
                  <textarea
                    rows={3}
                    value={settings.director_bio || ''}
                    onChange={(e) => handleChange('director_bio', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs text-dark focus:border-brand-blue focus:outline-none"
                    placeholder="Overview of the director's collection..."
                  />
                </div>
              </div>

              {/* 3 Featured Titles with Live Film Cards */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-dark flex items-center gap-2">
                    <Film className="w-4 h-4 text-brand-blue" />
                    <span>Featured 3 Titles in Showcase Grid</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select 3 specific physical titles from the vault to display in the director banner.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {[0, 1, 2].map((idx) => {
                    const currentId = directorProductIds[idx] || '';
                    const selectedFilm = products.find((p) => p.id === currentId);

                    return (
                      <div key={idx} className="space-y-2 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                        <label className="block text-xs font-bold text-dark">
                          Showcase Film #{idx + 1}
                        </label>
                        <select
                          value={currentId}
                          onChange={(e) => {
                            const newIds = [...directorProductIds];
                            while (newIds.length <= idx) newIds.push('');
                            newIds[idx] = e.target.value;
                            handleChange('director_product_ids', newIds);
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-dark focus:border-brand-blue focus:outline-none"
                        >
                          <option value="">Select film...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({formatGBP(p.price)})
                            </option>
                          ))}
                        </select>

                        {/* Film Visual Preview Card */}
                        {selectedFilm ? (
                          <div className="mt-2 p-2.5 rounded-lg bg-white border border-gray-200 flex items-center gap-3 shadow-2xs">
                            <img
                              src={selectedFilm.cover_image_url}
                              alt={selectedFilm.title}
                              className="w-12 h-16 object-cover rounded shadow-xs shrink-0"
                            />
                            <div className="min-w-0 flex-1 text-xs space-y-0.5">
                              <div className="font-bold text-dark truncate">{selectedFilm.title}</div>
                              <div className="text-gray-500 font-medium text-[11px]">{selectedFilm.format || 'DVD'} &bull; {selectedFilm.release_year}</div>
                              <div className="text-brand-blue font-bold font-mono">{formatGBP(selectedFilm.price)}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 p-3 rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-400">
                            No film selected for slot #{idx + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Director Spotlight Live Preview */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Director Spotlight Live Preview</span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0D111A] via-[#090C12] to-[#05070B] border border-white/10 p-6 sm:p-8 text-white shadow-xl">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="max-w-md space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">
                        {settings.director_badge || 'DIRECTOR SPOTLIGHT'}
                      </div>

                      <h4 className="text-xl sm:text-2xl font-black text-white">
                        {settings.director_name || 'Christopher Nolan'}
                      </h4>

                      {settings.director_quote && (
                        <div className="pl-3 border-l-2 border-amber-500/50 italic text-xs text-gray-300 font-serif">
                          &quot;{settings.director_quote}&quot;
                        </div>
                      )}

                      {settings.director_bio && (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {settings.director_bio}
                        </p>
                      )}
                    </div>

                    {/* 3 Showcase films preview */}
                    <div className="flex items-center gap-2.5 shrink-0 overflow-x-auto max-w-full pb-1">
                      {[0, 1, 2].map((idx) => {
                        const film = products.find((p) => p.id === directorProductIds[idx]);
                        if (!film) return null;
                        return (
                          <div key={idx} className="w-24 shrink-0 rounded-lg overflow-hidden border border-white/15 bg-white/5 p-1.5 space-y-1">
                            <img src={film.cover_image_url} alt={film.title} className="w-full aspect-[2/3] object-cover rounded-sm" />
                            <div className="text-[10px] font-bold text-white truncate">{film.title}</div>
                            <div className="text-[10px] text-amber-400 font-mono">{formatGBP(film.price)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: SHIPPING, FEES & LOGISTICS
        ========================================== */}
        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs space-y-6">
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
                  min="0"
                  value={settings.free_shipping_threshold ?? 0}
                  onChange={(e) => handleChange('free_shipping_threshold', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.00"
                  helperText="Set to 0.00 for 100% Free UK Delivery on all orders."
                />

                <Input
                  label="Standard Tracked 48 Delivery Fee (£)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.standard_shipping_fee ?? 0}
                  onChange={(e) => handleChange('standard_shipping_fee', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.00"
                  helperText="Set to 0.00 for complimentary delivery across the UK."
                />

                <Input
                  label="Express Tracked 24 Delivery Fee (£)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.express_shipping_fee ?? 0}
                  onChange={(e) => handleChange('express_shipping_fee', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="4.99"
                />

                <Input
                  label="Low-stock Alert Threshold (units)"
                  type="number"
                  min="0"
                  step="1"
                  value={settings.low_stock_threshold ?? 0}
                  onChange={(e) => handleChange('low_stock_threshold', Math.max(0, e.target.value === '' ? 0 : parseInt(e.target.value, 10)))}
                  helperText="Products at or below this value appear as low stock."
                />

                <Input
                  label="Budget Collection Maximum (£)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.budget_collection_threshold ?? 0}
                  onChange={(e) => handleChange('budget_collection_threshold', Math.max(0, e.target.value === '' ? 0 : Number(e.target.value)))}
                  helperText="Controls the homepage budget collection using live product prices."
                />

                <Input
                  label="Same-Day Dispatch Cutoff Time"
                  value={settings.dispatch_cutoff_time || ''}
                  onChange={(e) => handleChange('dispatch_cutoff_time', e.target.value)}
                  placeholder="e.g. 14:00 GMT"
                />

                <Input label="Standard Service Name" value={settings.standard_shipping_name || ''} onChange={(e) => handleChange('standard_shipping_name', e.target.value)} placeholder="Carrier and service" />
                <Input label="Standard Delivery Estimate" value={settings.standard_shipping_eta || ''} onChange={(e) => handleChange('standard_shipping_eta', e.target.value)} placeholder="Customer-facing estimate" />
                <Input label="Express Service Name" value={settings.express_shipping_name || ''} onChange={(e) => handleChange('express_shipping_name', e.target.value)} placeholder="Carrier and service" />
                <Input label="Express Delivery Estimate" value={settings.express_shipping_eta || ''} onChange={(e) => handleChange('express_shipping_eta', e.target.value)} placeholder="Customer-facing estimate" />

                <Input
                  label="Registered Company / Store Name *"
                  value={settings.store_name || ''}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="DVDs Zone"
                  required
                />

                <Input
                  label="Registered Legal Entity *"
                  value={settings.registered_company_name || ''}
                  onChange={(e) => handleChange('registered_company_name', e.target.value)}
                  placeholder="DVDs Zone Ltd"
                  required
                />

                <Input
                  label="Companies House Number (8 chars) *"
                  value={settings.company_number || ''}
                  onChange={(e) => handleChange('company_number', e.target.value.toUpperCase())}
                  placeholder="13894195"
                  helperText="Must be 8 alphanumeric characters (e.g. 13894195)"
                  required
                />

                <div className="sm:col-span-3">
                  <Input
                    label="Registered Office Address"
                    value={settings.registered_office_address || ''}
                    onChange={(e) => handleChange('registered_office_address', e.target.value)}
                    placeholder="Official Companies House registered office"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Companies House Public Record URL"
                    type="url"
                    value={settings.companies_house_url || ''}
                    onChange={(e) => handleChange('companies_house_url', e.target.value)}
                    placeholder="https://find-and-update.company-information.service.gov.uk/company/..."
                  />
                </div>

                <Input
                  label="Store / Warehouse Location"
                  value={settings.warehouse_location || ''}
                  onChange={(e) => handleChange('warehouse_location', e.target.value)}
                  placeholder="Operational dispatch location"
                />

                <Input
                  label="Customer Support Email"
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  placeholder="enquiries@dvdszone.co.uk"
                />

                <Input
                  label="Customer Support Phone"
                  value={settings.support_phone || ''}
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
