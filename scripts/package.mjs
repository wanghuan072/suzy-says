import fs from "node:fs";
for (const file of [
  "index.html",
  "404.html",
  "_headers",
  "robots.txt",
  "sitemap.xml",
]) {
  if (!fs.existsSync(`out/${file}`))
    throw Error(`Build first: out/${file} missing`);
}
console.log(
  "Cloudflare Pages deploy directory: out (npm run build). No Node server required.",
);
