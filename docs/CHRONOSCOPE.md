# The Chronoscope

Our own timeline engine. Nothing off the shelf wowed us, so we are building
the instrument the Almanac deserves: a full-screen, pannable, zoomable canvas
that treats a story's timeline like a specimen under glass.

## Why bespoke

- **Build for big.** Today a specimen has 4–16 beats; the roadmap has combined
  franchise timelines and, eventually, a master timeline of every specimen
  (Histography/ChronoZoom scale). A Canvas 2D renderer with viewport culling
  and zoom-dependent detail has that headroom; retained-mode SVG does not,
  and graph libraries (Svelte Flow et al.) fight our lane geometry and hide
  their best features behind a pro tier.
- **Cool features over time.** Owning the render loop makes the fun list
  cheap: pulses travelling along jumps, guided play-through, era parallax,
  branch textures. Each is a draw call, not a dependency negotiation.

## Design language

- **Semantic zoom** answers "how does the user look at the entire timeline":
  - *far* — lanes, jump ribbons, nodes; a silhouette of the story's shape
  - *mid* (~0.55+) — dates under beats
  - *near* (~0.9+) — beat titles
  - *close* (~1.4+) — inline photo thumbnails on beats that have stills
  Detail appears by zooming, never by scrolling a page.
- **Comet ribbons.** A time jump is one filled tapered shape — swelling from
  the departure, thinning, then flaring into an integrated barbed head at the
  arrival — not a stroked line with a marker glued on. Forward jumps glow in
  `--color-jump`, backward jumps in the cool blue counterpart. The selected
  beat's ribbon carries a travelling pulse.
- **Theme-native.** The engine reads the app's CSS custom properties at open
  (`--color-panel`, `--color-paper`, `--color-line`, `--color-jump`, …) so the
  board is parchment in light mode and void-dark in dark mode, same as the
  rest of the Almanac.

## Architecture

```
src/lib/timeline/
  layout.ts       pure geometry shared by BOTH renderers: branch membership,
                  lane positions, base segments, splinters, leveled jump arcs,
                  off-timeline jumps. No DOM, no Svelte. One layout, two views.
  display.ts      shared presentation helpers (kind meta, date labels).
  chronoscope.ts  the canvas engine: camera, interactions, renderer.
src/lib/components/
  BranchingTimeline.svelte  the in-card SVG board (unchanged look), now
                            consuming layout.ts, with an Expand button.
  EventPanel.svelte         the image/text/tags detail panel, shared between
                            the card and the full-screen view.
  Chronoscope.svelte        the full-screen overlay: header, canvas, docked
                            EventPanel, keyboard + screen-reader layer.
```

### Camera and interaction

- `cam = { x, y, s }`; world→screen is a single affine transform.
- Drag pans (pointer capture); outside the content bounds movement gains
  resistance, and release springs back on a rAF tween (the rubber band).
- Wheel zooms about the cursor; two-pointer pinch zooms on touch.
- `prefers-reduced-motion` collapses all tweens to instant jumps.
- Guided tour: Play walks the beats in the current order, flying the camera
  beat to beat; any interaction hands control back to the user.

### Hit-testing and accessibility

Canvas gives up the DOM, so the overlay puts it back deliberately:

- pointer hit-testing against beat positions (nearest within tolerance);
- a visually-hidden list of real `<button>`s, one per beat, so screen
  readers and Tab users can select beats; arrow keys step the current order;
- the docked EventPanel is normal DOM — the narrative reading of the board
  is always available as text.

### Rendering notes

- Device-pixel-ratio aware; `ResizeObserver` re-renders on layout change.
- Renders on demand (interaction/tween/image-load), continuous rAF only
  while something animates (spring, tour, selection pulse).
- Beat thumbnails load through an image cache and draw cover-cropped into
  rounded frames; a beat with no still draws nothing (no poster noise).
- Culling: segments/beats outside the viewport are skipped, so event count
  scales past anything a single story will throw at it.

## Phases

1. **Engine core** (this pass): layout extraction, camera, rubber band,
   ribbons, tiers, selection, thumbnails, overlay shell, a11y layer.
2. **Tour + pulse polish**: eased camera choreography, dash pulse along the
   selected jump, hover glow linking a ribbon's two endpoints.
3. **Lenses**: the same layout data rendered as alternate views — branching
   world-lines (Endgame style), story curve (told × happened).
4. **The master timeline**: every specimen on one canvas, density skyline at
   far zoom, ChronoZoom-style nesting into a single specimen.
