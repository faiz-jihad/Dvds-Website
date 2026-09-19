import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Clock, Heart, Mail, MapPin } from 'lucide-react';

export const AzDarkLandingFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#05070A] text-gray-400 border-t border-white/10 select-none pt-12 pb-8 mt-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trust Guarantees Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-10 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-blue shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Royal Mail Tracked 24</p>
              <p className="text-[11px] text-gray-400">Fast, insured delivery dispatched from London</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Certified UK Media</p>
              <p className="text-[11px] text-gray-400">Genuine retail editions &amp; Region 2 pressings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">30-Day Guarantee</p>
              <p className="text-[11px] text-gray-400">Hassle-free UK returns and full customer care</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Brand Col */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="inline-block">
              <div className="inline-flex items-center justify-center bg-white px-2.5 py-1 rounded-lg shadow-xs border border-white/20">
                <img
                  src="/brand/logo-transparent.png"
                  alt="DVDs Zone"
                  className="h-7 w-auto object-contain"
                />
              </div>
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
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Catalogue</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Complete Store
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-white transition-colors">
                  New Releases
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=trending" className="hover:text-white transition-colors">
                  Top 10 Chart
                </Link>
              </li>
              <li>
                <Link to="/shop?format=box-set" className="hover:text-white transition-colors">
                  TV Series Box Sets
                </Link>
              </li>
              <li>
                <Link to="/shop?format=4k" className="hover:text-white transition-colors">
                  4K Ultra HD Discs
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=sale" className="text-brand-red hover:text-red-300 font-semibold transition-colors">
                  Special Clearance Sale
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Help &amp; Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/delivery" className="hover:text-white transition-colors">
                  Delivery &amp; Postage Rates
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-white transition-colors">
                  Returns &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Customer Care
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Account &amp; Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/favourites" className="hover:text-white transition-colors">
                  Saved Wishlist
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Staff Backoffice
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip: Copyright & Certified Payment */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
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
