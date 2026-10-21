import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Disc, Film, Sparkles, ArrowRight } from 'lucide-react';
import { useFavouritesStore } from '../stores/useFavouritesStore';
import { publicApi } from '../lib/publicApi';
import { ProductCard } from '../components/product/ProductCard';
import { EmptyState } from '../components/common/EmptyState';
import { StoreDataState } from '../components/common/StoreDataState';
import { Button } from '../components/common/Button';
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
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-10 sm:py-16 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(23,105,224,0.15),transparent)] pointer-events-none" />

      <Seo title="My Wishlist — DVDs Zone UK" description="Your saved DVD collection and physical media wishlist." noIndex siteName="DVDs Zone" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <div className="pb-6 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue dark:text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase mb-2">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>SAVED PHYSICAL MEDIA</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-dark dark:text-white tracking-tight">
              Your Wishlist{' '}
              <span className="text-gray-400 dark:text-gray-500 font-normal text-2xl sm:text-4xl">
                ({favProducts.length})
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Curate and keep track of physical box sets and cinema titles you wish to add to your home collection.
            </p>
          </div>

          {favProducts.length > 0 && (
            <Link to="/shop">
              <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5 text-xs font-bold">
                <Disc className="w-4 h-4 text-brand-blue" />
                <span>Continue Browsing Vault</span>
              </Button>
            </Link>
          )}
        </div>

        {favProducts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-12 sm:p-16 text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-blue-400 flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-dark dark:text-white tracking-tight">
              Your wishlist is currently empty
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
              Tap the heart icon on any DVD title while browsing our catalogue to save editions to your personal collection wishlist.
            </p>
            <div className="pt-2">
              <Link to="/shop">
                <Button variant="primary" size="md" className="inline-flex items-center gap-2">
                  <span>Explore Cinema Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {favProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
