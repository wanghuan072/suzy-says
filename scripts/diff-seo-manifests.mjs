#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { diffManifests, readJson } from "./seo-manifest-lib.mjs";

const args = process.argv.slice(2);
const previousPath = args[0];
const currentPath = args[1];
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

if (!previousPath || !currentPath || (outputIndex >= 0 && !outputPath)) {
  console.error(
    "Usage: node diff-seo-manifests.mjs <previous.json> <current.json> [--output <diff.json>]",
  );
  process.exit(2);
}

try {
  const previous = readJson(previousPath);
  const current = readJson(currentPath);
  const result = diffManifests(previous, current);

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath)
    fs.writeFileSync(path.resolve(outputPath), serialized, "utf8");
  else process.stdout.write(serialized);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
