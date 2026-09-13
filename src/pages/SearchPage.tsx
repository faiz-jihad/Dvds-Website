import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Disc, ArrowLeft } from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { StoreDataState } from '../components/common/StoreDataState';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts() });
  const products = productsQuery.data || [];

  const results = query.trim()
    ? products.filter((p) => {
        const q = query.toLowerCase().trim();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.format.toLowerCase().includes(q) ||
          p.genres?.some((g) => g.name.toLowerCase().includes(q))
        );
      })
    : [];

  if (productsQuery.isLoading || productsQuery.error) {
    return <StoreDataState loading={productsQuery.isLoading} error={productsQuery.error} retry={() => productsQuery.refetch()} />;
  }

  return (
    <div className="bg-white min-h-screen py-6 sm:py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-100 flex flex-col items-start gap-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <div className="min-w-0">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
              Search Results
            </span>
            <h1 className="break-words font-display font-extrabold text-3xl sm:text-4xl text-dark tracking-tight mt-1">
              Results for &ldquo;{query}&rdquo;
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Found {results.length} matching DVD editions
            </p>
          </div>
          <Link to="/shop">
            <Button variant="outline" size="sm">
              All Titles
            </Button>
          </Link>
        </div>

        {results.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <Disc className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-dark mb-1">
              No matching titles found
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              We couldn't find any films matching &ldquo;{query}&rdquo;. Try browsing by genre or view our newly released additions.
            </p>
            <Link to="/shop">
              <Button variant="primary" size="sm">
                Browse Full Catalogue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
