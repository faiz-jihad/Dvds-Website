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

export const RootLayout: React.FC = () => {
  const { pathname } = useLocation();
  const setOperationalPricing = useCartStore((state) => state.setOperationalPricing);
  const syncCatalogue = useCartStore((state) => state.syncCatalogue);
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: publicApi.getStoreSettings, staleTime: 60_000 });
  const promotionsQuery = useQuery({ queryKey: ['active-promotions'], queryFn: publicApi.getActivePromotions, staleTime: 30_000 });
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: publicApi.getProducts, staleTime: 30_000 });

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
    if (settingsQuery.data && productsQuery.data) syncCatalogue(productsQuery.data, settingsQuery.data);
  }, [productsQuery.data, settingsQuery.data, syncCatalogue]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-white text-dark">
      {/* Top Announcements */}
      <AnnouncementBar />

      {/* Main Sticky Navbar */}
      <Navbar />

      {/* Primary Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Clean European UK Footer */}
      <Footer />

      {/* Interactive Overlays & Drawers */}
      <CartDrawer />
      <SearchOverlay />
      <MobileNavDrawer />
      <ToastContainer />
    </div>
  );
};
