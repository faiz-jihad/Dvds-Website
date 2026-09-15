import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductRailSectionConfig } from '../../types/homepage';
import { Product } from '../../types';
import { formatGBP } from '../../lib/formatters';
import { AccordionGallery, AccordionGalleryItem } from '../motion/AccordionGallery';

interface LatestReleasesSectionProps {
  data: ProductRailSectionConfig;
  allProducts: Product[];
}

export const LatestReleasesSection: React.FC<LatestReleasesSectionProps> = ({ data, allProducts }) => {
  const products = useMemo(() => {
    const filtered = allProducts
      .filter((product) => product.is_new_release)
      .sort((a, b) => {
        const dateDifference = Date.parse(b.created_at) - Date.parse(a.created_at);
        return Number.isNaN(dateDifference) ? b.release_year - a.release_year : dateDifference;
      });
    const list = filtered.length > 0 ? filtered : allProducts;
    return list.slice(0, Math.min(data.limit || 5, 7));
  }, [allProducts, data.limit]);

  const items = useMemo<AccordionGalleryItem[]>(() => products.map((product) => ({
    image: product.cover_image_url,
    alt: `${product.title} DVD cover`,
    label: product.title,
    link: `/product/${product.slug}`,
    eyebrow: 'New release',
    meta: `${product.release_year} · ${product.format} · ${formatGBP(product.price)}`,
  })), [products]);

  if (!items.length) return null;

  return (
    <section className="overflow-hidden border-y border-neutral-800 bg-neutral-950 py-14 text-white sm:py-20 lg:py-24">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {data.eyebrow && (
              <span className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue-soft">
                {data.eyebrow}
              </span>
            )}
            <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="mt-2 max-w-2xl text-xs font-light leading-relaxed text-neutral-400 sm:text-sm">
                {data.subtitle}
              </p>
            )}
          </div>

          {data.ctaLabel && data.ctaHref && (
            <Link
              to={data.ctaHref}
              className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue-soft transition-colors hover:text-white"
            >
              {data.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <AccordionGallery
          items={items}
          defaultIndex={Math.min(2, items.length - 1)}
          accentColor="#1769e0"
          overlayColor="#060a12"
          expandRatio={0.54}
          height={520}
          gap={10}
          radius={16}
          duration={0.65}
          parallax={0.5}
          tilt={7}
          stagger={0.06}
          grayscale
        />

        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">
          Hover or focus a cover to explore · Select the active cover to view details
        </p>
      </div>
    </section>
  );
};
