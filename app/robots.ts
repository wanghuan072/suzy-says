export const dynamic = "force-static";
import { site } from "@/config/site";
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/preview/",
        "/research/",
        "/planning/",
        "/reports/",
        "/handoff/",
      ],
    },
    sitemap: `${site.origin}/sitemap.xml`,
  };
}
