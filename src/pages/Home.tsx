import React from "react";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/publicApi";
import { Seo, toAbsoluteUrl } from "../components/common/Seo";
import { AzDarkLandingLayout } from "../components/landing/AzDarkLandingLayout";
import { Category } from "../types";
import { DEFAULT_STORE_SETTINGS } from "../data/defaultStoreSettings";
import { DEFAULT_PRODUCTS } from "../data/defaultProducts";

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "c-tv-box-sets",
    name: "TV Box Sets",
    slug: "tv-box-sets",
    description: "Complete TV seasons & Box Sets",
    image_url: "/catalog/the-mandalorian-seasons-1-3.jpeg",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "c-film",
    name: "Film & Cinema",
    slug: "film",
    description: "Feature films and classic movies",
    image_url: "/catalog/greyhound.jpeg",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "c-doc",
    name: "Documentary & Music",
    slug: "documentary-music",
    description: "Documentary and concert films",
    image_url: "/catalog/the-beatles-get-back.jpeg",
    is_active: true,
    sort_order: 3,
  },
];

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
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const products =
    productsQuery.data && productsQuery.data.length > 0
      ? productsQuery.data
      : DEFAULT_PRODUCTS;
  const categories =
    categoriesQuery.data && categoriesQuery.data.length > 0
      ? categoriesQuery.data
      : FALLBACK_CATEGORIES;
  const genres = genresQuery.data || [];
  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;

  return (
    <>
      <Seo
        title={
          settings.seo_site_title ||
          `DVD Zone — ${settings.store_name || "DVDs Zone"} UK | Buy Quality DVDs & TV Box Sets Online | Free UK Delivery`
        }
        description={
          settings.seo_site_description ||
          "DVD Zone (DVDs Zone UK) is your specialist online store for physical media DVDs, TV series box sets, and cinema classics. Free UK standard delivery on all orders. Same-day dispatch. Fast 2 working days delivery via Royal Mail."
        }
        keywords="DVD Zone, DVDs Zone, DVD Zone UK, DVDs Zone UK, dvdzone, dvdszone, dvd-zone, dvds-zone, dvd zone store, dvd zone online, buy DVDs UK, DVD box sets UK, television series box sets, classic films DVD, Star Wars Mandalorian DVD, physical media store UK, Royal Mail free delivery DVDs"
        canonicalPath="/"
        image={
          settings.seo_social_image_url ||
          "/catalog/the-mandalorian-seasons-1-3.jpeg"
        }
        siteName={settings.store_name || "DVDs Zone"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: settings.store_name || "DVDs Zone",
            alternateName: [
              "DVD Zone",
              "DVDZone",
              "DVDsZone",
              "DVD Zone UK",
              "DVDs Zone UK",
              "DVDs-Zone",
            ],
            url: toAbsoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: toAbsoluteUrl("/search?q={search_term_string}"),
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: settings.store_name || "DVDs Zone",
            alternateName: [
              "DVD Zone",
              "DVDZone",
              "DVDsZone",
              "DVD Zone UK",
              "DVDs Zone UK",
              "DVDs-Zone",
            ],
            url: toAbsoluteUrl("/"),
            sameAs: [
              "https://g.page/r/CcbYihBj8jECEBM",
              "https://g.page/r/CcbYihBj8jECEBM/review",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${settings.store_name || "DVDs Zone"} — Quality DVDs & Entertainment Catalogue`,
            description:
              settings.seo_site_description ||
              "Definitive physical DVD box sets and restored cinema releases available for UK and worldwide delivery.",
            url: toAbsoluteUrl("/"),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: products.slice(0, 12).map((prod, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: prod.title,
                url: toAbsoluteUrl(`/product/${prod.slug}`),
                image: toAbsoluteUrl(prod.cover_image_url),
              })),
            },
          },
        ]}
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
