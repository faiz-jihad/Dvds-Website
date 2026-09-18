import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ShoppingBag,
  ChevronDown,
  User,
  LogIn,
  Film,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { cn } from '../../lib/formatters';

const TYPE_OPTIONS = [
  { label: 'All Editions', value: '' },
  { label: 'Box Sets', value: 'box-sets' },
  { label: 'Steelbooks', value: 'steelbooks' },
  { label: 'Collector Series', value: 'collector' },
  { label: 'Classics', value: 'classics' },
];

export const SeriviaTopNav: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [typeOpen, setTypeOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(TYPE_OPTIONS[0]);
  const navigate = useNavigate();
  const { openCartDrawer } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const { user } = useCustomerAuth();
  const typeRef = useRef<HTMLDivElement>(null);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const params = new URLSearchParams();
    params.set('q', searchValue.trim());
    if (selectedType.value) params.set('category', selectedType.value);
    navigate(`/search?${params.toString()}`);
    setSearchValue('');
  };

  return (
    <header className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-[#0d0f14] border-b border-white/[0.07] shrink-0 z-10">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 shrink-0 mr-1 group"
        aria-label="DVDs Zone Home"
      >
        <div className="w-8 h-8 rounded-lg bg-[#f5c518] flex items-center justify-center shadow-lg shadow-[#f5c518]/20 group-hover:scale-105 transition-transform">
          <Film size={16} className="text-black" />
        </div>
        <span className="hidden sm:block font-bold text-sm text-white tracking-tight">
          DVDs Zone
        </span>
      </Link>

      {/* Type Filter Dropdown */}
      <div ref={typeRef} className="relative shrink-0">
        <button
          onClick={() => setTypeOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg px-3 py-2 transition-all"
          aria-haspopup="listbox"
          aria-expanded={typeOpen}
        >
          <span className="hidden sm:inline">{selectedType.label}</span>
          <span className="sm:hidden">Type</span>
          <ChevronDown
            size={14}
            className={cn('transition-transform duration-200', typeOpen && 'rotate-180')}
          />
        </button>
        {typeOpen && (
          <div className="absolute top-full left-0 mt-1.5 min-w-[170px] bg-[#181b24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSelectedType(opt); setTypeOpen(false); }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm transition-colors',
                  selectedType.value === opt.value
                    ? 'text-[#f5c518] bg-[#f5c518]/10'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex-1 relative flex items-center"
      >
        <Search
          size={15}
          className="absolute left-3.5 text-white/30 pointer-events-none"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Movies, series, shows, directors..."
          className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/[0.07] focus:border-[#f5c518]/40 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-white/25 outline-none transition-all"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue('')}
            className="absolute right-3 text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        )}
        {!searchValue && (
          <button
            type="button"
            className="absolute right-3 text-white/25 hover:text-white/50 transition-colors"
            aria-label="Search filters"
          >
            <SlidersHorizontal size={14} />
          </button>
        )}
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-all"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
        </button>

        {/* Cart */}
        <button
          onClick={openCartDrawer}
          className="relative w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-all"
          aria-label="Shopping cart"
        >
          <ShoppingBag size={16} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#f5c518] text-black text-[9px] font-bold flex items-center justify-center px-1 shadow-lg">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>

        {/* Profile / Auth */}
        {user ? (
          <Link
            to="/account/profile"
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-3 py-1.5 transition-all group"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5c518] to-amber-500 flex items-center justify-center text-black text-[10px] font-bold shrink-0">
              {(user.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs font-medium text-white/70 group-hover:text-white transition-colors max-w-[80px] truncate">
              {user.email?.split('@')[0]}
            </span>
            <span className="hidden sm:inline-flex items-center text-[9px] font-semibold bg-[#f5c518]/15 text-[#f5c518] rounded-full px-1.5 py-0.5 uppercase tracking-wide">
              Member
            </span>
          </Link>
        ) : (
          <Link
            to="/account/login"
            className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/60 hover:text-white transition-all"
          >
            <LogIn size={14} />
            <span className="hidden sm:inline text-xs font-medium">Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default SeriviaTopNav;
