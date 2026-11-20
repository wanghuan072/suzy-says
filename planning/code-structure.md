# Code structure

Retain root app/ App Router and @/* root alias. App route files remain thin. Create page/home, page/games, page/guides and page/legal implementations; shared components/layout, components/game, components/content; style/globals.css and scoped modules; lib/game-loader.ts, guide-loader.ts, url-policy.ts, seo.ts; config/site.ts, navigation.ts; types/game.ts, guide.ts and content.ts. Fixed root data/games and data/guides and seo/tdk.js remain as required, overriding optional global src/data suggestion. No migration of root app to src.

Modify app/layout.tsx, page.tsx and next.config.ts; add games and guides dynamic routes, root Legal routes, sitemap.ts and robots.ts. Replace starter public favicon with own icon. No external Google font fetch needed: use local system stacks. Retain package-lock/npm; add direct js-yaml dependency and types only as required; use existing sharp as explicit authoring dependency when needed.

Next16.4.6 local docs reviewed: generateStaticParams uses published arrays, params is Promise; metadata exported only server side. Existing cacheComponents and partialPrefetching retained unless incompatibility is demonstrated. Standalone Node output chosen; packaging copies public and .next/static and required config/data into deployable folder. Actual production build must pass full content gate.

Create scripts/validate.mjs (single rules), scripts/content-state.mjs (fingerprints, update/readonly), scripts/run-command.mjs (actual command results), scripts/package.mjs and meaningful node tests. No duplicate validation per phase. No dangerous innerHTML for content; JSON-LD serialized with escaped less-than into script text via React child.

Drafts never published by loaders. Nonpublic draft inspection can use a temporary development-only preview implementation removed before final build. No bypass flags on final npm build. Main provisional iframe does not block content-valid build. User-waived runtime tests remain not_tested, no forged verification.
