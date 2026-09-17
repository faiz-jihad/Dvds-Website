import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useAdminAuth } from '../../auth/AdminAuth';
import { ToastContainer } from '../common/Toast';
import { adminSchemaScope } from '../../lib/adminSchema';
import { adminApi } from '../../lib/adminApi';
import { useRealtimeStatus } from '../../lib/realtime';
import { useQuery } from '@tanstack/react-query';
import { AdminDataState } from '../admin/AdminDataState';
import { AdminNotificationMenu } from '../admin/AdminNotificationMenu';
import { useUiStore } from '../../stores/useUiStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Homepage Builder', href: '/admin/homepage', icon: LayoutTemplate },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Film },
      { label: 'Categories', href: '/admin/taxonomy', icon: FolderTree },
      { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Promotions', href: '/admin/promotions', icon: Tag },
      { label: 'Support', href: '/admin/support', icon: Mail },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Users & Access', href: '/admin/users', icon: Users },
      { label: 'Store Settings', href: '/admin/settings', icon: Sliders },
      { label: 'Audit Log', href: '/admin/activity', icon: ClipboardList },
    ],
  },
];

// Build a flat map of href → label for breadcrumb resolution
const ROUTE_LABELS: Record<string, string> = {};
NAV_GROUPS.forEach((g) => g.items.forEach((i) => (ROUTE_LABELS[i.href] = i.label)));

function useBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean); // ['admin', 'products']
  const crumbs: { label: string; href: string }[] = [];

  if (segments[0] === 'admin') {
    crumbs.push({ label: 'Admin', href: '/admin' });
    if (segments[1]) {
      const href = `/${segments.slice(0, 2).join('/')}`;
      crumbs.push({ label: ROUTE_LABELS[href] || segments[1], href });
    }
  }
  return crumbs;
}

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { isConnected: wsConnected } = useRealtimeStatus();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumb();
  const { pathname } = useLocation();
  const schemaScope = adminSchemaScope(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const schemaQuery = useQuery({
    queryKey: ['admin', 'schema-health', schemaScope, user?.id],
    queryFn: () => adminApi.checkSchema(schemaScope),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (error) {
      useUiStore.getState().addToast(error instanceof Error ? error.message : 'Sign out failed. Please retry.', 'error');
    }
  };

  const avatarInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A';

  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-6">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.filter((item) => item.href !== '/admin/users' || user?.role === 'admin').map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                onClick={onLinkClick}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans antialiased">
      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        {/* Brand */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
            <img
              src="/brand/logo.png"
              alt="Logo"
              className="h-5 w-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">DVDs Zone</p>
            <p className="text-[10px] text-slate-500">Admin Console</p>
          </div>
        </div>

        <SidebarNav />

        {/* Bottom user strip */}
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {avatarInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.fullName || 'Admin User'}
              </p>
              <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area (header + content) ─────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6">
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 sm:flex">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.href}>
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="text-sm font-semibold text-white">{crumb.label}</span>
                  ) : (
                    <Link
                      to={crumb.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: status, view store, notifications, user */}
          <div className="flex items-center gap-2">
            {/* Live status */}
            <div className="hidden items-center gap-1.5 lg:flex">
              <span className="relative flex h-2 w-2">
                {wsConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                <span
                  className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    wsConnected ? 'bg-emerald-500' : 'bg-slate-600'
                  )}
                />
              </span>
              <span className="text-[11px] text-slate-500">
                {wsConnected ? 'Live updates' : 'Live updates paused'}
              </span>
            </div>

            <div className="mx-1 hidden h-4 w-px bg-slate-700 lg:block" />

            {/* View store */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white sm:flex"
            >
              View Store
              <ArrowUpRight className="h-3 w-3" />
            </Link>

            {/* Notifications */}
            <AdminNotificationMenu />

            {/* Avatar (mobile only full info, desktop just avatar) */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-2 md:pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {avatarInitial}
              </div>
              <div className="hidden flex-col md:flex">
                <span className="max-w-[120px] truncate text-xs font-semibold text-white">
                  {user?.fullName || 'Admin'}
                </span>
                <span className="text-[10px] capitalize text-slate-500">{user?.role || 'staff'}</span>
              </div>
            </div>

            {/* Logout (desktop) */}
            <button
              type="button"
              onClick={handleLogout}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white md:flex"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#f4f6f9] p-4 sm:p-6 lg:p-8">
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

      {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />

          {/* Drawer panel */}
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-slate-900 shadow-2xl">
            {/* Drawer header */}
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {avatarInitial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user?.fullName || 'Admin'}</p>
                  <p className="text-[10px] text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarNav onLinkClick={() => setMobileNavOpen(false)} />

            {/* Drawer footer */}
            <div className="border-t border-slate-800 p-4 space-y-2">
              <Link
                to="/"
                target="_blank"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-xs font-semibold text-slate-400 hover:border-slate-600 hover:text-white transition-colors"
              >
                View Public Store
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Toast Alert Container */}
      <ToastContainer />
    </div>
  );
};
