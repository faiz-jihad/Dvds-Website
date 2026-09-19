import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Disc, ShieldCheck } from 'lucide-react';
import { Product } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { formatGBP, cn } from '../../lib/formatters';

interface AzCuratedCollectionBannerProps {
  products: Product[];
}

export const AzCuratedCollectionBanner: React.FC<AzCuratedCollectionBannerProps> = ({ products }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Find up to 4 box set or collector edition products
  const boxSets = products
    .filter((p) => p.format?.toLowerCase().includes('box') || p.format === '4K UHD' || p.is_best_seller)
    .slice(0, 4);

  if (boxSets.length === 0) return null;

  return (
    <section
      className={cn(
        'relative w-full rounded-3xl overflow-hidden border p-6 sm:p-10 lg:p-12 my-6 select-none transition-colors',
        isDark
          ? 'bg-gradient-to-br from-[#0F172A] via-[#0B0F19] to-[#07090E] border-white/10 shadow-2xl'
          : 'bg-gradient-to-br from-blue-50/70 via-slate-50 to-white border-gray-200 shadow-xl'
      )}
    >
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* Left Editorial Narrative */}
        <div className="flex-1 max-w-xl text-center lg:text-left">
          <div className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-brand-blue mb-2.5">
            Curated Collector Showcase
          </div>

          <h2 className={cn('text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3', isDark ? 'text-white' : 'text-gray-900')}>
            The Definitive Box Set &amp; Prestige Media Vault
          </h2>

          <p className={cn('text-sm sm:text-base leading-relaxed mb-6', isDark ? 'text-gray-300' : 'text-gray-600')}>
            Own the complete sagas, definitive multi-season box sets, and restored cinema anthologies.
            Every edition features official disc artwork, original bonus materials, and sealed packaging
            dispatched directly from London via Royal Mail Tracked 24.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-6">
            <div className={cn('flex items-center gap-2 text-xs font-semibold', isDark ? 'text-gray-300' : 'text-gray-700')}>
              <Disc size={15} className="text-brand-blue" />
              <span>Multi-Disc Editions</span>
            </div>
            <div className={cn('flex items-center gap-2 text-xs font-semibold', isDark ? 'text-gray-300' : 'text-gray-700')}>
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>Certified UK Region 2</span>
            </div>
          </div>

          <Link
            to="/shop?format=box-set"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:shadow-brand-blue/30 active:scale-95 cursor-pointer"
          >
            <span>Explore All Box Sets</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Right: Overlapping 3D Physical DVD Cases */}
        <div className="relative flex items-center justify-center pt-4 lg:pt-0">
          <div className="relative flex items-center justify-center h-[260px] sm:h-[300px] w-[300px] sm:w-[420px]">
            {boxSets.map((product, idx) => {
              // Fan out cases with rotation and z-index
              const rotationClasses = [
                '-rotate-12 -translate-x-16 sm:-translate-x-24 z-10',
                '-rotate-6 -translate-x-8 sm:-translate-x-12 z-20',
                'rotate-3 translate-x-4 sm:translate-x-6 z-30',
                'rotate-12 translate-x-16 sm:translate-x-20 z-40',
              ][idx] || 'z-10';

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className={`absolute w-[130px] sm:w-[155px] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 transition-transform duration-300 hover:scale-110 hover:z-50 hover:rotate-0 cursor-pointer ${rotationClasses}`}
                  title={product.title}
                >
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Spine gloss */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 pointer-events-none" />
                  {/* Subtle price tag */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-black text-white font-mono">
                    {formatGBP(product.price)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
export default AzCuratedCollectionBanner;
