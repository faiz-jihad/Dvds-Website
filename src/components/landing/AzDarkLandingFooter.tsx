import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Truck } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

export const AzDarkLandingFooter: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <footer
      className={cn(
        'w-full select-none pt-8 pb-8 mt-12 border-t transition-colors',
        isDark
          ? 'bg-[#05070A] text-gray-400 border-white/10'
          : 'bg-gray-100 text-gray-600 border-gray-200'
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-6">
          {/* Brand Col */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="inline-block">
              <img
                src={isDark ? '/brand/logo-dark-theme.png' : '/brand/logo-transparent.png'}
                alt="DVD ZONE"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              DVD ZONE — Quality DVDs & Entertainment. Active since 2021, operated by company based in 2022 AZ Rayan LTD & DVD Zone.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
              <MapPin size={13} className="text-brand-blue shrink-0" />
              <span>West Midlands, Birmingham, United Kingdom</span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Mail size={13} className="text-brand-blue shrink-0" />
                <a href="mailto:azrayanltd@gmail.com" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  azrayanltd@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Phone size={13} className="text-brand-blue shrink-0" />
                <a href="tel:+447400320038" className={isDark ? 'hover:text-white font-mono' : 'hover:text-gray-900 font-mono'}>
                  00447400320038
                </a>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className={cn('text-xs font-black uppercase tracking-wider mb-3', isDark ? 'text-white' : 'text-gray-900')}>
              Catalogue
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/shop" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Complete Store
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=trending" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Top 10 Chart
                </Link>
              </li>
              <li>
                <Link to="/shop?format=box-set" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  TV Series Box Sets
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="text-brand-red hover:text-red-400 font-semibold">
                  Special Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className={cn('text-xs font-black uppercase tracking-wider mb-3', isDark ? 'text-white' : 'text-gray-900')}>
              Help & Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/delivery" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Returns & Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div>
            <h4 className={cn('text-xs font-black uppercase tracking-wider mb-3', isDark ? 'text-white' : 'text-gray-900')}>
              Account & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/favourites" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/terms" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Privacy Policy
                </Link>
              </li>
            </ul>

            {/* Delivery highlight */}
            <div className="mt-5 pt-4 border-t border-white/5">
              <div className="flex items-start gap-2 text-[11px]">
                <Truck size={14} className="text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className={cn('font-bold text-xs block mb-1', isDark ? 'text-white' : 'text-gray-900')}>
                    FREE UK DELIVERY
                  </span>
                  <span className="text-gray-400 leading-relaxed">
                    Same-day dispatch. Delivery within 2 working days via Royal Mail.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div
          className={cn(
            'pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          <p>
            &copy; {new Date().getFullYear()} AZ Rayan LTD & DVD Zone. All rights reserved. Registered in England &amp; Wales.
          </p>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Stripe Verified</span>
            <span>&bull;</span>
            <span>PayPal</span>
            <span>&bull;</span>
            <span>Royal Mail</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default AzDarkLandingFooter;
