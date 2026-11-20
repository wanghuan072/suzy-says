<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Suzy Says project scope

### Current user override (2026-11-18)

The original first-edition illustration exception was superseded by the user on 2026-11-19: use real game images. Current per-asset review and specific remaining screenshot deferrals are recorded in `planning/media-policy.json`. Do not use original substitute game diagrams or infer third-party permission from public availability.

The user explicitly said `不需要实测了，直接写进iframe里即可`: do not require real-game iframe input tests or clean-context gameplay tests. Integrate configured addresses directly through the shared click-to-load player. Record gameplay as `not_tested_user_waived`, never as verified. This overrides the gameplay-test completion requirements below and in Game-Agent. Keep content/media/SEO/build checks and report their actual outcomes. Do not operate existing user Chrome windows.

- Write only inside this checkout. Never read other game projects. Preserve the existing root App Router architecture and user changes.
- Follow `project.yaml` and the Game-Agent workflow sequentially. No deployment, Git commits or remote mutations.
- Shared navigation: Home `/`, 0–2 research-supported topic pages, Guides `/guides`, More Games `/games`; desktop, mobile and footer share configuration. Cross-page links use full document navigation.
- Main game lives only at `/`. Game data lives only in `data/games/main-game.json` and `data/games/games.json`; Guide data uses independent strict JSON. Never substitute another game's fields or media.
- Each player's address exists only in its Game object's `player.iframeSrc`. Derive production CSP from published games and the safely parsed main address. Keep development eval isolated from production.
- Main initial embed may remain provisional; never claim verified play without actual input evidence. Additional games require sandboxed final-route gameplay, no popups or top navigation, independent risk review and at least 8 published records.
- Each game needs its own cover, 3 explanatory gameplay captures, original player content of at least 4000 non-whitespace characters, and 1–3 researched, verified YouTube embeds after the article. No borrowed covers, filler or aggregator copy.
- Initial player has a real visible Play Now button and zero game iframes. Activation creates one safe iframe or a readable safe failure. Include timeout/retry and distinct webpage/browser fullscreen SVG controls.
- Header uses local `/images/logo.png`; social image is `/images/og-image.png`. Preserve the startup keyword's punctuation in H1. No unverified Free claims.
- Static TDK belongs in `seo/tdk.js`, with home derived from main Game JSON; Game/Guide detail TDK belongs only in its JSON. Titles 40–60 characters, descriptions 140–160.
- Footer Legal: `/privacy`, `/terms`, `/copyright`, `/about`, `/contact`, same-tab links with `rel="noopener noreferrer nofollow"`. Contact uses plain-text domain-derived email only. No invented author, company, jurisdiction or capabilities.
- 1400px maximum container; only width breakpoints 1024px and 768px. Desktop/1024px game pages have a full-width left column and height-aware boundary-following sidebar, no internal sidebar scrolling. Featured/New each 6–8 cards in two columns; Recommended exactly 6 above article. Home reads explicit flags. Mobile order: player, Recommended, article, videos, Featured, New.
- Maintain content/claim/video/media provenance internally, capability matrix, spoiler policy, per-page fingerprints including rendered recommendations, and sitemap stable dates. No public research language, source anchors, comments or ad placeholders.
- Guides require independent task briefs, accurate distinct covers and complete details; long Guides have header-offset sticky TOC, flowing on mobile.
- English player-facing README links every main-navigation and Legal page; build/deployment commands belong in internal reports.
- Final acceptance includes machine-readable requirement, command/service and player runtime results, screenshots and Mobile/Desktop production Lighthouse. No guessed test counts or fabricated evidence.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

### Real media correction (2026-11-19)

The user rejected all original game illustrations and requested real game images found online. `planning/media-policy.json` now requires per-asset identity/hash/source review and prohibits original substitute game art. A primary author upload is provenance, not a copyright permission grant: `editorial-use-reviewed` must never be described as licensed. Exhibit of Sorrows CC BY credits are shown on /copyright. Game-input testing remains waived.

### Homepage sidebar override (2026-11-19)

Homepage Featured/New recommendations stay in normal document flow, with no sticky or scroll-following behavior. Other game detail pages retain their existing following sidebar.

### Cloudflare Pages deployment override (2026-11-19)
The user explicitly authorized uploading this project to wanghuan072/suzy-says on main and deploying it to Cloudflare Pages. Preserve the existing Next.js app; use output export, Node 24 for builds, npm run build, and out as the published directory. Security headers are generated by scripts/pages-headers.mjs. Do not restore the previous standalone/Cache Components configuration.
