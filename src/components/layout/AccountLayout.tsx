import React from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut, LogIn, UserPlus } from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useCustomerAuth } from '../../auth/CustomerAuth';

export const AccountLayout: React.FC = () => {
  const { customer, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const location = useLocation();

  const links = [
    { label: 'Profile Details', href: '/account', icon: User, end: true },
    { label: 'Order History', href: '/account/orders', icon: Package },
    { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Wishlist & Favourites', href: '/favourites', icon: Heart },
  ];

  return (
    <div className="bg-gray-50/70 min-h-screen py-6 sm:py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
              Customer Portal
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark tracking-tight mt-1">
              My Account
            </h1>
          </div>

          {/* Quick status on top right */}
          {isAuthenticated && customer ? (
            <div className="text-xs text-gray-500 sm:text-right">
              <span className="font-semibold text-dark">{customer.full_name || customer.email}</span>
              <span className="block text-[11px] text-gray-400 capitalize">{customer.role} Account</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-dark text-xs font-semibold hover:bg-gray-50 transition shadow-xs"
              >
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Account Navigation: Horizontal tabs on mobile, vertical card on desktop */}
          <aside className="lg:col-span-3">
            <nav className="bg-white rounded-xl p-2 sm:p-3 border border-gray-200 shadow-xs">
              {/* User profile brief badge when logged in (desktop) */}
              {isAuthenticated && customer && (
                <div className="hidden lg:flex p-3 mb-2 bg-gray-50 rounded-lg border border-gray-100 items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(customer.full_name || customer.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-dark truncate">
                      {customer.full_name || 'Customer'}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate font-mono">{customer.email}</p>
                  </div>
                </div>
              )}

              {/* Scrollable tabs on mobile, stacked on desktop */}
              <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {links.map((link) => (
                  <NavLink
                    key={link.label}
                    to={link.href}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                        isActive
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'text-gray-600 hover:text-dark hover:bg-gray-50'
                      )
                    }
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Sidebar Action: Sign Out or Sign In Prompt */}
              {isAuthenticated ? (
                <div className="hidden lg:block pt-2 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="hidden lg:block pt-3 mt-3 border-t border-gray-100 text-center">
                  <p className="text-[11px] text-gray-500 mb-2">Sign in to sync saved items</p>
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
          <main className="min-w-0 lg:col-span-9 bg-white rounded-lg p-4 sm:p-8 border border-gray-200 shadow-xs">
            {!isLoading && !isAuthenticated ? (
              <div className="py-12 px-6 text-center max-w-md mx-auto">
                <h2 className="font-display text-2xl font-bold text-dark tracking-tight">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed">
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
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-dark text-xs font-semibold transition-colors shadow-xs"
                  >
                    <UserPlus className="w-4 h-4 text-gray-500" />
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
