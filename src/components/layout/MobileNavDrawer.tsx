import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '../../stores/useUiStore';
import { publicApi } from '../../lib/publicApi';

export const MobileNavDrawer: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav, openSearch } = useUiStore();
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.getCategories,
    enabled: isMobileNavOpen,
    staleTime: 60_000,
  });

  const handleSearchClick = () => {
    closeMobileNav();
    openSearch();
  };

  return (
    <AnimatePresence>
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileNav}
            className="fixed inset-0 bg-dark/60 backdrop-blur-sm"
          />

          {/* Drawer Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed inset-y-0 left-0 w-[min(88vw,360px)] bg-white shadow-2xl z-10 flex flex-col justify-between overflow-y-auto overscroll-contain"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <img
                    src="/brand/logo-transparent.png"
                    alt="AZ Rayan LTD - DVDs"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-brand-blue text-white text-[8px] font-mono font-bold uppercase tracking-wider">
                    DVDs
                  </span>
                </div>
                <button
                  onClick={closeMobileNav}
                  className="min-h-11 min-w-11 p-1.5 text-gray-400 hover:text-dark rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar Button */}
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={handleSearchClick}
                  className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500 flex items-center justify-between"
                >
                  <span>Search film catalogue...</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                <Link
                  to="/shop"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 text-sm font-semibold text-dark hover:bg-gray-50 rounded-md"
                >
                  <span>All DVDs</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link
                  to="/shop?filter=new"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 text-sm font-semibold text-dark hover:bg-gray-50 rounded-md"
                >
                  <span>New Releases</span>
                  <span className="text-[10px] bg-brand-blue text-white px-1.5 py-0.5 rounded font-bold">
                    FRESH
                  </span>
                </Link>
                <Link
                  to="/shop?filter=bestseller"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 text-sm font-semibold text-dark hover:bg-gray-50 rounded-md"
                >
                  <span>Best Sellers</span>
                </Link>
                <Link
                  to="/shop?filter=sale"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 text-sm font-semibold text-brand-red hover:bg-brand-red-soft rounded-md"
                >
                  <span>Special Offers & Sale</span>
                </Link>

                <div className="pt-3 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3">
                    Categories
                  </span>
                </div>

                {(categoriesQuery.data || []).slice(0, 6).map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${cat.slug}`}
                    onClick={closeMobileNav}
                    className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 hover:text-dark hover:bg-gray-50 rounded-md"
                  >
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
              <Link
                to="/account"
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 py-2 px-3 text-xs font-medium text-dark hover:bg-white rounded-md transition-colors"
              >
                <span>My Account & Orders</span>
              </Link>
              <Link
                to="/favourites"
                onClick={closeMobileNav}
                className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-xs font-medium text-dark hover:bg-white rounded-md transition-colors"
              >
                <span>Wishlist & Favourites</span>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
