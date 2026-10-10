import React from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut, LogIn, UserPlus, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useAdminAuth } from '../../auth/AdminAuth';
import { Seo } from '../common/Seo';

export const AccountLayout: React.FC = () => {
  const { customer, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const { user: adminUser } = useAdminAuth();
  const location = useLocation();

  const isPrivilegedUser = Boolean(
    customer?.role === 'admin' ||
    customer?.role === 'staff' ||
    adminUser?.role === 'admin' ||
    adminUser?.role === 'staff' ||
    (customer?.email && (customer.email.toLowerCase() === 'admin@dvds-zone.co.uk' || customer.email.toLowerCase() === 'admin@dvdszone.co.uk' || customer.email.toLowerCase() === 'admin@azrayan.co.uk' || customer.email.toLowerCase() === 'azrayanltd@gmail.com'))
  );
  const roleLabel = (
    customer?.role ||
    adminUser?.role ||
    (customer?.email?.toLowerCase() === 'admin@dvds-zone.co.uk' || customer?.email?.toLowerCase() === 'admin@dvdszone.co.uk' || customer?.email?.toLowerCase() === 'admin@azrayan.co.uk' || customer?.email?.toLowerCase() === 'azrayanltd@gmail.com' ? 'admin' : '')
  ).toUpperCase();

  const links = [
    { label: 'Profile Details', href: '/account', icon: User, end: true },
    { label: 'Order History', href: '/account/orders', icon: Package },
    { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Wishlist & Favourites', href: '/favourites', icon: Heart },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-6 sm:py-10 text-dark dark:text-white transition-colors duration-200">
      <Seo
        title="My Account — DVDs Zone UK"
        description="Manage your DVDs Zone customer account, track your physical DVD shipments, and manage saved delivery addresses."
        canonicalPath="/account"
        noIndex={true}
        siteName="DVDs Zone"
      />
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
              Customer Portal
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark dark:text-white tracking-tight mt-1">
              My Account
            </h1>
          </div>

          {/* Quick status on top right */}
          {isAuthenticated && customer ? (
            <div className="flex items-center gap-3 sm:text-right">
              <div>
                <span className="font-semibold text-dark dark:text-white block">{customer.full_name || customer.email}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{roleLabel || customer.role} Account</span>
              </div>
              {isPrivilegedUser && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 hover:bg-brand-blue text-brand-blue dark:text-blue-400 hover:text-white text-xs font-bold border border-brand-blue/30 transition shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 transition shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] text-dark dark:text-white text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition shadow-xs"
              >
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Account Navigation: Horizontal tabs on mobile, vertical card on desktop */}
          <aside className="lg:col-span-3">
            <nav className="bg-white dark:bg-[#0E131F] rounded-xl p-2 sm:p-3 border border-gray-200 dark:border-white/10 shadow-xs">
              {/* User profile brief badge when logged in (desktop) */}
              {isAuthenticated && customer && (
                <div className="hidden lg:flex p-3 mb-2 bg-gray-50 dark:bg-[#141A26] rounded-lg border border-gray-100 dark:border-white/10 items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(customer.full_name || customer.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-dark dark:text-white truncate">
                      {customer.full_name || 'Customer'}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate font-mono">{customer.email}</p>
                  </div>
                </div>
              )}

              {/* Responsive tabs: 2x2 grid on mobile fitting one screen width without horizontal slider, vertical list on desktop */}
              <div className="grid grid-cols-2 lg:flex lg:flex-col gap-1.5">
                {links.map((link) => (
                  <NavLink
                    key={link.label}
                    to={link.href}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors text-center sm:text-left',
                        isActive
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10 bg-gray-50/60 dark:bg-white/5 lg:bg-transparent border border-gray-100 dark:border-white/5 lg:border-transparent'
                      )
                    }
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </NavLink>
                ))}

                {/* Backoffice Admin Console Shortcut for Admin & Staff */}
                {isPrivilegedUser && (
                  <Link
                    to="/admin"
                    className="col-span-2 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-bold bg-brand-blue/10 hover:bg-brand-blue dark:bg-brand-blue/20 dark:hover:bg-brand-blue text-brand-blue dark:text-blue-300 hover:text-white dark:hover:text-white border border-brand-blue/30 transition-all shadow-2xs group mt-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span className="truncate">Admin Console</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </Link>
                )}
              </div>

              {/* Sidebar Action: Sign Out or Sign In Prompt */}
              {isAuthenticated ? (
                <div className="hidden lg:block pt-2 mt-2 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden lg:block pt-3 mt-3 border-t border-gray-100 dark:border-white/10 text-center">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Sign in to sync saved items</p>
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="block w-full py-2 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold text-center hover:bg-brand-blue/90 transition shadow-xs"
                  >
                    Sign In to Account
                  </Link>
                </div>
              )}
            </nav>
          </aside>

          {/* Account Main Content Area */}
          <main className="min-w-0 lg:col-span-9 bg-white dark:bg-[#0E131F] rounded-lg p-4 sm:p-8 border border-gray-200 dark:border-white/10 shadow-xs text-dark dark:text-white">
            {!isLoading && !isAuthenticated ? (
              <div className="py-12 px-6 text-center max-w-md mx-auto">
                <h2 className="font-display text-2xl font-bold text-dark dark:text-white tracking-tight">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Sign in to view and manage your profile, track Royal Mail orders, and access saved addresses.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <UserPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Create Account</span>
                  </Link>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
