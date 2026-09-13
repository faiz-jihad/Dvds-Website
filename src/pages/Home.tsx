import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/publicApi';
import { homepageApi } from '../lib/homepageApi';
import { StoreDataState } from '../components/common/StoreDataState';
import { HomepageSectionRenderer } from '../components/homepage/HomepageSectionRenderer';

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
    return <StoreDataState error={new Error('Unable to load homepage configuration.')} retry={() => configQuery.refetch()} />;
  }

  // Filter enabled sections and sort by Admin sortOrder
  const activeSections = [...config.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className="min-h-screen bg-white text-gray-950 antialiased selection:bg-brand-blue selection:text-white">
      {activeSections.map((section) => (
        <HomepageSectionRenderer
          key={section.id}
          section={section}
          products={products}
          categories={categories}
        />
      ))}
    </main>
  );
};
