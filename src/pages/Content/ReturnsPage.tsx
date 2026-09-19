import React from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Seo } from '../../components/common/Seo';

export const ReturnsPage: React.FC = () => {
  return (
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] min-h-screen py-8 sm:py-16 text-dark dark:text-white transition-colors">
      <Seo
        title="Returns Policy — 30-Day Hassle-Free Returns | DVDs Zone UK"
        description="DVDs Zone offers a 30-day returns policy. Faulty disc? Changed your mind? Contact our UK team and we'll arrange a replacement or full refund."
        canonicalPath="/returns"
        siteName="DVDs Zone"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            CUSTOMER ASSURANCE
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl text-dark dark:text-white tracking-tight mt-1 mb-3">
            30-Day Returns Policy
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            We want you to be completely satisfied with every physical disc you purchase from DVDs Zone.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 rounded-lg space-y-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300 shadow-xs">
          <h3 className="font-display font-bold text-sm text-dark dark:text-white">Eligibility for Returns</h3>
          <ul className="list-disc pl-4 space-y-2 text-gray-600 dark:text-gray-300">
            <li>For eligible distance purchases, tell us within 14 days after delivery if you wish to cancel, then return the goods within the following 14 days.</li>
            <li>The cancellation right does not normally apply to sealed audio or video recordings once they have been unsealed.</li>
            <li>Faulty or misdescribed goods remain covered by your statutory rights.</li>
            <li>If a disc arrives damaged in transit or displays playback errors, contact support so the appropriate replacement or return route can be recorded.</li>
            <li>Refunds are credited directly to your original payment method within 3 business days of return receipt.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link to="/contact">
            <Button variant="primary">Contact Returns Department</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
