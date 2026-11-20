import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { load as yaml } from "js-yaml";
import { gameGroups } from "../lib/game-groups.mjs";
const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex");
const calendar = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export function computeState({ root = process.cwd() } = {}) {
  const read = (name) =>
    JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  const source = (name) =>
    fs.existsSync(path.join(root, name))
      ? fs.readFileSync(path.join(root, name), "utf8")
      : "";
  const main = read("data/games/main-game.json"),
    games = read("data/games/games.json");
  const guides = fs
    .readdirSync(path.join(root, "data/guides"))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({ ...read("data/guides/" + name), __file: name }));
  const pub = games.filter((game) => game.status === "published"),
    pg = guides.filter((guide) => guide.status === "published");
  // Evaluate only the trusted local TDK object; no module cache means isolated fixtures
  // and repeated checks always see the current main record and individual TDK values.
  const tdkProgram = source("seo/tdk.js")
    .replace(/import\s+main\s+from\s+[^;]+;\s*/, "")
    .replace(/export\s+const\s+tdk\s*=/, "globalThis.result =");
  const context = { main, result: undefined };
  vm.runInNewContext(tdkProgram, context, { timeout: 1000 });
  const tdk = context.result;
  if (!tdk || typeof tdk !== "object") throw Error("TDK object missing");
  const legal = read("data/legal-pages.json");
  const project = yaml(source("project.yaml"));
  const origin = project?.domain?.origin;
  const navigationText = source("config/navigation.ts");
  const shell = [
    ...navigationText.matchAll(/(?:label|path):\s*"([^"]+)"/g),
  ].map((match) => match[1]);
  const media = (value) => {
    const paths = new Set();
    const visit = (item) => {
      if (typeof item === "string" && item.startsWith("/images/"))
        paths.add(item);
      else if (Array.isArray(item)) item.forEach(visit);
      else if (item && typeof item === "object")
        Object.values(item).forEach(visit);
    };
    visit(value);
    return [...paths].sort().map((name) => {
      const file = path.resolve(root, "public", "." + name);
      if (!file.startsWith(path.resolve(root, "public") + path.sep))
        throw Error("Unsafe media fingerprint path");
      return [
        name,
        fs.existsSync(file) ? hash(fs.readFileSync(file)) : "missing",
      ];
    });
  };
  const globalMedia = media({
    logo: "/images/logo.png",
    og: "/images/og-image.png",
  });
  const card = (game, compact = true) => {
    const visible = {
      id: game.id,
      slug: game.slug,
      title: game.title,
      image: game.image,
      ...(!compact ? { shortDescription: game.shortDescription } : {}),
    };
    return { ...visible, media: media(visible) };
  };
  const guideCard = (guide) => {
    const visible = {
      id: guide.id,
      slug: guide.slug,
      title: guide.title,
      summary: guide.summary,
      cover: guide.cover,
    };
    return { ...visible, media: media(visible) };
  };
  const pages = {};
  const entry = (kind, id, visible) => ({
    kind,
    id,
    fingerprint: hash({ visible, shell, origin, globalMedia }),
  });
  for (const game of [main, ...pub]) {
    if (game.status !== "published") continue;
    const { updatedAt, flags, relatedGameIds, status, ...visible } = game;
    const groups = Object.fromEntries(
      Object.entries(gameGroups(pub, game, main.id)).map(([key, values]) => [
        key,
        values.map((value) => card(value)),
      ]),
    );
    pages[game.id === main.id ? "/" : "/games/" + game.slug] = entry(
      "game",
      game.id,
      {
        ...visible,
        media: media(visible),
        groups,
      },
    );
  }
  for (const guide of pg) {
    const { updatedAt, __file, relatedGuideIds, status, ...visible } = guide;
    const related = relatedGuideIds
      .map((id) => pg.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({ id: item.id, slug: item.slug, title: item.title }));
    pages["/guides/" + guide.slug] = entry("guide", guide.id, {
      ...visible,
      related,
      media: media(visible),
    });
  }
  for (const route of read("planning/route-registry.json").filter(
    (route) => !["game", "guide"].includes(route.type),
  )) {
    const content = route.type === "legal" ? legal[route.id] : null;
    if (route.type === "legal" && !content)
      throw Error("Legal copy missing: " + route.id);
    pages[route.path] = entry("static", route.id, {
      route,
      tdk: tdk[route.id],
      content,
      ...(route.id === "contact"
        ? { email: `support@${new URL(origin).hostname.replace(/^www\./, "")}` }
        : {}),
      cards:
        route.path === "/games"
          ? pub.map((game) => card(game, false))
          : route.path === "/guides"
            ? pg.map(guideCard)
            : [],
    });
  }
  return { pages, main, games, guides };
}

export function contentState(
  mode = "check",
  { root = process.cwd(), now = new Date() } = {},
) {
  if (!["check", "update"].includes(mode)) throw Error("state mode");
  const file = path.join(root, "seo/page-lastmod.json");
  const old = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { version: 1, pages: {} };
  const current = computeState({ root });
  const date = calendar(now),
    changed = [],
    removed = Object.keys(old.pages).filter((route) => !current.pages[route]);
  for (const [route, state] of Object.entries(current.pages)) {
    const previous = old.pages[route];
    if (previous?.fingerprint !== state.fingerprint) changed.push(route);
    if (state.kind === "static")
      state.lastModified =
        previous?.fingerprint === state.fingerprint
          ? previous.lastModified
          : date;
  }
  if (mode === "check") {
    if (changed.length || removed.length)
      throw Error(
        "Stale page fingerprints: " +
          [...changed, ...removed.map((route) => route + " (removed)")].join(
            ", ",
          ),
      );
    return { changed: [], removed: [], stable: true };
  }
  const write = (name, value) =>
    fs.writeFileSync(
      path.join(root, name),
      JSON.stringify(value, null, 2) + "\n",
    );
  for (const route of changed) {
    const state = current.pages[route];
    if (state.kind === "game") {
      const game =
        state.id === current.main.id
          ? current.main
          : current.games.find((game) => game.id === state.id);
      game.updatedAt = date;
    } else if (state.kind === "guide")
      current.guides.find((guide) => guide.id === state.id).updatedAt = date;
  }
  if (changed.some((route) => current.pages[route].id === current.main.id))
    write("data/games/main-game.json", current.main);
  if (
    changed.some(
      (route) =>
        current.pages[route].kind === "game" &&
        current.pages[route].id !== current.main.id,
    )
  )
    write("data/games/games.json", current.games);
  for (const guide of current.guides)
    if (
      changed.some(
        (route) =>
          current.pages[route].kind === "guide" &&
          current.pages[route].id === guide.id,
      )
    ) {
      const { __file, ...record } = guide;
      write("data/guides/" + __file, record);
    }
  write("seo/page-lastmod.json", { version: 1, pages: current.pages });
  return { changed, removed, date };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      JSON.stringify(contentState(process.argv[2] || "check"), null, 2),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
