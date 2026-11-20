import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  assertManifest,
  assertManifestPair,
  diffManifests,
  pendingDeletionUrls,
  prepareManifest,
} from "../scripts/seo-manifest-lib.mjs";

const origin = "https://example.com",
  first = "2026-10-16T00:00:00.000Z",
  later = "2026-10-19T00:00:00.000Z";
const entry = (route, hash = "a", time = first) => ({
  path: route,
  canonicalUrl: origin + route,
  indexable: true,
  contentFingerprint: hash,
  lastModified: time,
});
const manifest = (entries = [entry("/")], extra = {}) => ({
  schemaVersion: 1,
  fingerprintVersion: "content-v1",
  siteUrl: origin,
  generatedAt: later,
  entries: [...entries].sort((a, b) =>
    a.canonicalUrl.localeCompare(b.canonicalUrl),
  ),
  ...extra,
});
const url = origin + "/temporary";

test("validates legacy manifests and rejects invalid deletion queues", () => {
  assertManifest(manifest());
  assertManifest(
    manifest(undefined, { deletedUrls: [url], deletedAt: { [url]: first } }),
  );
  assert.throws(
    () =>
      assertManifest(
        manifest(undefined, { deletedUrls: ["https://another.test/retired"] }),
      ),
    /retired/,
  );
  assert.throws(
    () => assertManifest(manifest(undefined, { deletedUrls: [origin + "/"] })),
    /still indexable/,
  );
  assert.throws(
    () =>
      assertManifest(
        manifest(undefined, {
          deletedUrls: [url],
          deletedAt: { [url]: "2099-01-01T00:00:00.000Z" },
        }),
      ),
    /event time/,
  );
});

test("compares page additions, actual updates, removals and unchanged dates", () => {
  const old = manifest([entry("/"), entry("/old"), entry("/keep")], {
    generatedAt: first,
  });
  const current = manifest([
    entry("/", "b", later),
    entry("/keep"),
    entry("/new", "new", later),
  ]);
  assert.deepEqual(diffManifests(old, current), {
    added: [origin + "/new"],
    updated: [origin + "/"],
    deleted: [origin + "/old"],
    unchanged: [origin + "/keep"],
  });
});

test("includes a newly published then deleted URL missing from the last successful receipt", () => {
  const receipt = manifest(undefined, { generatedAt: first });
  const removed = manifest(undefined, {
    deletedUrls: [url],
    deletedAt: { [url]: later },
  });
  assert.deepEqual(diffManifests(receipt, removed), {
    added: [],
    updated: [],
    deleted: [url],
    unchanged: [origin + "/"],
  });
  assert.deepEqual(diffManifests(removed, removed).deleted, []);
  assert.deepEqual(diffManifests(null, removed).deleted, [url]);
});

test("acknowledged deletion is quiet, while restoration followed by a new deletion notifies again", () => {
  const acknowledged = manifest(undefined, {
    generatedAt: first,
    deletedUrls: [url],
    deletedAt: { [url]: first },
  });
  const same = manifest(undefined, {
    deletedUrls: [url],
    deletedAt: { [url]: first },
  });
  assert.deepEqual(pendingDeletionUrls(acknowledged, same), []);
  const restored = manifest([entry("/"), entry("/temporary", "a", later)]);
  assert.deepEqual(diffManifests(acknowledged, restored).added, [url]);
  const retiredAgain = manifest(undefined, {
    deletedUrls: [url],
    deletedAt: { [url]: later },
  });
  assert.deepEqual(diffManifests(acknowledged, retiredAgain).deleted, [url]);
});

test("legacy acknowledged deletions use the successful receipt time as compatibility boundary", () => {
  const legacy = manifest(undefined, {
    generatedAt: first,
    deletedUrls: [url],
  });
  assert.deepEqual(
    pendingDeletionUrls(
      legacy,
      manifest(undefined, { deletedUrls: [url], deletedAt: { [url]: first } }),
    ),
    [],
  );
  assert.deepEqual(
    pendingDeletionUrls(
      legacy,
      manifest(undefined, { deletedUrls: [url], deletedAt: { [url]: later } }),
    ),
    [url],
  );
});

test("reverted content remains an update and stale or mismatched records are rejected", () => {
  const old = manifest(undefined, { generatedAt: first });
  assert.deepEqual(
    diffManifests(old, manifest([entry("/", "a", later)])).updated,
    [origin + "/"],
  );
  assert.throws(() => diffManifests(manifest(), old), /backward/);
  assert.throws(
    () =>
      diffManifests(old, manifest(undefined, { fingerprintVersion: "other" })),
    /version/i,
  );
});

test("both public CLI helpers accept the new deletion history format", () => {
  const tempRoot = path.resolve(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(tempRoot, "sitemap-bing-test-"));
  const scripts = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../scripts",
  );
  try {
    const old = manifest(undefined, { generatedAt: first }),
      current = manifest(undefined, {
        deletedUrls: [url],
        deletedAt: { [url]: later },
      });
    const a = path.join(dir, "previous.json"),
      b = path.join(dir, "current.json");
    fs.writeFileSync(a, JSON.stringify(old));
    fs.writeFileSync(b, JSON.stringify(current));
    const diff = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(scripts, "diff-seo-manifests.mjs"), a, b],
        { encoding: "utf8" },
      ),
    );
    assert.deepEqual(diff.deleted, [url]);
    const validation = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(scripts, "validate-seo-manifest.mjs"), b, a],
        { encoding: "utf8" },
      ),
    );
    assert.equal(validation.valid, true);
    assert.equal(validation.unchangedCompared, 1);
  } finally {
    assert.ok(path.resolve(dir).startsWith(tempRoot + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects equivalent URL spellings instead of adding and deleting the same resource", () => {
  assert.throws(
    () =>
      assertManifest(
        manifest([entry("/a")], { deletedUrls: ["https://EXAMPLE.com/a"] }),
      ),
    /normalized/,
  );
  assert.throws(
    () =>
      assertManifest(
        manifest([{ ...entry("/a"), canonicalUrl: "https://EXAMPLE.com/a" }]),
      ),
    /normalized/,
  );
  assert.throws(
    () =>
      assertManifest(
        manifest([], { deletedUrls: ["https://example.com:443/a"] }),
      ),
    /normalized/,
  );
});

test("production validation catches missing or rewritten deletion history", () => {
  const previous = manifest(undefined, {
    generatedAt: first,
    deletedUrls: [url],
    deletedAt: { [url]: first },
  });
  assert.throws(
    () => assertManifestPair(manifest(), previous),
    /retain deletion/,
  );
  assert.throws(
    () =>
      assertManifestPair(
        manifest(undefined, {
          deletedUrls: [url],
          deletedAt: { [url]: later },
        }),
        previous,
      ),
    /preserve its event/,
  );
  assert.throws(
    () => assertManifestPair(manifest([]), manifest()),
    /retain deletion/,
  );
});

test("preparation preserves stable dates and repairs coarse or rolled-back content dates", () => {
  const previous = manifest([entry("/"), entry("/changed"), entry("/old")], {
    generatedAt: first,
  });
  const current = prepareManifest(
    manifest([entry("/", "a", later), entry("/changed", "b", first)]),
    previous,
  );
  assert.equal(current.entries[0].lastModified, first);
  assert.equal(current.entries[1].lastModified, later);
  assert.deepEqual(current.deletedUrls, [origin + "/old"]);
  assert.equal(current.deletedAt[origin + "/old"], later);
  assertManifestPair(current, previous);
  assert.throws(
    () =>
      prepareManifest(
        manifest([entry("/", "b", first)], { generatedAt: first }),
        manifest(undefined, { generatedAt: first }),
      ),
    /time must advance/,
  );
});

test("preparation carries transient deletions and generates a fresh event after restore", () => {
  const receipt = manifest(undefined, { generatedAt: first });
  const published = prepareManifest(
    manifest([entry("/"), entry("/temporary")], {
      generatedAt: "2026-10-18T00:00:00.000Z",
    }),
    receipt,
  );
  const removed = prepareManifest(manifest(), published);
  const nextTime = "2026-10-20T00:00:00.000Z";
  const continued = prepareManifest(
    manifest(undefined, { generatedAt: nextTime }),
    removed,
  );
  assert.equal(continued.deletedAt[url], later);
  assert.deepEqual(diffManifests(receipt, continued).deleted, [url]);
  const restored = prepareManifest(
    manifest([entry("/"), entry("/temporary")], { generatedAt: nextTime }),
    continued,
  );
  assert.deepEqual(restored.deletedUrls, []);
  const again = prepareManifest(
    manifest(undefined, { generatedAt: "2026-10-21T00:00:00.000Z" }),
    restored,
  );
  assert.deepEqual(diffManifests(removed, again).deleted, [url]);
});

test("noindex produces a deletion event and restoration removes it", () => {
  const published = manifest([entry("/"), entry("/temporary")], {
    generatedAt: first,
  });
  const hidden = prepareManifest(
    manifest([entry("/"), { ...entry("/temporary"), indexable: false }]),
    published,
  );
  assert.deepEqual(diffManifests(published, hidden).deleted, [url]);
  const restored = prepareManifest(
    manifest([entry("/"), entry("/temporary")], {
      generatedAt: "2026-10-20T00:00:00.000Z",
    }),
    hidden,
  );
  assert.deepEqual(restored.deletedUrls, []);
  assert.deepEqual(diffManifests(hidden, restored).added, [url]);
  assert.deepEqual(diffManifests(published, restored).updated, [url]);
});

test("restoring removed content notifies even if its source date and fingerprint are old", () => {
  const published = manifest([entry("/"), entry("/temporary")], {
    generatedAt: first,
  });
  const removed = prepareManifest(manifest(), published);
  const restored = prepareManifest(
    manifest([entry("/"), entry("/temporary")], {
      generatedAt: "2026-10-20T00:00:00.000Z",
    }),
    removed,
  );
  assert.deepEqual(diffManifests(published, restored).updated, [url]);
});

test("distinct deletions cannot reuse the preceding production timestamp", () => {
  const published = manifest([entry("/"), entry("/temporary")]);
  assert.throws(
    () => prepareManifest(manifest(), published),
    /time must advance/,
  );
});
