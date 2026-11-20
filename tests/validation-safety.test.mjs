import test from "node:test";
import assert from "node:assert/strict";
import {
  bodyText,
  safeAdditionalUrl,
  validateDates,
  validatePlayer,
  validateMediaEvidence,
} from "../scripts/validate.mjs";

test("body threshold cannot be inflated by headings or captions of media-only sections", () => {
  const media = {
    heading: "x".repeat(5000),
    blocks: [
      { type: "image", caption: "padding" },
      { type: "video", description: "padding" },
    ],
  };
  assert.equal(bodyText([media]), "");
  assert.equal(
    bodyText([
      {
        heading: "Read",
        blocks: [
          { type: "paragraph", text: "Actual player instructions" },
          { type: "image", caption: "padding" },
        ],
      },
    ]),
    "Read Actual player instructions",
  );
});

test("additional URL policy rejects parser-normalized IPs and local naming tricks", () => {
  for (const value of [
    "https://127.1/game",
    "https://2130706433/",
    "https://0x7f000001/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://10.0.0.1/",
    "https://user:secret@games.example.org/",
    "https://localhost./",
    "https://machine.internal/",
    "https://127-0-0-1.sslip.io/",
    "https://localtest.me/",
    "https://a.invalid/",
    "javascript:alert(1)",
    "https://example.org\\@localhost/",
  ])
    assert.equal(safeAdditionalUrl(value), false, value);
  assert.equal(
    safeAdditionalUrl(
      "https://html-classic.itch.zone/html/123/game/index.html",
    ),
    true,
  );
});

const player = () => ({
  iframeSrc: "https://games.example.org/game/",
  aspectRatio: "16 / 10",
  orientation: "adaptive",
  permissionsPolicy: ["fullscreen"],
  referrerPolicy: "no-referrer",
  sandbox: ["allow-scripts", "allow-same-origin"],
  loadTimeoutMs: 30000,
});
test("player settings reject privilege escalation and malformed geometry", () => {
  validatePlayer(player());
  for (const patch of [
    { sandbox: ["allow-scripts", "allow-popups"] },
    { sandbox: ["allow-top-navigation"] },
    { permissionsPolicy: ["camera"] },
    { permissionsPolicy: ["fullscreen", "fullscreen"] },
    { aspectRatio: "0 / 16" },
    { aspectRatio: "16 / Infinity" },
    { referrerPolicy: "arbitrary" },
    { loadTimeoutMs: 3000.5 },
  ])
    assert.throws(() => validatePlayer({ ...player(), ...patch }));
  assert.throws(() =>
    validatePlayer({ ...player(), iframeSrc: "javascript:alert(1)" }),
  );
  validatePlayer(
    { ...player(), iframeSrc: "javascript:alert(1)" },
    { isMain: true },
  );
});

test("dates advance with the validation clock while rejecting impossible and reversed dates", () => {
  const record = {
    status: "published",
    publishedAt: "2027-03-01",
    updatedAt: "2027-03-02",
  };
  validateDates(record, "2027-03-02");
  assert.throws(() => validateDates(record, "2027-03-01"), /future/);
  assert.throws(
    () => validateDates({ ...record, publishedAt: "2027-02-29" }, "2027-03-02"),
    /real date/,
  );
  assert.throws(
    () => validateDates({ ...record, updatedAt: "2027-02-28" }, "2027-03-02"),
    /order/,
  );
});

const image = {
  src: "/images/game/cover.png",
  width: 200,
  height: 100,
  sha256: "a".repeat(64),
};
const imageEntry = {
  status: "adopted",
  subjectGameId: "game",
  localPath: image.src,
  kind: "image",
  rightsStatus: "approved",
  rightsBasis: "Explicit project permission",
  sha256: image.sha256,
  width: 200,
  height: 100,
  slotId: "cover",
  semanticPurpose: "Identify current game",
};
const video = { videoId: "abcdefghijk" };
const videoEntry = {
  status: "adopted",
  subjectGameId: "game",
  kind: "video-embed",
  videoId: video.videoId,
  rightsStatus: "approved",
  embedStatus: "verified",
  ageRestrictionStatus: "clear",
  videoAnalysisId: "analysis-game",
  reviewedRangeIds: ["range-one"],
};
const analysis = {
  analysis_id: "analysis-game",
  gameId: "game",
  videoId: video.videoId,
  segments: [{ range_id: "range-one" }],
};
test("media evidence binds adopted bytes and reviewed ranges to the current game", () => {
  const check = (
    images = [imageEntry],
    videos = [videoEntry],
    analyses = [analysis],
  ) =>
    validateMediaEvidence(
      "game",
      [image],
      [video],
      [...images, ...videos],
      analyses,
    );
  check();
  assert.throws(() => check([], []), /adopted image/);
  for (const patch of [
    { subjectGameId: "other-game" },
    { status: "candidate" },
    { rightsStatus: "uncertain" },
    { sha256: "b".repeat(64) },
  ])
    assert.throws(() => check([{ ...imageEntry, ...patch }]));
  assert.throws(() => check([imageEntry, imageEntry]), /identity/);
  assert.throws(
    () =>
      check(
        [imageEntry],
        [{ ...videoEntry, reviewedRangeIds: ["unseen-range"] }],
      ),
    /ranges/,
  );
  assert.throws(
    () =>
      check(
        [imageEntry],
        [videoEntry],
        [{ ...analysis, gameId: "other-game" }],
      ),
    /identity/,
  );
  assert.throws(
    () => check([imageEntry], [{ ...videoEntry, embedStatus: "unknown" }]),
    /approval/,
  );
});

test("real media reviews bind exact source bytes and never invent a license", () => {
  const entry = {
    ...imageEntry,
    rightsStatus: "editorial-use-reviewed",
    rightsBasis: "Verified primary image; no explicit grant established",
    explicitRedistributionPermission: false,
    residualRightsRisk: "No explicit republication permission found",
    identityReviewed: true,
    sourcePage: "https://author.itch.io/game",
    originalLocation: "https://img.itch.zone/actual-image.png",
    captureMethod: "author-published-media",
  };
  const review = {
    subjectGameId: "game",
    localPath: image.src,
    sha256: image.sha256,
    sourcePage: entry.sourcePage,
    sourceUrl: entry.originalLocation,
    identityReviewed: true,
    rightsStatus: entry.rightsStatus,
    kind: "image",
  };
  const policy = {
    mode: "real-game-images",
    allowOriginalGameArtwork: false,
    deferGameplayScreenshots: true,
    minimumBodyImages: 3,
    userDecision: "Use real game images",
    gameIds: ["game"],
    reviewedAssets: [review],
  };
  const check = (nextEntry = entry, nextPolicy = policy) =>
    validateMediaEvidence(
      "game",
      [image],
      [video],
      [nextEntry, videoEntry],
      [analysis],
      nextPolicy,
    );
  check();
  assert.throws(() => check(entry, null), /rights approval/);
  assert.throws(
    () =>
      check({
        ...entry,
        originalLocation: "https://img.itch.zone/another.png",
      }),
    /rights approval/,
  );
  assert.throws(
    () => check({ ...entry, explicitRedistributionPermission: true }),
    /rights must remain explicit/,
  );
  assert.throws(
    () => check({ ...entry, captureMethod: "generated-original" }),
    /provenance/,
  );
  assert.throws(
    () => check(entry, { ...policy, gameIds: ["another-game"] }),
    /rights approval/,
  );
  assert.throws(
    () =>
      check(entry, {
        ...policy,
        reviewedAssets: [{ ...review, sha256: "b".repeat(64) }],
      }),
    /rights approval/,
  );
});

// The authorization changes image provenance only; embedding evidence stays mandatory.
test("original-art exception is explicit and cannot leak into another game's media", async () => {
  const { originalArtworkAllowed, validateGameImageCount } =
    await import("../scripts/validate.mjs");
  const policy = {
    approvedAt: "2026-11-18",
    userDecision:
      "Use original covers and diagrams now; defer gameplay screenshots",
    allowOriginalGameArtwork: true,
    deferGameplayScreenshots: true,
    gameIds: ["game"],
  };
  const diagram = {
    ...image,
    src: "/images/game/diagram.png",
    sha256: "b".repeat(64),
  };
  const coverLedger = {
    ...imageEntry,
    kind: "site-design",
    captureMethod: "generated-original",
  };
  const diagramLedger = {
    ...coverLedger,
    localPath: diagram.src,
    sha256: diagram.sha256,
    slotId: "first-action",
    semanticPurpose: "Explain the first decision",
  };
  assert.equal(originalArtworkAllowed("other-game", policy), false);
  assert.throws(
    () => originalArtworkAllowed("game", { ...policy, userDecision: "" }),
    /decision/,
  );
  assert.throws(
    () =>
      originalArtworkAllowed("game", {
        ...policy,
        deferGameplayScreenshots: false,
      }),
    /approval/,
  );
  assert.throws(
    () => validateGameImageCount("game", [diagram]),
    /3 screenshots/,
  );
  assert.throws(
    () => validateGameImageCount("other-game", [diagram], policy),
    /3 screenshots/,
  );
  assert.throws(() => validateGameImageCount("game", [], policy), /diagram/);
  validateGameImageCount("game", [diagram], policy);
  const check = (entries, currentPolicy = policy, analyses = [analysis]) =>
    validateMediaEvidence(
      "game",
      [image, diagram],
      [video],
      [...entries, videoEntry],
      analyses,
      currentPolicy,
    );
  check([coverLedger, diagramLedger]);
  assert.throws(
    () => check([coverLedger, diagramLedger], null),
    /evidence kind/,
  );
  assert.throws(
    () => check([coverLedger, { ...diagramLedger, kind: "game-capture" }]),
    /original body diagram/,
  );
  assert.throws(
    () =>
      check([
        coverLedger,
        { ...diagramLedger, captureMethod: "third-party-download" },
      ]),
    /provenance/,
  );
  assert.throws(
    () => check([coverLedger, { ...diagramLedger, rightsStatus: "uncertain" }]),
    /rights approval/,
  );
  assert.throws(
    () => check([coverLedger, diagramLedger], policy, []),
    /analysis identity/,
  );
});
