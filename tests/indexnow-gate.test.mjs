import test from "node:test";
import assert from "node:assert/strict";
import { release, publishedManifest } from "../scripts/indexnow-release.mjs";

test("waits for production alias propagation and fails rather than silently losing an event", async () => {
  let calls = 0;
  const result = await publishedManifest(
    { siteUrl: "https://suzysaysgame.site" },
    "new",
    {
      request: async () => ({
        ok: true,
        json: async () => ({
          deployment: { commit: ++calls === 1 ? "old" : "new" },
        }),
      }),
      pause: async () => {},
    },
  );
  assert.equal(result.deployment.commit, "new");
  await assert.rejects(
    publishedManifest({ siteUrl: "https://suzysaysgame.site" }, "new", {
      request: async () => ({
        ok: true,
        json: async () => ({ deployment: { commit: "old" } }),
      }),
      pause: async () => {},
    }),
    /alias has not reached/,
  );
});

test("unverified Bing gate makes zero requests and never confirms a receipt", async () => {
  const result = await release(
    { config: { bingVerified: false } },
    {
      fetch: () => {
        throw Error("network forbidden");
      },
    },
  );
  assert.equal(result.mode, "disabled");
  assert.equal(result.checkpoint, undefined);
});
test("verification for another origin cannot enable submissions", async () => {
  await assert.rejects(
    release({
      config: {
        bingVerified: true,
        siteUrl: "https://suzysaysgame.site",
        verification: { siteUrl: "https://example.com" },
      },
    }),
    /origin mismatch/,
  );
});
test("verified gate still rejects a preview or unrelated project", async () => {
  const config = {
    bingVerified: true,
    siteUrl: "https://suzysaysgame.site",
    verification: { siteUrl: "https://suzysaysgame.site" },
    projectId: "intended",
  };
  await assert.rejects(
    release({
      config,
      current: {
        siteUrl: config.siteUrl,
        deployment: { projectId: "other", environment: "production" },
      },
    }),
    /Wrong production/,
  );
});
