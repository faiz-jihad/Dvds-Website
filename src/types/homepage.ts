// Homepage CMS Types & Discriminated Unions

export interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  altText?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  size?: number;
  focalPoint?: {
    x: number; // 0 to 100 percentage
    y: number; // 0 to 100 percentage
  };
  createdAt?: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  linkText?: string;
  linkUrl?: string;
  backgroundColor: string;
  textColor: string;
}

export interface HeroSectionConfig {
  eyebrow?: string;
  title: string;
  description?: string;
  desktopImage: string;
  mobileImage?: string;
  imageAlt: string;
  primaryCta?: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  textAlignment: 'left' | 'center' | 'right';
  overlay: 'none' | 'light' | 'medium' | 'strong';
  focalPoint?: {
    x: number;
    y: number;
  };
  backgroundColor?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface FeaturedCollectionItem {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  mobileImage?: string;
  imageAlt?: string;
  href: string;
  ctaLabel?: string;
  badge?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
}

export interface FeaturedSectionConfig {
  eyebrow?: string;
  title: string;
  description?: string;
  collections: FeaturedCollectionItem[];
}

export type ProductRailSourceType =
  | 'bestsellers'
  | 'newest'
  | 'sale'
  | 'featured'
  | 'category'
  | 'manual';

export interface ProductRailSectionConfig {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  sourceType: ProductRailSourceType;
  categorySlug?: string;
  manualProductIds?: string[];
  limit: number;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface CategoryTileItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  countLabel?: string;
}

export interface CategoryGridSectionConfig {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  categorySlugs?: string[];
  layout: 'grid' | 'carousel';
}

export interface EditorialCardItem {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  focalPoint?: {
    x: number;
    y: number;
  };
  href?: string;
  ctaLabel?: string;
  readTime?: string;
}

export interface EditorialSectionConfig {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cards: EditorialCardItem[];
}

export interface SpotlightSectionConfig {
  eyebrow?: string;
  title: string;
  description?: string;
  desktopImage: string;
  mobileImage?: string;
  imageAlt?: string;
  overlay: 'none' | 'light' | 'medium' | 'strong';
  focalPoint?: {
    x: number;
    y: number;
  };
  ctas: {
    label: string;
    href: string;
    variant?: 'primary' | 'secondary' | 'outline';
  }[];
  backgroundColor?: string;
}

export interface CampaignSectionConfig {
  badgeText?: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerImage: string;
  focalPoint?: {
    x: number;
    y: number;
  };
  backgroundColor?: string;
  textColor?: string;
  startsAt?: string;
  endsAt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  productSource?: ProductRailSourceType;
  productLimit?: number;
}

export interface NewsletterSectionConfig {
  eyebrow?: string;
  title: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  disclaimer?: string;
}

// Discriminated Union for Homepage Sections
export type HomepageSection =
  | { id: string; type: 'hero'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: HeroSectionConfig }
  | { id: string; type: 'featured'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: FeaturedSectionConfig }
  | { id: string; type: 'productRail'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: ProductRailSectionConfig }
  | { id: string; type: 'categoryGrid'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: CategoryGridSectionConfig }
  | { id: string; type: 'editorial'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: EditorialSectionConfig }
  | { id: string; type: 'spotlight'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: SpotlightSectionConfig }
  | { id: string; type: 'campaign'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: CampaignSectionConfig }
  | { id: string; type: 'newsletter'; enabled: boolean; sortOrder: number; startsAt?: string; endsAt?: string; data: NewsletterSectionConfig };

export type HomepageSectionType = HomepageSection['type'];

export interface HomepageConfig {
  id: string;
  status: 'draft' | 'published';
  announcement: AnnouncementConfig;
  sections: HomepageSection[];
  updatedAt: string;
}
