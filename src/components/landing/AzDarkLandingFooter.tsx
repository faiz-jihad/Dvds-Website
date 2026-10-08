import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../stores/useThemeStore';
import { publicApi } from '../../lib/publicApi';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';
import { cn } from '../../lib/formatters';

export const AzDarkLandingFooter: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVD ZONE';
  const registeredCompanyName = settings.registered_company_name || 'DVDs Zone';
  const warehouseLocation = settings.warehouse_location || 'United Kingdom';
  const supportEmail = (!settings.support_email || settings.support_email.includes('azrayan.co.uk') || settings.support_email.includes('concierge')) ? 'azrayanltd@gmail.com' : settings.support_email;
  const supportPhone = settings.support_phone || '00447400320038';
  const cutoffTime = settings.dispatch_cutoff_time || '2:00 PM';

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
                alt={storeName}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className={cn('text-xs leading-relaxed max-w-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
              {storeName} — Quality DVDs &amp; Entertainment. Active since 2021, operated by {registeredCompanyName || 'DVDs Zone'}. United Kingdom.
            </p>
            <div className={cn('flex items-center gap-1.5 text-xs pt-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
              <MapPin size={13} className="text-brand-blue shrink-0" />
              <span>{warehouseLocation}</span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className={cn('flex items-center gap-1.5 text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
                <Mail size={13} className="text-brand-blue shrink-0" />
                <a
                  href={`mailto:${supportEmail}`}
                  className={cn('transition-colors', isDark ? 'hover:text-white' : 'hover:text-gray-900')}
                >
                  {supportEmail}
                </a>
              </div>
              <div className={cn('flex items-center gap-1.5 text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
                <Phone size={13} className="text-brand-blue shrink-0" />
                <a
                  href={`tel:${supportPhone}`}
                  className={cn('font-mono transition-colors', isDark ? 'hover:text-white' : 'hover:text-gray-900')}
                >
                  {supportPhone}
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
                <Link to="/shop" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Complete Store
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=trending" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Top 10 Chart
                </Link>
              </li>
              <li>
                <Link to="/shop?format=box-set" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  TV Series Box Sets
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="text-brand-red hover:text-red-400 font-semibold transition-colors">
                  Special Offers
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
                <Link to="/delivery" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Returns &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
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
                <Link to="/login" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/favourites" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/terms" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={cn('transition-colors', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')}>
                  Privacy Policy
                </Link>
              </li>
            </ul>

            {/* Delivery highlight */}
            <div className={cn('mt-5 pt-4 border-t', isDark ? 'border-white/5' : 'border-gray-200')}>
              <div className="flex items-start gap-2 text-[11px]">
                <Truck size={14} className="text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className={cn('font-bold text-xs block mb-1', isDark ? 'text-white' : 'text-gray-900')}>
                    FREE UK DELIVERY
                  </span>
                  <span className={cn('leading-relaxed', isDark ? 'text-gray-400' : 'text-gray-600')}>
                    Same-day dispatch (orders before {cutoffTime}). Delivery within 2 working days via Royal Mail.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div
          className={cn(
            'pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs transition-colors',
            isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-600'
          )}
        >
          <p>
            &copy; {new Date().getFullYear()} {registeredCompanyName || 'DVDs Zone'}. All rights reserved. Registered in United Kingdom.
          </p>
          <div className={cn('flex items-center gap-4 text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
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
