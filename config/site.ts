import fs from "node:fs";
import { load } from "js-yaml";
import map from "@/planning/content-map.json";
const project = load(fs.readFileSync("project.yaml", "utf8")) as {
  domain: { origin: string };
};
export const site = {
  name: map.siteIdentity.site_name,
  shortName: map.siteIdentity.short_name,
  origin: project.domain.origin,
  language: "en",
  logo: "/images/logo.png",
  og: "/images/og-image.png",
  email: `support@${new URL(project.domain.origin).hostname.replace(/^www\./, "")}`,
};
