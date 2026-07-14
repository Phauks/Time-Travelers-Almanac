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

Shared modules (`src/lib/timeline/`):

- `layout.ts` — all board geometry as pure functions of
  `(events, branches, order)`: branch membership, lane positions, per-pair
  base segments, splinters, level-packed jump arcs, off-timeline jumps,
  births, decay, registered moments, traveller threads. Both renderers
  consume this; change geometry here and both views follow. Covered by
  `layout.test.ts` (vitest, `npm test`).
- `camera.ts` — renderer-agnostic pan/zoom viewpoint: soft bounds, drag
  resistance, spring-back, eased flights, one `mode` at a time (no boolean
  soup). Reusable verbatim by the future master timeline.
- `layers.ts` — every draw pass as a stateless `Layer`; static layers are
  cached to an offscreen canvas and blitted during pans, dynamic layers
  (selection/pulse, lane labels, minimap) draw live. `engine.use(layer)`
  registers plugins.
- `lens.ts` — a lens = layout function + extra layers. `lanesLens` is the
  default; the overlay grows a switcher automatically once `LENSES` has a
  second entry (world-lines and story-curve are the intended next two).
- `stitch.ts` — saga stitching: franchise parts combined into one master
  timeline, ids prefixed, narrative offset per part, and cross-part
  `crossRef`s promoted into real jump ribbons.
- `display.ts` — kind metadata, `shortDate`, `whenLabel`, `jumpText`.
- `src/lib/components/EventPanel.svelte` — the image/text/tags detail panel,
  shared by the card and the full-screen view (now with a "crosses into"
  link when a beat has a `crossRef`).

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

## Done in the second pass (temporal splitting + modularity)

- **Temporal registration**: As Happened uses an elastic time-metric x-axis
  (`elasticWeight`: log-compressed gaps), and beats sharing an instant across
  lanes share an x, joined by a dotted "moment" connector with diamonds.
- **Born lanes**: a branch occupies a row only from its `branchAt` onward;
  freed rows are reclaimed (git-graph compaction); lane labels sit at the
  lane's birth. Births render distinctly: an arrival shockwave when a
  traveller's landing split history, a dashed halo + wye for drift splits.
- **Rule-aware decay**: an endangered/erased branch fades into gradient
  dashes past the moment its successor is born (derived automatically;
  `Branch.erasedAt`/`restoredAt` exist for explicit override).
- **Traveller threads**: `event.traveler` tags become weaving dashed threads
  (BTTF I's Marty and II/III's Doc are tagged); a Threads toggle and a
  per-traveller tour select ("follow Marty") in the overlay.
- **Full saga view**: on franchise entries, a Full Saga toggle stitches every
  part onto one canvas — BTTF becomes 37 beats, 8 lanes, with cross-film
  crossRefs drawn as real ribbons. Pairs beautifully with As Happened.
- **Minimap scrub strip** (bottom-left) with a live viewport frame; click or
  drag it to fly the camera.
- **Deep links**: `?view=scope&beat=<id>` opens the Chronoscope on a beat;
  the URL tracks selection and clears on close.
- **Pan cache**: static layers render into an offscreen canvas blitted while
  panning; dynamic layers stay live. Irrelevant at 16 beats, load-bearing at
  master-timeline scale.
- **Theme observer**: flipping `data-theme` while the overlay is open
  re-reads tokens and re-renders.
- 18 vitest unit tests on the pure core (`npm test`).

## Done in the third pass (the second lens + overlay polish)

- **Story-curve lens** (`storycurve.ts`): beats at (narrative order,
  chronological rank); segment colours read the telling — muted steps for
  time flowing on, amber leaps forward, blue flashbacks — against the faint
  diagonal a linear telling would draw. Proves the lens interface: the
  header switcher appears automatically, and the engine, camera, minimap,
  panel and tour all work unchanged on the new picture. Works on the full
  saga too (the trilogy as one EKG).
- `branchMembership()`/`makeBranchColor()` extracted so every lens shares
  one membership walk; `engine.setExtraLayers()` carries lens layers.
- **Overlay legend** (Legend pill) adapting to the active lens: branch
  swatches plus the board vocabulary (ribbons, portal ring, birth burst,
  decay, moment diamonds, threads, paradox) or the curve vocabulary.
- **Hover-pair glow**: hovering either end of a jump rings both endpoints
  and re-glows the ribbon.
- **Distance-eased tour**: flight time scales with world distance
  (450–1400ms), dwell starts on landing.
- Fixed a reactivity bug: `syncUrl` reads `selectedId`, so calling it
  tracked inside the engine-lifecycle effect recreated the engine on every
  tour step (see watch-outs — this is the second time this class of bug
  appeared). URL sync now goes through SvelteKit's `replaceState`.

## Known gaps / next candidates

- `svelte-check` currently crashes in this environment (TypeScript 7 pin vs
  svelte-check expecting ≤6) — pre-existing, not from this change.
- Mobile pinch is implemented but untested on a real device.
- Thumbnail draw order can overlap a ribbon at extreme zoom; consider a
  dedicated overlay pass.
- The story curve could show jump ribbons ghosted (its `jumps` are empty by
  design; a curve-specific variant is possible).
- A world-lines lens (Endgame click-to-trace) is the natural third lens.

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
