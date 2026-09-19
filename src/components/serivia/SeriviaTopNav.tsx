import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ShoppingBag,
  ChevronDown,
  X,
  Menu,
  Sparkles,
  User,
  Package,
  Heart,
  LogOut,
  CheckCheck,
  Tag,
  Info,
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { cn } from '../../lib/formatters';

const TYPE_OPTIONS = [
  { label: 'All Formats', value: 'all' },
  { label: 'Box Sets', value: 'box_set' },
  { label: '4K Ultra HD', value: 'format:4k' },
  { label: 'Blu-ray Disc', value: 'format:blu-ray' },
  { label: 'Standard DVD', value: 'format:dvd' },
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { openCartDrawer, openSearch } = useUiStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const { customer, isAuthenticated, logout } = useCustomerAuth();

  // Notification store
  const allNotifications = useNotificationStore((s) => s.notifications);
  const customerNotifications = allNotifications.filter((n) => n.target === 'customer');
  const unreadCount = customerNotifications.filter((n) => !n.read).length;
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const typeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (typeRef.current && !typeRef.current.contains(target)) setTypeOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const params = new URLSearchParams();
    params.set('q', searchValue.trim());
    navigate(`/search?${params.toString()}`);
    setSearchValue('');
  };

  const currentTypeLabel =
    TYPE_OPTIONS.find((t) => t.value === activeType)?.label || 'All Formats';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-2.5 bg-[#0d0f14]/95 backdrop-blur-xl border-b border-white/[0.08] select-none">
      {/* Left: Hamburger (mobile) + Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">


        <Link
          to="/"
          onClick={() => onSelectType?.('all')}
          className="flex items-center gap-2 group focus:outline-none shrink-0"
          aria-label="DVDs Zone Home"
        >
          <div className="inline-flex items-center justify-center bg-white px-2 py-0.5 rounded-lg shadow-xs border border-white/20 transition-transform duration-200 group-hover:scale-[1.03]">
            <img
              src="/brand/logo-transparent.png"
              alt="DVDs Zone"
              className="h-7 sm:h-8 md:h-9 w-auto max-w-[120px] sm:max-w-[155px] object-contain"
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = 'none';
                const fallback = document.getElementById('logo-text-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          </div>
          <div id="logo-text-fallback" className="hidden flex-col">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-none">
              DVDs Zone
            </span>
            <span className="text-[9px] font-bold text-[#f5c518] uppercase tracking-wider">
              Collector Vault
            </span>
          </div>
        </Link>

        {/* Desktop Type Dropdown */}
        <div ref={typeRef} className="relative hidden lg:block ml-2">
          <button
            onClick={() => setTypeOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/75 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-3 py-2 transition-all cursor-pointer"
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
            <div className="absolute top-full left-0 mt-1.5 min-w-[175px] bg-[#161822] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/[0.06] mb-1">
                Filter by Format & Edition
              </div>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSelectType?.(opt.value);
                    setTypeOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer',
                    activeType === opt.value
                      ? 'text-[#f5c518] bg-[#f5c518]/10 font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <span>{opt.label}</span>
                  {activeType === opt.value && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
                  )}
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
              className="absolute right-3 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={openSearch}
              title="Open advanced search"
              className="absolute right-3 text-white/30 hover:text-[#f5c518] transition-colors cursor-pointer"
            >
              <Sparkles size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Search Trigger -> Opens SearchOverlay */}
        <button
          type="button"
          onClick={openSearch}
          className="md:hidden w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
          aria-label="Search"
          title="Search catalogue"
        >
          <Search size={16} />
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            aria-label="Vault notifications"
            title="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[#f5c518] text-black text-[9px] font-extrabold flex items-center justify-center px-0.5 shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {notifOpen && (
            <div className="absolute right-0 sm:right-auto sm:-left-32 md:-left-44 mt-2 w-[310px] sm:w-[350px] bg-[#161822] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-white animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">
                    Vault Updates
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-[#f5c518] text-black px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead('customer')}
                    className="flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-[#f5c518] transition-colors cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-[280px] overflow-y-auto divide-y divide-white/[0.04]">
                {customerNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-xs text-white/40">No notifications at the moment.</p>
                    <p className="text-[10px] text-white/25 mt-1">
                      New 4K UHD arrivals and dispatch updates will appear here.
                    </p>
                  </div>
                ) : (
                  customerNotifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) {
                          setNotifOpen(false);
                          navigate(n.link);
                        }
                      }}
                      className={cn(
                        'px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer',
                        !n.read && 'bg-[#f5c518]/[0.04]'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 text-[#f5c518]">
                          {n.type === 'order' ? <Package size={14} /> : n.type === 'promo' ? <Tag size={14} /> : <Info size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/90 truncate">{n.title}</p>
                          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f5c518] mt-1.5 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-white/[0.06] bg-[#11131a] text-center">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/shop?filter=new');
                  }}
                  className="text-xs font-bold text-[#f5c518] hover:underline cursor-pointer"
                >
                  Explore New Releases &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Button with Counter */}
        <button
          onClick={openCartDrawer}
          className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all active:scale-95 cursor-pointer"
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

        {/* Profile / Account with Dropdown */}
        {isAuthenticated && customer ? (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 sm:gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer"
              title="Your Account"
            >
              <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 shadow">
                {(customer.full_name?.[0] || customer.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-white/80 max-w-[85px] truncate">
                {customer.full_name?.split(' ')[0] || customer.email?.split('@')[0]}
              </span>
              <ChevronDown
                size={12}
                className={cn('text-white/40 transition-transform', userMenuOpen && 'rotate-180')}
              />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#161822] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 text-white animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
                  <p className="text-xs font-bold text-white truncate">
                    {customer.full_name || 'Collector Member'}
                  </p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{customer.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/account/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <User size={14} className="text-[#f5c518]" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/account/orders"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Package size={14} className="text-[#f5c518]" />
                    <span>Order History</span>
                  </Link>
                  <Link
                    to="/favourites"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Heart size={14} className="text-[#f5c518]" />
                    <span>Saved Favourites</span>
                  </Link>
                </div>

                <div className="border-t border-white/[0.06] pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/account/login"
            className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-extrabold rounded-xl px-3 sm:px-3.5 py-1.5 text-xs shadow-md shadow-brand-blue/20 transition-all active:scale-95"
          >
            <User size={13} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default SeriviaTopNav;
