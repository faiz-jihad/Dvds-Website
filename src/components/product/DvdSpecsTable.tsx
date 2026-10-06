import React from 'react';
import { Product } from '../../types';
import { formatRuntime } from '../../lib/formatters';
import { BbfcBadge } from '../common/BbfcBadge';
import { ImdbBadge } from '../common/ImdbBadge';

interface DvdSpecsTableProps {
  product: Product;
}

export const DvdSpecsTable: React.FC<DvdSpecsTableProps> = ({ product }) => {
  const isVideoItem = ['DVD', 'Blu-ray', '4K UHD', 'Box Set'].includes(product.format);

  const specs: { label: string; value: React.ReactNode }[] = [
    { label: 'Catalogue SKU', value: <span className="font-mono font-medium">{product.sku}</span> },
    ...(product.category?.name ? [{ label: 'Category', value: product.category.name }] : []),
    { label: 'Format / Type', value: product.format || 'Standard' },
    { label: 'Condition', value: product.condition || 'Brand New (Sealed)' },
    ...(product.spine_number
      ? [{ label: 'Collector Spine #', value: <span className="font-mono font-bold text-brand-blue dark:text-blue-400">SPINE #{product.spine_number}</span> }]
      : []),
    ...(product.director
      ? [{ label: 'Director / Creator', value: product.director }]
      : []),
    ...(product.release_year && product.release_year > 1900
      ? [{ label: 'Release Year', value: product.release_year.toString() }]
      : []),
    ...(isVideoItem && product.runtime_minutes && product.runtime_minutes > 0
      ? [{ label: 'Runtime', value: `${formatRuntime(product.runtime_minutes)} (${product.runtime_minutes} mins)` }]
      : []),
    ...(isVideoItem && product.age_rating && product.age_rating !== 'All'
      ? [{
          label: 'Age Rating / Certificate',
          value: (
            <div className="flex items-center gap-2">
              <BbfcBadge rating={product.age_rating} size="sm" />
              <span>BBFC {product.age_rating} Certificate</span>
            </div>
          ),
        }]
      : []),
    ...(product.imdb_rating != null && product.imdb_rating > 0
      ? [{
          label: 'IMDb Rating',
          value: (
            <div className="flex items-center gap-2">
              <ImdbBadge product={product} size="sm" showTenSuffix asLink />
              <span className="text-gray-400 font-mono text-[11px]">(Audience &amp; Critics)</span>
            </div>
          ),
        }]
      : []),
    ...(product.aspect_ratio
      ? [{ label: 'Aspect Ratio', value: product.aspect_ratio }]
      : []),
    ...(product.audio_format
      ? [{ label: 'Audio / Language', value: product.audio_format || product.language }]
      : []),
    ...(product.subtitles && product.subtitles !== 'None'
      ? [{ label: 'Subtitles', value: product.subtitles }]
      : []),
    { label: 'Dispatched From', value: 'United Kingdom (100% Free Royal Mail Delivery)' },
  ];

  return (
    <div className="w-full border border-gray-200 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-[#0E131F]">
      <div className="flex flex-col items-start gap-1 bg-gray-50 dark:bg-[#141A26] px-4 py-3 border-b border-gray-200 dark:border-white/10 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-dark dark:text-white">
          Product Specifications
        </h4>
        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">AUTHENTIC SPECIFICATIONS</span>
      </div>
      <dl className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
        {specs.map((item, index) => (
          <div
            key={item.label}
            className={`grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-4 sm:gap-0 sm:py-2.5 ${
              index % 2 === 0 ? 'bg-white dark:bg-[#0E131F]' : 'bg-gray-50/50 dark:bg-[#141A26]/40'
            }`}
          >
            <dt className="text-gray-500 dark:text-gray-400 font-medium">{item.label}</dt>
            <dd className="min-w-0 break-words text-dark dark:text-gray-200 font-normal sm:col-span-3">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

