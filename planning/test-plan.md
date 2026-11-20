# Executable checks

- npm run validate:dev: strict JSON fields/types/IDs/relations; draft missing content/media reported honestly.
- npm run validate:media: actual files/dimensions/cover hashes, three explanatory captures and adopted video mapping.
- npm run validate:publish: above plus eight published games, two Guides, exact homepage flags, TDK 40–60/140–160, independent body4000+, no external public anchors or unapproved blocks.
- npm run typecheck, npm run lint, npm run format:check, npm test: record real exit codes and machine test counts.
- npm run content:update then npm run content:check: same single fingerprint rules; prove unchanged dates remain unchanged and card changes invalidate affected pages in isolated fixtures.
- npm run build: full readonly gate, next build and runtime-ready standalone package; no draft bypass.
- Local development/production page checks use project-owned preview only. No native user Chrome. Game iframe identity/input and clean-context tests expressly waived; report as not_tested_user_waived. Retain safe URL/player state checks where feasible without claiming actual gameplay.
- Layout views1600,1024,768: container width1400, no overflow, side card two-column geometry, parent-bound scroll following, mobile order, 6/4/2 index and Guide row/stack. Header height measured, distinct SVG controls and visible Play Now. Cover/source contact sheet includes all contexts.
- HTTP rendered route audit: title/description/canonical/schema, published slug sets, images, root Legal, no hidden draft/repeated main URL, valid404, no forbidden text. Browser checks assess hydration/console errors if available; inability is a recorded acceptance gap.
- Production Mobile/Desktop Lighthouse raw reports and >=90 performance target; repeat3 and median if variable. Record server PID/port/readiness/build ID/logs independently from exit code on teardown.

reports/command-results.json captures one-shot/service, actual timestamps, exit/PID/port/readiness/build/log/stop and machine counts. player-runtime-results.json records configured Game fields and explicit user waiver, never fabricated frame URL/input success.
