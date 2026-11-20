# Single-source data flow

project.yaml origin + content-map identity → config/site → canonical/social/sitemap/contact email. content-map primaryNavigation → shared Header/mobile/Footer; Legal links separate.

Main Game and additional Game JSON → unified typed loaders → home/list/detail/cards/recommendations/player/SEO/schema. Homepage flags exact6/6/6; details exclude self, related IDs first, then related selected inventory. Current Game image always owns player and cards. Addresses only maintained in Game player field; public data does not render research URLs as anchors. Published origins automatically derive CSP. Unsafe main address gives safe failure and no iframe; replacement only changes main player value and affected fingerprint/build checks. Additional sandbox defaults scripts/same-origin/pointer-lock, no popup/top navigation; compatibility deliberately untested by user override.

Guide JSON per slug → unified published loader → list/detail/metadata/BreadcrumbList/Article/sitemap. No author block for null authorId. Explicit typed renderer rejects unknown blocks and renders only text/elements. Spoiler warning/accessible details for marked late content. Post-body YouTube uses validated ID and privacy enhanced lazy iframe, no autoplay.

seo/tdk.js contains static pages and reads main.seo for home. Detail TDK only in own JSON. page-lastmod fingerprints contain own visible fields plus actual recommended card sets and shared shell/capabilities; game/Guide dates remain only in own JSON. Update mode changes affected dates; build readonly mode rejects stale data. No date update merely because time passed.

Internal research claims/video/brief/blueprints/media ledger never imported as public content. Validator checks ID references, adopted media and content sufficiency. Public first-party capabilities only game/YouTube iframes; no storage/analytics/forms/comments/payments. Embed third-party behavior described as external boundary, not invented first-party processing.
