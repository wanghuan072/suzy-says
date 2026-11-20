import fs from "node:fs";
import path from "node:path";
import type { Guide } from "@/types/guide";
export function getAllPublishedGuides() {
  return fs
    .readdirSync("data/guides")
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map(
      (f) =>
        JSON.parse(
          fs.readFileSync(path.join("data/guides", f), "utf8"),
        ) as Guide,
    )
    .filter((g) => g.status === "published");
}
export function getGuideBySlug(slug: string) {
  return getAllPublishedGuides().find((g) => g.slug === slug);
}
export function getGuideById(id: string) {
  return getAllPublishedGuides().find((g) => g.id === id);
}
export function getRelatedGuides(guide: Guide) {
  return guide.relatedGuideIds.map(getGuideById).filter((g): g is Guide => !!g);
}
export function getGuideRouteParams() {
  return getAllPublishedGuides().map((g) => ({ slug: g.slug }));
}
