export const dynamic = "force-static";
import { site } from "@/config/site";
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${site.origin}/sitemap.xml`,
  };
}
