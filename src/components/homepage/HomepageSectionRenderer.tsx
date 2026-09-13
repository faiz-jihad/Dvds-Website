import React from 'react';
import { HomepageSection } from '../../types/homepage';
import { Category, Product } from '../../types';
import { HeroSection } from './HeroSection';
import { FeaturedSection } from './FeaturedSection';
import { ProductRailSection } from './ProductRailSection';
import { CategoryGridSection } from './CategoryGridSection';
import { EditorialSection } from './EditorialSection';
import { SpotlightSection } from './SpotlightSection';
import { CampaignSection } from './CampaignSection';
import { NewsletterSection } from './NewsletterSection';

interface HomepageSectionRendererProps {
  section: HomepageSection;
  products: Product[];
  categories: Category[];
}

export const HomepageSectionRenderer: React.FC<HomepageSectionRendererProps> = ({
  section,
  products,
  categories,
}) => {
  if (!section.enabled) return null;

  // Date range check
  const now = Date.now();
  if (section.startsAt && Date.parse(section.startsAt) > now) return null;
  if (section.endsAt && Date.parse(section.endsAt) < now) return null;

  switch (section.type) {
    case 'hero':
      return <HeroSection data={section.data} startsAt={section.startsAt} endsAt={section.endsAt} />;

    case 'featured':
      return <FeaturedSection data={section.data} />;

    case 'productRail':
      return <ProductRailSection data={section.data} allProducts={products} />;

    case 'categoryGrid':
      return <CategoryGridSection data={section.data} categories={categories} products={products} />;

    case 'editorial':
      return <EditorialSection data={section.data} />;

    case 'spotlight':
      return <SpotlightSection data={section.data} />;

    case 'campaign':
      return <CampaignSection data={section.data} allProducts={products} startsAt={section.startsAt} endsAt={section.endsAt} />;

    case 'newsletter':
      return <NewsletterSection data={section.data} />;

    default:
      return null;
  }
};
