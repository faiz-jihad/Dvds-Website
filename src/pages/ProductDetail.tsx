import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Truck, ShieldCheck, Check, ArrowLeft, Disc, Clock } from 'lucide-react';
import { publicApi } from '../lib/publicApi';
import { formatGBP, cn } from '../lib/formatters';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BbfcBadge } from '../components/common/BbfcBadge';
import { ImdbBadge } from '../components/common/ImdbBadge';
import { QuantitySelector } from '../components/commerce/QuantitySelector';
import { DvdSpecsTable } from '../components/product/DvdSpecsTable';
import { ProductCard } from '../components/product/ProductCard';
import { useCartStore } from '../stores/useCartStore';
import { useFavouritesStore } from '../stores/useFavouritesStore';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const productQuery = useQuery({ queryKey: ['store', 'product', slug], queryFn: () => publicApi.getProductBySlug(slug || ''), enabled: Boolean(slug) });
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts() });
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  const product = productQuery.data;
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);
  const addToast = useUiStore((state) => state.addToast);
  const { isFavourite, toggleFavourite } = useFavouritesStore();

  if (productQuery.isLoading || productsQuery.isLoading || settingsQuery.isLoading || productQuery.error || productsQuery.error || settingsQuery.error) {
    return <StoreDataState loading={productQuery.isLoading || productsQuery.isLoading || settingsQuery.isLoading} error={productQuery.error || productsQuery.error || settingsQuery.error} retry={() => { productQuery.refetch(); productsQuery.refetch(); settingsQuery.refetch(); }} />;
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <Disc className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="font-display font-bold text-2xl text-dark mb-2">Film Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">
          The requested edition might be out of print or the URL has changed.
        </p>
        <Link to="/shop">
          <Button variant="primary">Return to DVD Catalogue</Button>
        </Link>
      </div>
    );
  }

  const isFav = isFavourite(product.id);
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  // Related products from same category
  const relatedProducts = (productsQuery.data || [])
    .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.format === product.format))
    .slice(0, 4);

  const handleAddToBasket = () => {
    addItem(product, quantity);
    setIsAdded(true);
    addToast(`Added ${quantity}x "${product.title}" to basket`, 'success');
    openCartDrawer();
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleToggleFav = () => {
    const result = toggleFavourite(product.id);
    addToast(
      result ? `Added to your favourites` : `Removed from your favourites`,
      'info'
    );
  };

  return (
    <div className="bg-white min-h-screen py-8 sm:py-12">
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-gray-500 mb-8 font-medium">
          <Link to="/" className="hover:text-dark">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-dark">Shop</Link>
          <span>/</span>
          <span className="text-dark truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Layout: Left Gallery + Right Sticky Purchase Box */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Left: Product Artwork Gallery */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-md aspect-dvd rounded-sm overflow-hidden bg-gray-50 border border-gray-200 shadow-dvd-subtle relative group">
              <img
                src={product.cover_image_url}
                alt={`${product.title} DVD Cover`}
                className="w-full h-full object-cover"
              />
              {/* Disc highlight spine sheen */}
              <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-white/60 via-white/10 to-transparent pointer-events-none" />

              {/* Criterion-style Spine Number Overlay */}
              {product.spine_number && (
                <div className="absolute top-4 right-4 bg-dark/95 backdrop-blur-xs text-white px-2.5 py-1 rounded-xs border border-white/20 font-mono text-[11px] font-bold tracking-widest uppercase shadow-md">
                  SPINE #{product.spine_number}
                </div>
              )}

              {hasDiscount && (
                <div className="absolute top-4 left-4">
                  <Badge variant="sale">SPECIAL OFFER</Badge>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 font-mono sm:gap-6">
              <span className="flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-brand-blue" />
                Original PAL DVD Edition
              </span>
              <span>•</span>
              <span>Region 2 UK Compatible</span>
            </div>
          </div>

          {/* Right: Sticky Purchase Panel */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            <div className="space-y-6">
              {/* Title & Eyebrow */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {product.spine_number && (
                    <span className="px-2 py-0.5 rounded-xs bg-dark text-white font-mono text-[10px] font-bold tracking-widest uppercase">
                      SPINE #{product.spine_number}
                    </span>
                  )}
                  <Badge variant="format">{product.format}</Badge>
                  <span className="text-xs text-gray-400 font-mono">•</span>
                  <span className="text-xs text-gray-500 font-mono">{product.release_year}</span>
                  <span className="text-xs text-gray-400 font-mono">•</span>
                  <BbfcBadge rating={product.age_rating} size="sm" showLabel />
                  <span className="text-xs text-gray-400 font-mono">•</span>
                  <ImdbBadge product={product} size="sm" showTenSuffix asLink />
                </div>

                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-dark tracking-tight leading-tight">
                  {product.title}
                </h1>

                {product.director && (
                  <p className="text-sm font-medium text-brand-blue mt-1">
                    Directed by {product.director}
                  </p>
                )}

                {product.short_description && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {product.short_description}
                  </p>
                )}
              </div>

              {/* Price Block with Red Sale treatment */}
              <div className="flex flex-wrap items-baseline gap-3 pb-6 border-b border-gray-100">
                <span className={cn('text-3xl font-extrabold font-mono tracking-tight', hasDiscount ? 'text-brand-red' : 'text-dark')}>
                  {formatGBP(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-gray-400 line-through font-mono">
                      {formatGBP(product.compare_at_price)}
                    </span>
                    <span className="text-xs font-bold text-brand-red uppercase tracking-wider bg-brand-red-soft px-2 py-0.5 rounded-sm">
                      Save {formatGBP(product.compare_at_price! - product.price)}
                    </span>
                  </>
                )}
              </div>

              {/* Availability & Stock State */}
              <div className="flex items-center gap-2 text-xs">
                {product.stock_quantity > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-800">
                      In Stock ({product.stock_quantity} available for immediate dispatch)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-brand-red" />
                    <span className="font-semibold text-brand-red">Temporarily Out of Stock</span>
                  </>
                )}
              </div>

              {/* Quantity & Add to Basket */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Quantity</span>
                  <QuantitySelector
                    quantity={quantity}
                    max={product.stock_quantity}
                    onChange={setQuantity}
                  />
                </div>

                <div className="flex items-stretch gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={product.stock_quantity <= 0}
                    onClick={handleAddToBasket}
                    className="flex-1 text-sm font-semibold"
                  >
                    {isAdded ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Added to Basket
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Add to Basket
                      </span>
                    )}
                  </Button>

                  <button
                    onClick={handleToggleFav}
                    className={cn(
                      'min-h-12 min-w-12 p-3 rounded-md border transition-colors flex items-center justify-center',
                      isFav
                        ? 'border-brand-red text-brand-red bg-brand-red-soft'
                        : 'border-gray-300 text-gray-600 hover:border-dark hover:text-dark'
                    )}
                    aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
                  >
                    <Heart className={cn('w-5 h-5', isFav && 'fill-current')} />
                  </button>
                </div>
              </div>

              {/* UK Delivery & Return Information */}
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200/70 space-y-3 text-xs text-gray-600">
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark font-semibold">UK Delivery: </strong>
                    {settingsQuery.data!.free_shipping_threshold <= 0 || settingsQuery.data!.standard_shipping_fee === 0 ? (
                      <>
                        <span className="text-emerald-700 font-bold">100% Free UK Delivery</span> on all orders via {settingsQuery.data!.standard_shipping_name} ({settingsQuery.data!.standard_shipping_eta}).
                      </>
                    ) : (
                      <>
                        {settingsQuery.data!.standard_shipping_name}. Free on orders over {formatGBP(settingsQuery.data!.free_shipping_threshold)}; otherwise {formatGBP(settingsQuery.data!.standard_shipping_fee)}. Estimated {settingsQuery.data!.standard_shipping_eta}.
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark font-semibold">30-Day Money Back Guarantee: </strong>
                    Returned discs must be in unblemished packaging. Free return labels available.
                  </div>
                </div>
              </div>

              {/* Description Narrative */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-display font-bold text-base text-dark mb-2">
                  Synopsis & Edition Overview
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-normal">
                  {product.description}
                </p>
              </div>

              {/* Physical Disc Technical Specs */}
              <div className="pt-4">
                <DvdSpecsTable product={product} />
              </div>
            </div>
          </div>
        </div>

        {/* Related Titles */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-100 sm:mt-24 sm:pt-12">
            <div className="flex flex-col items-start gap-4 mb-8 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
                  Complementary Viewing
                </span>
                <h3 className="font-display font-bold text-2xl text-dark tracking-tight mt-1">
                  You May Also Cherish
                </h3>
              </div>
              <Link to="/shop" className="text-xs font-semibold text-dark hover:text-brand-blue">
                View All Vault Titles →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
