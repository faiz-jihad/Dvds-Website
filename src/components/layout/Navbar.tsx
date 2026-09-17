import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  User,
  Package,
  RotateCcw,
  Truck,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  LogIn,
  LogOut,
  Shield,
  Tag,
  Film,
  ArrowRight,
} from "lucide-react";
import { useCartStore } from "../../stores/useCartStore";
import { useUiStore } from "../../stores/useUiStore";
import { useFavouritesStore } from "../../stores/useFavouritesStore";
import { useCustomerAuth } from "../../auth/CustomerAuth";
import { cn } from "../../lib/formatters";
import { CustomerNotificationMenu } from "../common/CustomerNotificationMenu";

interface NavLinkItem {
  label: string;
  href: string;
  badge?: string;
  badgeStyle?: string;
}

const GENRE_NAV_ITEMS = [
  {
    name: "Action & Military",
    slug: "action",
    desc: "War epics & adrenaline blockbusters",
  },
  {
    name: "Science Fiction",
    slug: "science-fiction",
    desc: "Space sagas & restored sci-fi",
  },
  {
    name: "Drama & Crime",
    slug: "drama",
    desc: "Prestige cinema & award-winning stories",
  },
  {
    name: "TV Series Box Sets",
    href: "/shop?category=tv-box-sets",
    desc: "Complete television seasons & anthologies",
  },
  {
    name: "Documentary & Music",
    slug: "documentary",
    desc: "Historical archives & live concert pressings",
  },
  {
    name: "Classic & Cult Cinema",
    slug: "historical",
    desc: "Restored British & world cinema classics",
  },
  {
    name: "Western & Frontier",
    slug: "western",
    desc: "Montana frontier epics & classic westerns",
  },
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [genresDropdownOpen, setGenresDropdownOpen] = useState(false);

  const location = useLocation();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const genresMenuRef = useRef<HTMLDivElement>(null);

  const openCartDrawer = useUiStore((state) => state.openCartDrawer);
  const openSearch = useUiStore((state) => state.openSearch);
  const openMobileNav = useUiStore((state) => state.openMobileNav);

  const cartItems = useCartStore((state) => state.items);
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const favourites = useFavouritesStore((state) => state.favourites);
  const {
    customer,
    isAuthenticated,
    logout: customerLogout,
  } = useCustomerAuth();

  // Scroll detection for navbar elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setAccountDropdownOpen(false);
    setGenresDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as HTMLElement)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        genresMenuRef.current &&
        !genresMenuRef.current.contains(event.target as HTMLElement)
      ) {
        setGenresDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcuts: '⌘K' or '/' opens search, 'Escape' closes menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountDropdownOpen(false);
        setGenresDropdownOpen(false);
      }
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement)?.tagName,
      );
      if (
        !isInput &&
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k"))
      ) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  const isShopActive =
    location.pathname === "/shop" &&
    (!location.search || location.search === "");
  const isNewActive =
    location.pathname === "/shop" && location.search.includes("filter=new");
  const isBestsellerActive =
    location.pathname === "/shop" &&
    location.search.includes("filter=bestseller");
  const isGenresActive =
    location.pathname === "/shop" &&
    (location.search.includes("genre=") ||
      location.search.includes("category="));
  const isSaleActive =
    location.pathname === "/shop" && location.search.includes("filter=sale");

  return (
    <header
      data-intro-nav
      className={cn(
        "sticky top-0 z-40 w-full max-w-full overflow-x-hidden transition-all duration-200 bg-white border-b",
        isScrolled
          ? "border-gray-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] py-2 sm:py-2.5"
          : "border-gray-100 py-3 sm:py-3.5",
      )}
    >
      <div className="max-w-container mx-auto flex min-w-0 max-w-full items-center justify-between gap-1 px-2 sm:gap-4 sm:px-4 lg:px-8">
        {/* LEFT: Mobile Menu Trigger + Brand Logo */}
        <div className="flex min-w-0 max-w-full items-center gap-1 shrink-0">
          {/* Mobile menu trigger */}
          <button
            onClick={openMobileNav}
            className="xl:hidden h-10 w-10 shrink-0 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Official Brand Logo */}
          <Link
            to="/"
            className="flex min-w-0 max-w-[55vw] items-center gap-2 shrink-0 group py-1"
            title="DVDs Zone - Home"
          >
            <img
              src="/brand/logo-transparent.png"
              alt="DVDs Zone"
              className="h-8 w-auto max-w-[7rem] object-contain sm:h-10 sm:max-w-[9rem] transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>
        </div>

        {/* CENTER: Primary Navigation Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 xl:gap-2 text-[13.5px] font-medium text-gray-700">
          <Link
            to="/shop"
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-dark/10",
              isShopActive
                ? "text-dark font-bold bg-gray-100 shadow-2xs"
                : "text-gray-600 hover:text-dark hover:bg-gray-100/70 font-medium",
            )}
          >
            Shop
          </Link>

          <Link
            to="/shop?filter=new"
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-dark/10",
              isNewActive
                ? "text-dark font-bold bg-gray-100 shadow-2xs"
                : "text-gray-600 hover:text-dark hover:bg-gray-100/70 font-medium",
            )}
          >
            New Releases
          </Link>

          <Link
            to="/shop?filter=bestseller"
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-dark/10",
              isBestsellerActive
                ? "text-dark font-bold bg-gray-100 shadow-2xs"
                : "text-gray-600 hover:text-dark hover:bg-gray-100/70 font-medium",
            )}
          >
            Best Sellers
          </Link>

          {/* Interactive Genres Dropdown Menu */}
          <div ref={genresMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setGenresDropdownOpen(!genresDropdownOpen)}
              aria-expanded={genresDropdownOpen}
              aria-controls="desktop-genres-menu"
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-dark/10",
                genresDropdownOpen || isGenresActive
                  ? "text-dark font-bold bg-gray-100 shadow-2xs"
                  : "text-gray-600 hover:text-dark hover:bg-gray-100/70 font-medium",
              )}
            >
              <span>Genres</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
                  genresDropdownOpen && "rotate-180 text-dark",
                )}
              />
            </button>

            {genresDropdownOpen && (
              <div
                id="desktop-genres-menu"
                className="absolute left-0 top-full mt-2 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-xl p-2.5 text-dark z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    Curated Archive Genres
                  </span>
                </div>
                <div className="space-y-0.5">
                  {GENRE_NAV_ITEMS.map((item) => {
                    const isActive = item.slug
                      ? location.pathname === "/shop" &&
                        location.search.includes(`genre=${item.slug}`)
                      : location.pathname === "/shop" &&
                        location.search.includes("category=tv-box-sets");
                    return (
                      <Link
                        key={item.name}
                        to={item.href || `/shop?genre=${item.slug}`}
                        onClick={() => setGenresDropdownOpen(false)}
                        className={cn(
                          "flex flex-col px-3 py-2 rounded-xl transition group outline-none",
                          isActive
                            ? "bg-gray-100 text-dark font-bold"
                            : "hover:bg-gray-50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs",
                              isActive
                                ? "font-bold text-dark"
                                : "font-medium text-gray-700 group-hover:text-dark",
                            )}
                          >
                            {item.name}
                          </span>
                          <ArrowRight
                            className={cn(
                              "w-3.5 h-3.5 transition-all",
                              isActive
                                ? "text-dark translate-x-0.5"
                                : "text-gray-300 group-hover:text-dark group-hover:translate-x-0.5",
                            )}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 mt-0.5 font-normal">
                          {item.desc}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-1 pt-2 border-t border-gray-100 px-3 py-1 text-center">
                  <Link
                    to="/shop"
                    onClick={() => setGenresDropdownOpen(false)}
                    className="text-xs font-bold text-dark hover:underline inline-flex items-center gap-1"
                  >
                    <span>Browse Complete Catalogue</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Special Offers Link */}
          <Link
            to="/shop?filter=sale"
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-red-200",
              isSaleActive
                ? "text-brand-red font-bold bg-red-50/90 border border-red-200/80 shadow-2xs"
                : "text-gray-700 hover:text-brand-red hover:bg-red-50/50 font-medium",
            )}
          >
            <Tag className="w-3.5 h-3.5 text-brand-red shrink-0" />
            <span>Special Offers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider bg-brand-red text-white shadow-2xs">
              Sale
            </span>
          </Link>
        </nav>

        {/* SEARCH AFFORDANCE: Clean, interactive retail search bar */}
        <div className="hidden 2xl:flex flex-1 min-w-0 max-w-xs mx-2">
          <button
            type="button"
            onClick={openSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 bg-gray-50 hover:bg-gray-100/90 border border-gray-200 rounded-full text-xs text-gray-400 hover:text-gray-700 transition-all duration-150 group shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-dark/10"
            aria-label="Search catalogue"
          >
            <span className="flex items-center gap-2.5 text-gray-400 group-hover:text-gray-600 truncate">
              <Search className="w-4 h-4 text-gray-400 group-hover:text-dark transition-colors shrink-0" />
              <span className="font-normal text-[13px] text-gray-500 truncate">
                Search films, actors, genres...
              </span>
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-400 shadow-2xs shrink-0">
              /
            </kbd>
          </button>
        </div>

        {/* RIGHT: Search, Account, Basket (desktop extras stay out of the compact header) */}
        <div className="flex min-w-0 max-w-full items-center gap-0.5 shrink-0">
          {/* Search Trigger */}
          <button
            type="button"
            onClick={openSearch}
            className="h-10 w-10 shrink-0 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Search catalogue"
            title="Search films"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Saved Wishlist (desktop only; mobile access is in the drawer) */}
          <Link
            to="/favourites"
            className="hidden xl:flex relative h-10 w-10 shrink-0 text-gray-700 hover:text-dark hover:bg-gray-100 rounded-full transition-colors items-center justify-center"
            aria-label="Wishlist"
            title="Saved Wishlist"
          >
            <Heart className="w-5 h-5" />
            {favourites.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {favourites.length}
              </span>
            )}
          </Link>

          {/* Customer Notifications Menu (desktop only; mobile access is in the drawer) */}
          <div className="hidden xl:block">
            <CustomerNotificationMenu />
          </div>

          {/* Customer Profile Dropdown */}
          <div ref={accountMenuRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              aria-expanded={accountDropdownOpen}
              aria-controls="mobile-safe-account-menu"
              className={cn(
                "h-10 w-10 shrink-0 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1",
                accountDropdownOpen
                  ? "bg-gray-100 text-dark"
                  : "text-gray-700 hover:text-dark hover:bg-gray-100",
              )}
              aria-label="Account options"
              title="Customer Account"
            >
              <User className="w-5 h-5" />
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200 hidden xl:block",
                  accountDropdownOpen && "rotate-180",
                )}
              />
            </button>

            {/* Account Popover Menu */}
            {accountDropdownOpen && (
              <div
                id="mobile-safe-account-menu"
                className="absolute right-0 top-full mt-2 w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-hidden bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-gray-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {isAuthenticated && customer ? (
                  <>
                    {/* Authenticated Customer Header */}
                    <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          Signed In
                        </span>
                        {customer.role !== "customer" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-brand-blue capitalize font-mono">
                            {customer.role}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-dark mt-0.5 truncate">
                        {customer.full_name || customer.email}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {customer.email}
                      </div>
                    </div>

                    <ul className="space-y-0.5 text-xs font-medium">
                      <li>
                        <Link
                          to="/account/orders"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <Package className="w-4 h-4 text-gray-400" />
                          <span>My Orders & Tracking</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/favourites"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Heart className="w-4 h-4 text-gray-400" />
                            <span>Saved Wishlist</span>
                          </div>
                          {favourites.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-brand-blue font-bold text-[10px]">
                              {favourites.length}
                            </span>
                          )}
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/account"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                          <span>Account Settings</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/delivery"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <Truck className="w-4 h-4 text-gray-400" />
                          <span>Delivery Information</span>
                        </Link>
                      </li>
                    </ul>

                    {(customer.role === "admin" ||
                      customer.role === "staff") && (
                      <div className="mt-1 pt-1.5 border-t border-gray-100">
                        <Link
                          to="/admin"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold text-brand-blue hover:bg-blue-50/50 transition-colors"
                        >
                          <span>Store Admin Backoffice</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}

                    <div className="mt-1 pt-1.5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          customerLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Unauthenticated Header with Prominent Sign In / Register Buttons */}
                    <div className="p-3 border-b border-gray-100 mb-1 space-y-2.5">
                      <div>
                        <div className="text-xs font-bold text-dark">
                          Customer Account
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          Sign in to view orders, saved addresses, and wishlist
                          items.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <Link
                          to="/login"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold transition-colors shadow-xs"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Sign In</span>
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center justify-center py-2 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-dark text-xs font-semibold transition-colors shadow-xs"
                        >
                          <span>Register</span>
                        </Link>
                      </div>
                    </div>

                    <ul className="space-y-0.5 text-xs font-medium">
                      <li>
                        <Link
                          to="/account/orders"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <Package className="w-4 h-4 text-gray-400" />
                          <span>Track an Order</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/favourites"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Heart className="w-4 h-4 text-gray-400" />
                            <span>Saved Wishlist</span>
                          </div>
                          {favourites.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-50 text-brand-blue font-bold text-[10px]">
                              {favourites.length}
                            </span>
                          )}
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/delivery"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <Truck className="w-4 h-4 text-gray-400" />
                          <span>Delivery Information</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/returns"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 hover:text-dark transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-gray-400" />
                          <span>Returns & Guarantee</span>
                        </Link>
                      </li>
                    </ul>

                    <div className="mt-1 pt-1.5 border-t border-gray-100">
                      <Link
                        to="/admin/login"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-dark transition-colors"
                      >
                        <span>Staff & Admin Sign In</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Shopping Basket: Clean round icon with top badge on mobile, capsule on tablet/desktop */}
          {/* Mobile Cart Icon (< sm) */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="sm:hidden relative h-10 w-10 shrink-0 text-gray-700 hover:text-brand-blue hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Open shopping basket"
            title="Shopping Basket"
          >
            <ShoppingBag className="w-5 h-5 text-gray-800" />
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-brand-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* Desktop/Tablet Cart Capsule (sm+) */}
          <button
            type="button"
            onClick={openCartDrawer}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-dark hover:bg-black text-white rounded-full transition-all duration-150 active:scale-95 shadow-xs cursor-pointer ml-1 shrink-0"
            aria-label="Open shopping basket"
            title="Shopping Basket"
          >
            <ShoppingBag className="w-4 h-4 text-white shrink-0" />
            <span className="text-xs font-semibold tracking-tight">Basket</span>
            <span className="min-w-[18px] h-5 px-1.5 flex items-center justify-center rounded-full bg-brand-blue text-white text-[10px] font-bold font-mono">
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
