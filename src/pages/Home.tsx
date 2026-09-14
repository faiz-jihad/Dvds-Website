import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/publicApi';
import { homepageApi } from '../lib/homepageApi';
import { StoreDataState } from '../components/common/StoreDataState';
import { SpykerHero } from '../components/homepage/SpykerHero';
import { SpykerScrollExpandSection } from '../components/homepage/SpykerScrollExpandSection';
import { SpykerEditorialChapter } from '../components/homepage/SpykerEditorialChapter';
import { SpykerInteractiveGallery } from '../components/homepage/SpykerInteractiveGallery';
import { SpykerManifestoVideo } from '../components/homepage/SpykerManifestoVideo';
import { HomepageSectionRenderer } from '../components/homepage/HomepageSectionRenderer';
import { AnimatedContent } from '../components/motion/AnimatedContent';
import { Seo } from '../components/common/Seo';

export const Home: React.FC = () => {
  const configQuery = useQuery({
    queryKey: ['homepage', 'config'],
    queryFn: () => homepageApi.getHomepageConfig(),
    staleTime: 60_000,
  });

  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: () => publicApi.getProducts(),
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['store', 'categories'],
    queryFn: () => publicApi.getCategories(),
    staleTime: 60_000,
  });

  const isLoading = configQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading;
  const error = configQuery.error || productsQuery.error || categoriesQuery.error;

  if (isLoading || error) {
    return (
      <StoreDataState
        loading={isLoading}
        error={error || null}
        retry={() => {
          configQuery.refetch();
          productsQuery.refetch();
          categoriesQuery.refetch();
        }}
      />
    );
  }

  const config = configQuery.data;
  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  if (!config) {
    return (
      <StoreDataState
        error={new Error('Unable to load homepage configuration.')}
        retry={() => configQuery.refetch()}
      />
    );
  }

  // Filter enabled sections, retaining only curated product rails, categories, and newsletter
  const catalogueSections = [...config.sections]
    .filter(
      (section) =>
        section.enabled &&
        section.type !== 'hero' &&
        section.type !== 'editorial' &&
        section.type !== 'featured' &&
        section.type !== 'spotlight' &&
        section.type !== 'campaign'
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className="min-h-screen bg-[#06080b] text-white antialiased selection:bg-white selection:text-black">
      <Seo
        title="AZ Rayan DVDs — Buy Physical DVDs & TV Box Sets UK | London Media Vault"
        description="Discover definitive DVD box sets, restored British cinema, and rare collector editions preserved in uncompressed physical permanence. Dispatched worldwide with Royal Mail Tracked 24 from London. Free UK delivery over £25."
        canonicalPath="/"
        image="/catalog/the-mandalorian-seasons-1-3.jpeg"
        siteName="AZ Rayan DVDs"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Physical DVD Vault & Collector Editions',
          description:
            'Definitive physical DVD box sets and restored cinema releases available for UK and worldwide delivery.',
          url: 'https://azrayan-dvds.co.uk/',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: products.slice(0, 11).map((prod, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: prod.title,
              url: `https://azrayan-dvds.co.uk/product/${prod.slug}`,
              image: `https://azrayan-dvds.co.uk${prod.cover_image_url}`,
            })),
          },
        }}
      />

      {/* 00: Monumental Dutch Coachbuilder Hero */}
      <SpykerHero />

      {/* Interactive Cinematic Scroll Expand Transition */}
      <SpykerScrollExpandSection />

      {/* Chapter 01: Architectural 12-Column Asymmetric Editorial Layout */}
      <SpykerEditorialChapter />

      {/* Chapter 02: Interactive Accordion Vault (Displaying the 11 real Zack DVDs) */}
      <SpykerInteractiveGallery />

      {/* Chapter 03: Cinema Manifesto (2.39:1 Anamorphic Player HUD & 3 Pillars) */}
      <SpykerManifestoVideo />

      {/* Curated Dynamic Catalogue Sections (Product Rails, Category Grids, Vault Dispatch) */}
      {catalogueSections.map((section, index) => {
        const renderedSection = (
          <HomepageSectionRenderer
            section={section}
            products={products}
            categories={categories}
          />
        );

        return (
          <AnimatedContent key={section.id} delay={Math.min(index * 0.03, 0.12)} distance={28}>
            {renderedSection}
          </AnimatedContent>
        );
      })}
    </main>
  );
};
