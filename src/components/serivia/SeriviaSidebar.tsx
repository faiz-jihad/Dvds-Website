import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Heart,
  Clock,
  TrendingUp,
  Settings,
  HelpCircle,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { Product } from '../../types';

interface SeriviaSidebarProps {
  recentProducts?: Product[];
  collapsed?: boolean;
  onToggle?: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Favourites', href: '/favourites', icon: Heart },
  { label: 'Coming Soon', href: '/shop?filter=new', icon: Clock },
  { label: 'Trending', href: '/shop?filter=trending', icon: TrendingUp },
];

const BOTTOM_NAV = [
  { label: 'Settings', href: '/account/profile', icon: Settings },
  { label: 'Support', href: '/contact', icon: HelpCircle },
];

export const SeriviaSidebar: React.FC<SeriviaSidebarProps> = ({
  recentProducts = [],
  collapsed = false,
  onToggle,
}) => {
  const { pathname } = useLocation();
  const favourites = useFavouritesStore((s) => s.favourites);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#0d0f14] border-r border-white/[0.07] transition-all duration-300 select-none',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-24 z-10 w-6 h-6 rounded-full bg-[#1c1f2a] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shadow-lg"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-6 pb-2 flex flex-col gap-0.5 overflow-y-auto">
        <div className="mb-3">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const isFavourites = label === 'Favourites';
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-[#f5c518]/10 text-[#f5c518]'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white'
                )}
                title={collapsed ? label : undefined}
              >
                <div className="relative shrink-0">
                  <Icon size={18} />
                  {isFavourites && favourites.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#f5c518] text-black text-[8px] font-bold flex items-center justify-center leading-none">
                      {Math.min(favourites.length, 9)}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] my-2" />

        {/* Recent Vault Highlights */}
        {!collapsed && recentProducts.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-3">
              Vault Highlights
            </p>
            <div className="flex flex-col gap-2">
              {recentProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/[0.05] transition-colors"
                >
                  {/* Poster thumbnail */}
                  <div className="relative w-10 h-14 shrink-0 rounded-md overflow-hidden bg-white/5">
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={12} className="text-white" fill="white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-white/80 leading-tight truncate">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {product.release_year} &bull;{' '}
                      {product.imdb_rating ? `${product.imdb_rating}` : product.format}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Links */}
      <div className="px-3 pb-5 flex flex-col gap-0.5">
        <div className="h-px bg-white/[0.06] mb-2" />
        {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200"
            title={collapsed ? label : undefined}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
};

export default SeriviaSidebar;
