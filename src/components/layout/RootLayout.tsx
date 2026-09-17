import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from './AnnouncementBar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from '../commerce/CartDrawer';
import { SearchOverlay } from '../commerce/SearchOverlay';
import { MobileNavDrawer } from './MobileNavDrawer';
import { ToastContainer } from '../common/Toast';
import { publicApi } from '../../lib/publicApi';
import { useCartStore } from '../../stores/useCartStore';
import { StoreDataState } from '../common/StoreDataState';
import { IntroLoader } from '../intro/IntroLoader';

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

  return (
    <IntroLoader home={pathname === '/'}>
    <div className="flex flex-col min-h-screen bg-white text-dark overflow-x-clip w-full max-w-[100vw]">
      {/* Top Announcements */}
      <AnnouncementBar />

      {/* Main Sticky Navbar */}
      <Navbar />

      {/* Primary Page Content */}
      <main className="flex-1">
        {!paymentRoute && (operationalLoading || operationalError) ? (
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
        ) : (
          <React.Suspense fallback={<div className={pathname === '/' ? 'min-h-screen bg-[#050505]' : 'min-h-[40vh]'} role="status"><span className="sr-only">Loading page</span></div>}>
            <Outlet />
          </React.Suspense>
        )}
      </main>

      {/* Clean European UK Footer */}
      <Footer />

      {/* Interactive Overlays & Drawers */}
      <CartDrawer />
      <SearchOverlay />
      <MobileNavDrawer />
      <ToastContainer />
    </div>
    </IntroLoader>
  );
};
