import fs from "node:fs";
import { getCsp } from "../lib/csp.ts";
const headers = `/*
  Content-Security-Policy: ${getCsp(false)}
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()

https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:preview.:project.pages.dev/*
  X-Robots-Tag: noindex
`;
if (!fs.existsSync("out/404.html")) throw new Error("Static 404 missing");
for (const name of ["sitemap.xml", "robots.txt"]) {
  if (!fs.existsSync(`out/${name}`)) throw new Error(`${name} missing`);
}
fs.writeFileSync("out/_headers", headers);
console.log("Cloudflare Pages headers and required static files verified.");
