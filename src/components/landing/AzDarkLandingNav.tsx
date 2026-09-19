import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  ChevronDown,
  Tag,
  Package,
  Clock,
  Disc,
  LogIn,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { cn } from '../../lib/formatters';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Movies', href: '/shop' },
  { label: 'TV Series', href: '/shop?category=tv-box-sets' },
  { label: 'Box Sets', href: '/shop?format=box-set' },
  { label: 'New Releases', href: '/shop?filter=new' },
  { label: 'Special Offers', href: '/shop?filter=sale', isSale: true },
];

export const AzDarkLandingNav: React.FC = () => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const { openCartDrawer, openSearch, openMobileNav } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const favourites = useFavouritesStore((s) => s.favourites);
  const { customer, isAuthenticated, logout } = useCustomerAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07090E]/95 backdrop-blur-md border-b border-white/10 transition-colors select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-4">
        {/* LEFT: Mobile Menu + AZ Rayan DVDs Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={openMobileNav}
            className="lg:hidden w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group py-1" title="DVDs Zone - Home">
            <div className="inline-flex items-center justify-center bg-white px-2 py-0.5 rounded-lg shadow-xs border border-white/20 transition-transform duration-300 group-hover:scale-[1.02]">
              <img
                src="/brand/logo-transparent.png"
                alt="DVDs Zone"
                className="h-7 sm:h-8 w-auto max-w-[120px] sm:max-w-[145px] object-contain"
              />
            </div>
          </Link>
        </div>

        {/* CENTER: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5',
                link.isSale
                  ? 'text-brand-red bg-brand-red/10 border border-brand-red/25 hover:bg-brand-red/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              )}
            >
              {link.isSale && <Tag size={12} className="text-brand-red" />}
              <span>{link.label}</span>
              {link.isSale && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-brand-red text-white rounded-full">
                  Sale
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* RIGHT: Search, Wishlist, Account, Basket */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Search Button */}
          <button
            type="button"
            onClick={openSearch}
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 hover:text-white transition-all cursor-pointer group"
            aria-label="Search catalogue"
          >
            <Search size={14} className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="hidden md:inline font-medium">Search titles, actors...</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 border border-white/15 rounded text-gray-400">
              /
            </kbd>
          </button>

          {/* Search Icon button for mobile */}
          <button
            type="button"
            onClick={openSearch}
            className="sm:hidden w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Search catalogue"
          >
            <Search size={16} />
          </button>

          {/* Wishlist Link */}
          <Link
            to="/favourites"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Saved Titles"
            aria-label="View favourites"
          >
            <Heart size={16} className={favourites.length > 0 ? 'text-brand-red fill-brand-red' : ''} />
            {favourites.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
                {favourites.length}
              </span>
            )}
          </Link>

          {/* Customer Account Menu */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 hover:text-white transition-colors cursor-pointer"
              aria-label="Customer account menu"
            >
              <User size={15} className="text-gray-300" />
              <span className="hidden sm:inline max-w-[90px] truncate">
                {isAuthenticated ? customer?.full_name?.split(' ')[0] || 'Account' : 'Sign In'}
              </span>
              <ChevronDown
                size={13}
                className={cn('text-gray-400 transition-transform duration-200', accountMenuOpen && 'rotate-180')}
              />
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0E131F] border border-white/15 p-2 shadow-2xl text-white z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-white truncate">{customer?.full_name || 'Customer'}</p>
                      <p className="text-[11px] text-gray-400 truncate">{customer?.email}</p>
                    </div>
                    <Link
                      to="/account/orders"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Package size={14} className="text-brand-blue" />
                      <span>My Orders &amp; Tracking</span>
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <User size={14} className="text-gray-400" />
                      <span>Account Profile</span>
                    </Link>
                    <div className="h-px bg-white/10 my-1" />
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
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-white">AZ Rayan Customer Club</p>
                      <p className="text-[11px] text-gray-400">Sign in to track orders &amp; saved films</p>
                    </div>
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
                      className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition-all mt-1.5"
                    >
                      <span>Create Account</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cart Trigger Button */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            aria-label={`View basket (${cartCount} items)`}
          >
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Basket</span>
            <span className="min-w-[18px] h-[18px] px-1 bg-white text-dark text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default AzDarkLandingNav;
