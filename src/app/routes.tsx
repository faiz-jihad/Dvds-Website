import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { AccountLayout } from '../components/layout/AccountLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedAdminRoute } from '../auth/AdminAuth';

const Home = React.lazy(() => import('../pages/Home').then((module) => ({ default: module.Home })));
const Shop = React.lazy(() => import('../pages/Shop').then((module) => ({ default: module.Shop })));
const ProductDetail = React.lazy(() => import('../pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const CartPage = React.lazy(() => import('../pages/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = React.lazy(() => import('../pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const OrderSuccessPage = React.lazy(() => import('../pages/OrderSuccessPage').then((module) => ({ default: module.OrderSuccessPage })));
const SearchPage = React.lazy(() => import('../pages/SearchPage').then((module) => ({ default: module.SearchPage })));
const FavouritesPage = React.lazy(() => import('../pages/FavouritesPage').then((module) => ({ default: module.FavouritesPage })));
const AboutPage = React.lazy(() => import('../pages/Content/AboutPage').then((module) => ({ default: module.AboutPage })));
const ContactPage = React.lazy(() => import('../pages/Content/ContactPage').then((module) => ({ default: module.ContactPage })));
const DeliveryPage = React.lazy(() => import('../pages/Content/DeliveryPage').then((module) => ({ default: module.DeliveryPage })));
const ReturnsPage = React.lazy(() => import('../pages/Content/ReturnsPage').then((module) => ({ default: module.ReturnsPage })));
const FaqPage = React.lazy(() => import('../pages/Content/FaqPage').then((module) => ({ default: module.FaqPage })));
const PrivacyPage = React.lazy(() => import('../pages/Content/LegalPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = React.lazy(() => import('../pages/Content/LegalPages').then((module) => ({ default: module.TermsPage })));
const RefundPolicyPage = React.lazy(() => import('../pages/Content/LegalPages').then((module) => ({ default: module.RefundPolicyPage })));
const ProfilePage = React.lazy(() => import('../pages/Account/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const OrdersPage = React.lazy(() => import('../pages/Account/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const AddressesPage = React.lazy(() => import('../pages/Account/AddressesPage').then((module) => ({ default: module.AddressesPage })));
const AdminDashboard = React.lazy(() => import('../pages/Admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const AdminProducts = React.lazy(() => import('../pages/Admin/AdminProducts').then((module) => ({ default: module.AdminProducts })));
const AdminOrders = React.lazy(() => import('../pages/Admin/AdminOrders').then((module) => ({ default: module.AdminOrders })));
const AdminInventory = React.lazy(() => import('../pages/Admin/AdminInventory').then((module) => ({ default: module.AdminInventory })));
const AdminPromotions = React.lazy(() => import('../pages/Admin/AdminPromotions').then((module) => ({ default: module.AdminPromotions })));
const AdminStoreSettings = React.lazy(() => import('../pages/Admin/AdminStoreSettings').then((module) => ({ default: module.AdminStoreSettings })));
const AdminActivity = React.lazy(() => import('../pages/Admin/AdminActivity').then((module) => ({ default: module.AdminActivity })));
const AdminTaxonomy = React.lazy(() => import('../pages/Admin/AdminTaxonomy').then((module) => ({ default: module.AdminTaxonomy })));
const AdminSupport = React.lazy(() => import('../pages/Admin/AdminSupport').then((module) => ({ default: module.AdminSupport })));
const AdminHomepage = React.lazy(() => import('../pages/Admin/AdminHomepage').then((module) => ({ default: module.AdminHomepage })));
const AdminLogin = React.lazy(() => import('../pages/Admin/AdminLogin').then((module) => ({ default: module.AdminLogin })));
const AdminUsers = React.lazy(() => import('../pages/Admin/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const LoginPage = React.lazy(() => import('../pages/Auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../pages/Auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));

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

      // Customer Authentication
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },

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
