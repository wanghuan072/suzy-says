import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const assert = (ok, msg) => {
  if (!ok) throw Error(msg);
};
const fields = (obj, allowed, label) => {
  assert(
    obj && typeof obj === "object" && !Array.isArray(obj),
    label + " object",
  );
  assert(
    Object.keys(obj).every((k) => allowed.includes(k)),
    label + " unknown field",
  );
  assert(
    allowed.every((k) => k in obj),
    label + " missing field",
  );
};
export const textLength = (s) => [...(s || "").trim()].length;
export function loadRecords() {
  const main = read("data/games/main-game.json");
  const games = read("data/games/games.json");
  const guides = fs
    .readdirSync("data/guides")
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ ...read("data/guides/" + f), __file: f }));
  return { main, games, guides };
}
export function bodyText(sections) {
  return sections
    .flatMap((s) => [
      ...(s.blocks.some((b) => !["image", "video"].includes(b.type))
        ? [s.heading || s.title]
        : []),
      ...s.blocks.flatMap((b) =>
        b.type === "paragraph"
          ? [b.text]
          : b.type === "list"
            ? b.items
            : b.type === "steps"
              ? b.items.flatMap((x) => [x.title, x.body])
              : b.type === "callout"
                ? [b.label || "", b.body]
                : b.type === "table"
                  ? [...b.columns, ...b.rows.flat()]
                  : b.type === "faq"
                    ? b.items.map((x) => x.question)
                    : [],
      ),
    ])
    .join(" ")
    .normalize("NFC");
}
// Site calendar dates follow the user's Asia/Shanghai timezone.
export function validateDates(
  record,
  today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
) {
  if (record.status === "draft") {
    assert(
      record.publishedAt === null && record.updatedAt === null,
      "draft dates",
    );
    return;
  }
  for (const key of ["publishedAt", "updatedAt"]) {
    const value = record[key];
    assert(
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
      "date format",
    );
    const date = new Date(value + "T00:00:00Z");
    assert(
      !Number.isNaN(date.valueOf()) &&
        date.toISOString().slice(0, 10) === value,
      "real date",
    );
    assert(value <= today, "future date");
  }
  assert(record.updatedAt >= record.publishedAt, "date order");
}

export function safeAdditionalUrl(value) {
  try {
    if (
      typeof value !== "string" ||
      value !== value.trim() ||
      /[\\\u0000-\u0020]/.test(value)
    )
      return false;
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !isIP(host.replace(/^\[|\]$/g, "")) &&
      host.includes(".") &&
      host.length <= 253 &&
      host
        .split(".")
        .every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) &&
      !/(?:^|\.)(?:localhost|local|internal|intranet|lan|home|test|invalid|example|onion)$/.test(
        host,
      ) &&
      !/(?:^|\.)(?:localhost|localdomain)$/.test(host) &&
      !/(?:^|\.)(?:nip\.io|sslip\.io|localtest\.me|lvh\.me)$/.test(host)
    );
  } catch {
    return false;
  }
}

export function validatePlayer(player, { isMain = false, draft = false } = {}) {
  assert(
    typeof player.iframeSrc === "string" && player.iframeSrc.length > 0,
    "iframe configured",
  );
  // The supplied provisional main URL remains a runtime safety decision.
  if (!isMain)
    assert(safeAdditionalUrl(player.iframeSrc), "safe additional URL");
  const uniqueAllowed = (values, allowed, label) => {
    assert(
      Array.isArray(values) &&
        new Set(values).size === values.length &&
        values.every((v) => allowed.includes(v)),
      label,
    );
  };
  uniqueAllowed(
    player.permissionsPolicy,
    [
      "fullscreen",
      "autoplay",
      "gamepad",
      "clipboard-write",
      "accelerometer",
      "gyroscope",
    ],
    "permissions policy allowlist",
  );
  if (player.sandbox !== null)
    uniqueAllowed(
      player.sandbox,
      [
        "allow-scripts",
        "allow-same-origin",
        "allow-pointer-lock",
        "allow-orientation-lock",
      ],
      "sandbox allowlist",
    );
  else assert(draft || isMain, "published additional sandbox required");
  if (!isMain && !draft)
    assert(player.sandbox.length > 0, "published additional sandbox required");
  assert(
    player.referrerPolicy === null
      ? draft || isMain
      : [
          "no-referrer",
          "no-referrer-when-downgrade",
          "origin",
          "origin-when-cross-origin",
          "same-origin",
          "strict-origin",
          "strict-origin-when-cross-origin",
          "unsafe-url",
        ].includes(player.referrerPolicy),
    "referrer policy",
  );
  assert(
    player.aspectRatio === null
      ? draft || isMain
      : typeof player.aspectRatio === "string" &&
          /^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*\/\s*(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(
            player.aspectRatio,
          ) &&
          player.aspectRatio
            .split("/")
            .every((n) => Number.isFinite(Number(n)) && Number(n) > 0),
    "aspect ratio",
  );
  assert(
    ["adaptive", "landscape", "portrait"].includes(player.orientation),
    "orientation",
  );
  assert(
    Number.isInteger(player.loadTimeoutMs) &&
      player.loadTimeoutMs >= 3000 &&
      player.loadTimeoutMs <= 120000,
    "timeout",
  );
}

export function originalArtworkAllowed(gameId, policy = null) {
  if (policy === null) return false;
  if (policy.mode === "real-game-images") {
    realGameMediaAllowed(gameId, policy);
    return false;
  }
  assert(
    policy && typeof policy === "object" && !Array.isArray(policy),
    "media policy object",
  );
  assert(
    typeof policy.approvedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(policy.approvedAt) &&
      !Number.isNaN(Date.parse(policy.approvedAt)) &&
      new Date(policy.approvedAt).toISOString().slice(0, 10) ===
        policy.approvedAt &&
      policy.approvedAt <= new Date().toISOString().slice(0, 10),
    "media policy approval date",
  );
  assert(
    typeof policy.userDecision === "string" &&
      policy.userDecision.trim().length > 0,
    "media policy user decision",
  );
  assert(
    policy.allowOriginalGameArtwork === true &&
      policy.deferGameplayScreenshots === true,
    "media policy explicit artwork approval",
  );
  assert(
    Array.isArray(policy.gameIds) &&
      policy.gameIds.length > 0 &&
      new Set(policy.gameIds).size === policy.gameIds.length &&
      policy.gameIds.every(
        (id) => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id),
      ),
    "media policy game scope",
  );
  return policy.gameIds.includes(gameId);
}

export function realGameMediaAllowed(gameId, policy = null) {
  if (policy?.mode !== "real-game-images") return false;
  assert(
    policy.allowOriginalGameArtwork === false &&
      policy.deferGameplayScreenshots === true &&
      policy.minimumBodyImages === 3 &&
      typeof policy.userDecision === "string" &&
      policy.userDecision.trim().length > 0 &&
      Array.isArray(policy.gameIds) &&
      new Set(policy.gameIds).size === policy.gameIds.length &&
      Array.isArray(policy.reviewedAssets) &&
      policy.reviewedAssets.length > 0,
    "real game media policy",
  );
  return policy.gameIds.includes(gameId);
}

export function validateGameImageCount(gameId, images, policy = null) {
  const original = originalArtworkAllowed(gameId, policy);
  const real = realGameMediaAllowed(gameId, policy);
  const deferral = real
    ? policy.deferredBodyImages?.find(
        (entry) =>
          entry.gameId === gameId &&
          entry.minimumBodyImages === 2 &&
          entry.priorApproval ===
            "research/real-media-20261119/before.json#/policy" &&
          typeof entry.reason === "string" &&
          entry.reason.length > 0,
      )
    : null;
  const minimum = original ? 1 : deferral ? 2 : 3;
  assert(
    images.length >= minimum,
    gameId +
      (original
        ? " needs an independent body diagram"
        : " needs 3 screenshots"),
  );
  assert(
    new Set(images.map((image) => image.src)).size >= minimum,
    gameId + " distinct body images",
  );
}

export function validateMediaEvidence(
  gameId,
  images,
  videos,
  ledger,
  analyses,
  policy = null,
) {
  const original = originalArtworkAllowed(gameId, policy);
  const real = realGameMediaAllowed(gameId, policy);
  let originalDiagrams = 0;
  assert(
    Array.isArray(ledger) && Array.isArray(analyses),
    "media evidence arrays",
  );
  for (const [index, image] of images.entries()) {
    const matches = ledger.filter(
      (entry) =>
        entry.status === "adopted" &&
        entry.subjectGameId === gameId &&
        entry.localPath === image.src,
    );
    assert(
      matches.length === 1,
      gameId + " adopted image ledger identity: " + image.src,
    );
    const entry = matches[0];
    const reviewed = real
      ? policy.reviewedAssets.find(
          (asset) =>
            asset.subjectGameId === gameId &&
            asset.localPath === image.src &&
            asset.sha256 === image.sha256 &&
            asset.sourcePage === entry.sourcePage &&
            asset.sourceUrl === entry.originalLocation &&
            asset.identityReviewed === true &&
            asset.rightsStatus === entry.rightsStatus &&
            asset.kind === entry.kind,
        )
      : null;
    assert(
      (entry.rightsStatus === "approved" ||
        (reviewed && entry.rightsStatus === "editorial-use-reviewed")) &&
        typeof entry.rightsBasis === "string" &&
        entry.rightsBasis.trim(),
      gameId + " image rights approval",
    );
    assert(
      (original && entry.kind === "site-design") ||
        (index === 0
          ? ["image", "game-capture"].includes(entry.kind)
          : entry.kind === "game-capture" ||
            (reviewed && entry.kind === "game-artwork")),
      gameId + " screenshot evidence kind",
    );
    if (real) {
      assert(reviewed, gameId + " exact real media review");
      assert(
        entry.identityReviewed === true &&
          ["author-published-media", "direct-browser-capture"].includes(
            entry.captureMethod,
          ) &&
          new URL(entry.sourcePage).hostname.endsWith(".itch.io") &&
          entry.kind !== "site-design",
        gameId + " real game media provenance",
      );
      if (entry.rightsStatus === "editorial-use-reviewed")
        assert(
          entry.explicitRedistributionPermission === false &&
            typeof entry.residualRightsRisk === "string" &&
            entry.residualRightsRisk.length > 0,
          gameId + " unresolved rights must remain explicit",
        );
    }
    if (entry.kind === "site-design") {
      assert(
        original && entry.captureMethod === "generated-original",
        gameId + " original artwork provenance",
      );
      if (index > 0) originalDiagrams++;
    }
    assert(
      /^[a-f0-9]{64}$/.test(entry.sha256) && entry.sha256 === image.sha256,
      gameId + " image ledger hash",
    );
    assert(
      entry.width === image.width && entry.height === image.height,
      gameId + " ledger dimensions",
    );
    assert(
      typeof entry.slotId === "string" &&
        entry.slotId &&
        typeof entry.semanticPurpose === "string" &&
        entry.semanticPurpose.trim(),
      gameId + " image purpose",
    );
  }
  if (original)
    assert(
      originalDiagrams >= 1,
      gameId +
        " needs an adopted original body diagram; screenshots remain deferred",
    );
  for (const video of videos) {
    const matches = ledger.filter(
      (entry) =>
        entry.status === "adopted" &&
        entry.kind === "video-embed" &&
        entry.subjectGameId === gameId &&
        entry.videoId === video.videoId,
    );
    assert(matches.length === 1, gameId + " adopted video ledger identity");
    const entry = matches[0];
    assert(
      entry.rightsStatus === "approved" &&
        entry.embedStatus === "verified" &&
        entry.ageRestrictionStatus === "clear",
      gameId + " video embed approval",
    );
    const matchingAnalyses = analyses.filter(
      (item) =>
        (item.analysis_id ?? item.id) === entry.videoAnalysisId &&
        (item.gameId ?? item.game_id) === gameId &&
        (item.videoId ?? item.video_id) === video.videoId,
    );
    assert(matchingAnalyses.length === 1, gameId + " video analysis identity");
    const ranges =
      matchingAnalyses[0].segments ?? matchingAnalyses[0].reviewed_ranges ?? [];
    const rangeIds = new Set(ranges.map((range) => range.range_id ?? range.id));
    assert(
      Array.isArray(entry.reviewedRangeIds) &&
        entry.reviewedRangeIds.length > 0 &&
        new Set(entry.reviewedRangeIds).size ===
          entry.reviewedRangeIds.length &&
        entry.reviewedRangeIds.every(
          (id) => typeof id === "string" && rangeIds.has(id),
        ),
      gameId + " reviewed video ranges",
    );
  }
}

export async function validate(mode = "dev") {
  assert(["dev", "media", "publish"].includes(mode), "validation mode");
  const { main, games, guides } = loadRecords();
  assert(Array.isArray(games), "games array");
  const all = [main, ...games];
  const published = all.filter((g) => g.status === "published");
  const mediaPolicy = fs.existsSync("planning/media-policy.json")
    ? read("planning/media-policy.json")
    : null;
  if (mediaPolicy !== null) {
    originalArtworkAllowed(main.id, mediaPolicy);
    assert(
      mediaPolicy.gameIds.every((id) => all.some((g) => g.id === id)),
      "media policy unknown game",
    );
  }
  const mediaRequired = (g) =>
    mode === "media" || (mode === "publish" && g.status === "published");
  const warnings = [];
  let ledger = [],
    analyses = [];
  if (mode !== "dev") {
    assert(fs.existsSync("research/media-ledger.json"), "media ledger missing");
    ledger = read("research/media-ledger.json");
    assert(Array.isArray(ledger), "media ledger array");
    const editorialGames = new Set(
      ledger
        .filter(
          (entry) =>
            entry.status === "adopted" &&
            entry.rightsStatus === "editorial-use-reviewed",
        )
        .map((entry) => entry.subjectGameId),
    );
    if (editorialGames.size)
      warnings.push(
        `${editorialGames.size} games use identity-verified primary imagery under editorial review; explicit republication permission remains unestablished.`,
      );
    assert(
      fs.existsSync("research/video-analysis.json"),
      "video analysis missing",
    );
    analyses = read("research/video-analysis.json");
    assert(Array.isArray(analyses), "video analysis array");
  }
  const ids = new Set(),
    slugs = new Set();
  const allowedGame = [
    "id",
    "slug",
    "title",
    "shortDescription",
    "status",
    "publishedAt",
    "updatedAt",
    "tags",
    "categories",
    "spoilerPolicy",
    "flags",
    "image",
    "player",
    "seo",
    "content",
    "relatedGameIds",
  ];
  const allowedGuide = [
    "id",
    "slug",
    "status",
    "title",
    "summary",
    "tags",
    "authorId",
    "spoilerPolicy",
    "publishedAt",
    "updatedAt",
    "cover",
    "seo",
    "sections",
    "relatedGuideIds",
    "__file",
  ];
  const inspectBlocks = (sections, kind) => {
    assert(Array.isArray(sections), "sections array");
    assert(
      new Set(sections.map((s) => s.id)).size === sections.length,
      "section IDs unique",
    );
    for (const s of sections) {
      fields(
        s,
        kind === "game"
          ? ["id", "heading", "blocks"]
          : ["id", "title", "blocks"],
        "section",
      );
      assert(Array.isArray(s.blocks), "blocks");
      for (const b of s.blocks) {
        const maps = {
          paragraph: ["type", "text"],
          image: ["type", "src", "alt", "width", "height"],
          video: ["type", "provider", "videoId", "title", "description"],
          list: ["type", "style", "items"],
          steps: ["type", "items"],
          callout: ["type", "tone", "body"],
          table: ["type", "columns", "rows"],
          faq: ["type", "items"],
        };
        assert(b.type in maps, "unknown block " + b.type);
        const allowed = [
          ...maps[b.type],
          ...(b.type === "image"
            ? ["caption"]
            : b.type === "video"
              ? ["poster"]
              : b.type === "callout"
                ? ["label"]
                : []),
        ];
        assert(
          Object.keys(b).every((k) => allowed.includes(k)),
          "unknown block field",
        );
        assert(
          maps[b.type].every((k) => k in b),
          "missing block field",
        );
        if (b.type === "paragraph")
          assert(
            typeof b.text === "string" &&
              textLength(b.text) >= 20 &&
              textLength(b.text) <= 4000,
            "paragraph size",
          );
        if (b.type === "video")
          assert(
            b.provider === "youtube" && /^[\w-]{11}$/.test(b.videoId),
            "video ID",
          );
        if (b.type === "table")
          assert(
            b.rows.every((r) => r.length === b.columns.length),
            "table columns",
          );
        if (b.type === "faq")
          assert(kind === "game" && b.items.length > 0, "game FAQ only");
        if (b.type === "list")
          assert(
            ["ordered", "unordered"].includes(b.style) && b.items.length > 0,
            "list",
          );
        if (b.type === "steps") assert(b.items.length >= 2, "ordered steps");
        if (b.type === "callout")
          assert(["info", "tip", "warning"].includes(b.tone), "callout tone");
      }
    }
  };
  const picture = async (img, label, required = mode !== "dev") => {
    assert(
      typeof img.src === "string" && typeof img.alt === "string",
      "image fields",
    );
    if (!img.src) {
      assert(!required, label + " missing image");
      warnings.push(label + " media pending");
      return;
    }
    assert(
      /^\/images\/.+\.(png|jpe?g|webp|avif|gif|svg)$/.test(img.src),
      "local image path",
    );
    if (!required) return;
    const p = path.resolve("public", "." + img.src);
    assert(
      p.startsWith(path.resolve("public") + path.sep) && fs.existsSync(p),
      label + " image file",
    );
    const meta = await sharp(p).metadata();
    assert(
      meta.width === img.width && meta.height === img.height,
      label + " image dimensions",
    );
    assert(img.alt.length >= 8, label + " image alt");
  };
  const seo = (s, label, required = mode === "publish") => {
    assert(
      s && typeof s.title === "string" && typeof s.description === "string",
      label + " SEO shape",
    );
    if (required || s.title) {
      assert(
        textLength(s.title) >= 40 && textLength(s.title) <= 60,
        label + " title length " + textLength(s.title),
      );
      assert(
        textLength(s.description) >= 140 && textLength(s.description) <= 160,
        label + " description length " + textLength(s.description),
      );
    }
  };
  const dates = validateDates;
  for (const g of all) {
    fields(g, allowedGame, "Game");
    assert(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id) && !ids.has(g.id),
      "game ID",
    );
    assert(!slugs.has(g.slug), "game slug");
    ids.add(g.id);
    slugs.add(g.slug);
    assert(["draft", "published"].includes(g.status), "game status");
    assert(
      ["none", "marked", "full"].includes(g.spoilerPolicy),
      "spoiler policy",
    );
    fields(
      g.flags,
      ["isNewHome", "isFeaturedHome", "isRecommendedHome"],
      "flags",
    );
    assert(
      Object.values(g.flags).every((v) => typeof v === "boolean"),
      "flag booleans",
    );
    fields(g.image, ["src", "alt", "width", "height"], "game image");
    fields(
      g.player,
      [
        "iframeSrc",
        "aspectRatio",
        "orientation",
        "permissionsPolicy",
        "referrerPolicy",
        "sandbox",
        "loadTimeoutMs",
      ],
      "player",
    );
    validatePlayer(g.player, {
      isMain: g.id === main.id,
      draft: g.status === "draft",
    });
    dates(g);
    seo(g.seo, g.id, mode === "publish" && g.status === "published");
    inspectBlocks(g.content, "game");
    await picture(g.image, g.id, mediaRequired(g));
    assert(
      new Set(g.relatedGameIds).size === g.relatedGameIds.length &&
        g.relatedGameIds.length <= 6,
      "related IDs",
    );
    assert(
      g.relatedGameIds.every(
        (id) => id !== g.id && games.some((x) => x.id === id),
      ),
      "related target",
    );
    if (mediaRequired(g)) {
      const imgs = g.content.flatMap((s) =>
        s.blocks.filter((b) => b.type === "image"),
      );
      const vids = g.content.flatMap((s) =>
        s.blocks.filter((b) => b.type === "video"),
      );
      validateGameImageCount(g.id, imgs, mediaPolicy);
      assert(!imgs.some((x) => x.src === g.image.src), "cover not screenshot");
      for (const img of imgs) await picture(img, g.id + " screenshot", true);
      const imageAssets = [g.image, ...imgs].map((img) => ({
        ...img,
        sha256: crypto
          .createHash("sha256")
          .update(fs.readFileSync("public" + img.src))
          .digest("hex"),
      }));
      assert(
        new Set(imageAssets.map((img) => img.sha256)).size ===
          imageAssets.length,
        g.id + " unique screenshot and cover hashes",
      );
      validateMediaEvidence(
        g.id,
        imageAssets,
        vids,
        ledger,
        analyses,
        mediaPolicy,
      );
      assert(vids.length >= 1 && vids.length <= 3, g.id + " video count");
    }
    if (mode === "publish" && g.status === "published") {
      assert(
        [...bodyText(g.content).replace(/\s/gu, "")].length >= 4000,
        g.id + " independent body below4000",
      );
      assert(
        textLength(g.shortDescription) >= 40 &&
          textLength(g.shortDescription) <= 240,
        "short description",
      );
      assert(
        g.seo.title.toLowerCase().includes(g.title.toLowerCase()),
        "game title in SEO",
      );
      assert(
        !/(according to|sourced from|adapted from|resource library)/i.test(
          bodyText(g.content),
        ),
        "public source wording",
      );
    }
  }
  assert(
    !games.some((g) => g.id === main.id || g.slug === main.slug),
    "duplicate main detail",
  );
  assert(
    main.relatedGameIds.length === 0 &&
      Object.values(main.flags).every((x) => !x),
    "main flags/relations",
  );
  if (mode === "publish") {
    assert(
      games.filter((g) => g.status === "published").length >= 8,
      "eight published games",
    );
    for (const key of ["isFeaturedHome", "isNewHome", "isRecommendedHome"]) {
      const n = games.filter(
        (g) => g.status === "published" && g.flags[key],
      ).length;
      assert(
        key === "isRecommendedHome" ? n === 6 : n >= 6 && n <= 8,
        "homepage " + key,
      );
    }
    assert(main.status === "published", "main game must be published");
    const hashes = published.map((g) =>
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("public" + g.image.src))
        .digest("hex"),
    );
    assert(new Set(hashes).size === hashes.length, "unique cover hashes");
  }
  for (const g of guides) {
    fields(g, allowedGuide, "Guide");
    assert(g.__file === g.slug + ".json", "Guide filename");
    assert(!ids.has(g.id), "guide ID uniqueness");
    ids.add(g.id);
    assert(["draft", "published"].includes(g.status), "guide status");
    assert(g.authorId === null, "unverified author");
    dates(g);
    seo(g.seo, g.id, mode === "publish" && g.status === "published");
    inspectBlocks(g.sections, "guide");
    await picture(g.cover, g.id, mediaRequired(g));
    assert(
      g.relatedGuideIds.every(
        (id) => id !== g.id && guides.some((x) => x.id === id),
      ),
      "Guide related",
    );
    if (mode === "publish" && g.status === "published") {
      assert(g.sections.length >= 2, "Guide sections");
      assert(g.summary.length >= 40 && g.tags.length >= 1, "Guide substance");
    }
  }
  if (mode === "publish") {
    assert(
      guides.filter((g) => g.status === "published").length >= 2,
      "two published Guides",
    );
    const { tdk } = await import("../seo/tdk.js?validate=" + Date.now());
    for (const [key, value] of Object.entries(tdk)) seo(value, key);
    assert(
      fs.existsSync("public/images/logo.png") &&
        fs.existsSync("public/images/og-image.png"),
      "brand media",
    );
  }
  return { mode, games: all.length, guides: guides.length, warnings };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      JSON.stringify(await validate(process.argv[2] || "dev"), null, 2),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
