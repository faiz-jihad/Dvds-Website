import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, Menu, User } from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { useUiStore } from '../../stores/useUiStore';
import { useFavouritesStore } from '../../stores/useFavouritesStore';
import { cn } from '../../lib/formatters';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const openCartDrawer = useUiStore((state) => state.openCartDrawer);
  const openSearch = useUiStore((state) => state.openSearch);
  const openMobileNav = useUiStore((state) => state.openMobileNav);

  const itemCount = useCartStore((state) => state.getItemCount());
  const favourites = useFavouritesStore((state) => state.favourites);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global keyboard shortcut: Press '/' to open Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  const navLinks = [
    { label: 'Shop', href: '/shop' },
    { label: 'New Releases', href: '/shop?filter=new' },
    { label: 'Best Sellers', href: '/shop?filter=bestseller' },
    { label: 'Genres', href: '/#genres' },
    { label: 'Offers', href: '/shop?filter=sale' },
  ];

  // Specific active check to ensure only ONE link is underlined at a time
  const getIsActive = (href: string) => {
    if (href === '/shop') {
      return location.pathname === '/shop' && (!location.search || location.search === '');
    }
    if (href.startsWith('/shop?')) {
      const queryParam = href.split('?')[1];
      return location.pathname === '/shop' && location.search.includes(queryParam);
    }
    if (href === '/#genres') {
      return location.pathname === '/' && location.hash === '#genres';
    }
    return location.pathname === href;
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '/#genres') {
      if (location.pathname === '/') {
        e.preventDefault();
        const el = document.getElementById('genres');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', '/#genres');
        }
      }
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300 bg-white',
        isScrolled
          ? 'shadow-sm border-b border-gray-200/80 py-3'
          : 'border-b border-gray-100 py-4 sm:py-5'
      )}
    >
      <div className="max-w-container mx-auto px-3 sm:px-6 md:px-12 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={openMobileNav}
          className="lg:hidden min-h-11 min-w-11 p-2 -ml-2 text-dark hover:text-brand-blue rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo with Official Eagle Crest & Typography */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group" title="AZ Rayan DVDs - Home">
          <img
            src="/brand/logo-transparent.png"
            alt="AZ Rayan LTD - DVDs"
            className="h-9 max-w-[82px] object-contain transition-transform duration-300 group-hover:scale-[1.03] min-[390px]:max-w-none sm:h-12"
          />
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-xs bg-brand-blue text-white text-[9px] font-mono font-bold uppercase tracking-wider">
            DVDs
          </span>
        </Link>

        {/* Desktop Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = getIsActive(link.href);
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  'transition-colors py-1 relative tracking-tight',
                  isActive
                    ? 'text-brand-blue font-semibold'
                    : 'text-dark hover:text-brand-blue'
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-blue rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Large Search Affordance */}
        <div className="flex-1 max-w-xs hidden xl:block mx-4">
          <button
            onClick={openSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-400 hover:text-dark transition-all duration-150 group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-blue transition-colors" />
              <span>Search films, actors, genres...</span>
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded text-gray-500">
              /
            </kbd>
          </button>
        </div>

        {/* Secondary Navigation Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Trigger for Mobile/Tablet */}
          <button
            onClick={openSearch}
            className="min-h-11 min-w-11 p-2 text-dark hover:text-brand-blue hover:bg-gray-50 rounded-md transition-colors xl:hidden"
            aria-label="Search catalogue"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Account */}
          <Link
            to="/account"
            className="hidden min-h-11 min-w-11 p-2 text-dark hover:text-brand-blue hover:bg-gray-50 rounded-md transition-colors min-[390px]:inline-flex min-[390px]:items-center min-[390px]:justify-center"
            aria-label="Customer account"
          >
            <User className="w-5 h-5" />
          </Link>

          {/* Favourites */}
          <Link
            to="/favourites"
            className="hidden min-h-11 min-w-11 p-2 text-dark hover:text-brand-blue hover:bg-gray-50 rounded-md transition-colors relative min-[390px]:inline-flex min-[390px]:items-center min-[390px]:justify-center"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {favourites.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {favourites.length}
              </span>
            )}
          </Link>

          {/* Basket Button with Animated Count Badge */}
          <button
            onClick={openCartDrawer}
            className="flex min-h-11 items-center gap-2 p-2 sm:px-3 sm:py-2 bg-dark hover:bg-black text-white rounded-md transition-all active:scale-95 shadow-sm"
            aria-label="Open basket"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline-block text-xs font-semibold tracking-wide">
              Basket
            </span>
            <span className="px-1.5 py-0.2 bg-brand-blue text-white font-mono text-xs font-bold rounded-sm">
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
