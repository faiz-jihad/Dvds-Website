import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Heart,
  Clock,
  TrendingUp,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
  Disc,
} from "lucide-react";
import { cn } from "../../lib/formatters";
import { useFavouritesStore } from "../../stores/useFavouritesStore";
import { useCustomerAuth } from "../../auth/CustomerAuth";
import { Product, Category, Genre } from "../../types";

interface SeriviaSidebarProps {
  recentProducts?: Product[];
  categories?: Category[];
  genres?: Genre[];
  collapsed?: boolean;
  onToggle?: () => void;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

const NAV_ITEMS = [
  { label: "Home", href: "/", filter: "all", icon: Home },
  {
    label: "Top 10 Chart",
    href: "/shop?filter=trending",
    filter: "trending",
    icon: TrendingUp,
  },
  {
    label: "New Arrivals",
    href: "/shop?filter=new",
    filter: "new",
    icon: Clock,
  },
  {
    label: "4K Ultra HD",
    href: "/shop?format=4k",
    filter: "format:4k",
    icon: Disc,
  },
  {
    label: "Box Sets",
    href: "/shop?format=box-set",
    filter: "box_set",
    icon: Package,
  },
  { label: "Favourites", href: "/favourites", filter: "", icon: Heart },
];

export const SeriviaSidebar: React.FC<SeriviaSidebarProps> = ({
  recentProducts = [],
  categories = [],
  genres = [],
  collapsed = false,
  onToggle,
  activeFilter = "all",
  onSelectFilter,
}) => {
  const { pathname } = useLocation();
  const favourites = useFavouritesStore((s) => s.favourites);

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (pathname === "/" && onSelectFilter) {
      if (item.filter) return activeFilter === item.filter;
      return false;
    }
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.href.split("?")[0]);
  };

  const handleNavClick = (e: React.MouseEvent, item: (typeof NAV_ITEMS)[0]) => {
    if (pathname === "/" && item.filter && onSelectFilter) {
      e.preventDefault();
      onSelectFilter(item.filter);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 select-none relative",
        collapsed ? "w-[72px]" : "w-[230px]",
      )}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-4 z-20 w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-500 hover:text-dark hover:border-brand-blue transition-all shadow-md cursor-pointer"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const isFavourites = item.label === "Favourites";
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                  active
                    ? "bg-brand-blue/10 text-brand-blue font-bold shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 hover:text-dark",
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    size={17}
                    className={cn(
                      "transition-colors",
                      active
                        ? "text-brand-blue"
                        : "text-gray-400 group-hover:text-dark",
                    )}
                  />
                  {isFavourites && favourites.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-brand-red text-white text-[8px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow">
                      {Math.min(favourites.length, 99)}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Dynamic Genres Section (Expanded Desktop) */}
        {!collapsed && genres.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 px-3 mb-2">
              Genres &amp; Themes
            </p>
            <div className="flex flex-col gap-0.5">
              {genres.map((g) => {
                const isGenreActive = activeFilter === `genre:${g.slug}`;
                return (
                  <button
                    key={g.id}
                    onClick={() => onSelectFilter?.(`genre:${g.slug}`)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate",
                      isGenreActive
                        ? "bg-brand-blue/10 text-brand-blue font-bold"
                        : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                    )}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 my-3" />

        {/* Recent Vault Highlights (Desktop Expanded) */}
        {!collapsed && recentProducts.length > 0 && (
          <div className="mt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-blue px-3 mb-2.5">
              Vault Highlights
            </p>
            <div className="flex flex-col gap-2">
              {recentProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group flex items-center gap-2.5 rounded-xl p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/70 hover:border-brand-blue/30 transition-all cursor-pointer"
                >
                  <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-200 shadow-xs">
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={10} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-dark leading-tight truncate group-hover:text-brand-blue">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {product.release_year} &bull;{" "}
                      <span className="text-brand-blue font-bold">
                        {product.imdb_rating
                          ? `${product.imdb_rating.toFixed(1)} ★`
                          : product.format}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Official Store Guarantee (Expanded Desktop) */}
        {!collapsed && (
          <div className="mt-auto pt-3 border-t border-gray-100 px-2 pb-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-dark">
                <ShieldCheck size={14} className="text-brand-blue shrink-0" />
                <span>Official UK Store</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                Certified physical editions &amp; collector box sets.
              </p>
            </div>
          </div>
        )}
      </nav>
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
  const { customer, isAuthenticated, logout } = useCustomerAuth();
  const { pathname } = useLocation();

  if (!isOpen) return null;

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (pathname === "/" && onSelectFilter && item.filter) {
      return activeFilter === item.filter;
    }
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.href.split("?")[0]);
  };

  const handleMobileNavClick = (
    e: React.MouseEvent,
    item: (typeof NAV_ITEMS)[0],
  ) => {
    if (pathname === "/" && item.filter && onSelectFilter) {
      e.preventDefault();
      onSelectFilter(item.filter);
      onClose();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
      {/* Dark Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-[285px] max-w-[85vw] h-full bg-white text-dark border-r border-gray-200 flex flex-col z-10 overflow-y-auto no-scrollbar shadow-2xl animate-in slide-in-from-left duration-250">
        {/* Drawer Header with Official Logo */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <img
              src="/brand/logo-transparent.png"
              alt="DVDs Zone"
              className="h-8 w-auto max-w-[130px] object-contain"
            />
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-dark cursor-pointer active:scale-95"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Links */}
        <div className="px-3 py-3 space-y-1 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1">
            Menu Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const isFavourites = item.label === "Favourites";
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={(e) => handleMobileNavClick(e, item)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer",
                  active
                    ? "bg-brand-blue/10 text-brand-blue font-bold"
                    : "text-gray-700 hover:bg-gray-100 hover:text-dark",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {isFavourites && favourites.length > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-brand-red text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow">
                    {favourites.length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Categories / Genres Quick Selection */}
        {(genres.length > 0 || categories.length > 0) && (
          <div className="px-3 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1">
              Popular Genres & Editions
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
                    "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
                    activeFilter === `genre:${genre.slug}`
                      ? "bg-brand-blue text-white border-brand-blue font-bold shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
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
                    "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
                    activeFilter === `cat:${cat.slug}`
                      ? "bg-brand-blue text-white border-brand-blue font-bold shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
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
          <div className="px-3 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue px-3 py-1">
              Featured Titles
            </p>
            <div className="space-y-2 mt-1">
              {recentProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-150 transition-colors cursor-pointer"
                >
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="w-9 h-12 rounded-md object-cover shrink-0 shadow-xs"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-dark truncate">
                      {product.title}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {product.release_year} &bull;{" "}
                      <span className="text-brand-blue font-bold">
                        {product.imdb_rating
                          ? `${product.imdb_rating.toFixed(1)} ★`
                          : product.format}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Customer Account Access (Mobile) */}
        <div className="px-3 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1">
            Account
          </p>
          {isAuthenticated && customer ? (
            <div className="space-y-1 mt-1">
              <div className="px-3 py-1.5">
                <p className="text-xs font-bold text-dark truncate">
                  {customer.full_name || customer.email}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {customer.email}
                </p>
              </div>
              <Link
                to="/account/orders"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-dark transition-colors"
              >
                <Package size={15} className="text-gray-400" />
                <span>My Orders &amp; Tracking</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-1 pt-1">
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-blue text-white text-xs font-bold shadow-xs hover:bg-brand-blue-hover transition-colors"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="flex items-center justify-center py-2 px-3 rounded-xl border border-gray-200 bg-white text-dark text-xs font-bold shadow-xs hover:bg-gray-50 transition-colors"
              >
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Dispatch Guarantee */}
        <div className="mt-auto px-4 py-3.5 bg-gray-50 border-t border-gray-150">
          <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
            <ShieldCheck size={14} className="text-brand-blue shrink-0" />
            <span>Royal Mail Tracked 24 Dispatch</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriviaSidebar;
