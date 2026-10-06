import React from "react";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/publicApi";
import { Seo } from "../components/common/Seo";
import { StoreDataState } from "../components/common/StoreDataState";
import { AzDarkLandingLayout } from "../components/landing/AzDarkLandingLayout";
import { DEFAULT_STORE_SETTINGS } from "../data/defaultStoreSettings";

export const Home: React.FC = () => {
  const productsQuery = useQuery({
    queryKey: ["store", "products"],
    queryFn: () => publicApi.getProducts(),
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["store", "categories"],
    queryFn: () => publicApi.getCategories(),
    staleTime: 60_000,
  });

  const genresQuery = useQuery({
    queryKey: ["store", "genres"],
    queryFn: () => publicApi.getGenres(),
    staleTime: 60_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["store", "settings"],
    queryFn: () => publicApi.getStoreSettings(),
    staleTime: 60_000,
  });

  const isLoading =
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    genresQuery.isLoading;
  const error =
    productsQuery.error || categoriesQuery.error || genresQuery.error;

  if (isLoading || error) {
    return (
      <div className="min-h-[50vh] bg-[#07090E] flex items-center justify-center text-white">
        <StoreDataState
          loading={isLoading}
          error={error || null}
          retry={() => {
            productsQuery.refetch();
            categoriesQuery.refetch();
            genresQuery.refetch();
          }}
        />
      </div>
    );
  }

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const genres = genresQuery.data || [];
  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;

  return (
    <>
      <Seo
        title="DVD ZONE — Quality DVDs & Entertainment | Free UK Delivery"
        description="Quality DVDs, TV box sets, and entertainment. Free UK standard delivery on all orders. Same-day dispatch. Delivery within 2 working days via Royal Mail."
        canonicalPath="/"
        image="/catalog/the-mandalorian-seasons-1-3.jpeg"
        siteName="DVD ZONE"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "DVD ZONE - Quality DVDs & Entertainment",
          description:
            "Definitive physical DVD box sets and restored cinema releases available for UK and worldwide delivery.",
          url: "https://dvdszone.co.uk/",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: products.slice(0, 11).map((prod, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: prod.title,
              url: `https://dvdszone.co.uk/product/${prod.slug}`,
              image: `https://dvdszone.co.uk${prod.cover_image_url}`,
            })),
          },
        }}
      />
      <AzDarkLandingLayout
        products={products}
        categories={categories}
        genres={genres}
        settings={settings}
      />
    </>
  );
};
