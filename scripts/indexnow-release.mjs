import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notifyIndexNow, writeCheckpoint } from "./notify-indexnow.mjs";

export async function publishedManifest(
  config,
  expected,
  {
    request = fetch,
    pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {},
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await request(`${config.siteUrl}/seo-manifest.json`, {
      redirect: "error",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw Error(`Production manifest HTTP ${response.status}`);
    const current = await response.json();
    if (!expected || current.deployment?.commit === expected) return current;
    console.log(
      `Waiting for production alias: expected ${expected}; observed ${current.deployment?.commit}`,
    );
    if (attempt < 5) await pause(3000);
  }
  throw Error(
    "Production alias has not reached this commit; retry after deployment propagation",
  );
}

export async function release(
  { config, current, checkpoint, production = false },
  dependencies,
) {
  if (!config.bingVerified)
    return { mode: "disabled", reason: "Bing ownership verification pending" };
  if (config.verification?.siteUrl !== config.siteUrl)
    throw Error("Bing verification origin mismatch");
  if (
    current.siteUrl !== config.siteUrl ||
    current.deployment?.projectId !== config.projectId ||
    current.deployment?.environment !== "production"
  )
    throw Error("Wrong production manifest");
  return notifyIndexNow(
    {
      current,
      checkpoint,
      key: config.key,
      manifestUrl: `${config.siteUrl}/seo-manifest.json`,
      send: production,
      production,
    },
    dependencies,
  );
}

async function main() {
  const config = JSON.parse(fs.readFileSync("seo/indexnow.json", "utf8"));
  if (!config.bingVerified) {
    console.log("IndexNow disabled: Bing verification pending");
    return;
  }
  const event = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  if (process.env.GITHUB_EVENT_NAME === "status") {
    const valid =
      event.sender?.login === "vercel[bot]" &&
      event.sender?.id === 35613825 &&
      event.repository?.full_name === config.repository &&
      event.context === "Vercel" &&
      event.state === "success";
    if (!valid) throw Error("Untrusted deployment status");
    const target = new URL(event.target_url);
    if (
      target.origin !== "https://vercel.com" ||
      !target.pathname.startsWith("/whs-projects-f97a952d/suzy-says/")
    )
      throw Error("Wrong Vercel project status");
  } else if (
    process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    process.env.GITHUB_REF !== `refs/heads/${config.branch}`
  )
    throw Error("Unsupported release event");
  if (
    process.env.GITHUB_EVENT_NAME === "status" &&
    Array.isArray(event.branches) &&
    !event.branches.some((branch) => branch.name === config.branch)
  ) {
    console.log("Skip non-production branch");
    return;
  }
  const current = await publishedManifest(
    config,
    process.env.GITHUB_EVENT_NAME === "status" ? event.sha : undefined,
  );
  const checkpoint = JSON.parse(
    fs.readFileSync(".indexnow/receipt.json", "utf8"),
  );
  const result = await release({
    config,
    current,
    checkpoint,
    production: true,
  });
  if (result.checkpoint) {
    writeCheckpoint(".indexnow/receipt.json", result.checkpoint);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "notified=true\n");
  }
  const summary = { ...result };
  delete summary.checkpoint;
  console.log(JSON.stringify(summary, null, 2));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
