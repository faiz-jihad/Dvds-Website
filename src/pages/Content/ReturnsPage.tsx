import React from 'react';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';

export const ReturnsPage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-3xl mx-auto px-6 space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            CUSTOMER ASSURANCE
          </span>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-dark tracking-tight mt-1 mb-3">
            30-Day Returns Policy
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We want you to be completely satisfied with every physical disc you purchase from AZ Rayan DVDs.
          </p>
        </div>

        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-3 text-xs leading-relaxed text-gray-700">
          <h3 className="font-display font-bold text-sm text-dark">Eligibility for Returns</h3>
          <ul className="list-disc pl-4 space-y-2">
            <li>Unopened and sealed discs can be returned within 30 days of receipt for a 100% refund.</li>
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
