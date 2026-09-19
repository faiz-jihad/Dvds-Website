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
  const storeName = settings.store_name || 'DVDs Zone';
  const registeredCompanyName = settings.registered_company_name || 'DVDs Zone Ltd';
  const companyNumber = settings.company_number || '13894195';
  const companiesHouseUrl =
    settings.companies_house_url ||
    'https://find-and-update.company-information.service.gov.uk/company/13894195';
  const registeredOffice =
    settings.registered_office_address ||
    'Apartment 18, 34 Ryland Street, Birmingham, B16 8DB, United Kingdom';

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
        {/* Main Columns Directory (Nike Signature Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12">
          {/* Column 1: Brand Logo & Primary Callouts */}
          <div className="lg:col-span-3">
            <Link to="/" className="inline-block mb-6 group">
              <img
                src="/brand/logo-dark-theme.png"
                alt="DVDs Zone"
                className="h-12 sm:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
            <ul className="space-y-3.5 font-sans font-black text-[12px] sm:text-[13px] tracking-wider uppercase text-white">
              <li>
                <Link to="/shop" className="hover:text-neutral-400 transition-colors block">
                  EXPLORE ARCHIVE
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-neutral-400 transition-colors block">
                  NEW RELEASES
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-neutral-400 transition-colors block">
                  DISPATCH TRACKING
                </Link>
              </li>
              <li>
                <Link to="/favourites" className="hover:text-neutral-400 transition-colors block">
                  SAVED WISHLIST
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="hover:text-neutral-400 transition-colors block">
                  SPECIAL OFFERS
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-neutral-400 transition-colors block">
                  SEND VAULT FEEDBACK
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: GET HELP */}
          <div className="lg:col-span-3">
            <h4 className="font-sans font-black text-[12px] tracking-wider uppercase text-white mb-3.5">
              GET HELP
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-[12px] text-neutral-400">
              <li>
                <Link to="/account/orders" className="hover:text-white transition-colors block">
                  Order Status
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-white transition-colors block">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-white transition-colors block">
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors block">
                  Payment Options
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors block">
                  DVD Region 2 Guide
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: ABOUT DVDS ZONE */}
          <div className="lg:col-span-3">
            <h4 className="font-sans font-black text-[12px] tracking-wider uppercase text-white mb-3.5">
              ABOUT DVDs ZONE
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-[12px] text-neutral-400">
              <li>
                <Link to="/about" className="hover:text-white transition-colors block">
                  News & Story
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors block">
                  Physical Media Heritage
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors block">
                  UK Vault & Storage Facility
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-white transition-colors block">
                  Sustainability & Packaging
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors block">
                  Authenticity Guarantee
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors block text-neutral-500 font-mono text-[11px]">
                  Vault Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Nike-Style Circular Social Buttons */}
          <div className="lg:col-span-3 flex lg:justify-end items-start pt-2 lg:pt-0">
            <div className="flex items-center gap-3.5">
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

        {/* Bottom Bar: Nike Signature Location & Legal Strip */}
        <div className="pt-6 border-t border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-[11px] text-neutral-400">
          {/* Left: Location Pin + Copyright */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 text-white font-bold cursor-default">
              <MapPin className="w-3.5 h-3.5 text-white fill-white" />
              <span>United Kingdom</span>
            </div>
            <span>© {new Date().getFullYear()} {registeredCompanyName}. All Rights Reserved</span>
          </div>

          {/* Right: Nike-Style Secondary Links & Guides */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
            {/* Guides Dropdown Menu (Exact Nike Feature) */}
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
                        Royal Mail Delivery Timelines
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/returns"
                        onClick={() => setGuidesOpen(false)}
                        className="block px-2.5 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        Replacement & Returns Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/about"
                        onClick={() => setGuidesOpen(false)}
                        className="block px-2.5 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        Physical Media Preservation
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

        {/* Registered Office Microtext */}
        <div className="pt-3 text-[10px] text-neutral-500 text-left">
          {registeredCompanyName} • Registered office: {registeredOffice}
        </div>
        <p className="pt-2 text-[10px] leading-relaxed text-neutral-400 text-left sm:text-center">
          All our DVD are region 2 (UK) and zero region (UK).
        </p>
      </div>
    </footer>
  );
};

export default Footer;
