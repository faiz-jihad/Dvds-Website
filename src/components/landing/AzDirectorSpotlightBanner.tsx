import React from 'react';
import { Link } from 'react-router-dom';
import { Quote, ArrowRight, Disc, Star } from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { formatGBP, cn } from '../../lib/formatters';

interface AzDirectorSpotlightBannerProps {
  settings: StoreSettings | null;
  products: Product[];
}

export const AzDirectorSpotlightBanner: React.FC<AzDirectorSpotlightBannerProps> = ({
  settings,
  products,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!settings || !settings.director_name?.trim()) return null;

  // Resolve the 3 showcase products from settings.director_product_ids
  const productIds = Array.isArray(settings.director_product_ids) ? settings.director_product_ids : [];
  const showcaseProducts = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  // Fallback to top products if none configured
  const displayProducts =
    showcaseProducts.length > 0
      ? showcaseProducts.slice(0, 3)
      : products.slice(0, 3);

  return (
    <section
      id="director-spotlight"
      className={cn(
        'scroll-mt-24 relative w-full rounded-3xl overflow-hidden border p-6 sm:p-10 lg:p-12 my-8 select-none transition-colors',
        isDark
          ? 'bg-gradient-to-br from-[#0D111A] via-[#090C12] to-[#05070B] border-white/10 shadow-2xl'
          : 'bg-gradient-to-br from-amber-50/50 via-slate-50 to-white border-gray-200 shadow-xl'
      )}
    >
      {/* Cinematic Golden Ambient Glow */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* Left Editorial Narrative */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-4">
          <div className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            {settings.director_badge || 'DIRECTOR SPOTLIGHT'}
          </div>

          <h2 className={cn('text-2xl sm:text-4xl font-black tracking-tight leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
            {settings.director_name}
          </h2>

          {settings.director_quote && (
            <div className="relative pl-4 border-l-2 border-amber-500/50 my-3 text-left">
              <Quote size={18} className="text-amber-500/40 mb-1" />
              <p className={cn('text-sm sm:text-base italic font-serif leading-relaxed', isDark ? 'text-gray-200' : 'text-gray-800')}>
                "{settings.director_quote}"
              </p>
            </div>
          )}

          {settings.director_bio && (
            <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-gray-400' : 'text-gray-600')}>
              {settings.director_bio}
            </p>
          )}

          <div className="pt-2">
            <Link
              to="/shop"
              className={cn(
                'inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl border font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md active:scale-95 cursor-pointer',
                isDark
                  ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-900'
              )}
            >
              <span>Explore Vault Cinema</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Right: 3 Showcase Film Cards */}
        {displayProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 shrink-0 w-full lg:w-auto">
            {displayProducts.map((product, idx) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className={cn(
                  'group relative flex flex-col items-center rounded-2xl p-3 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-pointer w-full sm:w-[150px] lg:w-[160px] border',
                  isDark
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-amber-500/40'
                    : 'bg-white hover:bg-amber-50/50 border-gray-200 hover:border-amber-500/50 shadow-sm'
                )}
              >
                <div
                  className={cn(
                    'relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-2.5 border',
                    isDark ? 'border-white/15 bg-black/40' : 'border-gray-200 bg-gray-100'
                  )}
                >
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-bold text-amber-400 border border-amber-500/30">
                    Pick #{idx + 1}
                  </div>
                  {product.imdb_rating && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-black text-amber-300 flex items-center gap-0.5">
                      <Star size={10} fill="#fcd34d" />
                      <span>{product.imdb_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="w-full text-center">
                  <h4
                    className={cn(
                      'text-xs font-bold truncate transition-colors group-hover:text-amber-500',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {product.title}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px]">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{product.format || 'DVD'}</span>
                    <span className="text-gray-400">&bull;</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {formatGBP(product.price)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
export default AzDirectorSpotlightBanner;
