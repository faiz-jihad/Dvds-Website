import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Disc } from 'lucide-react';
import { useFavouritesStore } from '../stores/useFavouritesStore';
import { publicApi } from '../lib/publicApi';
import { ProductCard } from '../components/product/ProductCard';
import { EmptyState } from '../components/common/EmptyState';
import { StoreDataState } from '../components/common/StoreDataState';
import { Seo } from '../components/common/Seo';

export const FavouritesPage: React.FC = () => {
  const { favourites } = useFavouritesStore();
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts() });
  const allProducts = productsQuery.data || [];

  const favProducts = allProducts.filter((p) => favourites.includes(p.id) && p.status === 'active');

  if (productsQuery.isLoading || productsQuery.error) {
    return <StoreDataState loading={productsQuery.isLoading} error={productsQuery.error} retry={() => productsQuery.refetch()} />;
  }

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-6 sm:py-10 transition-colors">
      <Seo title="My Wishlist — DVDs Zone" description="Your saved DVD wishlist." noIndex siteName="DVDs Zone" />
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-200 dark:border-white/10">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400">
            Saved Films
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark dark:text-white tracking-tight mt-1">
            Your Wishlist ({favProducts.length})
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Keep track of titles you wish to add to your home physical media library.
          </p>
        </div>

        {favProducts.length === 0 ? (
          <EmptyState
            title="No favourites saved yet"
            description="Tap the heart icon on any DVD title to keep track of films you wish to collect."
            actionText="Explore Vault"
            actionHref="/shop"
            icon={<Heart className="w-8 h-8 stroke-[1.5]" />}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
