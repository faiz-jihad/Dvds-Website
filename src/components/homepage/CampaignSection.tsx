import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowRight, Clock } from 'lucide-react';
import { CampaignSectionConfig } from '../../types/homepage';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface CampaignSectionProps {
  data: CampaignSectionConfig;
  allProducts: Product[];
  startsAt?: string;
  endsAt?: string;
}

export const CampaignSection: React.FC<CampaignSectionProps> = ({
  data,
  allProducts,
  startsAt,
  endsAt,
}) => {
  const effectiveStartsAt = startsAt || data.startsAt;
  const effectiveEndsAt = endsAt || data.endsAt;

  const now = Date.now();
  if (effectiveStartsAt && Date.parse(effectiveStartsAt) > now) return null;
  if (effectiveEndsAt && Date.parse(effectiveEndsAt) < now) return null;

  const focalX = data.focalPoint?.x ?? 50;
  const focalY = data.focalPoint?.y ?? 50;

  // Sale/Clearance products
  const campaignProducts = React.useMemo(() => {
    let prods = allProducts.filter((p) => p.compare_at_price != null && p.compare_at_price > p.price);
    if (!prods.length) prods = allProducts;
    return prods.slice(0, data.productLimit || 4);
  }, [allProducts, data.productLimit]);

  return (
    <section
      className="py-14 sm:py-20 text-white overflow-hidden"
      style={{ backgroundColor: data.backgroundColor || '#0B132B' }}
    >
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Banner Hero Box */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 mb-10 shadow-2xl">
          <img
            src={data.bannerImage}
            alt={data.title}
            className="absolute inset-0 w-full h-full object-cover opacity-35"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

          <div className="relative z-10 p-8 sm:p-12 lg:p-14 max-w-2xl">
            {data.badgeText && (
              <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 shadow-sm">
                <Tag className="w-3 h-3" />
                {data.badgeText}
              </span>
            )}

            <h2 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight mb-3">
              {data.title}
            </h2>

            {data.subtitle && (
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed mb-6">
                {data.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {data.ctaLabel && (
                <Link to={data.ctaHref || '/shop?filter=sale'}>
                  <button
                    type="button"
                    className="bg-white hover:bg-neutral-100 text-dark px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>{data.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              )}

              {data.secondaryCtaLabel && (
                <Link to={data.secondaryCtaHref || '/shop'}>
                  <button
                    type="button"
                    className="border border-white/30 hover:bg-white/10 text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    {data.secondaryCtaLabel}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Featured Campaign Products Grid */}
        {campaignProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight">
                Featured Campaign Titles
              </h3>
              <Link
                to="/shop?filter=sale"
                className="text-xs font-mono text-brand-blue-soft hover:underline"
              >
                View all clearance →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {campaignProducts.map((prod) => (
                <div key={prod.id} className="bg-white rounded-xl p-3 shadow-md">
                  <ProductCard product={prod} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
