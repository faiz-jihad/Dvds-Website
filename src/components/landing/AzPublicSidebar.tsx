import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Heart,
  Calendar,
  TrendingUp,
  Settings,
  HelpCircle,
  Clock,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Film,
} from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useLastSeenStore } from '../../stores/useLastSeenStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { publicApi } from '../../lib/publicApi';
import { Product } from '../../types';

interface AzPublicSidebarProps {
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
  fallbackProducts?: Product[];
}

export const AzPublicSidebar: React.FC<AzPublicSidebarProps> = ({
  activeFilter = 'all',
  onSelectFilter,
  fallbackProducts,
}) => {
  const location = useLocation();
  const { pathname, search } = location;
  const [collapsed, setCollapsed] = useState(false);
  const favourites = useFavouritesStore((s) => s.favourites);
  const { lastSeenProducts, recordView } = useLastSeenStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  // If fallbackProducts is not provided (e.g. on interior pages), fetch products
  const productsQuery = useQuery({
    queryKey: ['sidebar', 'fallback-products'],
    queryFn: () => publicApi.getProducts(),
    staleTime: 60_000,
    enabled: !fallbackProducts || fallbackProducts.length === 0,
  });

  const availableProducts = fallbackProducts && fallbackProducts.length > 0
    ? fallbackProducts
    : productsQuery.data || [];

  // Primary navigation items (Item 2: "New Releases", Item 3: "Director Spotlight" removed)
  const mainNav = [
    { label: 'Home', href: '/', filter: 'all', icon: Home },
    { label: 'Favorites', href: '/favourites', filter: '', icon: Heart, badge: favourites.length },
    { label: 'New Releases', href: '/shop?filter=new', filter: 'new', icon: Calendar },
    { label: 'Trending', href: '/shop?filter=trending', filter: 'trending', icon: TrendingUp },
  ];

  const secondaryNav = [
    { label: 'Settings', href: '/account', icon: Settings },
    { label: 'Support', href: '/contact', icon: HelpCircle },
  ];

  const isNavActive = (href: string, filter?: string) => {
    if (pathname === '/') {
      if (filter && activeFilter && activeFilter !== 'all') {
        return activeFilter === filter;
      }
      return href === '/';
    }

    if (href === '/') return false;

    if (href.includes('?')) {
      const [targetPath, targetQuery] = href.split('?');
      if (pathname !== targetPath) return false;
      const currentParams = new URLSearchParams(search);
      const targetParams = new URLSearchParams(targetQuery);
      let matches = true;
      targetParams.forEach((val, key) => {
        if (currentParams.get(key) !== val) {
          matches = false;
        }
      });
      return matches;
    }

    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavClick = (e: React.MouseEvent, href: string, filter?: string) => {
    if (pathname === '/' && filter && onSelectFilter) {
      e.preventDefault();
      onSelectFilter(filter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Determine items for "Last seen" list:
  const displayLastSeen: Product[] = (
    lastSeenProducts.length > 0
      ? lastSeenProducts
      : availableProducts.slice(0, 4)
  ).slice(0, 5);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 sticky top-[72px] sm:top-[80px] h-[calc(100vh-72px)] sm:h-[calc(100vh-80px)] z-30 transition-all duration-300 select-none border-r',
        isDark
          ? 'bg-[#0A0D14] border-white/5 text-white'
          : 'bg-white border-gray-200 text-gray-800 shadow-xs',
        collapsed ? 'w-[76px]' : 'w-[260px] xl:w-[280px]'
      )}
    >
      {/* Sidebar Inner Scroll Container */}
      <div className="flex-1 flex flex-col px-3.5 py-3.5 overflow-y-auto no-scrollbar space-y-5">
        {/* Sidebar Header: Navigation Label & Collapse/Expand Toggle */}
        <div
          className={cn(
            'flex items-center pb-2.5 border-b',
            isDark ? 'border-white/5' : 'border-gray-100',
            collapsed ? 'justify-center' : 'justify-between px-1'
          )}
        >
          {!collapsed ? (
            <>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold tracking-widest uppercase',
                  isDark ? 'text-gray-400' : 'text-gray-500'
                )}
              >
                Menu
              </span>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className={cn(
                  'w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer',
                  isDark
                    ? 'bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border-white/10'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 border-gray-200'
                )}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className={cn(
                'w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer',
                isDark
                  ? 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border-white/10'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200'
              )}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={15} />
            </button>
          )}
        </div>

        {/* Top Navigation Links (Home, Favorites, New Releases, Trending) */}
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const active = isNavActive(item.href, item.filter);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={(e) => handleNavClick(e, item.href, item.filter)}
                className={cn(
                  'group flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer relative',
                  active
                    ? isDark
                      ? 'bg-white/10 text-white font-bold shadow-xs'
                      : 'bg-brand-blue/10 text-brand-blue font-bold shadow-xs'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    size={18}
                    className={cn(
                      'transition-colors',
                      active
                        ? 'text-brand-blue'
                        : isDark
                          ? 'text-gray-400 group-hover:text-white'
                          : 'text-gray-500 group-hover:text-gray-900'
                    )}
                  />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] rounded-full bg-brand-red text-white text-[9px] font-black flex items-center justify-center px-1 leading-none shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={cn('h-px mx-2', isDark ? 'bg-white/5' : 'bg-gray-100')} />

        {/* Secondary Navigation (Settings & Support) */}
        <nav className="space-y-1">
          {secondaryNav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 cursor-pointer',
                  active
                    ? isDark
                      ? 'bg-white/10 text-white font-bold'
                      : 'bg-brand-blue/10 text-brand-blue font-bold'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={18}
                  className={cn(
                    'shrink-0 transition-colors',
                    active
                      ? 'text-brand-blue'
                      : isDark
                        ? 'text-gray-400 group-hover:text-white'
                        : 'text-gray-500 group-hover:text-gray-900'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={cn('h-px mx-2', isDark ? 'bg-white/5' : 'bg-gray-100')} />

        {/* ── "Last seen" Section ── */}
        <div className="space-y-3 pt-1">
          {/* Section Header */}
          <div className={cn('flex items-center gap-2 px-2.5', collapsed && 'justify-center px-0')}>
            <Clock size={14} className="text-brand-blue shrink-0" />
            {!collapsed && (
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  isDark ? 'text-gray-400' : 'text-gray-500'
                )}
              >
                Last seen
              </span>
            )}
          </div>

          {/* Sequential List of Last Seen DVDs */}
          {displayLastSeen.length > 0 ? (
            <div className="space-y-2.5">
              {displayLastSeen.map((dvd, index) => (
                <Link
                  key={dvd.id || index}
                  to={`/product/${dvd.slug}`}
                  onClick={() => recordView(dvd)}
                  className={cn(
                    'group block rounded-2xl p-2 border transition-all duration-200 overflow-hidden shadow-xs cursor-pointer',
                    isDark
                      ? 'bg-[#121622]/90 hover:bg-[#181D2D] border-white/5 hover:border-brand-blue/30 text-white'
                      : 'bg-gray-50 hover:bg-gray-100/80 border-gray-200/80 hover:border-brand-blue/40 text-gray-900',
                    collapsed ? 'p-1.5' : 'p-2'
                  )}
                  title={dvd.title}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Poster Thumbnail */}
                    <div className="relative w-12 h-16 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                      <img
                        src={dvd.cover_image_url}
                        alt={dvd.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Play overlay button on thumbnail */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-brand-blue text-white flex items-center justify-center shadow-md">
                          <Play size={10} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Movie Info (Expanded state) */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 py-0.5">
                        <p
                          className={cn(
                            'text-xs font-bold leading-tight truncate group-hover:text-brand-blue transition-colors',
                            isDark ? 'text-white' : 'text-gray-900'
                          )}
                        >
                          {dvd.title}
                        </p>
                        <div
                          className={cn(
                            'flex items-center gap-1.5 mt-1 text-[10px]',
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          )}
                        >
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                              isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
                            )}
                          >
                            {dvd.format || 'DVD'}
                          </span>
                          <span>&bull;</span>
                          <span>{dvd.release_year || '2024'}</span>
                        </div>
                        {/* Rating or price */}
                        <div
                          className={cn(
                            'flex items-center justify-between mt-2 pt-1 border-t text-[9px]',
                            isDark ? 'border-white/5' : 'border-gray-200/60'
                          )}
                        >
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            ★ {dvd.imdb_rating ? dvd.imdb_rating.toFixed(1) : '8.5'}
                          </span>
                          <span
                            className={cn(
                              'font-mono font-semibold',
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            )}
                          >
                            £{Number(dvd.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !collapsed && (
              <div
                className={cn(
                  'px-3 py-6 text-center rounded-xl border text-xs',
                  isDark
                    ? 'bg-white/[0.02] border-white/5 text-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                )}
              >
                <Film className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
                <p className="text-[10px]">No films viewed yet</p>
              </div>
            )
          )}
        </div>

        {/* Pro Collector Badge Footer (Expanded) */}
        {!collapsed && (
          <div className={cn('mt-auto pt-4 border-t px-1', isDark ? 'border-white/5' : 'border-gray-100')}>
            <div
              className={cn(
                'p-3 rounded-2xl border text-xs space-y-1',
                isDark
                  ? 'bg-gradient-to-br from-[#121622] to-[#0D101A] border-white/5 text-gray-400'
                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-gray-600'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-1.5 font-bold',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>UK Official Vault</span>
              </div>
              <p
                className={cn(
                  'text-[10px] leading-relaxed',
                  isDark ? 'text-gray-400' : 'text-gray-500'
                )}
              >
                100% Genuine Region 2 / PAL UK releases &amp; Box Sets.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AzPublicSidebar;
