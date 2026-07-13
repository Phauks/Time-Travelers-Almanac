# Content schema

All content lives in `src/lib/types.ts` (the shapes) and
`src/lib/data/specimens.ts` (the entries). This note reviews the model and how
to extend it, including the planned visitor-contribution flow.

## The three axes

Every entry is tagged on three independent axes, so a work can be described
without forcing it into one bucket:

- **Rule** (`fixed | mutable | branching`): what happens when you change the
  past. This is the core classification; each rule has its own page.
- **Mode** (`contraption | anomaly | relic | relativistic | sleep | mind`): how
  travel happens. An array, since some works mix modes.
- **Loop** (`groundhog | deathloop | causal | null`): an optional repeating
  condition layered on top.

## MediaEntry

Identity and grouping: `slug`, `title`, `year`, `released` (full date), `medium`,
`saga` (a franchise key; the UI now says "franchise", the field kept its old
name to avoid a churny rename), `continuity`, `partOrder`.

Editorial: `logline`, `synopsis`, `aliases`, `mechanism`, `fieldNote`,
`paradoxes`, `paradoxRisk`.

Art and links: `poster`, `trailer`, `ratings`, `links`, `sources`, plus keyless
lookup hints `wikidata` (QID) and `isbn`. `poster`/`trailer`/`ratings` are filled
by `scripts/enrich.mjs` at build time and merged over any authored values.

Timeline: `branches` (the parallel timelines) and `timeline` (the events).

### Known legacy fields

- `related` (superseded by the computed `relatedSpecimens`)
- `imageSource` (free text placeholder from before the enrichment pipeline)
- `TimelineEvent.variant` (superseded by `branch`)
- `EventKind` aliases `normal`/`jump` (kept for old data)

These are safe to leave, but new entries should not use them.

## TimelineEvent

Ordering uses two numbers so the "As Told" and "As Happened" views can differ:

- `narrative`: the order the audience experiences the beat.
- `chrono` (+ optional `chronoEnd`): the real in-story time, used to sort and to
  compute whether a jump goes forward or back. `chronoLabel` / `chronoEndLabel`
  are the display strings.

Time travel is expressed per event:

- `jumpTo`: a jump landing on another event **on this timeline**.
- `jumpToLabel` / `jumpFromLabel`: a jump whose other end is **off this
  timeline** (another era or another work), drawn as a labelled cap. Pair a
  departure with `crossRef` to link the continuing work.
- `traveler`: who makes the jump, so several independent travellers can coexist.
- `branch`: which parallel timeline the beat sits on (explicit, because a story
  can hop between timelines out of narrative order).

Media: `image` + `imageCredit` (attribution is required for CC-licensed art).
`source` records which work a beat came from, for future combined franchise
timelines.

## Adding a new entry

1. Append a `MediaEntry` to the relevant file under `src/lib/data/`.
2. Give every timeline event a stable `id`, a `narrative` index, and a `chrono`.
3. Wire jumps with `jumpTo` (on-timeline) or `jumpToLabel`/`jumpFromLabel`
   (off-timeline). Mark the departure event `kind: 'departure'`.
4. Add an IMDb link (screen media) or `isbn` (books) so enrichment can find a
   poster, trailer, and scores. No keys are needed for Wikidata/Open Library.
5. Run `node scripts/content-lint.mjs` (bans em dash, en dash, middot).

## Visitor contributions (planned)

The model is ready for a submission flow via the `Contribution` type and the
optional `MediaEntry.contributed` field:

- A submission sets `contributed.status = 'proposed'` and records `by` and
  `source`.
- Only `status === 'published'` should ever be built into the live catalogue;
  the data layer can filter on it.
- The same shape can gate contributed timeline edits and images, and
  `imageCredit` keeps attribution attached to user-supplied art.

Because the catalogue is a static build, the practical path is: collect
submissions out of band (an issue form, a serverless endpoint, a separate
`contributions.json`), review them, then merge approved records into
`src/lib/data`. Nothing user-supplied should reach the build unreviewed.
