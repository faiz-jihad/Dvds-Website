import React from "react";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/publicApi";
import { Seo, toAbsoluteUrl } from "../components/common/Seo";
import { AzDarkLandingLayout } from "../components/landing/AzDarkLandingLayout";
import { Category } from "../types";
import { DEFAULT_STORE_SETTINGS } from "../data/defaultStoreSettings";
import { DEFAULT_PRODUCTS } from "../data/defaultProducts";
import { DEFAULT_GENRES } from "../data/defaultGenres";

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
  const genres =
    genresQuery.data && genresQuery.data.length > 0
      ? genresQuery.data
      : DEFAULT_GENRES;
  const settings = settingsQuery.data || DEFAULT_STORE_SETTINGS;

  return (
    <>
      <Seo
        title={
          settings.seo_site_title && /^dvd\s+zone/i.test(settings.seo_site_title)
            ? settings.seo_site_title
            : "DVD zone UK | Buy DVD Movies & TV Box Sets Online"
        }
        description={
          settings.seo_site_description && /^dvd\s+zone/i.test(settings.seo_site_description)
            ? settings.seo_site_description
            : "DVD zone UK — Buy DVD movies, TV series box sets, and physical media in the UK. 100% free Royal Mail UK delivery and same-day dispatch."
        }
        keywords="DVD zone UK, DVD Zone UK, DVD zone, DVD Zone, DVDs Zone UK, DVDs Zone, dvdzone uk, dvdzone, dvdszone, AZ Rayan DVDs, dvds-zone.co.uk, buy DVDs UK, TV box sets UK, physical media store UK, Royal Mail free delivery DVDs"
        canonicalPath="/"
        image={
          settings.seo_social_image_url ||
          "/catalog/the-mandalorian-seasons-1-3.jpeg"
        }
        siteName={settings.store_name || "DVD zone UK"}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Brand",
            name: settings.store_name || "DVD zone UK",
            alternateName: [
              "DVD zone UK",
              "DVD Zone UK",
              "DVD zone",
              "DVD Zone",
              "DVDs Zone",
              "DVDs Zone UK",
              "dvdzone",
              "dvdzone uk",
              "AZ Rayan DVDs",
              "dvds-zone.co.uk",
            ],
            url: toAbsoluteUrl("/"),
            logo: toAbsoluteUrl("/brand/logo.png"),
            sameAs: [
              "https://g.page/r/CcbYihBj8jECEBM",
              "https://g.page/r/CcbYihBj8jECEBM/review",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: settings.store_name || "DVD zone UK",
            alternateName: [
              "DVD zone UK",
              "DVD Zone UK",
              "DVD zone",
              "DVD Zone",
              "DVDs Zone",
              "DVDs Zone UK",
              "dvdzone",
              "dvdzone uk",
              "AZ Rayan DVDs",
              "dvds-zone.co.uk",
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
            brand: {
              "@type": "Brand",
              name: settings.store_name || "DVDs Zone",
            },
            alternateName: [
              "dvdzone",
              "dvd zone",
              "dvds zone",
              "DVD Zone",
              "DVDZone",
              "DVDsZone",
              "AZ Rayan DVDs",
              "DVDs Zone UK",
              "DVD Zone UK",
              "dvds-zone.co.uk",
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
              numberOfItems: products.length,
              itemListElement: products.map((prod, idx) => ({
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
