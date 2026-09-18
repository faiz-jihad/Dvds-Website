import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ShoppingBag,
  ChevronDown,
  Film,
  X,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { cn } from '../../lib/formatters';

const TYPE_OPTIONS = [
  { label: 'All Formats', value: 'all' },
  { label: 'Box Sets', value: 'box_set' },
  { label: 'Trending', value: 'trending' },
  { label: 'New Releases', value: 'new' },
  { label: 'On Sale', value: 'sale' },
];

interface SeriviaTopNavProps {
  onOpenMobileMenu?: () => void;
  activeType?: string;
  onSelectType?: (type: string) => void;
}

export const SeriviaTopNav: React.FC<SeriviaTopNavProps> = ({
  onOpenMobileMenu,
  activeType = 'all',
  onSelectType,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [mobileSearchActive, setMobileSearchActive] = useState(false);
  const navigate = useNavigate();
  const { openCartDrawer, openSearch } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const { user } = useCustomerAuth();
  const typeRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (mobileSearchActive) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchActive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const params = new URLSearchParams();
    params.set('q', searchValue.trim());
    navigate(`/search?${params.toString()}`);
    setSearchValue('');
    setMobileSearchActive(false);
  };

  const currentTypeLabel =
    TYPE_OPTIONS.find((t) => t.value === activeType)?.label || 'All Formats';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 bg-[#0d0f14]/95 backdrop-blur-xl border-b border-white/[0.08] select-none">
      {/* Mobile Search Active Mode */}
      {mobileSearchActive ? (
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full">
          <div className="relative flex-1 flex items-center">
            <Search size={16} className="absolute left-3 text-[#f5c518]" />
            <input
              ref={mobileInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search titles, directors, genres..."
              className="w-full bg-white/[0.08] border border-[#f5c518]/40 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-white/40 outline-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="absolute right-3 text-white/50 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchActive(false)}
            className="text-xs font-semibold text-white/60 hover:text-white px-2 py-1.5"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          {/* Left: Hamburger (mobile) + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile menu trigger */}
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white/80 active:scale-95 transition-all"
              aria-label="Open mobile menu"
            >
              <Menu size={18} />
            </button>

            {/* Brand Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none"
              aria-label="DVDs Zone Home"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#f5c518] to-amber-500 flex items-center justify-center shadow-lg shadow-[#f5c518]/25 group-hover:scale-105 transition-transform">
                <Film size={17} className="text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-none">
                  DVDs Zone
                </span>
                <span className="hidden sm:inline text-[9px] font-semibold tracking-wider text-[#f5c518] uppercase">
                  Collector Vault
                </span>
              </div>
            </Link>

            {/* Desktop Type Dropdown */}
            <div ref={typeRef} className="relative hidden lg:block ml-2">
              <button
                onClick={() => setTypeOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-3 py-2 transition-all"
                aria-haspopup="listbox"
                aria-expanded={typeOpen}
              >
                <span>{currentTypeLabel}</span>
                <ChevronDown
                  size={13}
                  className={cn('transition-transform duration-200 text-white/40', typeOpen && 'rotate-180')}
                />
              </button>
              {typeOpen && (
                <div className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-[#161822] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onSelectType?.(opt.value);
                        setTypeOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3.5 py-2 text-xs font-medium transition-colors',
                        activeType === opt.value
                          ? 'text-[#f5c518] bg-[#f5c518]/10 font-semibold'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Search Bar (Desktop / Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-2 relative items-center">
            <form onSubmit={handleSearch} className="w-full relative flex items-center">
              <Search
                size={15}
                className="absolute left-3.5 text-white/30 pointer-events-none"
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search movies, box sets, series, actors..."
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/[0.08] focus:border-[#f5c518]/50 rounded-xl pl-9 pr-10 py-2 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-all"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  className="absolute right-3 text-white/30 hover:text-white/70 transition-colors"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openSearch}
                  title="Open advanced search"
                  className="absolute right-3 text-white/25 hover:text-[#f5c518] transition-colors"
                >
                  <Sparkles size={13} />
                </button>
              )}
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Search Icon Trigger */}
            <button
              type="button"
              onClick={() => setMobileSearchActive(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all"
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Notifications / Vault alerts */}
            <button
              onClick={() => navigate('/shop?filter=new')}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-all"
              aria-label="New Vault arrivals"
              title="New Releases"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
            </button>

            {/* Cart Button with Counter */}
            <button
              onClick={openCartDrawer}
              className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all active:scale-95"
              aria-label="View basket"
              title="View Cart"
            >
              <ShoppingBag size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#f5c518] text-black text-[9px] font-extrabold flex items-center justify-center px-1 shadow-md leading-none animate-in fade-in zoom-in-75 duration-200">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Profile / Account Pill */}
            {user ? (
              <Link
                to="/account/profile"
                className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-2.5 sm:px-3 py-1.5 transition-all group"
                title="Your Account"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5c518] to-amber-500 flex items-center justify-center text-black text-[10px] font-bold shrink-0">
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-medium text-white/80 group-hover:text-white max-w-[80px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </Link>
            ) : (
              <Link
                to="/account/login"
                className="flex items-center gap-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white transition-all"
              >
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </>
      )}
    </header>
  );
};

export default SeriviaTopNav;
