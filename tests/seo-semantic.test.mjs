import test from "node:test";
import assert from "node:assert/strict";
import { semanticContent } from "../scripts/seo-semantic.mjs";
test("styles, hydration, verification and copyright year do not change content", () => {
  const a =
    '<html><head><meta name="msvalidate.01" content="old"><style>body{color:red}</style></head><body><p class="red">Hello</p><footer>© 2026 Site</footer><script>build=1</script></body></html>';
  const b = a
    .replace("old", "new")
    .replace("color:red", "color:blue")
    .replace('class="red"', 'class="blue"')
    .replace("2026", "2027")
    .replace("build=1", "build=2");
  assert.deepEqual(semanticContent(a), semanticContent(b));
});
test("copy, important links, metadata and image bytes affect fingerprints", () => {
  const html =
    '<title>Game</title><h1>Game</h1><a href="/guides">Guide</a><img src="/images/game.jpg" alt="Game">';
  for (const changed of [
    html.replace("<h1>Game", "<h1>New Game"),
    html.replace("/guides", "/games"),
    html.replace("<title>Game", "<title>New"),
  ])
    assert.notDeepEqual(semanticContent(html), semanticContent(changed));
  assert.notDeepEqual(
    semanticContent(html, () => "v1"),
    semanticContent(html, () => "v2"),
  );
});
