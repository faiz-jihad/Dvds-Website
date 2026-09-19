import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AzPublicSidebar } from '../landing/AzPublicSidebar';
import { AzDarkLandingFooter } from '../landing/AzDarkLandingFooter';
import { CartDrawer } from '../commerce/CartDrawer';
import { SearchOverlay } from '../commerce/SearchOverlay';
import { MobileNavDrawer } from './MobileNavDrawer';
import { ToastContainer } from '../common/Toast';
import { publicApi } from '../../lib/publicApi';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { StoreDataState } from '../common/StoreDataState';
import { Home, Film, Heart, ShoppingBag, Menu, Search } from 'lucide-react';
import { cn } from '../../lib/formatters';

export const RootLayout: React.FC = () => {
  const { pathname } = useLocation();
  const paymentRoute = /^\/(checkout|order-success|order-confirmation)(\/|$)/.test(pathname) || /^\/account\/orders\//.test(pathname);
  const setOperationalPricing = useCartStore((state) => state.setOperationalPricing);
  const syncCatalogue = useCartStore((state) => state.syncCatalogue);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings, staleTime: 30_000, refetchInterval: 60_000 });
  const promotionsQuery = useQuery({ queryKey: ['active-promotions'], queryFn: publicApi.getActivePromotions, staleTime: 15_000, refetchInterval: 30_000 });
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: publicApi.getProducts, staleTime: 15_000, refetchInterval: 30_000 });
  const categoriesQuery = useQuery({ queryKey: ['store', 'categories'], queryFn: publicApi.getCategories, staleTime: 30_000, refetchInterval: 60_000 });
  const genresQuery = useQuery({ queryKey: ['store', 'genres'], queryFn: publicApi.getGenres, staleTime: 30_000, refetchInterval: 60_000 });
  const operationalLoading = settingsQuery.isLoading || promotionsQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || genresQuery.isLoading;
  const operationalError = settingsQuery.error || promotionsQuery.error || productsQuery.error || categoriesQuery.error || genresQuery.error;

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (settingsQuery.data && !promotionsQuery.isLoading) {
      setOperationalPricing(
        settingsQuery.data.free_shipping_threshold,
        settingsQuery.data.standard_shipping_fee,
        promotionsQuery.data || [],
      );
    }
  }, [promotionsQuery.data, promotionsQuery.isLoading, setOperationalPricing, settingsQuery.data]);

  useEffect(() => {
    if (!paymentRoute && settingsQuery.data && productsQuery.data) syncCatalogue(productsQuery.data, settingsQuery.data);
  }, [productsQuery.data, settingsQuery.data, syncCatalogue, paymentRoute]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.toggleAttribute('data-home-entry', pathname === '/');
  }, [pathname]);

  const isHome = pathname === '/';
  const { openCartDrawer, openMobileNav, isMobileNavOpen, openSearch } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const favourites = useFavouritesStore((s) => s.favourites);

  return (
    <div
      className={cn(
        'flex flex-col min-h-screen overflow-x-clip w-full max-w-[100vw] transition-colors duration-200',
        isDark ? 'bg-[#07090E] text-white' : 'bg-[#F9FAFB] text-gray-900'
      )}
    >
      {/* ── Top Unified Navbar (Item 1, 4, 5, 6, 7) — rendered across all storefront pages ── */}
      {!paymentRoute && <Navbar />}

      {/* ── Main Layout: Persistent Sidebar (Item 7) + Content Area ── */}
      <div className="flex flex-1 min-w-0 relative">
        {!paymentRoute && <AzPublicSidebar fallbackProducts={productsQuery.data || []} />}

        <main className="flex-1 min-w-0 flex flex-col">
          {!paymentRoute && (operationalLoading || operationalError) ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <StoreDataState
                loading={operationalLoading}
                error={operationalError || null}
                retry={() => {
                  settingsQuery.refetch();
                  promotionsQuery.refetch();
                  productsQuery.refetch();
                  categoriesQuery.refetch();
                  genresQuery.refetch();
                }}
              />
            </div>
          ) : (
            <React.Suspense
              fallback={
                <div className="min-h-[50vh] flex items-center justify-center" role="status">
                  <span className="sr-only">Loading page</span>
                </div>
              }
            >
              <Outlet />
            </React.Suspense>
          )}

          {/* Unified Footer */}
          {!paymentRoute && <AzDarkLandingFooter />}
        </main>
      </div>

      {/* Interactive Overlays & Drawers */}
      <CartDrawer />
      <SearchOverlay />
      <MobileNavDrawer />
      <ToastContainer />

      {/* Floating Action Search Button (WhatsApp style floating button on mobile) */}
      {!paymentRoute && (
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search catalogue"
          title="Search films & box sets"
          className="md:hidden fixed bottom-[72px] right-4 z-40 w-12 h-12 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white shadow-lg shadow-brand-blue/35 border-2 border-white flex items-center justify-center cursor-pointer active:scale-90 transition-all duration-200 group"
        >
          <Search size={21} className="group-hover:scale-110 transition-transform text-white stroke-[2.5]" />
          <span className="sr-only">Search catalogue</span>
        </button>
      )}

      {/* Global Mobile Bottom Navigation Bar */}
      {!paymentRoute && (
        <nav
          aria-label="Mobile Navigation"
          className={cn(
            'md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl border-t flex items-center justify-around px-2 py-1.5 shadow-2xl transition-colors',
            isDark
              ? 'bg-[#07090E]/95 border-white/10 text-gray-400'
              : 'bg-white/95 border-gray-200 text-gray-500'
          )}
        >
          {/* Home */}
          <Link
            to="/"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
              isHome
                ? 'text-brand-blue font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-dark'
            )}
          >
            <Home size={18} />
            <span>Home</span>
          </Link>

          {/* Browse / Catalogue */}
          <Link
            to="/shop"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
              pathname.startsWith('/shop')
                ? 'text-brand-blue font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-dark'
            )}
          >
            <Film size={18} />
            <span>Browse</span>
          </Link>

          {/* Favourites with Red Badge */}
          <Link
            to="/favourites"
            className={cn(
              'relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer',
              pathname.startsWith('/favourites')
                ? 'text-brand-blue font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-dark'
            )}
          >
            <div className="relative">
              <Heart size={18} />
              {favourites.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-brand-red text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
                  {favourites.length}
                </span>
              )}
            </div>
            <span>Saved</span>
          </Link>

          {/* Basket with Blue Badge */}
          <button
            type="button"
            onClick={openCartDrawer}
            className={cn(
              'relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer active:scale-95',
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-dark'
            )}
          >
            <div className="relative">
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-brand-blue text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span>Basket</span>
          </button>

          {/* Menu — opens global MobileNavDrawer */}
          <button
            type="button"
            onClick={openMobileNav}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer active:scale-95',
              isMobileNavOpen
                ? 'text-brand-blue font-bold'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-dark'
            )}
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default RootLayout;
