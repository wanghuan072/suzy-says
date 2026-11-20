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
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const securityHeaders = [
  { key: "Content-Security-Policy", value: getCsp(false) },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
vercel.headers = [
  ...(vercel.headers ?? []).filter((rule) => rule.source !== "/(.*)"),
  { source: "/(.*)", headers: securityHeaders },
];
fs.writeFileSync("vercel.json", JSON.stringify(vercel, null, 2) + "\n");
console.log("Cloudflare Pages headers and required static files verified.");
