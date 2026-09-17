import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Eye,
  Save,
  Send,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Edit2,
  Copy,
  Trash2,
  Plus,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  X,
  Sparkles,
  Tag,
  Film,
  Search,
  FolderTree,
  BookOpen,
  Mail,
  Sliders,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { homepageApi } from '../../lib/homepageApi';
import { adminApi } from '../../lib/adminApi';
import {
  HomepageConfig,
  HomepageSection,
  HomepageSectionType,
  HeroSectionConfig,
  FeaturedSectionConfig,
  ProductRailSectionConfig,
  CategoryGridSectionConfig,
  EditorialSectionConfig,
  SpotlightSectionConfig,
  CampaignSectionConfig,
  NewsletterSectionConfig,
} from '../../types/homepage';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { MediaPickerModal } from '../../components/admin/MediaPickerModal';
import { HomepageSectionRenderer } from '../../components/homepage/HomepageSectionRenderer';
import { useUiStore } from '../../stores/useUiStore';
import { AdminDataState } from '../../components/admin/AdminDataState';

export const AdminHomepage: React.FC = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  const draftQuery = useQuery({
    queryKey: ['admin', 'homepage', 'draft'],
    queryFn: () => homepageApi.getDraftHomepageConfig(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const productsQuery = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => adminApi.getProducts(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile' | 'none'>('none');

  // Editing Section Modal
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  // Add Section Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Media Picker Trigger
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    isOpen: boolean;
    targetField: string;
    targetIndex?: number;
    initialUrl?: string;
    initialAlt?: string;
    initialFocalPoint?: { x: number; y: number };
  }>({
    isOpen: false,
    targetField: '',
  });

  const [productPickerSearch, setProductPickerSearch] = useState('');

  useEffect(() => {
    if (draftQuery.data) {
      setConfig((current) => current || JSON.parse(JSON.stringify(draftQuery.data)));
    }
  }, [draftQuery.data]);

  const loading = draftQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading;
  const error = draftQuery.error || productsQuery.error || categoriesQuery.error;
  if (loading || error || !config) {
    return <AdminDataState
      loading={loading}
      error={error || (!config && !loading ? new Error('Homepage configuration could not be initialized.') : null)}
      onRetry={() => {
        draftQuery.refetch();
        productsQuery.refetch();
        categoriesQuery.refetch();
      }}
    />;
  }

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  // ==========================================
  // Section Ordering and Status Toggles
  // ==========================================
  const handleToggleSection = (id: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
      };
    });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    setConfig((prev) => {
      if (!prev) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.sections.length) return prev;

      const newSections = [...prev.sections];
      const temp = newSections[index];
      newSections[index] = newSections[targetIndex];
      newSections[targetIndex] = temp;

      // Re-assign sortOrder
      return {
        ...prev,
        sections: newSections.map((s, idx) => ({ ...s, sortOrder: idx })),
      };
    });
  };

  const handleDeleteSection = (id: string) => {
    if (!confirm('Are you sure you want to remove this section from the homepage?')) return;
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, sortOrder: idx })),
      };
    });
    addToast('Section removed', 'info');
  };

  const handleDuplicateSection = (section: HomepageSection) => {
    const duplicated: HomepageSection = {
      ...JSON.parse(JSON.stringify(section)),
      id: `section-${Date.now()}`,
      sortOrder: section.sortOrder + 1,
    };

    setConfig((prev) => {
      if (!prev) return prev;
      const newSections = [...prev.sections];
      newSections.splice(section.sortOrder + 1, 0, duplicated);
      return {
        ...prev,
        sections: newSections.map((s, idx) => ({ ...s, sortOrder: idx })),
      };
    });
    addToast(`Duplicated section "${section.type}"`, 'success');
  };

  // ==========================================
  // Save & Publish Handlers
  // ==========================================
  const handleSaveDraft = async () => {
    if (!config || isSaving || isPublishing) return;
    setIsSaving(true);
    try {
      await homepageApi.saveDraftHomepageConfig(config);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'homepage'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast('Draft homepage saved successfully', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save draft homepage', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!config || isSaving || isPublishing) return;
    setIsPublishing(true);
    try {
      await homepageApi.publishHomepageConfig(config);
      await queryClient.invalidateQueries({ queryKey: ['homepage'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'homepage'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast('🎉 Homepage published live to customer storefront!', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to publish homepage', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevert = async () => {
    if (isSaving || isPublishing) return;
    if (!confirm('Revert all draft changes back to the currently published live homepage?')) return;
    setIsSaving(true);
    try {
      const reverted = await homepageApi.revertDraftToPublished();
      setConfig(reverted);
      queryClient.setQueryData(['admin', 'homepage', 'draft'], reverted);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast('Draft reverted to live version', 'info');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to revert draft', 'error');
    } finally { setIsSaving(false); }
  };

  // ==========================================
  // Section Creator
  // ==========================================
  const handleAddSection = (type: HomepageSectionType) => {
    let defaultData: any = {};

    switch (type) {
      case 'hero':
        defaultData = {
          eyebrow: "THE COLLECTOR'S EDITION",
          title: 'Films Worth Owning.',
          description: 'Discover essential cinema on physical media.',
          desktopImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&auto=format&fit=crop&q=85',
          imageAlt: 'Cinema Theatre',
          primaryCta: { label: 'Shop the Collection', href: '/shop' },
          textAlignment: 'left',
          overlay: 'medium',
          focalPoint: { x: 50, y: 40 },
        };
        break;
      case 'featured':
        defaultData = {
          eyebrow: 'FEATURED',
          title: 'Curated Collections',
          collections: [],
        };
        break;
      case 'productRail':
        defaultData = {
          eyebrow: 'TRENDING',
          title: 'Collector Favourites',
          sourceType: 'bestsellers',
          limit: 8,
          ctaLabel: 'View All',
          ctaHref: '/shop',
        };
        break;
      case 'categoryGrid':
        defaultData = {
          eyebrow: 'DISCOVERY',
          title: 'Shop by Category',
          layout: 'grid',
        };
        break;
      case 'editorial':
        defaultData = {
          eyebrow: 'ESSAYS',
          title: 'Cinema Stories',
          cards: [],
        };
        break;
      case 'spotlight':
        defaultData = {
          title: 'Spotlight Banner',
          desktopImage: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&auto=format&fit=crop&q=85',
          overlay: 'medium',
          ctas: [{ label: 'Explore', href: '/shop' }],
        };
        break;
      case 'campaign':
        defaultData = {
          badgeText: 'SALE',
          title: 'Special Archive Drop',
          bannerImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&auto=format&fit=crop&q=85',
          productSource: 'sale',
          productLimit: 4,
          ctaLabel: 'Shop Sale',
          ctaHref: '/shop?filter=sale',
        };
        break;
      case 'newsletter':
        defaultData = {
          title: 'Keep the collection growing.',
          description: 'Occasional notices on rare catalog arrivals.',
          buttonText: 'Subscribe',
        };
        break;
    }

    const newSec: HomepageSection = {
      id: `section-${Date.now()}`,
      type,
      enabled: true,
      sortOrder: config.sections.length,
      data: defaultData,
    } as HomepageSection;

    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: [...prev.sections, newSec] };
    });

    setIsAddModalOpen(false);
    setEditingSection(newSec);
    setIsSectionModalOpen(true);
  };

  // Section saving from modal
  const handleSaveEditedSection = () => {
    if (!editingSection) return;
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => (s.id === editingSection.id ? editingSection : s)),
      };
    });
    setIsSectionModalOpen(false);
    setEditingSection(null);
    addToast('Section updated in draft', 'success');
  };

  const getSectionIcon = (type: HomepageSectionType) => {
    switch (type) {
      case 'hero': return Film;
      case 'featured': return Sparkles;
      case 'productRail': return Sliders;
      case 'categoryGrid': return FolderTree;
      case 'editorial': return BookOpen;
      case 'spotlight': return Sparkles;
      case 'campaign': return Tag;
      case 'newsletter': return Mail;
      default: return Layers;
    }
  };

  // ==========================================
  // Live Device Preview Render
  // ==========================================
  if (previewDevice !== 'none') {
    const previewWidth = {
      desktop: 'w-full',
      tablet: 'w-[768px] border-x border-gray-400 shadow-2xl',
      mobile: 'w-[375px] border-x border-gray-400 shadow-2xl',
    }[previewDevice];

    const activeSections = config.sections
      .filter((s) => s.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        {/* Preview Topbar */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm">Live Preview Mode</span>
            <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded flex items-center gap-1.5 ${
                  previewDevice === 'desktop' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`px-3 py-1 rounded flex items-center gap-1.5 ${
                  previewDevice === 'tablet' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" /> Tablet (768px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded flex items-center gap-1.5 ${
                  previewDevice === 'mobile' ? 'bg-brand-blue text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile (375px)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPreviewDevice('none')}
              className="bg-white text-dark hover:bg-gray-100"
            >
              Exit Preview
            </Button>
          </div>
        </div>

        {/* Scaled Preview Frame */}
        <div className="flex-1 overflow-y-auto bg-gray-950/60 p-4 flex justify-center">
          <div className={`bg-white transition-all duration-300 min-h-screen ${previewWidth}`}>
            {activeSections.map((sec) => (
              <HomepageSectionRenderer
                key={sec.id}
                section={sec}
                products={products}
                categories={categories}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Main Admin CMS View
  // ==========================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header & Publishing Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-dark tracking-tight">
              Homepage Builder
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
              CMS Draft Mode
            </span>
          </div>
          <p className="text-xs text-gray-500 font-light">
            Manage sections, visual storytelling, campaigns, and photography without editing source code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Device Previews */}
          <div className="flex items-center border border-gray-200 rounded-md p-0.5 bg-white shadow-xs mr-2">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              title="Desktop Preview"
              className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-dark transition-colors"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('tablet')}
              title="Tablet Preview"
              className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-dark transition-colors"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              title="Mobile Preview"
              className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-dark transition-colors"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRevert}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
            className="rounded-full px-5 flex items-center gap-1.5 text-xs font-bold shadow-md shadow-brand-blue/20"
          >
            <Send className="w-3.5 h-3.5" /> {isPublishing ? 'Publishing...' : 'Publish Live'}
          </Button>
        </div>
      </div>

      {/* 1. Announcement Bar Settings Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-blue-50 text-brand-blue">
              <Mail className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display font-bold text-sm text-dark">Announcement / Service Bar</h2>
              <p className="text-[11px] text-gray-400">Persistent top-level message</p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-mono font-semibold text-gray-600">
              {config.announcement.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <input
              type="checkbox"
              checked={config.announcement.enabled}
              onChange={(e) =>
                setConfig((prev) =>
                  prev ? { ...prev, announcement: { ...prev.announcement, enabled: e.target.checked } } : prev
                )
              }
              className="accent-brand-blue w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {config.announcement.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-6">
              <Input
                label="Banner Text"
                value={config.announcement.text}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, announcement: { ...prev.announcement, text: e.target.value } } : prev
                  )
                }
                placeholder="Royal Mail Tracked 24/48 UK Dispatch..."
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="Link Text"
                value={config.announcement.linkText || ''}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, announcement: { ...prev.announcement, linkText: e.target.value } } : prev
                  )
                }
                placeholder="Delivery Info"
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="Link URL"
                value={config.announcement.linkUrl || ''}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, announcement: { ...prev.announcement, linkUrl: e.target.value } } : prev
                  )
                }
                placeholder="/delivery"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Homepage Sections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-lg text-dark">Homepage Section Ordering</h2>
            <p className="text-xs text-gray-500">
              Drag or use arrows to rearrange sections. Click edit to configure imagery, focal points, and copy.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Add Section
          </Button>
        </div>

        <div className="space-y-2.5">
          {config.sections.map((section, index) => {
            const IconComponent = getSectionIcon(section.type);
            const sectionTitle =
              (section.data as any).title || (section.data as any).eyebrow || section.type.toUpperCase();

            return (
              <div
                key={section.id}
                className={`flex items-center justify-between p-4 rounded-xl border bg-white transition-all shadow-xs ${
                  section.enabled ? 'border-gray-200' : 'border-gray-200/60 opacity-60 bg-gray-50/50'
                }`}
              >
                {/* Left info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-700 shrink-0">
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-brand-blue">
                        {section.type}
                      </span>
                      <h3 className="font-display font-bold text-sm text-dark truncate">
                        {sectionTitle}
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      Order #{index + 1} · {section.enabled ? 'Live in draft' : 'Hidden'}
                    </p>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Reorder buttons */}
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 'up')}
                    disabled={index === 0}
                    title="Move section up"
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 'down')}
                    disabled={index === config.sections.length - 1}
                    title="Move section down"
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {/* Toggle enabled */}
                  <label className="flex items-center cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={() => handleToggleSection(section.id)}
                      className="accent-brand-blue w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(JSON.parse(JSON.stringify(section)));
                      setIsSectionModalOpen(true);
                    }}
                    title="Edit section details"
                    className="p-2 rounded-md hover:bg-blue-50 text-brand-blue transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateSection(section)}
                    title="Duplicate section"
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    title="Delete section"
                    className="p-2 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. ADD NEW SECTION MODAL                                  */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Homepage Section"
        maxWidth="lg"
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          {[
            { type: 'hero', label: 'Cinematic Hero', desc: 'Large campaign banner with desktop & mobile images' },
            { type: 'featured', label: 'Featured Collections', desc: '2–4 large visual editorial cards' },
            { type: 'productRail', label: 'Product Rail / Carousel', desc: 'Trending, bestsellers, or manual picks' },
            { type: 'categoryGrid', label: 'Shop by Category', desc: 'Visual genre & format discovery tiles' },
            { type: 'editorial', label: 'Editorial / Storytelling', desc: 'Culture essays & collector guides' },
            { type: 'spotlight', label: 'Spotlight Showcase', desc: 'Director or master collection multi-CTA' },
            { type: 'campaign', label: 'Sale / Campaign', desc: 'Clearance & time-limited promotional banner' },
            { type: 'newsletter', label: 'Newsletter Signup', desc: 'Minimalist physical media subscriber form' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => handleAddSection(item.type as HomepageSectionType)}
              className="p-4 rounded-xl border border-gray-200 hover:border-brand-blue hover:bg-blue-50/50 text-left transition-all group"
            >
              <h3 className="font-display font-bold text-sm text-dark group-hover:text-brand-blue">
                {item.label}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* 4. EDIT SECTION MODAL                                     */}
      {/* ========================================================= */}
      {editingSection && (
        <Modal
          isOpen={isSectionModalOpen}
          onClose={() => {
            setIsSectionModalOpen(false);
            setEditingSection(null);
          }}
          title={`Edit Section: ${editingSection.type.toUpperCase()}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Common Status & Dates */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
              <Input
                label="Campaign Starts At (Optional ISO Date)"
                value={editingSection.startsAt || ''}
                onChange={(e) =>
                  setEditingSection({ ...editingSection, startsAt: e.target.value || undefined })
                }
                placeholder="2026-03-01T00:00:00Z"
              />
              <Input
                label="Campaign Ends At (Auto-expirational)"
                value={editingSection.endsAt || ''}
                onChange={(e) =>
                  setEditingSection({ ...editingSection, endsAt: e.target.value || undefined })
                }
                placeholder="2026-04-01T00:00:00Z"
              />
            </div>

            {/* HERO SECTION EDITOR */}
            {editingSection.type === 'hero' && (
              <div className="space-y-4">
                <Input
                  label="Eyebrow Text"
                  value={(editingSection.data as HeroSectionConfig).eyebrow || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as HeroSectionConfig), eyebrow: e.target.value },
                    })
                  }
                  placeholder="THE COLLECTOR'S EDITION"
                />

                <Input
                  label="Hero Headline Title *"
                  value={(editingSection.data as HeroSectionConfig).title}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as HeroSectionConfig), title: e.target.value },
                    })
                  }
                  placeholder="Films Worth Owning."
                  required
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Description Text
                  </label>
                  <textarea
                    rows={2}
                    value={(editingSection.data as HeroSectionConfig).description || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as HeroSectionConfig), description: e.target.value },
                      })
                    }
                    className="w-full p-3 bg-white border border-gray-300 rounded-md text-xs text-dark focus:outline-none focus:border-brand-blue"
                  />
                </div>

                {/* Images Config */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Desktop Image & Focal Point
                    </label>
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-gray-200 bg-gray-900 mb-2">
                      <img
                        src={(editingSection.data as HeroSectionConfig).desktopImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${(editingSection.data as HeroSectionConfig).focalPoint?.x ?? 50}% ${(editingSection.data as HeroSectionConfig).focalPoint?.y ?? 50}%`,
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setMediaPickerConfig({
                          isOpen: true,
                          targetField: 'hero-desktop',
                          initialUrl: (editingSection.data as HeroSectionConfig).desktopImage,
                          initialAlt: (editingSection.data as HeroSectionConfig).imageAlt,
                          initialFocalPoint: (editingSection.data as HeroSectionConfig).focalPoint,
                        })
                      }
                      className="w-full text-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1" /> Change Desktop Media
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Mobile Dedicated Image (Optional)
                    </label>
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-gray-200 bg-gray-900 mb-2">
                      {(editingSection.data as HeroSectionConfig).mobileImage ? (
                        <img
                          src={(editingSection.data as HeroSectionConfig).mobileImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-mono">
                          Uses desktop image
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setMediaPickerConfig({
                          isOpen: true,
                          targetField: 'hero-mobile',
                          initialUrl: (editingSection.data as HeroSectionConfig).mobileImage || '',
                        })
                      }
                      className="w-full text-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5 mr-1" /> Set Mobile Image
                    </Button>
                  </div>
                </div>

                {/* CTAs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Input
                    label="Primary CTA Label"
                    value={(editingSection.data as HeroSectionConfig).primaryCta?.label || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: {
                          ...(editingSection.data as HeroSectionConfig),
                          primaryCta: {
                            href: (editingSection.data as HeroSectionConfig).primaryCta?.href || '/shop',
                            label: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Primary CTA URL"
                    value={(editingSection.data as HeroSectionConfig).primaryCta?.href || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: {
                          ...(editingSection.data as HeroSectionConfig),
                          primaryCta: {
                            label: (editingSection.data as HeroSectionConfig).primaryCta?.label || 'Shop',
                            href: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Secondary CTA Label"
                    value={(editingSection.data as HeroSectionConfig).secondaryCta?.label || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: {
                          ...(editingSection.data as HeroSectionConfig),
                          secondaryCta: {
                            href: (editingSection.data as HeroSectionConfig).secondaryCta?.href || '/shop',
                            label: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <Input
                    label="Secondary CTA URL"
                    value={(editingSection.data as HeroSectionConfig).secondaryCta?.href || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: {
                          ...(editingSection.data as HeroSectionConfig),
                          secondaryCta: {
                            label: (editingSection.data as HeroSectionConfig).secondaryCta?.label || 'Explore',
                            href: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>

                {/* Overlay & Text Alignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Text Alignment
                    </label>
                    <select
                      value={(editingSection.data as HeroSectionConfig).textAlignment || 'left'}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as HeroSectionConfig),
                            textAlignment: e.target.value as any,
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Dark Gradient Overlay
                    </label>
                    <select
                      value={(editingSection.data as HeroSectionConfig).overlay || 'medium'}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as HeroSectionConfig),
                            overlay: e.target.value as any,
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    >
                      <option value="none">None (Clean Image)</option>
                      <option value="light">Light Shadow</option>
                      <option value="medium">Medium Cinematic (Recommended)</option>
                      <option value="strong">Strong High-Contrast</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCT RAIL EDITOR */}
            {editingSection.type === 'productRail' && (
              <div className="space-y-4">
                <Input
                  label="Rail Title *"
                  value={(editingSection.data as ProductRailSectionConfig).title}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as ProductRailSectionConfig), title: e.target.value },
                    })
                  }
                  placeholder="Trending in the Vault"
                  required
                />

                <Input
                  label="Subtitle / Description"
                  value={(editingSection.data as ProductRailSectionConfig).subtitle || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as ProductRailSectionConfig), subtitle: e.target.value },
                    })
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Product Data Source
                    </label>
                    <select
                      value={(editingSection.data as ProductRailSectionConfig).sourceType}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as ProductRailSectionConfig),
                            sourceType: e.target.value as any,
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    >
                      <option value="bestsellers">Best Sellers (Automatic)</option>
                      <option value="newest">New Releases (Automatic)</option>
                      <option value="sale">Special Offers / On Sale (Automatic)</option>
                      <option value="featured">Curator Featured (Automatic)</option>
                      <option value="category">Filter by Specific Category</option>
                      <option value="manual">Manual DVD Selection (Pick Specific Titles)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Max Items Displayed
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="16"
                      value={(editingSection.data as ProductRailSectionConfig).limit}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as ProductRailSectionConfig),
                            limit: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    />
                  </div>
                </div>

                {/* Specific Category Selector if sourceType is category */}
                {(editingSection.data as ProductRailSectionConfig).sourceType === 'category' && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-lg space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Select Category
                    </label>
                    <select
                      value={(editingSection.data as ProductRailSectionConfig).categorySlug || ''}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as ProductRailSectionConfig),
                            categorySlug: e.target.value,
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Manual Product Picker UI if sourceType is manual */}
                {(editingSection.data as ProductRailSectionConfig).sourceType === 'manual' && (
                  <div className="space-y-3 pt-1 border border-blue-200/80 bg-blue-50/30 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-800">
                          Select DVDs to Feature in this Section
                        </label>
                        <p className="text-[11px] text-gray-500">Check each DVD title you wish to display.</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-blue bg-blue-100 px-2.5 py-0.5 rounded-full">
                        {((editingSection.data as ProductRailSectionConfig).manualProductIds || []).length} Selected
                      </span>
                    </div>

                    {/* Search & Bulk Toggle Controls */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter DVDs by title or SKU..."
                          value={productPickerSearch}
                          onChange={(e) => setProductPickerSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue"
                        />
                        {productPickerSearch && (
                          <button
                            type="button"
                            onClick={() => setProductPickerSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const selected = (editingSection.data as ProductRailSectionConfig).manualProductIds || [];
                          const filtered = products
                            .filter((p) =>
                              !productPickerSearch ||
                              p.title.toLowerCase().includes(productPickerSearch.toLowerCase()) ||
                              p.sku.toLowerCase().includes(productPickerSearch.toLowerCase())
                            )
                            .map((p) => p.id);
                          const newSet = Array.from(new Set([...selected, ...filtered]));
                          setEditingSection({
                            ...editingSection,
                            data: {
                              ...(editingSection.data as ProductRailSectionConfig),
                              manualProductIds: newSet,
                            },
                          });
                        }}
                        className="text-[11px] font-semibold text-brand-blue hover:bg-blue-50 px-2.5 py-1.5 rounded border border-blue-200 bg-white transition shrink-0"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSection({
                            ...editingSection,
                            data: {
                              ...(editingSection.data as ProductRailSectionConfig),
                              manualProductIds: [],
                            },
                          });
                        }}
                        className="text-[11px] font-semibold text-gray-500 hover:bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200 bg-white transition shrink-0"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Scrollable Products List */}
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white p-1 shadow-2xs">
                      {products
                        .filter((p) =>
                          !productPickerSearch ||
                          p.title.toLowerCase().includes(productPickerSearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(productPickerSearch.toLowerCase())
                        )
                        .map((p) => {
                          const selected = ((editingSection.data as ProductRailSectionConfig).manualProductIds || []).includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition select-none ${
                                selected ? 'bg-blue-50/80 font-medium' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const currentIds = (editingSection.data as ProductRailSectionConfig).manualProductIds || [];
                                  const nextIds = selected
                                    ? currentIds.filter((id) => id !== p.id)
                                    : [...currentIds, p.id];
                                  setEditingSection({
                                    ...editingSection,
                                    data: {
                                      ...(editingSection.data as ProductRailSectionConfig),
                                      manualProductIds: nextIds,
                                    },
                                  });
                                }}
                                className="accent-brand-blue w-4 h-4 rounded shrink-0"
                              />

                              <div className="w-8 h-11 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200">
                                <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-dark truncate">{p.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                  <span>{p.format}</span>
                                  <span>•</span>
                                  <span>{p.release_year}</span>
                                  <span>•</span>
                                  <span>{p.sku}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-bold text-dark">
                                  £{p.price.toFixed(2)}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Rail CTA Button Label"
                    value={(editingSection.data as ProductRailSectionConfig).ctaLabel || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as ProductRailSectionConfig), ctaLabel: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Rail CTA Destination URL"
                    value={(editingSection.data as ProductRailSectionConfig).ctaHref || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as ProductRailSectionConfig), ctaHref: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* CATEGORY GRID EDITOR */}
            {editingSection.type === 'categoryGrid' && (
              <div className="space-y-4">
                <Input
                  label="Section Title *"
                  value={(editingSection.data as CategoryGridSectionConfig).title}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as CategoryGridSectionConfig), title: e.target.value },
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Eyebrow"
                    value={(editingSection.data as CategoryGridSectionConfig).eyebrow || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as CategoryGridSectionConfig), eyebrow: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Subtitle"
                    value={(editingSection.data as CategoryGridSectionConfig).subtitle || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as CategoryGridSectionConfig), subtitle: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Choose Categories to Display on Homepage
                    </label>
                    <span className="text-xs font-mono font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full">
                      {((editingSection.data as CategoryGridSectionConfig).categorySlugs || []).length} Categories Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-56 overflow-y-auto">
                    {categories.map((cat) => {
                      const slugs = (editingSection.data as CategoryGridSectionConfig).categorySlugs || [];
                      const isSelected = slugs.includes(cat.slug);
                      const prodCount = products.filter((p) => p.category_id === cat.id).length;

                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-white border-brand-blue font-bold text-dark shadow-2xs'
                              : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const nextSlugs = isSelected
                                ? slugs.filter((s) => s !== cat.slug)
                                : [...slugs, cat.slug];
                              setEditingSection({
                                ...editingSection,
                                data: {
                                  ...(editingSection.data as CategoryGridSectionConfig),
                                  categorySlugs: nextSlugs,
                                },
                              });
                            }}
                            className="accent-brand-blue w-3.5 h-3.5 rounded shrink-0"
                          />
                          <span className="truncate flex-1">{cat.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.2 rounded shrink-0">
                            {prodCount}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* CAMPAIGN EDITOR */}
            {editingSection.type === 'campaign' && (
              <div className="space-y-4">
                <Input
                  label="Campaign Title *"
                  value={(editingSection.data as CampaignSectionConfig).title}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as CampaignSectionConfig), title: e.target.value },
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Badge Tag"
                    value={(editingSection.data as CampaignSectionConfig).badgeText || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as CampaignSectionConfig), badgeText: e.target.value },
                      })
                    }
                    placeholder="SALE UNDER £15"
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Product Data Source
                    </label>
                    <select
                      value={(editingSection.data as CampaignSectionConfig).productSource || 'sale'}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as CampaignSectionConfig),
                            productSource: e.target.value as any,
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    >
                      <option value="sale">Special Offers / On Sale</option>
                      <option value="bestsellers">Best Sellers</option>
                      <option value="newest">New Releases</option>
                      <option value="featured">Curator Featured</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Subtitle"
                    value={(editingSection.data as CampaignSectionConfig).subtitle || ''}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        data: { ...(editingSection.data as CampaignSectionConfig), subtitle: e.target.value },
                      })
                    }
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                      Product Count Limit
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={(editingSection.data as CampaignSectionConfig).productLimit || 4}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          data: {
                            ...(editingSection.data as CampaignSectionConfig),
                            productLimit: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md text-xs text-dark"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="w-16 h-12 rounded bg-gray-900 overflow-hidden shrink-0">
                    <img
                      src={(editingSection.data as CampaignSectionConfig).bannerImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setMediaPickerConfig({
                        isOpen: true,
                        targetField: 'campaign-banner',
                        initialUrl: (editingSection.data as CampaignSectionConfig).bannerImage,
                      })
                    }
                    className="text-xs"
                  >
                    Change Campaign Banner Media
                  </Button>
                </div>
              </div>
            )}

            {/* GENERIC / SIMPLE FALLBACK FOR OTHER TYPES */}
            {['featured', 'editorial', 'spotlight', 'newsletter'].includes(
              editingSection.type
            ) && (
              <div className="space-y-3">
                <Input
                  label="Section Title"
                  value={(editingSection.data as any).title || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as any), title: e.target.value },
                    })
                  }
                />
                <Input
                  label="Eyebrow Text"
                  value={(editingSection.data as any).eyebrow || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...(editingSection.data as any), eyebrow: e.target.value },
                    })
                  }
                />
                {editingSection.type === 'spotlight' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setMediaPickerConfig({
                        isOpen: true,
                        targetField: 'spotlight-desktop',
                        initialUrl: (editingSection.data as SpotlightSectionConfig).desktopImage,
                        initialFocalPoint: (editingSection.data as SpotlightSectionConfig).focalPoint,
                      })
                    }
                  >
                    Change Spotlight Visual Asset
                  </Button>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsSectionModalOpen(false);
                  setEditingSection(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveEditedSection}>
                Update Draft Section
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* 5. MEDIA PICKER MODAL                                     */}
      {/* ========================================================= */}
      <MediaPickerModal
        isOpen={mediaPickerConfig.isOpen}
        onClose={() => setMediaPickerConfig({ ...mediaPickerConfig, isOpen: false })}
        initialUrl={mediaPickerConfig.initialUrl}
        initialAlt={mediaPickerConfig.initialAlt}
        initialFocalPoint={mediaPickerConfig.initialFocalPoint}
        onSelect={(result) => {
          if (!editingSection) return;

          if (mediaPickerConfig.targetField === 'hero-desktop' && editingSection.type === 'hero') {
            setEditingSection({
              ...editingSection,
              data: {
                ...editingSection.data,
                desktopImage: result.url,
                imageAlt: result.altText || editingSection.data.imageAlt,
                focalPoint: result.focalPoint,
              },
            });
          } else if (mediaPickerConfig.targetField === 'hero-mobile' && editingSection.type === 'hero') {
            setEditingSection({
              ...editingSection,
              data: {
                ...editingSection.data,
                mobileImage: result.url,
              },
            });
          } else if (mediaPickerConfig.targetField === 'campaign-banner' && editingSection.type === 'campaign') {
            setEditingSection({
              ...editingSection,
              data: {
                ...editingSection.data,
                bannerImage: result.url,
                focalPoint: result.focalPoint,
              },
            });
          } else if (mediaPickerConfig.targetField === 'spotlight-desktop' && editingSection.type === 'spotlight') {
            setEditingSection({
              ...editingSection,
              data: {
                ...editingSection.data,
                desktopImage: result.url,
                focalPoint: result.focalPoint,
              },
            });
          }
        }}
      />
    </div>
  );
};
