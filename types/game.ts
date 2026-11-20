import type { Block, LocalImage, Seo } from "./content";
export type Game = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string | null;
  tags: string[];
  categories: string[];
  spoilerPolicy: "none" | "marked" | "full";
  flags: {
    isNewHome: boolean;
    isFeaturedHome: boolean;
    isRecommendedHome: boolean;
  };
  image: LocalImage;
  player: {
    iframeSrc: string;
    aspectRatio: string | null;
    orientation: "adaptive" | "portrait" | "landscape";
    permissionsPolicy: string[];
    referrerPolicy: React.HTMLAttributeReferrerPolicy | null;
    sandbox: string[] | null;
    loadTimeoutMs: number;
  };
  seo: Seo;
  content: { id: string; heading: string; blocks: Block[] }[];
  relatedGameIds: string[];
};
