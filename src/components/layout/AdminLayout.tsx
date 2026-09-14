import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  ShoppingCart,
  Boxes,
  Tag,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Sliders,
  ClipboardList,
  FolderTree,
  Mail,
  LayoutTemplate,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useAdminAuth } from '../../auth/AdminAuth';
import { ToastContainer } from '../common/Toast';
import { adminApi } from '../../lib/adminApi';
import { useRealtimeStatus } from '../../lib/realtime';
import { useQuery } from '@tanstack/react-query';
import { AdminDataState } from '../admin/AdminDataState';
import { AdminNotificationMenu } from '../admin/AdminNotificationMenu';

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
    badge?: string;
  }[];
}

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { isConnected: wsConnected } = useRealtimeStatus();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const schemaQuery = useQuery({
    queryKey: ['admin', 'schema-health'],
    queryFn: () => adminApi.checkSchema(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const navGroups: NavGroup[] = [
    {
      title: 'Core & Overview',
      items: [
        { label: 'Dashboard & Finances', href: '/admin', icon: LayoutDashboard, end: true },
        { label: 'Homepage Builder', href: '/admin/homepage', icon: LayoutTemplate },
      ],
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { label: 'Product Catalog', href: '/admin/products', icon: Film },
        { label: 'Categories & Genres', href: '/admin/taxonomy', icon: FolderTree },
        { label: 'Stock & Inventory', href: '/admin/inventory', icon: Boxes },
      ],
    },
    {
      title: 'Sales & Operations',
      items: [
        { label: 'Orders & Fulfilment', href: '/admin/orders', icon: ShoppingCart },
        { label: 'Promotions & Coupons', href: '/admin/promotions', icon: Tag },
        { label: 'Customer Enquiries', href: '/admin/support', icon: Mail },
      ],
    },
    {
      title: 'Store Settings',
      items: [
        { label: 'Users & RBAC Access', href: '/admin/users', icon: Users },
        { label: 'Store Settings & Policies', href: '/admin/settings', icon: Sliders },
        { label: 'Activity & Audit Log', href: '/admin/activity', icon: ClipboardList },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const renderNavLinks = () => (
    <div className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {group.title}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-brand-blue text-white shadow-xs font-bold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex flex-col antialiased">
      {/* Executive Admin Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-800 bg-[#0d1726] px-4 py-3 text-white sm:px-6 shadow-sm">
        {/* Left Section: Mobile toggle, Logo, & General Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="bg-white px-2 py-1 rounded shadow-xs flex items-center">
              <img
                src="/brand/logo.png"
                alt="AZ Rayan LTD"
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm tracking-tight text-white leading-tight">
                AZ Rayan <span className="text-brand-blue font-mono text-xs font-normal">Backoffice</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">Management Console</span>
            </div>
          </Link>

          {/* Clean General Operational Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 border-l border-neutral-700/80 pl-4 py-0.5">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full rounded-full opacity-75',
                  wsConnected ? 'animate-ping bg-emerald-400' : 'bg-blue-400'
                )}
              />
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  wsConnected ? 'bg-emerald-500' : 'bg-blue-500'
                )}
              />
            </span>
            <span className="text-[11px] font-medium text-neutral-300">
              {wsConnected ? 'Live & Connected' : 'Synchronizing Services...'}
            </span>
          </div>
        </div>

        {/* Right Section: View Store, Push Notification Menu, Profile, & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick link to storefront */}
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg transition-colors"
            title="Open public store in new tab"
          >
            <span>View Store</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
          </Link>

          {/* Interactive Admin Notification Center Bell */}
          <AdminNotificationMenu />

          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 border-l border-neutral-700/80 pl-2 sm:pl-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-white shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden leading-tight md:block text-left">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user?.fullName || 'Admin User'}</div>
              <div className="text-[10px] text-neutral-400 capitalize">{user?.role || 'Staff'}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-5 md:flex md:flex-col md:justify-between shadow-2xs">
          <div className="flex-1 overflow-y-auto pr-1">
            {renderNavLinks()}
          </div>
          <div className="mt-8 border-t border-gray-100 pt-4 px-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Signed In Staff</p>
            <p className="mt-1 truncate text-xs font-semibold text-gray-700">{user?.email}</p>
          </div>
        </aside>

        {/* Content Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {schemaQuery.isLoading || schemaQuery.error ? (
            <AdminDataState
              loading={schemaQuery.isLoading}
              error={schemaQuery.error}
              onRetry={() => schemaQuery.refetch()}
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <button
            className="absolute inset-0 bg-dark/60 backdrop-blur-xs"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] overflow-y-auto overscroll-contain bg-white p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-sm font-bold text-dark">{user?.fullName}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderNavLinks()}
            </div>
            <div className="mt-8 border-t border-gray-100 pt-4">
              <Link
                to="/"
                target="_blank"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-xs font-semibold text-dark hover:bg-gray-50"
              >
                <span>View Public Store</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Toast Alert Container */}
      <ToastContainer />
    </div>
  );
};
