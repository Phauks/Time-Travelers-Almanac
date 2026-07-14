# Handover: the timeline component

Where the timeline stands and where it is going. There are now two renderers
over one shared geometry:

- `src/lib/components/BranchingTimeline.svelte` — the in-card SVG board
  (unchanged look: header, scrollable board, event panel), plus an **Expand**
  button.
- `src/lib/components/Chronoscope.svelte` + `src/lib/timeline/chronoscope.ts`
  — the full-screen Canvas 2D instrument. Design rationale and architecture
  live in `docs/CHRONOSCOPE.md`; the survey of prior art that led here is in
  the research artifact (round two: Histography, ChronoZoom, Fallen of WWII,
  NatGeo/NYT scrollytelling).

Shared modules:

- `src/lib/timeline/layout.ts` — all board geometry as pure functions of
  `(events, branches, order)`: branch membership, lane positions, per-pair
  base segments (dashed across big gaps), splinters, level-packed jump arcs,
  off-timeline jumps, departure ids. Both renderers consume this; change
  geometry here and both views follow.
- `src/lib/timeline/display.ts` — kind metadata, `shortDate`, `whenLabel`,
  `jumpText`.
- `src/lib/components/EventPanel.svelte` — the image/text/tags detail panel,
  shared by the card and the full-screen view.

## Done in this pass (the Chronoscope, phase 1)

- Full-screen overlay shell (Lightbox pattern): header with title, As Told /
  As Happened toggle, **Tour**, **Fit**, close; canvas board left; docked
  EventPanel right; stacks vertically under 860px.
- Camera: drag pan with pointer capture, wheel zoom about the cursor
  (ctrl+wheel handles trackpad pinch), two-pointer pinch, soft bounds with
  drag resistance and a spring-back rubber band on release.
- Semantic zoom tiers: far = lanes/ribbons/nodes silhouette; ~0.55 dates fade
  in; ~0.9 beat titles; ~1.4 inline thumbnails (cover-cropped, cached) on
  beats that have stills.
- Jumps are **comet ribbons**: one filled tapered shape per jump with an
  integrated barbed head, `--color-jump` forward / cool blue back, soft glow;
  the selected departure's ribbon carries a travelling pulse
  (`prefers-reduced-motion` disables all tweens and the pulse).
- Guided tour: walks the beats in the current order, flying the camera; any
  canvas interaction pauses it.
- Theme-native: engine reads `--color-*`/`--font-mono` tokens at open, so the
  board is parchment in light mode and void-dark in dark mode.
- A11y: Escape closes, arrow keys step beats, hidden list of real buttons for
  screen readers/Tab, hover cursor + hit-testing on nodes.
- Verified with Playwright on `/specimens/back-to-the-future/` in both
  themes: card unchanged, expand/step/tour/pause/re-order/escape all pass,
  no console errors; `vite build` green.

## Known gaps / phase 2 candidates

- `svelte-check` currently crashes in this environment (TypeScript 7 pin vs
  svelte-check expecting ≤6) — pre-existing, not from this change.
- No legend inside the overlay yet (it exists on the card).
- Off-timeline jump stubs are functional but plain; hover does not yet
  highlight a ribbon's two endpoints together.
- Tour pacing is a fixed 3.2s; the Fallen-of-WWII grammar (narrated glide,
  pause-to-explore) could go further, e.g. easing zoom per jump distance.
- Mobile pinch is implemented but untested on a real device.
- Thumbnail draw order can overlap a ribbon at extreme zoom; consider a
  dedicated overlay pass.

## Where this goes next (see docs/CHRONOSCOPE.md)

1. Phase 2 polish: endpoint-pair hover glow, overlay legend, distance-eased
   tour, elastic-time x-axis experiment (spacing weighted by log time-gap).
2. Lenses: the same layout data as branching world-lines (Endgame
   click-to-trace) and a story curve (told × happened) view.
3. The master timeline: every specimen on one canvas — density skyline far
   out (Histography), ChronoZoom-style nesting into a single specimen.

## Watch-outs

- Keep `layout.ts` pure — no DOM, no Svelte. The `{#key slug}` wrapper in the
  dossier remounts the card on navigation; the Chronoscope engine is created
  per open and destroyed on close, so no state may persist inside it either.
- In `Chronoscope.svelte`, the engine-lifecycle `$effect` must not read
  `selectedId` (it is written there, and a tracked read recreates the engine
  on every selection — this bug shipped once already; `untrack` guards it).
- `overflow-x: clip` on `body` prevents stray page scroll; the overlay locks
  `body` scroll while open and manages its own bounds.
