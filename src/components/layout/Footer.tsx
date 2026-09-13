import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../lib/publicApi';

export const Footer: React.FC = () => {
  const [guidesOpen, setGuidesOpen] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: publicApi.getStoreSettings,
    staleTime: 60_000,
  });

  const storeName = settingsQuery.data?.store_name || 'AZ Rayan DVDs';

  return (
    <footer className="bg-white text-[#111111] border-t border-gray-200 text-xs antialiased">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12 pt-14 pb-10">
        {/* Main Columns Layout (Nike Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-14">
          {/* Column 1: Resources */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#111111]">
              Resources
            </h4>
            <ul className="space-y-3 text-[12px] text-[#707072]">
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  Find A Store
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-[#111111] transition-colors">
                  Become A Member
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-[#111111] transition-colors">
                  Film Edition Finder
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  Collector Guidance
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="hover:text-[#111111] transition-colors">
                  Student & Bulk Discounts
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#111111] transition-colors">
                  Send Us Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Help */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#111111]">
              Help
            </h4>
            <ul className="space-y-3 text-[12px] text-[#707072]">
              <li>
                <Link to="/faq" className="hover:text-[#111111] transition-colors">
                  Get Help
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-[#111111] transition-colors">
                  Order Status
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-[#111111] transition-colors">
                  Delivery
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-[#111111] transition-colors">
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#111111] transition-colors">
                  Payment Options
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#111111] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="lg:col-span-4 space-y-3.5">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#111111]">
              Company
            </h4>
            <ul className="space-y-3 text-[12px] text-[#707072]">
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  About {storeName}
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-[#111111] transition-colors">
                  News & Master Releases
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  Physical Media Heritage
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  Archive Studios
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-[#111111] transition-colors">
                  Recyclable Packaging
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#111111] transition-colors">
                  BBFC UK Compliance
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#111111] transition-colors">
                  Report a Concern
                </Link>
              </li>
            </ul>
          </div>

          {/* Right: Location Selector (Nike Globe) */}
          <div className="lg:col-span-2 flex lg:justify-end items-start pt-1 sm:pt-0">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#111111] hover:text-[#707072] transition-colors"
            >
              <Globe className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>United Kingdom</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar (Exact Nike Sub-Footer) */}
        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px] text-[#707072]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>© {new Date().getFullYear()} {storeName}, Inc. All rights reserved</span>

            {/* Guides Dropdown Menu */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setGuidesOpen(!guidesOpen)}
                className="inline-flex items-center gap-1 hover:text-[#111111] transition-colors"
              >
                <span>Guides</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {guidesOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-44 bg-white border border-gray-200 rounded-md shadow-lg p-2 z-20 space-y-1">
                  <Link
                    to="/delivery"
                    onClick={() => setGuidesOpen(false)}
                    className="block px-2 py-1 text-[11px] text-[#707072] hover:text-black hover:bg-gray-50 rounded"
                  >
                    Delivery Guide
                  </Link>
                  <Link
                    to="/returns"
                    onClick={() => setGuidesOpen(false)}
                    className="block px-2 py-1 text-[11px] text-[#707072] hover:text-black hover:bg-gray-50 rounded"
                  >
                    Returns Guide
                  </Link>
                  <Link
                    to="/faq"
                    onClick={() => setGuidesOpen(false)}
                    className="block px-2 py-1 text-[11px] text-[#707072] hover:text-black hover:bg-gray-50 rounded"
                  >
                    Region 2 / DVD FAQ
                  </Link>
                </div>
              )}
            </div>

            <Link to="/terms" className="hover:text-[#111111] transition-colors">
              Terms of Sale
            </Link>
            <Link to="/terms" className="hover:text-[#111111] transition-colors">
              Terms of Use
            </Link>
            <Link to="/privacy" className="hover:text-[#111111] transition-colors">
              {storeName} Privacy Policy
            </Link>
            <Link to="/privacy" className="hover:text-[#111111] transition-colors">
              Privacy Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
