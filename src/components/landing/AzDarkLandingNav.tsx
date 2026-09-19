import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ShoppingBag,
  User,
  ChevronDown,
  Tag,
  Package,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Check,
  Film,
  Tv,
  Disc,
  Sparkles,
  Gamepad2,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { CustomerNotificationMenu } from '../common/CustomerNotificationMenu';
import { publicApi } from '../../lib/publicApi';
import { cn } from '../../lib/formatters';

const DEFAULT_CATEGORY_OPTIONS = [
  { label: 'All Categories', slug: 'all', href: '/shop', icon: Film, desc: 'Full physical catalogue' },
  { label: 'Film', slug: 'film', href: '/shop?category=film', icon: Film, desc: 'Blockbusters & cinema releases' },
  { label: 'TV Box Sets', slug: 'tv-box-sets', href: '/shop?category=tv-box-sets', icon: Tv, desc: 'Complete television seasons' },
  { label: 'Documentary & Music', slug: 'documentary-music', href: '/shop?category=documentary-music', icon: Disc, desc: 'Music & historical archives' },
  { label: 'Game', slug: 'game', href: '/shop?category=game', icon: Gamepad2, desc: 'Interactive & disc games' },
];

export const AzDarkLandingNav: React.FC = () => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const accountRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const categoriesQuery = useQuery({
    queryKey: ['store', 'categories'],
    queryFn: () => publicApi.getCategories(),
    staleTime: 60_000,
  });

  const categoryOptions = useMemo(() => {
    if (!categoriesQuery.data || categoriesQuery.data.length === 0) {
      return DEFAULT_CATEGORY_OPTIONS;
    }

    const getIcon = (slug: string) => {
      if (slug.includes('tv')) return Tv;
      if (slug.includes('music') || slug.includes('doc')) return Disc;
      if (slug.includes('game')) return Gamepad2;
      return Film;
    };

    const apiItems = categoriesQuery.data.map((c) => ({
      label: c.name,
      slug: c.slug,
      href: `/shop?category=${c.slug}`,
      icon: getIcon(c.slug),
      desc: c.description || `Browse complete ${c.name} releases`,
    }));

    return [
      { label: 'All Categories', slug: 'all', href: '/shop', icon: Film, desc: 'Full physical catalogue' },
      ...apiItems,
    ];
  }, [categoriesQuery.data]);

  const { openCartDrawer, openSearch } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const { customer, isAuthenticated, logout } = useCustomerAuth();
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  // Sync selected category label with URL
  useEffect(() => {
    if (location.pathname === '/shop') {
      const searchParams = new URLSearchParams(location.search);
      const catParam = searchParams.get('category');
      if (catParam) {
        const found = categoryOptions.find((c) => c.slug === catParam);
        if (found) {
          setSelectedCategory(found.label);
          return;
        }
      }
      setSelectedCategory('All Categories');
    } else if (location.pathname === '/') {
      setSelectedCategory('All Categories');
    }
  }, [location.pathname, location.search, categoryOptions]);

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (item: (typeof categoryOptions)[0]) => {
    setSelectedCategory(item.label);
    setCategoryMenuOpen(false);
    navigate(item.href);
  };

  const isSaleActive = location.pathname === '/shop' && location.search.includes('filter=sale');

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-md transition-colors select-none border-b',
        isDark
          ? 'bg-[#07090E]/95 border-white/10 text-white'
          : 'bg-white/95 border-gray-200 text-gray-900 shadow-xs'
      )}
    >
      <div className="w-full h-[64px] sm:h-[80px] flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
        {/* ── LEFT: DVDs Zone Brand Logo (Aligned with sidebar width on desktop) ── */}
        <div className="flex items-center shrink-0 w-auto lg:w-[260px] xl:w-[280px]">
          <Link to="/" className="flex items-center gap-2 group py-1" title="DVDs Zone - Home">
            <img
              src={isDark ? '/brand/logo-dark-theme.png' : '/brand/logo-transparent.png'}
              alt="DVDs Zone"
              className="h-8 sm:h-11 md:h-12 w-auto max-w-[125px] sm:max-w-[185px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* ── CENTER: Category Selector Pill (Gambar 2) + Search Engine (Shortened to not cross sidebar boundary) ── */}
        <div className="hidden md:flex flex-1 items-center min-w-0 mx-1 sm:mx-3 xl:mx-4 gap-2 sm:gap-3 max-w-4xl xl:max-w-5xl">
          {/* Category Dropdown Pill [ Movies ⌵ ] matching Gambar 2 */}
          <div ref={categoryRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
              className={cn(
                'h-11 px-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap',
                isDark
                  ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-900'
              )}
              aria-label="Filter catalogue by category"
              aria-expanded={categoryMenuOpen}
            >
              <Film size={15} className="text-brand-blue shrink-0" />
              <span>{selectedCategory}</span>
              <ChevronDown
                size={14}
                className={cn('text-gray-400 transition-transform duration-200', categoryMenuOpen && 'rotate-180')}
              />
            </button>

            {/* Category Dropdown Menu */}
            {categoryMenuOpen && (
              <div
                className={cn(
                  'absolute top-full left-0 mt-2 w-72 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150',
                  isDark ? 'bg-[#0E131F] border-white/15 text-white' : 'bg-white border-gray-200 text-gray-900'
                )}
              >
                <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                  Browse by Category
                </p>
                <div className="space-y-1">
                  {categoryOptions.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedCategory === item.label;
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => handleCategorySelect(item)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer group',
                          isSelected
                            ? isDark
                              ? 'bg-brand-blue/20 text-white'
                              : 'bg-brand-blue/10 text-brand-blue'
                            : isDark
                              ? 'hover:bg-white/5 text-gray-300 hover:text-white'
                              : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'p-1.5 rounded-lg shrink-0 transition-colors',
                              isSelected
                                ? 'bg-brand-blue text-white'
                                : isDark
                                  ? 'bg-white/5 text-gray-400 group-hover:text-white'
                                  : 'bg-gray-100 text-gray-500 group-hover:text-gray-900'
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-xs font-semibold truncate', isSelected && 'font-bold')}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-brand-blue shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Search Engine Pill ── */}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={openSearch}
              className={cn(
                'w-full h-11 px-4 rounded-xl border text-xs sm:text-sm font-normal flex items-center justify-between transition-all cursor-pointer group shadow-xs',
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600 hover:text-gray-900'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search
                  size={16}
                  className={cn(
                    'transition-colors shrink-0',
                    isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                  )}
                />
                <span className="truncate">Search titles, actors, genres, box sets, or SKU...</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <kbd
                  className={cn(
                    'hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border',
                    isDark ? 'bg-white/10 border-white/15 text-gray-400' : 'bg-white border-gray-200 text-gray-500 shadow-2xs'
                  )}
                >
                  /
                </kbd>
                <div
                  className={cn(
                    'p-1 rounded-md transition-colors',
                    isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                  )}
                  title="Filter options"
                >
                  <SlidersHorizontal size={16} />
                </div>
              </div>
            </button>
          </div>

          {/* ── Special Offers Button (Item 4: Positioned immediately to the right of search engine) ── */}
          <Link
            to="/shop?filter=sale"
            className={cn(
              'h-11 px-3.5 sm:px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 shrink-0 border shadow-xs',
              isSaleActive
                ? 'text-brand-red bg-brand-red/20 border-brand-red/40'
                : isDark
                  ? 'text-brand-red bg-brand-red/10 border-brand-red/25 hover:bg-brand-red/20'
                  : 'text-brand-red bg-red-50 border-red-200 hover:bg-red-100'
            )}
            title="Browse Special Offers & Limited Sales"
          >
            <Tag size={13} className="text-brand-red shrink-0" />
            <span className="hidden xl:inline">Special Offers</span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-brand-red text-white rounded-full">
              Sale
            </span>
          </Link>
        </div>

        {/* ── RIGHT: Notifications, Theme Switcher, Account, Basket ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* ── Notification Bell (Item 5: Present on homepage and all pages) ── */}
          <CustomerNotificationMenu />

          {/* ── Direct Theme Switcher Button ── */}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border transition-all cursor-pointer shadow-xs',
              isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-400 hover:text-amber-300'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 hover:text-gray-900'
            )}
            title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* ── Customer Account Menu with Dark/Light Mode Toggle (Item 6) ── */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className={cn(
                'flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-full border text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer shadow-xs',
                isDark
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200 hover:text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800 hover:text-gray-900'
              )}
              aria-label="Customer account menu"
              aria-expanded={accountMenuOpen}
            >
              <User size={15} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
              <span className="hidden sm:inline max-w-[95px] truncate">
                {isAuthenticated ? customer?.full_name?.split(' ')[0] || 'Account' : 'Sign In'}
              </span>
              <ChevronDown
                size={13}
                className={cn('text-gray-400 transition-transform duration-200', accountMenuOpen && 'rotate-180')}
              />
            </button>

            {accountMenuOpen && (
              <div
                className={cn(
                  'fixed sm:absolute top-[64px] sm:top-full mt-2 left-3 right-3 sm:left-auto sm:right-0 w-auto sm:w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150',
                  isDark ? 'bg-[#0E131F] border-white/15 text-white' : 'bg-white border-gray-200 text-gray-900'
                )}
              >
                {/* User Header */}
                {isAuthenticated ? (
                  <div className={cn('px-3 py-2 border-b mb-1', isDark ? 'border-white/10' : 'border-gray-100')}>
                    <p className="text-xs font-bold truncate">{customer?.full_name || 'Customer'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{customer?.email}</p>
                  </div>
                ) : (
                  <div className={cn('px-3 py-2 border-b mb-1', isDark ? 'border-white/10' : 'border-gray-100')}>
                    <p className="text-xs font-bold">DVDs Zone Club</p>
                    <p className="text-[11px] text-gray-400">Sign in to track orders &amp; media library</p>
                  </div>
                )}

                {/* ── THEME TOGGLE: Dark & Light Mode (Item 6) ── */}
                <div className={cn('px-3 py-2.5 my-1 rounded-xl border', isDark ? 'bg-white/[0.03] border-white/10' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Appearance</span>
                    <span className="text-[10px] font-mono text-gray-400">{isDark ? 'Dark' : 'Light'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-black/20 dark:bg-black/40">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                        isDark
                          ? 'bg-brand-blue text-white shadow-xs font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Moon size={13} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                        !isDark
                          ? 'bg-white text-dark shadow-xs font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Sun size={13} />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                {/* Account Navigation Links */}
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/account/orders"
                      onClick={() => setAccountMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <Package size={14} className="text-brand-blue" />
                      <span>My Orders &amp; Tracking</span>
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                        isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <User size={14} className="text-gray-400" />
                      <span>Account Profile</span>
                    </Link>
                    <div className={cn('h-px my-1', isDark ? 'bg-white/10' : 'bg-gray-100')} />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-xl transition-all shadow-md mt-1"
                    >
                      <LogIn size={14} />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setAccountMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold rounded-xl transition-all mt-1.5 border',
                        isDark
                          ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border-gray-200'
                      )}
                    >
                      <span>Create Account</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Cart Trigger Button ── */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs sm:text-[13px] font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            aria-label={`View basket (${cartCount} items)`}
          >
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Basket</span>
            <span className="min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] px-1 bg-white text-dark text-[10px] sm:text-[11px] font-black rounded-full flex items-center justify-center shadow-xs">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AzDarkLandingNav;
