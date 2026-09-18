import React from 'react';
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
  X,
  Film,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/formatters';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { Product, Category, Genre } from '../../types';

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
  { label: 'Box Sets', href: '/shop?format=box-set', icon: Package },
];

const BOTTOM_NAV = [
  { label: 'Settings', href: '/account/profile', icon: Settings },
  { label: 'Support & FAQs', href: '/contact', icon: HelpCircle },
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
        'flex flex-col h-full bg-[#0d0f14] border-r border-white/[0.08] transition-all duration-300 select-none relative',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full bg-[#181a24] border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-[#f5c518]/50 transition-all shadow-lg"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 pt-6 pb-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const isFavourites = label === 'Favourites';
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200',
                  active
                    ? 'bg-[#f5c518]/15 text-[#f5c518] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                )}
                title={collapsed ? label : undefined}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    size={17}
                    className={cn(
                      'transition-colors',
                      active ? 'text-[#f5c518]' : 'text-white/50 group-hover:text-white'
                    )}
                  />
                  {isFavourites && favourites.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-[#f5c518] text-black text-[8px] font-extrabold flex items-center justify-center px-0.5 leading-none">
                      {Math.min(favourites.length, 99)}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] my-3" />

        {/* Recent Vault Highlights (Desktop Expanded) */}
        {!collapsed && recentProducts.length > 0 && (
          <div className="mt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#f5c518]/70 px-3 mb-2.5">
              Vault Highlights
            </p>
            <div className="flex flex-col gap-2">
              {recentProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group flex items-center gap-2.5 rounded-xl p-2 bg-white/[0.02] hover:bg-white/[0.07] border border-white/[0.04] hover:border-white/10 transition-all"
                >
                  <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-white/5 shadow">
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={10} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white/85 leading-tight truncate group-hover:text-white">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">
                      {product.release_year} &bull;{' '}
                      <span className="text-[#f5c518] font-medium">
                        {product.imdb_rating ? `${product.imdb_rating.toFixed(1)} ★` : product.format}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Links */}
      <div className="px-3 pb-5 flex flex-col gap-1 shrink-0">
        <div className="h-px bg-white/[0.06] mb-2" />
        {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-white/45 hover:text-white hover:bg-white/[0.05] transition-all"
            title={collapsed ? label : undefined}
          >
            <Icon size={15} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
};

/* Mobile Slide-Out Drawer Navigation */
interface SeriviaMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentProducts?: Product[];
  categories?: Category[];
  genres?: Genre[];
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export const SeriviaMobileDrawer: React.FC<SeriviaMobileDrawerProps> = ({
  isOpen,
  onClose,
  recentProducts = [],
  categories = [],
  genres = [],
  activeFilter,
  onSelectFilter,
}) => {
  const favourites = useFavouritesStore((s) => s.favourites);
  const { pathname } = useLocation();

  if (!isOpen) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Dark Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-[#0d0f14] border-r border-white/10 flex flex-col z-10 overflow-y-auto no-scrollbar shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f5c518] to-amber-500 flex items-center justify-center shadow-md">
              <Film size={16} className="text-black" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight">DVDs Zone</span>
              <p className="text-[9px] text-[#f5c518] font-bold uppercase">Collector Vault</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Links */}
        <div className="px-3 py-3 space-y-1 border-b border-white/[0.08]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 py-1">
            Menu
          </p>
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const isFavourites = label === 'Favourites';
            return (
              <Link
                key={href}
                to={href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-[#f5c518]/15 text-[#f5c518]'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                {isFavourites && favourites.length > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-[#f5c518] text-black text-[10px] font-extrabold flex items-center justify-center px-1">
                    {favourites.length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Categories / Genres Quick Selection */}
        {(genres.length > 0 || categories.length > 0) && (
          <div className="px-3 py-3 border-b border-white/[0.08]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 py-1">
              Top Genres & Formats
            </p>
            <div className="flex flex-wrap gap-1.5 px-1 py-1">
              {genres.slice(0, 6).map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => {
                    onSelectFilter?.(`genre:${genre.slug}`);
                    onClose();
                  }}
                  className={cn(
                    'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                    activeFilter === `genre:${genre.slug}`
                      ? 'bg-[#f5c518] text-black border-[#f5c518]'
                      : 'bg-white/[0.04] text-white/65 border-white/[0.06] hover:text-white'
                  )}
                >
                  {genre.name}
                </button>
              ))}
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectFilter?.(`cat:${cat.slug}`);
                    onClose();
                  }}
                  className={cn(
                    'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors',
                    activeFilter === `cat:${cat.slug}`
                      ? 'bg-[#f5c518] text-black border-[#f5c518]'
                      : 'bg-white/[0.04] text-white/65 border-white/[0.06] hover:text-white'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Vault Highlights (Mobile) */}
        {recentProducts.length > 0 && (
          <div className="px-3 py-3 border-b border-white/[0.08]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#f5c518]/70 px-3 py-1">
              Featured Titles
            </p>
            <div className="space-y-2 mt-1">
              {recentProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                >
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="w-9 h-12 rounded-md object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white/90 truncate">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {product.release_year} &bull;{' '}
                      <span className="text-[#f5c518]">
                        {product.imdb_rating ? `${product.imdb_rating.toFixed(1)} ★` : product.format}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Support & Guarantee */}
        <div className="mt-auto px-3 py-4 space-y-2 bg-[#090b10]">
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          ))}

          <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 px-3 text-[10px] text-white/40">
            <ShieldCheck size={14} className="text-[#f5c518] shrink-0" />
            <span>Royal Mail Tracked 24 Dispatch</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriviaSidebar;
