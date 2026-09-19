import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../lib/formatters';

export const AzDarkLandingFooter: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <footer
      className={cn(
        'w-full select-none pt-12 pb-8 mt-12 border-t transition-colors',
        isDark
          ? 'bg-[#05070A] text-gray-400 border-white/10'
          : 'bg-gray-100 text-gray-600 border-gray-200'
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trust Guarantees Bar */}
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-3 gap-6 pb-10 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center text-brand-blue shrink-0',
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-2xs'
              )}
            >
              <Truck size={20} />
            </div>
            <div>
              <p className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-white' : 'text-gray-900')}>
                Royal Mail Tracked 24
              </p>
              <p className="text-[11px] text-gray-400">Fast, insured delivery dispatched from London</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center text-emerald-500 shrink-0',
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-2xs'
              )}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-white' : 'text-gray-900')}>
                Certified UK Media
              </p>
              <p className="text-[11px] text-gray-400">Genuine retail editions &amp; Region 2 pressings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl border flex items-center justify-center text-amber-500 shrink-0',
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-2xs'
              )}
            >
              <Clock size={20} />
            </div>
            <div>
              <p className={cn('text-xs font-bold uppercase tracking-wider', isDark ? 'text-white' : 'text-gray-900')}>
                30-Day Guarantee
              </p>
              <p className="text-[11px] text-gray-400">Hassle-free UK returns and full customer care</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Brand Col */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="inline-block">
              <img
                src={isDark ? '/brand/logo-dark-theme.png' : '/brand/logo-transparent.png'}
                alt="DVDs Zone"
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              AZ Rayan DVDs is the UK's premier independent retailer for restored physical cinema, definitive television box sets, and rare disc editions.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
              <MapPin size={13} className="text-brand-blue shrink-0" />
              <span>London, United Kingdom</span>
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
                <Link to="/shop?format=4k" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  4K Ultra HD Discs
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="text-brand-red hover:text-red-400 font-semibold">
                  Special Clearance Sale
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className={cn('text-xs font-black uppercase tracking-wider mb-3', isDark ? 'text-white' : 'text-gray-900')}>
              Help &amp; Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/delivery" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Delivery &amp; Postage Rates
                </Link>
              </li>
              <li>
                <Link to="/returns" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Returns &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Contact Customer Care
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
              Account &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/favourites" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/terms" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={isDark ? 'hover:text-white' : 'hover:text-gray-900'}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-gray-400 hover:text-gray-500">
                  Staff Backoffice
                </Link>
              </li>
            </ul>
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
            &copy; {new Date().getFullYear()} AZ Rayan DVDs. All rights reserved. Registered in England &amp; Wales.
          </p>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Stripe Verified</span>
            <span>&bull;</span>
            <span>PayPal Express</span>
            <span>&bull;</span>
            <span>Barclays Bank UK</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default AzDarkLandingFooter;
