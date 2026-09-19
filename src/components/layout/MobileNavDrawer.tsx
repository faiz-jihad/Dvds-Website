import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Search,
  Disc,
  Sparkles,
  Heart,
  User,
  Truck,
  LogIn,
  LogOut,
  Bell,
  Tag,
  Film,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "../../stores/useUiStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useCustomerAuth } from "../../auth/CustomerAuth";
import { useFavouritesStore } from "../../stores/useFavouritesStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { publicApi } from "../../lib/publicApi";
import { cn } from "../../lib/formatters";

const GENRE_NAV_ITEMS = [
  { name: "Action & Military", slug: "action" },
  { name: "Science Fiction", slug: "science-fiction" },
  { name: "Drama & Crime", slug: "drama" },
  { name: "TV Series Box Sets", href: "/shop?category=tv-box-sets" },
  { name: "Documentary & Music", slug: "documentary" },
  { name: "Classic & Cult Cinema", slug: "historical" },
  { name: "Western & Frontier", slug: "western" },
];

export const MobileNavDrawer: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav, openSearch } = useUiStore();
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";
  const {
    customer,
    isAuthenticated,
    logout: customerLogout,
  } = useCustomerAuth();
  const location = useLocation();
  const [genresOpen, setGenresOpen] = useState(false);
  const favourites = useFavouritesStore((state) => state.favourites);
  const allNotifications = useNotificationStore((state) => state.notifications);
  const unreadCount = allNotifications.filter(
    (n) => n.target === "customer" && !n.read,
  ).length;
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: publicApi.getCategories,
    enabled: isMobileNavOpen,
    staleTime: 60_000,
  });

  const handleSearchClick = () => {
    closeMobileNav();
    openSearch();
  };

  return (
    <AnimatePresence>
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileNav}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Menu */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-[min(90vw,380px)] max-w-full bg-white dark:bg-[#0E131F] border-r border-gray-200 dark:border-white/10 text-dark dark:text-white shadow-2xl z-10 flex flex-col overflow-y-auto overscroll-contain"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <img
                    src={isDark ? "/brand/logo-dark-theme.png" : "/brand/logo.png"}
                    alt="DVDs Zone"
                    className="h-10 w-auto max-w-[9.5rem] object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="font-display font-extrabold text-sm tracking-tight text-dark dark:text-white leading-none">
                      DVDs Zone
                    </span>
                    <span className="text-[9px] font-mono tracking-wider text-gray-400 uppercase mt-0.5">
                      Archive Vault
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeMobileNav}
                  className="min-h-10 min-w-10 p-2 text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center justify-center transition cursor-pointer"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar Button */}
              <div className="p-4 border-b border-gray-100 dark:border-white/10">
                <button
                  onClick={handleSearchClick}
                  className="w-full min-h-12 py-2.5 px-3.5 bg-gray-50 dark:bg-[#131826] hover:bg-gray-100 dark:hover:bg-[#1A2333] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <span>Search film archive...</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              {/* Customer Account Mobile Status */}
              <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-[#131826]/70">
                {isAuthenticated && customer ? (
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/account"
                      onClick={closeMobileNav}
                      className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition"
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {(customer.full_name || customer.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-dark dark:text-white truncate">
                          {customer.full_name || "My Account"}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">
                          {customer.email}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileNav();
                        customerLogout();
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={closeMobileNav}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 transition text-center shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMobileNav}
                      className="flex items-center justify-center py-2.5 px-3 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#1A2333] text-dark dark:text-white text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition text-center shadow-2xs"
                    >
                      <span>Register</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1 text-xs">
                <Link
                  to="/shop"
                  onClick={closeMobileNav}
                  className={cn(
                    "flex items-center justify-between min-h-11 py-2.5 px-3 font-semibold rounded-lg transition-colors",
                    location.pathname === "/shop" && !location.search
                      ? "bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
                  )}
                >
                  <span>Complete Catalogue</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/shop?filter=new"
                  onClick={closeMobileNav}
                  className={cn(
                    "flex items-center justify-between min-h-11 py-2.5 px-3 font-semibold rounded-lg transition-colors",
                    location.pathname === "/shop" &&
                      location.search.includes("filter=new")
                      ? "bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
                  )}
                >
                  <span>New Pressings</span>
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded font-bold">
                    FRESH
                  </span>
                </Link>

                <Link
                  to="/shop?filter=bestseller"
                  onClick={closeMobileNav}
                  className={cn(
                    "flex items-center justify-between min-h-11 py-2.5 px-3 font-semibold rounded-lg transition-colors",
                    location.pathname === "/shop" &&
                      location.search.includes("filter=bestseller")
                      ? "bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
                  )}
                >
                  <span>Best Sellers</span>
                </Link>

                {/* Prominent Special Offers */}
                <Link
                  to="/shop?filter=sale"
                  onClick={closeMobileNav}
                  className={cn(
                    "flex items-center justify-between min-h-11 py-2.5 px-3 font-bold rounded-xl transition-all border",
                    location.pathname === "/shop" &&
                      location.search.includes("filter=sale")
                      ? "bg-red-50 dark:bg-red-950/30 text-brand-red border-red-200 dark:border-red-900/40 shadow-xs"
                      : "bg-red-50/40 dark:bg-red-950/20 text-brand-red border-red-100 dark:border-red-950/50 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand-red shrink-0" />
                    <span>Special Offers & Deals</span>
                  </div>
                  <span className="text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs">
                    Sale
                  </span>
                </Link>

                {/* Curated Film Genres Section */}
                <div className="pt-4 pb-1">
                  <button
                    type="button"
                    onClick={() => setGenresOpen(!genresOpen)}
                    aria-expanded={genresOpen}
                    aria-controls="mobile-genres-menu"
                    className="w-full min-h-11 flex items-center justify-between px-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition cursor-pointer rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Film className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      <span>Curated Film Genres</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
                        genresOpen ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  {genresOpen && (
                    <div
                      id="mobile-genres-menu"
                      className="mt-1 space-y-0.5 pl-1.5 pr-1"
                    >
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
                            onClick={closeMobileNav}
                            className={cn(
                              "flex items-center justify-between min-h-11 py-2 px-3 text-xs rounded-lg transition-colors",
                              isActive
                                ? "bg-gray-100 dark:bg-white/10 text-dark dark:text-white font-bold"
                                : "text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
                            )}
                          >
                            <span>{item.name}</span>
                            <ArrowRight
                              className={cn(
                                "w-3.5 h-3.5 transition-all",
                                isActive
                                  ? "text-dark dark:text-white translate-x-0.5"
                                  : "text-gray-300 dark:text-gray-600",
                              )}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Archive Collections */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 block mb-1">
                    Special Anthologies
                  </span>
                  <Link
                    to="/shop?category=tv-box-sets"
                    onClick={closeMobileNav}
                    className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span>Complete TV Box Sets</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                  </Link>
                  <Link
                    to="/shop?search=Star+Wars"
                    onClick={closeMobileNav}
                    className="flex items-center justify-between py-2 px-3 text-xs text-gray-600 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span>Star Wars Anthology Vault</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                  </Link>
                </div>
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-[#0A0D14] space-y-2 text-xs">
              {/* Appearance Theme Selector */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131826]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Appearance
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {isDark ? "Dark" : "Light"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-gray-100 dark:bg-black/40">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      isDark
                        ? "bg-brand-blue text-white shadow-xs font-bold"
                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      !isDark
                        ? "bg-white text-dark shadow-xs font-bold"
                        : "text-gray-500 dark:text-gray-400 hover:text-white"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <Link
                to="/account/orders"
                onClick={closeMobileNav}
                className="flex items-center gap-2.5 py-2 px-3 text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors font-medium"
              >
                <Truck className="w-4 h-4 text-gray-400" />
                <span>Orders & Consignment Tracking</span>
              </Link>
              <Link
                to="/favourites"
                onClick={closeMobileNav}
                className="flex items-center justify-between py-2 px-3 text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span>Saved Wishlist</span>
                </div>
                {favourites.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-300 font-bold text-[10px] font-mono border border-blue-100 dark:border-blue-800/40">
                    {favourites.length}
                  </span>
                )}
              </Link>
              <Link
                to="/account/orders"
                onClick={closeMobileNav}
                className="flex items-center justify-between py-2 px-3 text-gray-700 dark:text-gray-300 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span>Order & Store Alerts</span>
                </div>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-blue text-white font-bold text-[10px] font-mono shadow-2xs">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-mono">
                    Active
                  </span>
                )}
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
