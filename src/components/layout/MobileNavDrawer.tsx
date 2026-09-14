import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Search, Disc, Sparkles, Heart, User, Truck, Shield, LogIn, LogOut, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '../../stores/useUiStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { publicApi } from '../../lib/publicApi';

export const MobileNavDrawer: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav, openSearch } = useUiStore();
  const { customer, isAuthenticated, logout: customerLogout } = useCustomerAuth();
  const favourites = useFavouritesStore((state) => state.favourites);
  const allNotifications = useNotificationStore((state) => state.notifications);
  const unreadCount = allNotifications.filter((n) => n.target === 'customer' && !n.read).length;
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
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileNav}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Drawer Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-[min(88vw,360px)] bg-white border-r border-gray-200 text-dark shadow-2xl z-10 flex flex-col justify-between overflow-y-auto overscroll-contain"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/brand/logo.png"
                    alt="AZ Rayan LTD"
                    className="h-7 w-auto object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="font-display font-extrabold text-sm tracking-tight text-dark leading-none">
                      AZ Rayan
                    </span>
                    <span className="text-[9px] font-mono tracking-wider text-gray-400 uppercase mt-0.5">
                      Archive Vault
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeMobileNav}
                  className="min-h-10 min-w-10 p-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg flex items-center justify-center transition cursor-pointer"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar Button */}
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={handleSearchClick}
                  className="w-full py-2.5 px-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 hover:text-dark flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <span>Search film archive...</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              {/* Customer Account Mobile Status */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/60">
                {isAuthenticated && customer ? (
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/account"
                      onClick={closeMobileNav}
                      className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {(customer.full_name || customer.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-dark truncate">
                          {customer.full_name || 'My Account'}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{customer.email}</p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileNav();
                        customerLogout();
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={closeMobileNav}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 transition text-center shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMobileNav}
                      className="flex items-center justify-center py-2.5 px-3 rounded-lg border border-gray-300 bg-white text-dark text-xs font-semibold hover:bg-gray-50 transition text-center shadow-2xs"
                    >
                      <span>Register</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1 text-xs">
                <Link
                  to="/shop"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 font-semibold text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Complete Catalogue</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link
                  to="/shop?filter=new"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 font-semibold text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>New Pressings</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                    FRESH
                  </span>
                </Link>
                <Link
                  to="/shop?filter=bestseller"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 font-semibold text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Best Sellers</span>
                </Link>
                <Link
                  to="/shop?filter=sale"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2.5 px-3 font-semibold text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Special Offers</span>
                  <span className="text-[10px] bg-red-50 text-brand-red border border-red-200 px-1.5 py-0.5 rounded font-bold">
                    SAVE
                  </span>
                </Link>

                <div className="pt-4 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3">
                    Archive Categories
                  </span>
                </div>

                <Link
                  to="/shop?category=tv-box-sets"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>TV Box Sets</span>
                </Link>
                <Link
                  to="/shop?search=Star+Wars"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Star Wars Anthology</span>
                </Link>
                <Link
                  to="/shop?genre=action"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Action & Military</span>
                </Link>
                <Link
                  to="/shop?genre=documentary"
                  onClick={closeMobileNav}
                  className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span>Music & Documentary</span>
                </Link>
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-1 text-xs">
              <Link
                to="/account/orders"
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 py-2 px-3 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                <Truck className="w-4 h-4 text-gray-400" />
                <span>Orders & Consignment Tracking</span>
              </Link>
              <Link
                to="/favourites"
                onClick={closeMobileNav}
                className="flex items-center justify-between py-2 px-3 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span>Saved Wishlist</span>
                </div>
                {favourites.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-brand-blue font-bold text-[10px] font-mono border border-blue-100">
                    {favourites.length}
                  </span>
                )}
              </Link>
              {unreadCount > 0 && (
                <div
                  className="flex items-center justify-between py-2 px-3 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span>Notifications</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-brand-blue font-bold text-[10px] font-mono border border-blue-100">
                    {unreadCount} new
                  </span>
                </div>
              )}
              <Link
                to="/admin"
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-dark font-mono text-[10px] tracking-wider uppercase transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <span>Store Admin Backoffice</span>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
