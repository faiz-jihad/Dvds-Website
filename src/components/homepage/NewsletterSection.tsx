import React, { useState } from 'react';
import { Mail, Check, Sparkles } from 'lucide-react';
import { NewsletterSectionConfig } from '../../types/homepage';
import { publicApi } from '../../lib/publicApi';
import { useUiStore } from '../../stores/useUiStore';

interface NewsletterSectionProps {
  data: NewsletterSectionConfig;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ data }) => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('Please enter a valid UK email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await publicApi.subscribeNewsletter(email);
      setIsSubscribed(true);
      setEmail('');
      addToast('Thank you! You have joined the collector dispatch list.', 'success');
    } catch {
      addToast('Subscription could not be processed right now.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white border-t border-gray-200 py-16 sm:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        {data.eyebrow && (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.22em] uppercase text-brand-blue bg-blue-50 px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3 h-3" />
            {data.eyebrow}
          </span>
        )}

        <h2 className="font-display font-black text-2xl sm:text-4xl text-gray-950 tracking-tight leading-tight mb-3">
          {data.title}
        </h2>

        {data.description && (
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-light mb-8 max-w-md mx-auto">
            {data.description}
          </p>
        )}

        {isSubscribed ? (
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-3 rounded-full text-xs font-semibold border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>You are on the list. We will notify you of upcoming catalog drops.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-2.5">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 focus-within:border-brand-blue transition-colors">
              <div className="flex items-center pl-3 flex-1 w-full text-gray-400">
                <Mail className="w-4 h-4 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={data.placeholder || 'Enter your email address...'}
                  required
                  disabled={isSubmitting}
                  className="w-full bg-transparent px-3 py-2.5 text-xs text-dark placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-dark hover:bg-neutral-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
              >
                {isSubmitting ? 'Saving...' : data.buttonText || 'Subscribe'}
              </button>
            </div>

            {data.disclaimer && (
              <p className="text-[10px] text-gray-400 font-mono">
                {data.disclaimer}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};
