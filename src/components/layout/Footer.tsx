import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  ChevronDown,
  ExternalLink,
  Mail,
  Phone,
  Truck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../lib/publicApi';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultStoreSettings';

export const Footer: React.FC = () => {
  const [guidesOpen, setGuidesOpen] = useState(false);
  const guidesRef = useRef<HTMLDivElement>(null);

  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;
  const storeName = settings.store_name || 'DVD ZONE';
  const registeredCompanyName = settings.registered_company_name || 'DVD Zone';
  const companyNumber = settings.company_number || '13894195';
  const companiesHouseUrl =
    settings.companies_house_url ||
    'https://find-and-update.company-information.service.gov.uk/company/13894195';
  const businessLocation = settings.warehouse_location || 'United Kingdom';
  const supportEmail = (!settings.support_email || settings.support_email.includes('azrayan.co.uk') || settings.support_email.includes('concierge')) ? 'azrayanltd@gmail.com' : settings.support_email;

  // Close guides dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guidesRef.current && !guidesRef.current.contains(event.target as Node)) {
        setGuidesOpen(false);
      }
    };
    if (guidesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [guidesOpen]);

  return (
    <footer className="bg-[#111111] text-white select-none antialiased border-t border-neutral-800">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-12 pt-12 pb-8">
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12">
          {/* Column 1: Brand & Company Info */}
          <div className="lg:col-span-3">
            <Link to="/" className="inline-block mb-4 group">
              <img
                src="/brand/logo-dark-theme.png"
                alt="DVD ZONE"
                className="h-12 sm:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4 max-w-xs">
              {storeName} — {businessLocation}
            </p>
            <div className="space-y-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                <a href={`mailto:${supportEmail}`} className="hover:text-white transition-colors">
                  {supportEmail}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                <a href={`tel:${settings.support_phone || '00447400320038'}`} className="hover:text-white transition-colors font-mono">
                  {settings.support_phone || '00447400320038'}
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-sans font-black text-[12px] tracking-wider uppercase text-white mb-3.5">
              QUICK LINKS
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-[12px] text-neutral-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors block">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors block">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-white transition-colors block">
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors block">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-white transition-colors block">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/favourites" className="hover:text-white transition-colors block">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: GET HELP */}
          <div className="lg:col-span-2">
            <h4 className="font-sans font-black text-[12px] tracking-wider uppercase text-white mb-3.5">
              GET HELP
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-[12px] text-neutral-400">
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-white transition-colors block">
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-white transition-colors block">
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors block">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors block">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Delivery Info */}
          <div className="lg:col-span-3">
            <h4 className="font-sans font-black text-[12px] tracking-wider uppercase text-white mb-3.5">
              DELIVERY
            </h4>
            <div className="space-y-3 text-[11px] sm:text-[12px] text-neutral-400">
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-white font-bold text-xs">FREE UK DELIVERY</p>
                  <p>Free standard delivery across the United Kingdom.</p>
                  <p>Same-day dispatch.</p>
                  <p>Delivery within 2 working days via Royal Mail.</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3.5 mt-6">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="w-8 h-8 rounded-full bg-neutral-700/70 hover:bg-white text-neutral-400 hover:text-black flex items-center justify-center transition-all duration-200"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-neutral-700/70 hover:bg-white text-neutral-400 hover:text-black flex items-center justify-center transition-all duration-200"
              >
                <Facebook className="w-4 h-4 fill-current" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full bg-neutral-700/70 hover:bg-white text-neutral-400 hover:text-black flex items-center justify-center transition-all duration-200"
              >
                <Youtube className="w-4 h-4 fill-current" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-neutral-700/70 hover:bg-white text-neutral-400 hover:text-black flex items-center justify-center transition-all duration-200"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-[11px] text-neutral-400">
          {/* Left: Location Pin + Copyright */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 text-white font-bold cursor-default">
              <MapPin className="w-3.5 h-3.5 text-white fill-white" />
              <span>United Kingdom</span>
            </div>
            <span>© {new Date().getFullYear()} {registeredCompanyName}. All Rights Reserved.</span>
          </div>

          {/* Right: Legal Links & Guides */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
            {/* Guides Dropdown Menu */}
            <div ref={guidesRef} className="relative">
              <button
                type="button"
                onClick={() => setGuidesOpen(!guidesOpen)}
                className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Guides</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
              </button>

              {guidesOpen && (
                <div className="absolute left-0 lg:left-auto lg:right-0 bottom-full mb-2 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-2 z-50 text-xs">
                  <div className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase px-2.5 py-1">
                    Store Guides
                  </div>
                  <ul className="space-y-0.5">
                    <li>
                      <Link
                        to="/faq"
                        onClick={() => setGuidesOpen(false)}
                        className="block px-2.5 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        DVD Region 2 Guide
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/delivery"
                        onClick={() => setGuidesOpen(false)}
                        className="block px-2.5 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        Royal Mail Delivery Information
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/returns"
                        onClick={() => setGuidesOpen(false)}
                        className="block px-2.5 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        Returns & Replacements Policy
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Sale
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Use
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">
              Refund Policy
            </Link>
            <a
              href={companiesHouseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Company Info (No. {companyNumber})</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Business Information Microtext */}
        <div className="pt-3 text-[10px] text-neutral-500 text-left">
          {registeredCompanyName} — {businessLocation}
        </div>
        <p className="pt-2 text-[10px] leading-relaxed text-neutral-400 text-left sm:text-center">
          All our DVDs are Region 2 (UK) and Region 0 (UK).
        </p>
      </div>
    </footer>
  );
};

export default Footer;
