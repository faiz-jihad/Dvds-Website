import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut } from 'lucide-react';
import { cn } from '../../lib/formatters';

export const AccountLayout: React.FC = () => {
  const links = [
    { label: 'Profile Details', href: '/account', icon: User, end: true },
    { label: 'Order History', href: '/account/orders', icon: Package },
    { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Wishlist & Favourites', href: '/favourites', icon: Heart },
  ];

  return (
    <div className="bg-gray-50/70 min-h-screen py-6 sm:py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="pb-6 mb-8 border-b border-gray-200">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            Customer Portal
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark tracking-tight mt-1">
            My Account
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Account Navigation Sidebar */}
          <aside className="lg:col-span-3">
            <nav className="bg-white rounded-lg p-3 border border-gray-200 shadow-xs space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.href}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-blue text-white'
                        : 'text-gray-600 hover:text-dark hover:bg-gray-50'
                    )
                  }
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Account Main Content Area */}
          <main className="min-w-0 lg:col-span-9 bg-white rounded-lg p-4 sm:p-8 border border-gray-200 shadow-xs">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
