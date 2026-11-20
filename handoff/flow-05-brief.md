# Flow 05 Brief

## Status
completed

## Confirmed Inputs
Existing root Next16.4.6/React19.3/TypeScript/npm architecture, phases02–04, local framework docs and runtime waiver.

## Outputs
code-structure.md, data-flow.md, route-registry.json, test-plan.md, updated project.yaml output decision.

## Locked Decisions
Keep root app, @ alias and existing framework. Separate route/page/component/style/lib/config/types responsibilities. Fixed root Game/Guide/seo data. Portable Node standalone output. Canonical domain from project.yaml. Shared Game player and safe renderer, no fallback or duplicate URLs. Production checks cannot bypass content/media gates. No deploy/commit.

## Decisions The Next Flow May Change
Narrow framework integration adjustments proven necessary by local docs/build. Content enrichment and media remain07/08.

## Known Gaps
Public code not written yet. Drafts incomplete by design;06 build may fail only for explicit later content gates and must be recorded honestly. No real iframe tests under latest user direction.

## Required Reads For The Next Flow
Stage06 plus local Next API docs and all planning/specification files.

## Next Flow Instructions
Implement current architecture and shared data-driven skeleton, draft Game/Guide records, validation/command tracking, CSS two breakpoints, safe player and states. Run type/lint/meaningful tests and actual build; don't write final content prematurely or mark gameplay verified.
