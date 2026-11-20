export const dynamic = "force-static";
import fs from "node:fs";
import type { MetadataRoute } from "next";
import { absolute } from "@/lib/url-policy";
import { getAllPublishedGames, getMainGame } from "@/lib/game-loader";
import { getAllPublishedGuides } from "@/lib/guide-loader";
import registry from "@/planning/route-registry.json";
export default function sitemap(): MetadataRoute.Sitemap {
  const state = JSON.parse(fs.readFileSync("seo/page-lastmod.json", "utf8"));
  const main = getMainGame();
  const staticPages = registry.filter(
    (r) => r.type !== "game" && r.type !== "guide",
  );
  const list = [
    { url: absolute("/"), lastModified: main.updatedAt ?? undefined },
    ...getAllPublishedGames().map((g) => ({
      url: absolute(`/games/${g.slug}`),
      lastModified: g.updatedAt ?? undefined,
    })),
    ...getAllPublishedGuides().map((g) => ({
      url: absolute(`/guides/${g.slug}`),
      lastModified: g.updatedAt ?? undefined,
    })),
    ...staticPages.map((r) => ({
      url: absolute(r.path),
      lastModified:
        state.pages?.[r.path]?.lastModified ??
        state[r.path]?.lastModified ??
        undefined,
    })),
  ];
  if (new Set(list.map((x) => x.url)).size !== list.length)
    throw new Error("Duplicate sitemap canonical");
  return list;
}
