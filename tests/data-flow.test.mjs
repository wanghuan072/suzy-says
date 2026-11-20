import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
test("main remains a unique home identity and preserves configured initial player", () => {
  const main = read("data/games/main-game.json");
  const extra = read("data/games/games.json");
  assert.equal(main.slug, "suzy-says");
  assert.ok(main.player.iframeSrc.length);
  assert.ok(!extra.some((g) => g.id === main.id || g.slug === main.slug));
});
test("homepage groups have intentional exact membership and peer relations resolve", () => {
  const all = read("data/games/games.json");
  for (const field of ["isFeaturedHome", "isNewHome"])
    assert.ok(
      all.filter((g) => g.flags[field]).length >= 6 &&
        all.filter((g) => g.flags[field]).length <= 8,
    );
  assert.equal(all.filter((g) => g.flags.isRecommendedHome).length, 6);
  for (const game of all) {
    assert.equal(new Set(game.relatedGameIds).size, game.relatedGameIds.length);
    assert.ok(
      game.relatedGameIds.every(
        (id) => id !== game.id && all.some((g) => g.id === id),
      ),
    );
  }
});
test("planned routes contain one home, root Legal and no duplicate canonical", () => {
  const routes = read("planning/route-registry.json");
  assert.equal(new Set(routes.map((r) => r.path)).size, routes.length);
  assert.equal(routes.filter((r) => r.path === "/").length, 1);
  assert.ok(
    !routes.some(
      (r) => r.path === "/games/suzy-says" || r.path.startsWith("/legal/"),
    ),
  );
  for (const path of ["/privacy", "/terms", "/copyright", "/about", "/contact"])
    assert.ok(routes.some((r) => r.path === path));
});
test("Guide slugs map one-to-one and lack invented bylines", () => {
  for (const name of fs.readdirSync("data/guides")) {
    const g = read("data/guides/" + name);
    assert.equal(name, g.slug + ".json");
    assert.equal(g.authorId, null);
  }
});
