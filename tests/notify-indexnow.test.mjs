import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  notifyIndexNow,
  writeCheckpoint,
} from "../scripts/notify-indexnow.mjs";

const siteUrl = "https://example.com",
  key = "0123456789abcdef",
  manifestUrl = siteUrl + "/seo-manifest.json";
const current = {
  schemaVersion: 1,
  fingerprintVersion: "v1",
  siteUrl,
  generatedAt: "2026-10-19T00:00:00.000Z",
  entries: [
    {
      path: "/",
      canonicalUrl: siteUrl + "/",
      indexable: true,
      contentFingerprint: "a",
      lastModified: "2026-10-01T00:00:00.000Z",
    },
  ],
};
const options = {
  current,
  checkpoint: null,
  key,
  manifestUrl,
  send: true,
  production: true,
};
function mock(statuses = [200], published = current, keyContent = key) {
  const posts = [],
    waits = [];
  return {
    posts,
    waits,
    fetch: async (url, init) => {
      assert.equal(init.redirect, "error");
      if (url === manifestUrl)
        return new Response(JSON.stringify(published), {
          headers: { "Content-Type": "application/json" },
        });
      if (url === `${siteUrl}/${key}.txt`)
        return new Response(keyContent, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      assert.equal(url, "https://api.indexnow.org/indexnow");
      assert.equal(init.method, "POST");
      posts.push(JSON.parse(init.body));
      const status = statuses.shift() ?? 200;
      if (status instanceof Error) throw status;
      return new Response("", { status, headers: { "Retry-After": "0" } });
    },
    sleep: async (ms) => {
      waits.push(ms);
    },
  };
}

test("dry-run never accesses the network or returns a checkpoint", async () => {
  const result = await notifyIndexNow(
    { current },
    { fetch: () => assert.fail("network in dry-run") },
  );
  assert.deepEqual(result, {
    mode: "dry-run",
    urls: 1,
    batches: 1,
    statuses: [],
  });
});

test("real submissions require production and validate fixed origin, live version and key", async () => {
  await assert.rejects(
    notifyIndexNow({ ...options, production: false }, mock()),
    /production/,
  );
  await assert.rejects(
    notifyIndexNow(
      { ...options, manifestUrl: "https://another.test/manifest" },
      mock(),
    ),
    /fixed production origin/,
  );
  await assert.rejects(
    notifyIndexNow(
      options,
      mock([], { ...current, generatedAt: "2026-10-20T00:00:00.000Z" }),
    ),
    /manifest changed/,
  );
  await assert.rejects(
    notifyIndexNow(options, mock([], current, "<html>fallback</html>")),
    /plain-text key/,
  );
  await assert.rejects(
    notifyIndexNow({ ...options, key: "bad" }, mock()),
    /invalid IndexNow key/,
  );
  await assert.rejects(
    notifyIndexNow({ ...options, checkpoint: false }, mock()),
    /root must be an object/,
  );
});

test("accepts 200 and 202, sending canonical URLs and the root key location", async () => {
  for (const status of [200, 202]) {
    const io = mock([status]);
    const result = await notifyIndexNow(options, io);
    assert.deepEqual(result.statuses, [status]);
    assert.deepEqual(result.checkpoint, current);
    assert.deepEqual(io.posts[0], {
      host: "example.com",
      key,
      keyLocation: `${siteUrl}/${key}.txt`,
      urlList: [siteUrl + "/"],
    });
  }
});

test("a second successful run does not resubmit unchanged pages", async () => {
  const io = mock();
  const result = await notifyIndexNow({ ...options, checkpoint: current }, io);
  assert.equal(result.urls, 0);
  assert.equal(io.posts.length, 0);
  assert.deepEqual(result.checkpoint, current);
});

test("splits 10001 URLs, then retries all pending batches after partial failure", async () => {
  const large = {
    ...current,
    entries: [],
    deletedUrls: Array.from(
      { length: 10001 },
      (_, i) => `${siteUrl}/retired/${i}`,
    ),
  };
  const io = mock([200, 500, 500, 500], large);
  await assert.rejects(
    notifyIndexNow({ ...options, current: large }, io),
    /HTTP 500/,
  );
  assert.deepEqual(
    io.posts.map((p) => p.urlList.length),
    [10000, 1, 1, 1],
  );
  const retry = mock([200, 202], large);
  const result = await notifyIndexNow({ ...options, current: large }, retry);
  assert.deepEqual(
    retry.posts.map((p) => p.urlList.length),
    [10000, 1],
  );
  assert.deepEqual(result.checkpoint, large);
});

test("retries transient failures within a fixed limit and stops on permanent errors", async () => {
  for (const status of [429, 503, new Error("timeout")]) {
    const io = mock([status, 200]);
    await notifyIndexNow(options, io);
    assert.equal(io.posts.length, 2);
    assert.equal(io.waits.length, 1);
  }
  const io = mock([403]);
  await assert.rejects(notifyIndexNow(options, io), /HTTP 403/);
  assert.equal(io.posts.length, 1);
});

test("a newer publication during submission prevents checkpoint confirmation", async () => {
  const io = mock();
  const fetch = async (url, init) => {
    if (url === manifestUrl && io.posts.length)
      return new Response(JSON.stringify({ ...current, deploymentId: "new" }));
    return io.fetch(url, init);
  };
  await assert.rejects(
    notifyIndexNow(options, { ...io, fetch }),
    /manifest changed/,
  );
  assert.equal(io.posts.length, 1);
});

test("exhausted rate limits and long Retry-After stop without confirming", async () => {
  const exhausted = mock([429, 429, 429]);
  await assert.rejects(notifyIndexNow(options, exhausted), /HTTP 429/);
  assert.equal(exhausted.posts.length, 3);
  const io = mock();
  const fetch = async (url, init) =>
    url === "https://api.indexnow.org/indexnow"
      ? new Response("", { status: 429, headers: { "Retry-After": "120" } })
      : io.fetch(url, init);
  await assert.rejects(
    notifyIndexNow(options, { ...io, fetch }),
    /retry later/,
  );
  assert.deepEqual(io.waits, []);
});

test("an HTML fallback key file is rejected even if its text happens to match", async () => {
  const io = mock();
  const fetch = async (url, init) =>
    url === `${siteUrl}/${key}.txt`
      ? new Response(key, { headers: { "Content-Type": "text/html" } })
      : io.fetch(url, init);
  await assert.rejects(
    notifyIndexNow(options, { ...io, fetch }),
    /plain-text key/,
  );
  assert.equal(io.posts.length, 0);
});

test("CLI defaults to offline dry-run, preserves receipt and rejects missing history", () => {
  const tempRoot = path.resolve(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(tempRoot, "indexnow-test-"));
  try {
    const a = path.join(dir, "current.json"),
      b = path.join(dir, "receipt.json");
    fs.writeFileSync(a, JSON.stringify(current));
    fs.writeFileSync(b, "null\n");
    const cli = fileURLToPath(
      new URL("../scripts/notify-indexnow.mjs", import.meta.url),
    );
    const result = JSON.parse(
      execFileSync(process.execPath, [cli, "--current", a, "--checkpoint", b], {
        encoding: "utf8",
      }),
    );
    assert.equal(result.mode, "dry-run");
    assert.equal(fs.readFileSync(b, "utf8"), "null\n");
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [cli, "--current", a, "--checkpoint", path.join(dir, "missing.json")],
        { stdio: "pipe" },
      ),
    );
    writeCheckpoint(b, current);
    assert.deepEqual(JSON.parse(fs.readFileSync(b, "utf8")), current);
    assert.deepEqual(fs.readdirSync(dir).sort(), [
      "current.json",
      "receipt.json",
    ]);
  } finally {
    assert.ok(path.resolve(dir).startsWith(tempRoot + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
