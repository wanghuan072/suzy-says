import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notifyIndexNow, writeCheckpoint } from "./notify-indexnow.mjs";

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
  const response = await fetch(`${config.siteUrl}/seo-manifest.json`, {
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw Error(`Production manifest HTTP ${response.status}`);
  const current = await response.json();
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
    if (event.sha !== current.deployment?.commit) {
      console.log("Skip superseded or preview deployment");
      return;
    }
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
  const { checkpoint: saved, ...summary } = result;
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
