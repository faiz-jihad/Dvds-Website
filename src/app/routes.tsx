import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { AccountLayout } from '../components/layout/AccountLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedAdminRoute } from '../auth/AdminAuth';
import { OAuthCallback } from '../pages/Auth/OAuthCallback';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ [key: string]: any }>,
  exportName = 'default'
) {
  return React.lazy(async () => {
    try {
      const module = await factory();
      return { default: module[exportName] || module.default || module };
    } catch (error: any) {
      const isDynamicImportError =
        error?.message &&
        (error.message.includes('dynamically imported module') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Loading chunk') ||
          error.message.includes('Importing a module script failed'));

      if (isDynamicImportError && typeof window !== 'undefined') {
        const lastReload = sessionStorage.getItem('last_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('last_chunk_reload', now.toString());
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

const Home = lazyWithRetry(() => import('../pages/Home'), 'Home');
const Shop = lazyWithRetry(() => import('../pages/Shop'), 'Shop');
const ProductDetail = lazyWithRetry(() => import('../pages/ProductDetail'), 'ProductDetail');
const CartPage = lazyWithRetry(() => import('../pages/CartPage'), 'CartPage');
const CheckoutPage = lazyWithRetry(() => import('../pages/CheckoutPage'), 'CheckoutPage');
const OrderSuccessPage = lazyWithRetry(() => import('../pages/OrderSuccessPage'), 'OrderSuccessPage');
const SearchPage = lazyWithRetry(() => import('../pages/SearchPage'), 'SearchPage');
const FavouritesPage = lazyWithRetry(() => import('../pages/FavouritesPage'), 'FavouritesPage');
const AboutPage = lazyWithRetry(() => import('../pages/Content/AboutPage'), 'AboutPage');
const ContactPage = lazyWithRetry(() => import('../pages/Content/ContactPage'), 'ContactPage');
const DeliveryPage = lazyWithRetry(() => import('../pages/Content/DeliveryPage'), 'DeliveryPage');
const ReturnsPage = lazyWithRetry(() => import('../pages/Content/ReturnsPage'), 'ReturnsPage');
const FaqPage = lazyWithRetry(() => import('../pages/Content/FaqPage'), 'FaqPage');
const PrivacyPage = lazyWithRetry(() => import('../pages/Content/LegalPages'), 'PrivacyPage');
const TermsPage = lazyWithRetry(() => import('../pages/Content/LegalPages'), 'TermsPage');
const RefundPolicyPage = lazyWithRetry(() => import('../pages/Content/LegalPages'), 'RefundPolicyPage');
const ProfilePage = lazyWithRetry(() => import('../pages/Account/ProfilePage'), 'ProfilePage');
const OrdersPage = lazyWithRetry(() => import('../pages/Account/OrdersPage'), 'OrdersPage');
const AddressesPage = lazyWithRetry(() => import('../pages/Account/AddressesPage'), 'AddressesPage');
const AdminDashboard = lazyWithRetry(() => import('../pages/Admin/AdminDashboard'), 'AdminDashboard');
const AdminProducts = lazyWithRetry(() => import('../pages/Admin/AdminProducts'), 'AdminProducts');
const AdminOrders = lazyWithRetry(() => import('../pages/Admin/AdminOrders'), 'AdminOrders');
const AdminInventory = lazyWithRetry(() => import('../pages/Admin/AdminInventory'), 'AdminInventory');
const AdminPromotions = lazyWithRetry(() => import('../pages/Admin/AdminPromotions'), 'AdminPromotions');
const AdminStoreSettings = lazyWithRetry(() => import('../pages/Admin/AdminStoreSettings'), 'AdminStoreSettings');
const AdminActivity = lazyWithRetry(() => import('../pages/Admin/AdminActivity'), 'AdminActivity');
const AdminTaxonomy = lazyWithRetry(() => import('../pages/Admin/AdminTaxonomy'), 'AdminTaxonomy');
const AdminSupport = lazyWithRetry(() => import('../pages/Admin/AdminSupport'), 'AdminSupport');
const AdminHomepage = lazyWithRetry(() => import('../pages/Admin/AdminHomepage'), 'AdminHomepage');
const AdminLogin = lazyWithRetry(() => import('../pages/Admin/AdminLogin'), 'AdminLogin');
const AdminUsers = lazyWithRetry(() => import('../pages/Admin/AdminUsers'), 'AdminUsers');
const LoginPage = lazyWithRetry(() => import('../pages/Auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyWithRetry(() => import('../pages/Auth/RegisterPage'), 'RegisterPage');

import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';

export const router = createBrowserRouter([
  // Public Storefront Routes
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: <Shop /> },
      { path: 'shop/:category', element: <Shop /> },
      { path: 'product/:slug', element: <ProductDetail /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order-success/:orderId', element: <OrderSuccessPage /> },
      { path: 'order-confirmation/:orderId', element: <OrderSuccessPage /> },
      { path: 'favourites', element: <FavouritesPage /> },

      // Information & Legal
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'refund-policy', element: <RefundPolicyPage /> },

      // Customer Authentication & OAuth Callbacks
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'auth/callback', element: <OAuthCallback /> },
      { path: 'auth/v1/callback', element: <OAuthCallback /> },

      // Customer Account
      {
        path: 'account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <ProfilePage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderSuccessPage /> },
          { path: 'addresses', element: <AddressesPage /> },
        ],
      },
    ],
  },

  // Admin Suite Backoffice Routes
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedAdminRoute>
        <AdminLayout />
      </ProtectedAdminRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'homepage', element: <AdminHomepage /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'inventory', element: <AdminInventory /> },
      { path: 'promotions', element: <AdminPromotions /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'settings', element: <AdminStoreSettings /> },
      { path: 'activity', element: <AdminActivity /> },
      { path: 'taxonomy', element: <AdminTaxonomy /> },
      { path: 'support', element: <AdminSupport /> },
    ],
  },

  // Fallback redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
