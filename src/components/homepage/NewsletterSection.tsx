import React, { useState } from 'react';
import { Mail, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { NewsletterSectionConfig } from '../../types/homepage';
import { publicApi } from '../../lib/publicApi';
import { useUiStore } from '../../stores/useUiStore';

interface NewsletterSectionProps {
  data: NewsletterSectionConfig;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ data }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsSubmitting(true);
      await publicApi.subscribeNewsletter(email.trim());
      setIsSubscribed(true);
      addToast('Thank you for joining our physical media archive list.', 'success');
    } catch {
      addToast('Subscription could not be processed right now.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-[#06080b] text-white border-t border-white/[0.08] py-20 sm:py-28 relative overflow-hidden">
      {/* Subtle radial ambient gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(circle 600px at 50% 50%, rgba(20, 35, 60, 0.4) 0%, transparent 100%)',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.3em] uppercase text-white/50 mb-3">
          <Mail className="w-3.5 h-3.5" />
          <span>{data.eyebrow || "THE COLLECTOR'S DISPATCH"}</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 leading-[0.95]">
          {data.title || 'STAY INFORMED ON RARE PRESSINGS.'}
        </h2>

        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-light mb-8 max-w-lg mx-auto">
          {data.description ||
            'Occasional notices when out-of-print box sets, director restorations, and rare catalogue acquisitions enter our London facility. Never spam.'}
        </p>

        {isSubscribed ? (
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3.5 rounded-full text-xs font-mono font-medium border border-white/20 backdrop-blur-md">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>You are on the list. We will notify you of upcoming catalog arrivals.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-white/[0.04] p-1.5 rounded-full border border-white/15 focus-within:border-white/40 transition-colors">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={data.placeholder || 'Enter your email address...'}
                className="w-full bg-transparent px-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-hidden font-mono"
                aria-label="Email address for newsletter dispatch"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs tracking-widest uppercase rounded-full transition-all shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'JOINING...' : data.buttonText ? data.buttonText.toUpperCase() : 'JOIN DISPATCH'}
              </button>
            </div>

            <p className="text-[11px] font-mono text-white/40 tracking-wider">
              {data.disclaimer || '✓ UK GDPR Compliant. Dispatched infrequently. Unsubscribe in one click.'}
            </p>
          </form>
        )}
      </div>
    </section>
  );
};
