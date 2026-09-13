import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Film, ShoppingCart, Boxes, Tag, ArrowUpRight, LogOut, Menu, X, Sliders, Database, ClipboardList, FolderTree, Mail, LayoutTemplate } from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useAdminAuth } from '../../auth/AdminAuth';
import { ToastContainer } from '../common/Toast';
import { adminApi } from '../../lib/adminApi';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = [
    { label: 'Dashboard & Finances', href: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Homepage Builder', href: '/admin/homepage', icon: LayoutTemplate },
    { label: 'Products (CRUD)', href: '/admin/products', icon: Film },
    { label: 'Categories & Genres', href: '/admin/taxonomy', icon: FolderTree },
    { label: 'Orders & Fulfilment', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Stock & Inventory', href: '/admin/inventory', icon: Boxes },
    { label: 'Promotions', href: '/admin/promotions', icon: Tag },
    { label: 'Customer Enquiries', href: '/admin/support', icon: Mail },
    { label: 'Store Settings / CMS', href: '/admin/settings', icon: Sliders },
    { label: 'Activity & Audit', href: '/admin/activity', icon: ClipboardList },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const navigation = (
    <>
      <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
        Store management
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          end={item.end}
          onClick={() => setMobileNavOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3.5 py-3 text-xs font-semibold transition-colors',
              isActive
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
            )
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Topbar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-neutral-800 bg-dark px-3 py-3 text-white sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="min-h-11 min-w-11 shrink-0 rounded-md p-2 text-neutral-300 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <div className="bg-white px-2 py-0.5 rounded-sm flex items-center shadow-2xs">
              <img
                src="/brand/logo.png"
                alt="AZ Rayan LTD"
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="hidden font-display font-extrabold text-sm tracking-tight text-white min-[380px]:inline">
              <span className="text-brand-blue font-mono text-xs">BACKOFFICE</span>
            </span>
          </Link>
          <span className="text-xs text-neutral-400 border-l border-neutral-700 pl-3 hidden sm:inline">
            UK Retail Administration
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider md:flex ${adminApi.isConfigured ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-amber-800 bg-amber-950/40 text-amber-300'}`}>
            <Database className="h-3 w-3" />
            {adminApi.isConfigured ? 'Live database' : 'Backend offline'}
          </div>
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-md transition-colors min-[430px]:flex"
          >
            <span>View Public Store</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <div className="hidden items-center gap-2 border-l border-neutral-700 pl-3 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
              {user?.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden leading-tight lg:block">
              <div className="text-xs font-semibold text-white">{user?.fullName}</div>
              <div className="text-[10px] capitalize text-neutral-400">{user?.role}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 min-w-11 rounded-md p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out of admin"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Admin Navigation Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
          {navigation}
          <div className="mt-8 border-t border-gray-100 px-3 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Signed in as</p>
            <p className="mt-1 truncate text-xs font-semibold text-gray-700">{user?.email}</p>
          </div>
        </aside>

        {/* Admin Main Content Area */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,340px)] overflow-y-auto overscroll-contain bg-white p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold text-dark">{user?.fullName}</p>
                <p className="text-[11px] text-gray-400">{user?.email}</p>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="min-h-11 min-w-11 rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};
