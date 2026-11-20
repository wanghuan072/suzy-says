# Production search notifications

The existing Next.js sitemap enumerates the real published routes. After export,
`scripts/build-seo-manifest.mjs` extracts stable page text, metadata, important
links and image identities from those pages. It ignores styling and hydration.
It inherits dates and deletion events from the fixed current production manifest.
The first migration explicitly permits a missing manifest; disable `bootstrap`
after the first successful production publication. All other read failures stop
the build. No production history is inferred from local or preview builds.

`seo/indexnow.json` contains the public IndexNow key and the Bing ownership gate.
The key is public verification material, not a password. The initial gate stays
closed until Bing's Verify button succeeds for this exact domain.

`.github/workflows/indexnow.yml` listens for the existing `Vercel` success status
from the official `vercel[bot]` (ID 35613825), then checks the fixed public
production manifest, project ID and commit. Preview and superseded events do not
submit. The workflow also supports a no-argument manual retry of current
production. Receipt artifacts last 90 days; after confirmed expiry, it explicitly
resubmits the full current set and retained deletion events. HTTP or artifact
read failures stop processing. Partial submission never advances the receipt.

Keep production Git deployments ordered. This integration covers this repository's
Git-to-Vercel publication path, not hypothetical independent CMS updates or
interleaved CLI/promote/rollback deployments. Rebuild content for a rollback.
Failed notifications can be retried from Actions or by the next production
publication. A successful 200/202 response acknowledges receipt, not indexing.

Check Bing Webmaster Tools → select suzysaysgame.site → IndexNow → IndexNow
Insights → View Complete Report. Compare dates, sources and changed URLs with the
Actions run and its receipt. Newly connected reports may still be preparing data.
