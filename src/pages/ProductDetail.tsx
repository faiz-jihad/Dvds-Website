import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers
} from 'lucide-react';
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
import { useLastSeenStore } from '../stores/useLastSeenStore';
import { useUiStore } from '../stores/useUiStore';
import { StoreDataState } from '../components/common/StoreDataState';
import { Seo } from '../components/common/Seo';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const recordView = useLastSeenStore((state) => state.recordView);

  const productQuery = useQuery({ queryKey: ['store', 'product', slug], queryFn: () => publicApi.getProductBySlug(slug || ''), enabled: Boolean(slug) });
  const productsQuery = useQuery({ queryKey: ['store', 'products'], queryFn: () => publicApi.getProducts() });
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => publicApi.getStoreSettings() });
  const product = productQuery.data;
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Collect up to 6 images for gallery
  const productImages: string[] = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      list.push(...product.images);
    }
    if (product.cover_image_url) {
      list.unshift(product.cover_image_url);
    }
    return Array.from(new Set(list.filter(Boolean))).slice(0, 6);
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (product) {
      recordView(product);
    }
  }, [product, recordView]);

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
        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="font-display font-bold text-2xl text-dark dark:text-white mb-2">Product Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
          The requested item might be unavailable, out of stock, or the link has changed.
        </p>
        <Link to="/shop">
          <Button variant="primary">Return to Catalogue</Button>
        </Link>
      </div>
    );
  }

  const isFav = isFavourite(product.id);
  const isDeal = Boolean(
    settingsQuery.data?.deal_is_active &&
    settingsQuery.data?.deal_product_id === product.id &&
    (!settingsQuery.data?.campaign_ends_at || Date.parse(settingsQuery.data.campaign_ends_at) > Date.now()) &&
    Number(settingsQuery.data?.deal_discount_price) > 0
  );
  const effectivePrice = isDeal ? Math.min(product.price, Number(settingsQuery.data!.deal_discount_price)) : product.price;
  const hasDiscount = (product.compare_at_price && product.compare_at_price > product.price) || isDeal;
  const originalPrice = isDeal ? product.price : product.compare_at_price;
  const isVideoFormat = ['DVD', 'Blu-ray', '4K UHD', 'Box Set'].includes(product.format);
  const activeImage = productImages[selectedImageIndex] || product.cover_image_url || '';

  // Related products from same category or format
  const relatedProducts = (productsQuery.data || [])
    .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.format === product.format))
    .slice(0, 4);

  const handleAddToBasket = () => {
    addItem(isDeal ? { ...product, price: effectivePrice } : product, quantity);
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
    <div className="bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white min-h-screen py-8 sm:py-12 transition-colors">
      <Seo
        title={`${product.title} | DVD ZONE`}
        description={`${product.title}. ${product.description ? product.description.slice(0, 130).replace(/\s\S+$/, '') + '...' : ''} All orders 100% free standard delivery across United Kingdom. Dispatched same day, delivered to your address within 2 working days via Royal Mail.`}
        canonicalPath={`/product/${product.slug}`}
        image={activeImage}
        type="product"
        siteName="DVD ZONE"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.description || product.title,
          image: activeImage.startsWith('http') ? activeImage : `https://dvdszone.co.uk${activeImage}`,
          url: `https://dvdszone.co.uk/product/${product.slug}`,
          sku: product.sku || product.id,
          brand: { '@type': 'Brand', name: 'DVD ZONE' },
          offers: {
            '@type': 'Offer',
            url: `https://dvdszone.co.uk/product/${product.slug}`,
            priceCurrency: 'GBP',
            price: product.price.toFixed(2),
            priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
            availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: 'DVD ZONE' },
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'GBP' },
              shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
                transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
              },
            },
          },
          ...(isVideoFormat && product.age_rating && product.age_rating !== 'All' && { contentRating: product.age_rating }),
          ...(product.format && { additionalProperty: { '@type': 'PropertyValue', name: 'Format', value: product.format } }),
        }}
      />
      <div className="max-w-container mx-auto px-4 sm:px-6 md:px-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-gray-500 dark:text-gray-400 mb-8 font-medium">
          <Link to="/" className="hover:text-dark dark:hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-dark dark:hover:text-white transition-colors">Catalogue</Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link to={`/shop?category=${product.category.slug}`} className="hover:text-dark dark:hover:text-white transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-dark dark:text-white truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Layout: Left Gallery + Right Sticky Purchase Box */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Left: Product Artwork / Images Gallery (Up to 6 images) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-md aspect-square sm:aspect-[4/5] rounded-xl overflow-hidden bg-white dark:bg-[#0E131F] border border-gray-200 dark:border-white/10 shadow-sm relative group flex items-center justify-center p-3 sm:p-4">
              <img
                src={activeImage}
                alt={`${product.title} view ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain transition-all duration-300"
              />

              {/* Prev / Next Navigation Controls for Multi-Image */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition opacity-80 group-hover:opacity-100 shadow-md cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition opacity-80 group-hover:opacity-100 shadow-md cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter Badge */}
              {productImages.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-dark/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[11px] font-mono font-medium">
                  {selectedImageIndex + 1} / {productImages.length}
                </div>
              )}

              {/* Spine Number Overlay if present */}
              {product.spine_number && (
                <div className="absolute top-3 right-3 bg-dark/95 backdrop-blur-xs text-white px-2.5 py-1 rounded-xs border border-white/20 font-mono text-[10px] font-bold tracking-widest uppercase shadow-md">
                  SPINE #{product.spine_number}
                </div>
              )}

              {isDeal ? (
                <div className="absolute top-3 left-3">
                  <Badge variant="sale">SPOTLIGHT DEAL</Badge>
                </div>
              ) : hasDiscount ? (
                <div className="absolute top-3 left-3">
                  <Badge variant="sale">SPECIAL OFFER</Badge>
                </div>
              ) : null}
            </div>

            {/* Thumbnail Strip (Up to 6 images) */}
            {productImages.length > 1 && (
              <div className="mt-3.5 grid grid-cols-6 gap-2 w-full max-w-md">
                {productImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      'aspect-square rounded-lg overflow-hidden border-2 transition-all p-1 bg-white dark:bg-[#141A26] cursor-pointer flex items-center justify-center',
                      selectedImageIndex === index
                        ? 'border-brand-blue ring-2 ring-brand-blue/30 scale-105'
                        : 'border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-gray-400'
                    )}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-contain rounded-xs" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sticky Purchase Panel */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            <div className="space-y-6">
              {/* Title & Eyebrow */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {product.category?.name && (
                    <span className="px-2 py-0.5 rounded-xs bg-brand-blue/10 text-brand-blue dark:bg-blue-900/30 dark:text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {product.category.name}
                    </span>
                  )}
                  {product.format && <Badge variant="format">{product.format}</Badge>}
                  {product.release_year && product.release_year > 1900 && (
                    <>
                      <span className="text-xs text-gray-400 font-mono">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{product.release_year}</span>
                    </>
                  )}
                  {isVideoFormat && product.age_rating && product.age_rating !== 'All' && (
                    <>
                      <span className="text-xs text-gray-400 font-mono">•</span>
                      <BbfcBadge rating={product.age_rating} size="sm" showLabel />
                    </>
                  )}
                  {product.imdb_rating != null && product.imdb_rating > 0 && (
                    <>
                      <span className="text-xs text-gray-400 font-mono">•</span>
                      <ImdbBadge product={product} size="sm" showTenSuffix asLink />
                    </>
                  )}
                </div>

                <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-dark dark:text-white tracking-tight leading-tight">
                  {product.title}
                </h1>

                {product.director && (
                  <p className="text-sm font-medium text-brand-blue dark:text-blue-400 mt-1">
                    Creator / Director: {product.director}
                  </p>
                )}

                {product.short_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    {product.short_description}
                  </p>
                )}
              </div>

              {/* Price Block with Red Sale treatment */}
              <div className="flex flex-wrap items-baseline gap-3 pb-6 border-b border-gray-200 dark:border-white/10">
                <span className={cn('text-3xl font-extrabold font-mono tracking-tight', hasDiscount ? 'text-brand-red dark:text-red-400' : 'text-dark dark:text-white')}>
                  {formatGBP(effectivePrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-gray-400 line-through font-mono">
                      {formatGBP(originalPrice)}
                    </span>
                    <span className="text-xs font-bold text-brand-red uppercase tracking-wider bg-brand-red-soft dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-sm">
                      Save {formatGBP(originalPrice! - effectivePrice)}
                    </span>
                  </>
                )}
              </div>

              {/* Availability & Stock State */}
              <div className="flex items-center gap-2 text-xs">
                {product.stock_quantity > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-brand-blue" />
                    <span className="font-semibold text-brand-blue dark:text-blue-400">
                      In Stock ({product.stock_quantity} available for immediate dispatch)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-brand-red" />
                    <span className="font-semibold text-brand-red dark:text-red-400">Sold Out</span>
                  </>
                )}
              </div>

              {/* Quantity & Add to Basket */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Quantity</span>
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
                    className="flex-1 text-sm font-bold justify-center"
                  >
                    {product.stock_quantity <= 0 ? (
                      <span>Sold Out</span>
                    ) : isAdded ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Added to Basket
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        Add to Basket
                      </span>
                    )}
                  </Button>

                  <button
                    onClick={handleToggleFav}
                    className={cn(
                      'min-h-12 min-w-12 p-3 rounded-md border transition-colors flex items-center justify-center cursor-pointer',
                      isFav
                        ? 'border-brand-red text-brand-red bg-red-50 dark:bg-red-950/30'
                        : 'border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-dark dark:hover:border-white hover:text-dark dark:hover:text-white'
                    )}
                    aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
                  >
                    <Heart className={cn('w-5 h-5', isFav && 'fill-current')} />
                  </button>
                </div>
              </div>

              {/* UK Delivery & Return Information */}
              <div className="bg-white dark:bg-[#0E131F] rounded-lg p-4 border border-gray-200 dark:border-white/10 space-y-3 text-xs text-gray-600 dark:text-gray-300 shadow-xs">
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark dark:text-white font-semibold">UK Delivery: </strong>
                    <span className="text-brand-blue dark:text-blue-400 font-bold">100% Free Standard Delivery</span> across United Kingdom. Dispatched same day, delivered to your address within 2 working days via Royal Mail.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-brand-blue dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-dark dark:text-white font-semibold">30-Day Money Back Guarantee: </strong>
                    Returned items must be in original condition. Free return labels available.
                  </div>
                </div>
              </div>

              {/* Description Narrative */}
              <div className="pt-6 border-t border-gray-200 dark:border-white/10">
                <h3 className="font-display font-bold text-base text-dark dark:text-white mb-2">
                  Product Description &amp; Overview
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Technical & Product Specs */}
              <div className="pt-4">
                <DvdSpecsTable product={product} />
              </div>
            </div>
          </div>
        </div>

        {/* Related Titles */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10 sm:mt-24 sm:pt-12">
            <div className="flex flex-col items-start gap-4 mb-8 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-brand-blue dark:text-blue-400">
                  Recommended For You
                </span>
                <h3 className="font-display font-bold text-2xl text-dark dark:text-white tracking-tight mt-1">
                  You May Also Like
                </h3>
              </div>
              <Link to="/shop" className="text-xs font-semibold text-dark dark:text-gray-300 hover:text-brand-blue dark:hover:text-blue-400 transition-colors">
                View Full Catalogue →
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
