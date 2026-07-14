# Handover: the timeline component

Where the timeline stands and where it is going. The component is
`src/lib/components/BranchingTimeline.svelte`. It is now one coherent card:
a header (title + As Told/As Happened toggle + Legend button), the board, and
a three-region event panel (image, text, tags). The board scales with the
number of events (a fixed step per beat) so long stories scroll rather than
compress. Legend content lives in one `legendBody` snippet, shown by hovering
the title or toggling the Legend button; there is no permanent legend strip.

## Done in the latest pass

- Single card with header/board/panel; title header shows the media name.
- Legend on title hover and via a Legend button overlaid on the board.
- Board scales (`W = ML + MR + (n-1)*STEP`) and scrolls; fills the column when
  short (`svg { width: 100% }` with an inline `min-width`).
- Event panel is three regions: image left, text right, tags beneath.
- Timeline branch descriptors dropped (only show a name if the fiction names
  the timeline, Steins;Gate style; `Branch.label` is that name).
- Reserved image slot: beat still, else dimmed poster, else a blank note.
- Video is a native YouTube `<iframe>` (youtube-nocookie), autoplay off,
  `controls=1`; play/pause are YouTube's own.

## Next: a full-screen, draggable timeline view (requested)

Goal: a button on the card opens the timeline full screen, board filling the
width, the event detail docked on the right. The board becomes an infinite
pan/zoom canvas that eases back toward the timeline when released, and events
show thumbnails inline.

Suggested approach:

1. **Shell**: a fixed overlay (like `Lightbox`/`VideoModal`) holding the board
   left and a persistent event panel right. Reuse the same `pos`/`segParts`/
   `jumpsLeveled` derivations; only the container and interaction change.
2. **Pan/zoom**: track `tx, ty, scale` state; apply as a transform on a single
   group. Pointer drag updates `tx/ty`; wheel/pinch updates `scale` about the
   cursor. On pointer-up, animate `tx/ty` back so the nearest lane re-centres
   (a spring or eased tween on a rAF loop; remember `Date.now()` is unavailable
   in workflow scripts but fine in component code).
3. **Bounds/"pull back"**: clamp softly. When released outside a comfortable
   range, tween back to the clamped value (rubber-band).
4. **Thumbnails on beats**: when a beat has `image`, render a small clipped
   image at the node (SVG `<image>` with a `clipPath`, or an HTML overlay
   positioned from `pos`). Fall back to nothing (not the poster) on the board
   to avoid noise.
5. **Spacing**: keep the `STEP` model; in the big view raise `STEP` and node
   size so it feels roomy.

## Rendering: is SVG right? Alternatives to investigate

SVG is fine for correctness but the arrowheads look stiff and per-node HTML
(thumbnails, rich labels) is awkward inside `<svg>`. Options, cheapest first:

- **Hybrid SVG + HTML overlay (recommended next step).** Keep SVG for the
  lines/arcs (crisp, easy geometry) but render nodes, thumbnails, and labels as
  absolutely-positioned HTML over the SVG, placed from the same `pos` numbers.
  Best of both: vector arrows, real DOM for media and interaction. Low risk,
  incremental.
- **Canvas 2D.** Draw everything imperatively. Great for many nodes and smooth
  pan/zoom; you lose easy hit-testing and accessibility (must re-implement).
  Worth it only if event counts get large.
- **A graph/flow library** (e.g. Svelte Flow / xyflow, or D3 for layout only).
  Gives pan/zoom, nodes-as-components, and edges out of the box; cost is a
  dependency and bending its edge routing to our jump/branch semantics.
- **WebGL (PixiJS/regl)** only if this becomes a giant, animated canvas; likely
  overkill.
- **Nicer arrows regardless of tech**: curved cubic paths with a tapered
  (filled path) arrowhead rather than a stroked marker; animate a dash offset
  along a jump to suggest travel; ease node radius on select.

## Fun directions (design, not urgent)

- Animate a pulse travelling along a jump arc when it is selected.
- Parallax the lanes slightly on pan; subtle grid or "era" bands behind.
- A "play" control that walks the beats in order, panning the canvas.
- Distinct textures per rule (fixed = engraved, mutable = ink-bleed,
  branching = split), tying the timeline to the three-rule identity.
- Hover a jump to highlight its departure and arrival nodes together.

## Watch-outs

- Keep the board derivations pure functions of `events`/`branches`; the
  `{#key slug}` wrapper in the dossier remounts on navigation, so avoid relying
  on persisted internal state.
- `overflow-x: clip` on `body` prevents stray horizontal scroll; a full-screen
  canvas should manage its own bounds rather than causing page scroll.
