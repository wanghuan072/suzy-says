import type { Metadata } from "next";
import type { Seo } from "@/types/content";
import { site } from "@/config/site";
import { absolute } from "./url-policy";
export function metadataFor(
  seo: Seo,
  path: string,
  type: "website" | "article" = "website",
): Metadata {
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: absolute(path) },
    openGraph: {
      type,
      title: seo.title,
      description: seo.description,
      url: absolute(path),
      siteName: site.name,
      images: [
        {
          url: absolute(site.og),
          width: 1200,
          height: 630,
          type: "image/png",
          alt: site.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [absolute(site.og)],
    },
  };
}

/** Safe raw JSON for a native JSON-LD script, as recommended by Next.js. */
export function structuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\u003c");
}
export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": absolute("/") + "#website",
    url: absolute("/"),
    name: site.name,
    inLanguage: site.language,
  };
}
export function webPageSchema(
  path: string,
  name: string,
  description: string,
  type = "WebPage",
) {
  return {
    "@type": type,
    "@id": absolute(path) + "#webpage",
    url: absolute(path),
    name,
    description,
    inLanguage: site.language,
    isPartOf: { "@id": absolute("/") + "#website" },
  };
}
