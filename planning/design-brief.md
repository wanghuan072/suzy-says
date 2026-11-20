# Design brief

Selected direction: a quiet CRT room. Ink background #14111d, violet surfaces #211b2d/#30263f, warm yellow action #e8d964, ivory text #f6f1e9 and muted lavender #c5bdce. Original CRT mark in logo-direction.svg. Contrast pairs are light-on-dark and dark-on-yellow; no weak gray-on-gray Footer.

## Geometry
Wide 1600 viewport: 100px outer margins, exactly 1400px container, 972px left + 28px gap + 400px right. Header approximately 80px, measured at runtime rather than hardcoded sticky offset. Home H1 48px, other H1 40px; player visible below a short introduction. Complete local cover contained in player; no forced crop. Six Recommended cards in 3 columns between player and article. Right Featured and New each six two-column cards, each media contained. Actual mockup uses all eight selected identities, six per group; limited inventory necessarily overlaps across groups.

1024 viewport: fluid 24px margins; 976px container, 644px left +24px gap +308px right. Hamburger Header. Recommended two columns; Featured/New remain two columns. Games list four columns. Guide list left image/right text. Tall sidebar uses direction-sensitive parent-bound following, no inner scrollbar.

768 viewport: 16px margins; 736px single track. Header hamburger, home H1 <=34px and details <=30px. Order: player, six Recommended (two columns), full-width article, videos, Featured, New. No sticky game sidebar. Games list two columns; Guide list image above text. Images maintain their own aspect and contain key text.

## Page roles and image meaning
Home introduces the listening rule and separates original release facts from provisional player. Assessment and Please Answer use focused interface-reading sections; Last Seen Online uses file/clue relationships; Open House and Bad Ben use spatial/camera sequences; Uncle Nintendo uses choice and time structure; Exhibit uses repeated interaction; Burger uses road and control sequencing. Blueprint section questions and media-slots.json define each screenshot's task. No cross-game text or visual substitution.

Guides have task-specific original covers, breadcrumbs/H1/intro/date/tags/cover, then a clear body. Four or more sections trigger a right TOC that may scroll within available height; mobile TOC flows before body. Legal uses quiet text-first layout and no invented company/author.

## Covers and backgrounds
cover-composition.json records real dimensions. All covers initially contain: titles and edge subjects are important, including the small Uncle Nintendo source. No background photo. The page's abstract dark surfaces are derived from the room/CRT palette. Real covers retain their colors. Source images are preview candidates, not automatically adopted media. Full capture/usage assessment remains Flow08.

## State surfaces
Ready: correct cover and high contrast Play Now. Loading: progress text and aria-busy, no repeated iframe. Failed/timed out: human-readable cause and Retry. Webpage fullscreen: original page-frame expansion SVG; Browser fullscreen: separate corner-bracket SVG. Both >=44px, separated by8px, pressed attributes and visible exit route. No required native Chrome operations or game play tests under current override.

## Visual review
high-fidelity-wide.png displays real main cover, local original logo direction, actual game names, 6 Recommended and 6+6 sidebar cards. Final implementation must compare at all three widths and preserve the full left track; no narrow prose inside game pages. The mockup shows first article chapter, not final page length.
