import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { semanticContent } from "./seo-semantic.mjs";
import { prepareManifest } from "./seo-manifest-lib.mjs";

const config = JSON.parse(fs.readFileSync("seo/indexnow.json", "utf8"));
const manifestPath = "out/seo-manifest.json";
const sitemapPath = "out/sitemap.xml";
const xml = fs.readFileSync(sitemapPath, "utf8");
const now = new Date().toISOString();
const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
  url: new URL(match[1].match(/<loc>(.*?)<\/loc>/)[1]).href,
  date: match[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
}));

let previous = null;
if (process.env.VERCEL_ENV === "production") {
  const response = await fetch(`${config.siteUrl}/seo-manifest.json`, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404 && config.bootstrap === true)
    console.log("Explicit first production manifest bootstrap");
  else {
    if (!response.ok)
      throw Error(`Previous production manifest HTTP ${response.status}`);
    previous = await response.json();
  }
} else if (fs.existsSync(manifestPath))
  previous = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const entries = urls
  .map(({ url, date }) => {
    const u = new URL(url);
    if (u.origin !== config.siteUrl)
      throw Error("Sitemap origin differs from configured production site");
    const file =
      u.pathname === "/"
        ? "out/index.html"
        : path.join("out", `${u.pathname.slice(1)}.html`);
    const html = fs.readFileSync(file, "utf8");
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify(
          semanticContent(html, (name) =>
            crypto
              .createHash("sha256")
              .update(fs.readFileSync(path.join("out", name.slice(1))))
              .digest("hex"),
          ),
        ),
      )
      .digest("hex");
    return {
      path: u.pathname,
      canonicalUrl: url,
      indexable: true,
      contentFingerprint: `sha256:${fingerprint}`,
      lastModified: date ? new Date(date).toISOString() : now,
    };
  })
  .sort((a, b) =>
    a.canonicalUrl < b.canonicalUrl
      ? -1
      : a.canonicalUrl > b.canonicalUrl
        ? 1
        : 0,
  );
const current = prepareManifest(
  {
    schemaVersion: 1,
    fingerprintVersion: "semantic-html-v1",
    siteUrl: config.siteUrl,
    generatedAt: now,
    entries,
    deployment: {
      projectId: process.env.VERCEL_PROJECT_ID ?? config.projectId,
      id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? "local",
    },
  },
  previous,
);
fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + "\n");
const dates = new Map(
  current.entries.map((e) => [e.canonicalUrl, e.lastModified]),
);
fs.writeFileSync(
  sitemapPath,
  xml.replace(/<url>([\s\S]*?)<\/url>/g, (all, body) => {
    const url = new URL(body.match(/<loc>(.*?)<\/loc>/)[1]).href;
    const stamp = `<lastmod>${dates.get(url)}</lastmod>`;
    return `<url>${/<lastmod>/.test(body) ? body.replace(/<lastmod>.*?<\/lastmod>/, stamp) : body + stamp}</url>`;
  }),
);
console.log(
  `SEO manifest: ${entries.length} canonical pages; ${current.deletedUrls.length} retained deletions`,
);
