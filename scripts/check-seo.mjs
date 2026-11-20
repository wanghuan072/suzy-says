import fs from "node:fs";
import { parse } from "parse5";
import { load } from "js-yaml";

// HTTP source inspection only: this does not claim browser currentSrc or runtime visibility.
const expectedBuild = fs.readFileSync(".next/BUILD_ID", "utf8").trim();
const base = process.argv[2] ?? "http://127.0.0.1:4783";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const origin = load(fs.readFileSync("project.yaml", "utf8")).domain.origin;
const registry = read("planning/route-registry.json");
const games = [
  read("data/games/main-game.json"),
  ...read("data/games/games.json"),
];
const guides = fs
  .readdirSync("data/guides")
  .filter((f) => f.endsWith(".json"))
  .map((f) => read("data/guides/" + f));
const byId = new Map([...games, ...guides].map((x) => [x.id, x]));
const legal = ["/privacy", "/terms", "/copyright", "/about", "/contact"];
const checks = [],
  inventory = [],
  links = new Set(),
  documents = new Map();
const attr = (n, k) => n?.attrs?.find((a) => a.name === k)?.value;
const cls = (n, c) => (attr(n, "class") ?? "").split(/\s+/).includes(c);
const nodes = (n) => [n, ...(n.childNodes ?? []).flatMap(nodes)];
const find = (n, p) => nodes(n).filter(p);
const text = (n) =>
  !n
    ? ""
    : n.nodeName === "#text"
      ? n.value
      : (n.childNodes ?? []).map(text).join("");
const visibleText = (n) => {
  if (
    !n ||
    ["script", "style", "iframe", "figure", "figcaption", "svg"].includes(
      n.tagName,
    ) ||
    attr(n, "hidden") !== undefined ||
    attr(n, "aria-hidden") === "true" ||
    cls(n, "faq") ||
    cls(n, "videos")
  )
    return "";
  if (n.nodeName === "#text") return n.value;
  if (n.tagName === "details" && attr(n, "open") === undefined)
    return (n.childNodes ?? [])
      .filter((c) => c.tagName === "summary")
      .map(visibleText)
      .join("");
  return (n.childNodes ?? []).map(visibleText).join(" ");
};
const count = (value) => [...value.replace(/\s/gu, "")].length;
const check = (id, route, passed, detail) =>
  checks.push({ id, route, result: passed ? "pass" : "fail", detail });
async function fetchSource(path) {
  const chain = [];
  let url = new URL(path, base).href;
  for (let i = 0; i < 8; i++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    chain.push({
      url,
      status: response.status,
      location: response.headers.get("location"),
    });
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      url = new URL(response.headers.get("location"), url).href;
      continue;
    }
    return {
      status: response.status,
      url,
      chain,
      source: await response.text(),
    };
  }
  throw Error("Redirect limit: " + path);
}
for (const route of registry) {
  const response = await fetchSource(route.path),
    doc = parse(response.source);
  documents.set(route.path, doc);
  const titleNodes = find(doc, (n) => n.tagName === "title"),
    h1s = find(doc, (n) => n.tagName === "h1");
  const metas = (name) =>
    find(
      doc,
      (n) =>
        n.tagName === "meta" &&
        (attr(n, "name") === name || attr(n, "property") === name),
    ).map((n) => attr(n, "content"));
  const canonical = find(
    doc,
    (n) => n.tagName === "link" && attr(n, "rel") === "canonical",
  ).map((n) => attr(n, "href"));
  const title = text(titleNodes[0]),
    description = metas("description")[0] ?? "";
  check("served-build", route.path, response.source.includes(expectedBuild), {
    expectedBuild,
    method:
      "build ID appears in served RSC bootstrap; local .next/BUILD_ID comparison",
  });
  check("http-status", route.path, response.status === 200, response.chain);
  check(
    "title",
    route.path,
    titleNodes.length === 1 &&
      [...title].length >= 40 &&
      [...title].length <= 60,
    { value: title, length: [...title].length },
  );
  check(
    "description",
    route.path,
    metas("description").length === 1 &&
      [...description].length >= 140 &&
      [...description].length <= 160,
    { value: description, length: [...description].length },
  );
  check("one-h1", route.path, h1s.length === 1, h1s.map(text));
  check(
    "canonical",
    route.path,
    canonical.length === 1 &&
      new URL(canonical[0]).href === new URL(route.path, origin).href,
    canonical,
  );
  check(
    "social-image",
    route.path,
    ["og:image", "twitter:image"].every(
      (k) =>
        metas(k).length === 1 &&
        metas(k)[0] === origin + "/images/og-image.png",
    ),
    { og: metas("og:image"), twitter: metas("twitter:image") },
  );
  check(
    "social-type",
    route.path,
    metas("og:type")[0] === (route.type === "guide" ? "article" : "website"),
    metas("og:type"),
  );
  const scripts = find(
    doc,
    (n) => n.tagName === "script" && attr(n, "type") === "application/ld+json",
  );
  const schemas = [],
    errors = [];
  for (const script of scripts) {
    try {
      schemas.push(JSON.parse(text(script)));
    } catch (e) {
      errors.push(e.message);
    }
  }
  const entities = schemas.flatMap((s) => s["@graph"] ?? [s]),
    types = entities.flatMap((s) => s["@type"] ?? []);
  check("json-ld-parse", route.path, scripts.length > 0 && !errors.length, {
    types,
    errors,
  });
  const required =
    route.path === "/"
      ? ["WebSite", "WebPage", "VideoGame"]
      : route.type === "game"
        ? ["WebPage", "VideoGame"]
        : route.type === "guide"
          ? ["WebPage", "Article"]
          : route.type.endsWith("index")
            ? ["CollectionPage"]
            : [];
  check(
    "schema-type",
    route.path,
    required.every((t) => types.includes(t)),
    { required, actual: types },
  );
  const breadcrumbs = find(
    doc,
    (n) => n.tagName === "nav" && attr(n, "aria-label") === "Breadcrumb",
  );
  const crumbs = schemas.find((s) => s["@type"] === "BreadcrumbList");
  const visibleCrumbs = breadcrumbs.flatMap((n) =>
    find(n, (c) => c.tagName === "li").map((li) => text(li).trim()),
  );
  check(
    "visible-breadcrumb",
    route.path,
    route.path === "/"
      ? breadcrumbs.length === 0
      : breadcrumbs.length === 1 &&
          JSON.stringify(visibleCrumbs) ===
            JSON.stringify(crumbs?.itemListElement.map((x) => x.name)),
    { visible: visibleCrumbs, schema: crumbs?.itemListElement },
  );
  const footer = find(doc, (n) => n.tagName === "footer")[0],
    footerLinks = find(footer ?? {}, (n) => n.tagName === "a");
  check(
    "footer-legal-rel",
    route.path,
    legal.every((path) =>
      footerLinks.some(
        (n) =>
          attr(n, "href") === path &&
          ["noopener", "noreferrer", "nofollow"].every((r) =>
            (attr(n, "rel") ?? "").split(/\s+/).includes(r),
          ),
      ),
    ),
    footerLinks
      .filter((n) => legal.includes(attr(n, "href")))
      .map((n) => ({ path: attr(n, "href"), rel: attr(n, "rel") })),
  );
  const anchors = find(doc, (n) => n.tagName === "a"),
    external = [];
  for (const a of anchors) {
    const href = attr(a, "href");
    if (!href) continue;
    const url = new URL(href, origin + route.path);
    if (url.origin !== origin) {
      external.push(href);
      continue;
    }
    links.add(url.pathname);
  }
  check("no-external-anchors", route.path, external.length === 0, external);
  const record = route.path === "/" ? games[0] : byId.get(route.id),
    article = find(doc, (n) => attr(n, "data-article-game") === record?.id)[0];
  const images = find(doc, (n) => n.tagName === "img").map((n) => ({
    src: attr(n, "src"),
    srcset: attr(n, "srcset"),
    alt: attr(n, "alt"),
  }));
  const identity = [];
  if (route.type === "game") {
    const main = find(doc, (n) => n.tagName === "main")[0],
      player = find(doc, (n) => attr(n, "data-player-state") !== undefined)[0];
    check(
      "game-identity",
      route.path,
      attr(main, "data-game-id") === record.id &&
        attr(player, "data-game-id") === record.id &&
        text(h1s[0]) ===
          (record.id === "last-seen-online"
            ? "last seen online: Passwords, Clues and Desktop Guide"
            : "Play " + record.title + " Online"),
      {
        configuredId: record.id,
        mainId: attr(main, "data-game-id"),
        playerId: attr(player, "data-game-id"),
      },
    );
    check(
      "game-body-character-floor",
      route.path,
      route.path === "/" || count(visibleText(article)) >= 4000,
      {
        nonWhitespaceVisibleCharacters: count(visibleText(article)),
        exclusions: [
          "FAQ block including closed answers",
          "figure and caption",
          "video region",
          "iframe",
          "hidden/aria-hidden",
          "scripts/styles/svg",
        ],
        method: "HTTP source semantic extraction, not computed CSS visibility",
      },
    );
    const cover = find(player ?? {}, (n) => n.tagName === "img")[0],
      src = attr(cover, "src");
    const decoded = src?.startsWith("/_next/image?")
      ? new URL(src, base).searchParams.get("url")
      : src;
    check("game-cover-source", route.path, decoded === record.image.src, {
      configured: record.image.src,
      serverHtmlSrc: src,
      decodedSource: decoded,
      browserCurrentSrc: "not measured by HTTP",
    });
    check(
      "initial-game-iframe-absent",
      route.path,
      find(player ?? {}, (n) => n.tagName === "iframe").length === 0,
      {
        configuredIframe: record.player.iframeSrc,
        method: "initial HTML only; input waived",
      },
    );
  }
  for (const card of find(
    doc,
    (n) => n.tagName === "a" && attr(n, "data-game-id") !== undefined,
  )) {
    const id = attr(card, "data-game-id"),
      g = byId.get(id),
      img = find(card, (n) => n.tagName === "img")[0];
    identity.push({
      id,
      href: attr(card, "href"),
      title: text(find(card, (n) => cls(n, "card-name"))[0]),
      serverHtmlSrc: attr(img, "src"),
      expectedSrc: g?.image.src,
    });
  }
  check(
    "game-card-identity",
    route.path,
    identity.every((x) => {
      const g = byId.get(x.id);
      return (
        g &&
        x.href === "/games/" + g.slug &&
        x.title === g.title &&
        x.serverHtmlSrc === g.image.src
      );
    }),
    identity,
  );
  const guideCards = find(
    doc,
    (n) => n.tagName === "a" && attr(n, "data-guide-id") !== undefined,
  ).map((n) => {
    const g = byId.get(attr(n, "data-guide-id"));
    return {
      id: g?.id,
      href: attr(n, "href"),
      title: text(find(n, (c) => c.tagName === "h2")[0]),
      src: attr(find(n, (c) => c.tagName === "img")[0], "src"),
      expected: g,
    };
  });
  check(
    "guide-card-identity",
    route.path,
    guideCards.every(
      (x) =>
        x.expected &&
        x.href === "/guides/" + x.expected.slug &&
        x.title === x.expected.title &&
        x.src === x.expected.cover.src,
    ),
    guideCards.map(({ expected, ...x }) => x),
  );
  if (route.type === "guide")
    check(
      "guide-identity",
      route.path,
      text(h1s[0]) === record.title &&
        images.some(
          (x) => x.src === record.cover.src && x.alt === record.cover.alt,
        ),
      { id: record.id, cover: record.cover.src },
    );
  inventory.push({
    route: route.path,
    id: route.id,
    type: route.type,
    status: response.status,
    redirectChain: response.chain,
    title,
    description,
    h1: h1s.map(text),
    canonical,
    ogType: metas("og:type"),
    schemaTypes: types,
    images,
    gameCards: identity,
    articleVisibleCharacters: article ? count(visibleText(article)) : null,
  });
}
for (const field of ["title", "description"])
  check(
    "unique-" + field,
    "*",
    new Set(inventory.map((x) => x[field])).size === inventory.length,
    {
      count: inventory.length,
      unique: new Set(inventory.map((x) => x[field])).size,
    },
  );
check("route-count", "*", inventory.length === 18, inventory.length);
const internal = [];
for (const path of [...links].sort()) {
  const response = await fetchSource(path);
  internal.push({
    path,
    status: response.status,
    redirectChain: response.chain,
  });
}
check(
  "internal-links-status",
  "*",
  internal.every((x) => x.status === 200),
  internal,
);
const sitemap = await fetchSource("/sitemap.xml"),
  entries = [...sitemap.source.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    (m) => ({
      url: m[1].match(/<loc>(.*?)<\/loc>/)?.[1],
      date: m[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
    }),
  );
check(
  "sitemap",
  "/sitemap.xml",
  sitemap.status === 200 &&
    entries.length === 18 &&
    new Set(entries.map((x) => x.url)).size === 18 &&
    entries.every(
      (x) =>
        x.url?.startsWith(origin + "/") &&
        registry.some(
          (r) => origin + (r.path === "/" ? "/" : r.path) === x.url,
        ) &&
        /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(x.date ?? "") &&
        Number.isFinite(Date.parse(x.date)),
    ),
  { status: sitemap.status, entries },
);
const robots = await fetchSource("/robots.txt");
check(
  "robots",
  "/robots.txt",
  robots.status === 200 &&
    robots.source.includes("User-Agent: *") &&
    robots.source.includes("Allow: /") &&
    robots.source.includes("Sitemap: " + origin + "/sitemap.xml") &&
    !/^Disallow: \/\s*$/m.test(robots.source),
  { status: robots.status, body: robots.source },
);
const notFound = await fetchSource("/__seo-check-missing-route");
check(
  "unknown-route-404",
  "/__seo-check-missing-route",
  notFound.status === 404,
  notFound.chain,
);
const trailing = await fetchSource("/guides/");
check(
  "trailing-slash-canonical",
  "/guides/",
  trailing.status === 200 && new URL(trailing.url).pathname === "/guides",
  trailing.chain,
);
const imagePaths = new Set(
  inventory
    .flatMap((page) => page.images.map((image) => image.src))
    .filter((src) => src?.startsWith("/")),
);
imagePaths.add("/images/og-image.png");
for (const path of imagePaths) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(20000),
  });
  check(
    "image-http-source",
    path,
    response.status === 200 &&
      response.headers.get("content-type")?.startsWith("image/"),
    {
      status: response.status,
      contentType: response.headers.get("content-type"),
      method: "source URL fetch; no browser currentSrc measurement",
    },
  );
  await response.body?.cancel();
}
const failures = checks.filter((x) => x.result === "fail"),
  stamp = new Date().toISOString();
fs.writeFileSync(
  "reports/seo-page-inventory.json",
  JSON.stringify(
    {
      checkedAt: stamp,
      base,
      origin,
      method:
        "parse5 on actual production HTTP HTML; source src/srcset only, no browser currentSrc or CSS visibility claim",
      pages: inventory,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  "reports/seo-production-check.json",
  JSON.stringify(
    {
      checkedAt: stamp,
      base,
      origin,
      expectedBuild,
      method: "HTTP fetch with manual redirects and parse5 HTML parsing",
      testCount: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      checks,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      testCount: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      failures,
    },
    null,
    2,
  ),
);
process.exitCode = failures.length ? 1 : 0;
