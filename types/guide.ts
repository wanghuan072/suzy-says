import type { Block, LocalImage, Seo } from "./content";
export type Guide = {
  id: string;
  slug: string;
  status: "draft" | "published";
  title: string;
  summary: string;
  tags: string[];
  authorId: string | null;
  spoilerPolicy: "none" | "marked" | "full";
  publishedAt: string | null;
  updatedAt: string | null;
  cover: LocalImage;
  seo: Seo;
  sections: { id: string; title: string; blocks: Block[] }[];
  relatedGuideIds: string[];
};
