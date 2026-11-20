import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeState, contentState } from "../scripts/content-state.mjs";
import { homepageGroups, gameGroups } from "../lib/game-groups.mjs";
const project = process.cwd(),
  reports = path.join(project, "reports");
const results = [];
const now = new Date("2026-11-19T12:00:00Z"),
  later = new Date("2026-11-20T12:00:00Z");
const read = (root, name) =>
  JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const write = (root, name, value) => {
  const p = path.join(root, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
};
function fixture() {
  fs.mkdirSync(reports, { recursive: true });
  const root = fs.mkdtempSync(path.join(reports, ".fingerprint-"));
  for (const name of [
    "data",
    "seo",
    "public/images",
    "style",
    "components/layout",
    "config/navigation.ts",
    "page/legal",
    "page/games",
    "page/guides",
    "project.yaml",
    "planning/route-registry.json",
  ]) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(path.join(project, name), target, { recursive: true });
  }
  fs.rmSync(path.join(root, "seo/page-lastmod.json"), { force: true });
  const publish = (record) => ({
    ...record,
    status: "published",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
  });
  write(
    root,
    "data/games/main-game.json",
    publish(read(root, "data/games/main-game.json")),
  );
  write(
    root,
    "data/games/games.json",
    read(root, "data/games/games.json").map(publish),
  );
  for (const name of fs.readdirSync(path.join(root, "data/guides")))
    write(
      root,
      "data/guides/" + name,
      publish(read(root, "data/guides/" + name)),
    );
  contentState("update", { root, now });
  return root;
}
function isolated(name, run) {
  test(name, () => {
    const root = fixture();
    try {
      run(root);
      results.push({
        name,
        result: "passed",
        isolation: "project/reports/.fingerprint-*",
        cleaned: true,
      });
    } catch (error) {
      results.push({ name, result: "failed", error: error.message });
      throw error;
    } finally {
      const resolved = path.resolve(root),
        allowed = path.resolve(reports) + path.sep;
      assert.ok(
        resolved.startsWith(allowed) &&
          path.basename(resolved).startsWith(".fingerprint-"),
      );
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  });
}
function commit(root, expected) {
  assert.throws(
    () => contentState("check", { root, now: later }),
    /Stale page fingerprints/,
  );
  const before = read(root, "seo/page-lastmod.json");
  const beforeRecords = computeState({ root });
  const result = contentState("update", { root, now: later });
  assert.deepEqual([...result.changed].sort(), [...expected].sort());
  assert.equal(contentState("check", { root, now: later }).stable, true);
  const after = read(root, "seo/page-lastmod.json");
  const afterRecords = computeState({ root });
  for (const item of [
    beforeRecords.main,
    ...beforeRecords.games,
    ...beforeRecords.guides,
  ]) {
    const route =
      item.id === beforeRecords.main.id
        ? "/"
        : item.__file
          ? "/guides/" + item.slug
          : "/games/" + item.slug;
    const current = [
      afterRecords.main,
      ...afterRecords.games,
      ...afterRecords.guides,
    ].find((record) => record.id === item.id);
    assert.equal(
      current.publishedAt,
      item.publishedAt,
      "publication date preserved: " + route,
    );
    if (!expected.includes(route))
      assert.equal(
        current.updatedAt,
        item.updatedAt,
        "unaffected record date: " + route,
      );
  }
  for (const state of Object.values(after.pages))
    if (state.kind !== "static")
      assert.ok(
        !("lastModified" in state),
        "game/guide dates belong only to their JSON",
      );
  for (const route of Object.keys(before.pages))
    if (!expected.includes(route) && after.pages[route])
      assert.deepEqual(
        after.pages[route],
        before.pages[route],
        "unchanged state: " + route,
      );
  assert.deepEqual(contentState("update", { root, now: later }).changed, []);
}

isolated(
  "ordinary TDK and Legal text changes affect only their own URL",
  (root) => {
    const file = path.join(root, "seo/tdk.js");
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, "utf8")
        .replace(
          "Privacy Policy and Embedded Players",
          "Privacy Choices and Embedded Players",
        ),
    );
    commit(root, ["/privacy"]);
    const legal = read(root, "data/legal-pages.json");
    legal.terms.sections[0].text += " Keep a copy for your own reading.";
    write(root, "data/legal-pages.json", legal);
    commit(root, ["/terms"]);
  },
);
isolated(
  "game body and compact-card description changes have precise page impact",
  (root) => {
    const games = read(root, "data/games/games.json"),
      game = games[0];
    game.content[0].blocks.find((block) => block.type === "paragraph").text +=
      " Read the current prompt before choosing.";
    write(root, "data/games/games.json", games);
    commit(root, ["/games/" + game.slug]);
    game.shortDescription += " Choose carefully.";
    write(root, "data/games/games.json", games);
    commit(root, ["/games/" + game.slug, "/games"]);
  },
);
isolated(
  "Guide visible related-link changes update dependents but unrelated summaries do not",
  (root) => {
    const guides = computeState({ root }).guides,
      target = guides[0];
    const expected = [
      "/guides",
      "/guides/" + target.slug,
      ...guides
        .filter((guide) => guide.relatedGuideIds.includes(target.id))
        .map((guide) => "/guides/" + guide.slug),
    ];
    target.title += ": careful choices";
    const { __file, ...record } = target;
    write(root, "data/guides/" + __file, record);
    commit(root, [...new Set(expected)]);
    record.summary += " Take the next step deliberately.";
    write(root, "data/guides/" + __file, record);
    commit(root, ["/guides", "/guides/" + target.slug]);
  },
);
isolated(
  "body image bytes and Guide cover bytes are included without unrelated-page churn",
  (root) => {
    const games = read(root, "data/games/games.json"),
      game = games[0];
    const local = "/images/test-exclusive-body.png";
    write(root, "public" + local, { bytes: "initial fixture" });
    game.content[0].blocks.push({
      type: "image",
      src: local,
      alt: "Independent test image",
      width: 1,
      height: 1,
    });
    write(root, "data/games/games.json", games);
    commit(root, ["/games/" + game.slug]);
    fs.appendFileSync(path.join(root, "public" + local), "changed bytes");
    commit(root, ["/games/" + game.slug]);
    const guide = computeState({ root }).guides[0],
      cover = guide.cover.src;
    assert.ok(cover);
    fs.appendFileSync(
      path.join(root, "public" + cover),
      "fixture bytes change",
    );
    commit(root, ["/guides", "/guides/" + guide.slug]);
  },
);
isolated(
  "homepage flags fingerprint actual groups while card ordering follows the common selector",
  (root) => {
    const initial = computeState({ root }),
      games = read(root, "data/games/games.json"),
      main = initial.main;
    const target = games.find((game) => !game.flags.isFeaturedHome);
    assert.ok(target);
    target.flags.isFeaturedHome = true;
    const beforeGroups = new Map(
      [main, ...initial.games].map((game) => [
        game.id,
        JSON.stringify(gameGroups(initial.games, game, main.id)),
      ]),
    );
    write(root, "data/games/games.json", games);
    const expected = [main, ...games]
      .filter((game) => {
        const compact = (groups) =>
          Object.fromEntries(
            Object.entries(groups).map(([key, records]) => [
              key,
              records.map((g) => g.id),
            ]),
          );
        return (
          JSON.stringify(compact(JSON.parse(beforeGroups.get(game.id)))) !==
          JSON.stringify(compact(gameGroups(games, game, main.id)))
        );
      })
      .map((game) => (game.id === main.id ? "/" : "/games/" + game.slug));
    assert.ok(
      !expected.includes("/"),
      "detail Featured flags do not change the deduplicated homepage",
    );
    commit(root, expected);
  },
);
isolated(
  "list reorder and published Guide removal update only visible collection and relationships",
  (root) => {
    const games = read(root, "data/games/games.json");
    games.reverse();
    write(root, "data/games/games.json", games);
    // Detail groups use stable IDs; homepage marked groups intentionally retain record order.
    commit(root, ["/games", "/"]);
    const guides = computeState({ root }).guides,
      target = guides[0],
      expected = [
        "/guides",
        ...guides
          .filter((guide) => guide.relatedGuideIds.includes(target.id))
          .map((guide) => "/guides/" + guide.slug),
      ];
    const { __file, ...record } = target;
    record.status = "draft";
    record.publishedAt = null;
    record.updatedAt = null;
    write(root, "data/guides/" + __file, record);
    assert.throws(() => contentState("check", { root }), /removed/);
    const result = contentState("update", { root, now: later });
    assert.deepEqual(result.changed.sort(), expected.sort());
    assert.deepEqual(result.removed, ["/guides/" + target.slug]);
    assert.equal(contentState("check", { root }).stable, true);
  },
);
isolated(
  "calendar passage keeps New membership, fingerprints and all dates unchanged",
  (root) => {
    const before = fs.readFileSync(
      path.join(root, "seo/page-lastmod.json"),
      "utf8",
    );
    const dataBefore = fs.readFileSync(
      path.join(root, "data/games/games.json"),
      "utf8",
    );
    assert.equal(
      contentState("check", { root, now: new Date("2027-01-19T12:00:00Z") })
        .stable,
      true,
    );
    assert.deepEqual(
      contentState("update", { root, now: new Date("2027-01-19T12:00:00Z") })
        .changed,
      [],
    );
    assert.equal(
      fs.readFileSync(path.join(root, "seo/page-lastmod.json"), "utf8"),
      before,
    );
    assert.equal(
      fs.readFileSync(path.join(root, "data/games/games.json"), "utf8"),
      dataBefore,
    );
  },
);
test("New is sorted by site publication date then ID; groups exclude current and minimize avoidable overlap", () => {
  const records = Array.from({ length: 20 }, (_, i) => ({
    id: "game-" + String(i).padStart(2, "0"),
    status: "published",
    publishedAt: i % 2 ? "2026-11-18" : "2026-11-19",
    flags: {
      isNewHome: i < 6,
      isFeaturedHome: i < 6,
      isRecommendedHome: i < 6,
    },
    relatedGameIds: [],
  }));
  const home = homepageGroups([...records].reverse());
  assert.deepEqual(
    home.fresh.map((g) => g.id),
    [],
  );
  assert.equal(home.featured.length, 2);
  assert.equal(
    new Set([...home.recommended, ...home.featured].map((g) => g.id)).size,
    8,
  );
  const groups = gameGroups(records, records[19], "home");
  const used = Object.values(groups)
    .flat()
    .map((g) => g.id);
  assert.equal(new Set(used).size, 18);
  assert.ok(!used.includes(records[19].id));
  for (const group of Object.values(groups))
    assert.equal(new Set(group.map((g) => g.id)).size, 6);
  assert.throws(() => homepageGroups(records.slice(1)), /membership/);
  results.push({
    name: "pure selector ordering and distinctness",
    result: "passed",
  });
});
isolated(
  "New and Recommended flags change only actual rendered membership; invalid exact counts fail",
  (root) => {
    const expectedFor = (before, games) => {
      const main = before.main;
      const ids = (groups) =>
        Object.fromEntries(
          Object.entries(groups).map(([key, records]) => [
            key,
            records.map((game) => game.id),
          ]),
        );
      return [main, ...games]
        .filter(
          (game) =>
            JSON.stringify(
              ids(
                gameGroups(
                  before.games,
                  before.games.find((item) => item.id === game.id) ?? main,
                  main.id,
                ),
              ),
            ) !== JSON.stringify(ids(gameGroups(games, game, main.id))),
        )
        .map((game) => (game.id === main.id ? "/" : "/games/" + game.slug));
    };
    let before = computeState({ root });
    let games = read(root, "data/games/games.json");
    games.find((game) => !game.flags.isNewHome).flags.isNewHome = true;
    write(root, "data/games/games.json", games);
    assert.deepEqual(expectedFor(before, games), []);
    assert.equal(contentState("check", { root, now: later }).stable, true);
    before = computeState({ root });
    games = read(root, "data/games/games.json");
    const added = games.find((game) => !game.flags.isRecommendedHome),
      removed = games.find((game) => game.flags.isRecommendedHome);
    added.flags.isRecommendedHome = true;
    write(root, "data/games/games.json", games);
    assert.throws(() => computeState({ root }), /membership/);
    removed.flags.isRecommendedHome = false;
    write(root, "data/games/games.json", games);
    commit(root, expectedFor(before, games));
  },
);
isolated(
  "Guide body image bytes affect its article independently of its list cover",
  (root) => {
    const guide = computeState({ root }).guides[0],
      local = "/images/guide-test-exclusive.png";
    write(root, "public" + local, { bytes: "initial" });
    guide.sections[0].blocks.push({
      type: "image",
      src: local,
      alt: "Guide decision diagram",
      width: 1,
      height: 1,
    });
    const { __file, ...record } = guide;
    write(root, "data/guides/" + __file, record);
    commit(root, ["/guides/" + guide.slug]);
    fs.appendFileSync(path.join(root, "public" + local), "new bytes");
    commit(root, ["/guides/" + guide.slug]);
  },
);
after(() => {
  fs.writeFileSync(
    path.join(reports, "content-state-tests.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        suite: "stage09 isolated fingerprint and recommendation verification",
        tests: results.length,
        passed: results.filter((item) => item.result === "passed").length,
        cases: results,
        remainingFixtures: fs
          .readdirSync(reports)
          .filter((name) => name.startsWith(".fingerprint-")),
      },
      null,
      2,
    ) + "\n",
  );
});

isolated(
  "presentation-only edits preserve every content date and fingerprint",
  (root) => {
    contentState("check", { root, now });
    for (const name of [
      "style/globals.css",
      "components/layout/SiteFooter.tsx",
      "page/legal/LegalPage.tsx",
    ]) {
      fs.appendFileSync(
        path.join(root, name),
        "\n/* formatting-only regression fixture */\n",
      );
    }
    const after = contentState("check", { root, now: later });
    assert.deepEqual(after.changed, []);
    assert.deepEqual(after.removed, []);
  },
);
