import React, { useMemo } from 'react';
import { Disc, Package, Sparkles, ArrowRight } from 'lucide-react';
import { Product } from '../../types';

interface SeriviaFormatVaultProps {
  products: Product[];
  onSelectFilter?: (filter: string) => void;
}

interface FormatItem {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  icon: typeof Disc;
  count: number;
}

export const SeriviaFormatVault: React.FC<SeriviaFormatVaultProps> = ({
  products,
  onSelectFilter,
}) => {
  // Dynamically compute formats present in the catalogue
  const formatList = useMemo(() => {
    const countsByFormat: Record<string, number> = {};

    products.forEach((p) => {
      if (p.format) {
        countsByFormat[p.format] = (countsByFormat[p.format] || 0) + 1;
      }
    });

    const entries = Object.entries(countsByFormat);
    if (entries.length === 0) return [];

    return entries
      .map(([formatName, count]): FormatItem => {
        const lower = formatName.toLowerCase();
        const isBox = lower.includes('box');
        const is4K = lower.includes('4k') || lower.includes('uhd');
        const isBluRay = lower.includes('blu');

        // Dynamic ID corresponding to our filter logic
        const id = isBox
          ? 'box_set'
          : `format:${formatName.toLowerCase()}`;

        // Dynamic badge and subtitle
        const badge = is4K
          ? 'Ultra HD'
          : isBox
          ? 'Collector Edition'
          : isBluRay
          ? 'HD Disc'
          : 'Standard Edition';

        const subtitle = `${count} ${count === 1 ? 'title' : 'titles'} available in physical edition`;

        return {
          id,
          name: formatName,
          subtitle,
          badge,
          icon: isBox ? Package : Disc,
          count,
        };
      })
      .sort((a, b) => b.count - a.count); // Show formats with highest title counts first
  }, [products]);

  // If no format data exists or only 1 format exists, don't show the multi-format vault
  if (formatList.length < 2) return null;

  return (
    <section className="w-full select-none">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <Sparkles size={11} className="stroke-[2.5]" />
              Physical Media Hub
            </span>
            <span className="text-[11px] font-medium text-gray-400">
              Dispatched with Royal Mail 24
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-dark tracking-tight">
            Browse by Disc Format
          </h2>
        </div>
      </div>

      {/* Grid of Dynamic Format Vault Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {formatList.map((fmt) => {
          const Icon = fmt.icon;
          return (
            <div
              key={fmt.id}
              onClick={() => onSelectFilter?.(fmt.id)}
              className="group relative rounded-2xl p-5 sm:p-6 bg-dark border border-gray-800 text-white shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue hover:shadow-2xl overflow-hidden"
            >
              {/* Subtle ambient light on hover */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-brand-blue/10 group-hover:bg-brand-blue/20 group-hover:scale-150 transition-all duration-500 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10">
                      {fmt.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-white/50">
                      {fmt.count} {fmt.count === 1 ? 'edition' : 'editions'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2 group-hover:text-brand-blue transition-colors">
                    <Icon size={18} className="text-brand-blue shrink-0" />
                    <span>{fmt.name}</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                    {fmt.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.08]">
                  <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                    Explore collection
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-all duration-200">
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SeriviaFormatVault;
