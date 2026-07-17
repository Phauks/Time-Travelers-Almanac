# Chronoscope v2: analysis and plan

Feedback-driven next phase. The requests sort into five buckets; two are
pure UI, three need schema changes. The deep insight in the feedback is
that three complaints (dates not aligning across timelines, gap dashes,
saga lane ordering) are all symptoms of one root cause: the time model is
too weak. Fix the model once and all three fall out.

## A. Corner layout and quick controls (no schema)

The full screen becomes four corners plus the right sidebar:

- top-left: the title in a small rounded box, always present
- top-right: the minimap, spaced off the edges, left of the sidebar
- bottom-left: the legend, collapsed to a pill until toggled open
- bottom-right: the nav cluster (pan, zoom, fit as icon only, no label)
- the header bar above the canvas is REMOVED; ordering toggle, Full saga,
  traveler chips, and the close button move to the top of the right sidebar
- traveler chips gain an all-on / all-off button
- the event panel gets a fixed height relative to the viewport
  (max-height around 50vh) and scrolls internally past that

## B. The time model (schema)

Problem. `chrono` is a fractional year (1955.845). Two beats on the same
calendar day in different timelines carry different fractions, so they can
never align; "November 1955" sits at three different x positions. Gap
compression and jump-length labels are also derived from float arithmetic.

Change. Structured time on the event, with `chrono` kept as the derived
sort key:

    when?: {
      year: number;      // negative for BCE
      month?: number;    // 1-12
      day?: number;      // 1-31
      time?: string;     // "22:04", display only
    }

- alignment: beats sharing a calendar day (or month, when day is absent)
  form one column across all lanes; the traveler's-path view aligns
  columns wherever narrative adjacency allows
- gap notches: when a lane segment spans a large real gap that the layout
  compresses, the segment renders solid, then a short dashed notch at its
  centre, then solid again; strongest effect in the traveler's path,
  where uniform stepping otherwise hides thirty-year gaps
- jump labels compute from real dates: "30 Years", "1 Week", "2 Days",
  never abbreviations
- migration: `when` is optional; existing fractional `chrono` values keep
  working until each specimen is upgraded, and `chronoStartLabel` remains
  the display string

## C. Cast and presence (schema)

Problems. Travelers are bare strings; variants exist only by naming
convention ("Doc (1955)"); no images; presence rings fail with several
people on one beat and lean on colour alone; the Doc who ends BTTF I
(having lived 1955-1985 with the letter) is not the Doc who started it.

Change. A cast registry per entry:

    cast?: CastMember[];

    interface CastMember {
      id: string;          // 'doc-1955'
      name: string;        // 'Doc (lived through)'
      person: string;      // 'Doc': groups variants of one human
      variant?: string;    // one line on what makes this variant distinct
      color?: string;      // override; otherwise assigned
      images?: {           // portrait can CHANGE as the story scars them
        src: string;
        fromEvent?: string; // active from this beat onward (narrative order)
        credit?: string;
      }[];
    }

Events reference cast ids in `travelers`. Rendering replaces the rings
with a row of small round avatar tokens beneath each beat: one token per
present traveler, image-first (initial-letter chip as fallback), readable
at distance, no colour-only encoding, stacks cleanly for multiple people.
Chips in the sidebar toggle each cast member; variants of one person list
together but toggle separately. BTTF I data work: the closing beats move
from 'Doc' to the lived-through Doc variant.

## D. Photo nodes and label collision (render)

- beats that have a still render AS the still: a circle-cropped photo
  token ringed in the branch colour, at every zoom tier (scaled), with the
  plain dot as fallback; the event panel drops its image region and gains
  the space for text (the lightbox link remains)
- label collision pass: measure every date/title label, then place with a
  greedy interval sweep per text row; colliding labels alternate above /
  below the lane or drop by priority (selected first, then hovered, then
  the rest); no label may overlap another

## E. Saga lane identity (schema + canon mapping)

Problem. Stitching prefixes every branch, so the saga shows eight lanes
ordered by first appearance x (I1, III1, III2, I2, ...). But some lanes
are canonically the SAME timeline: the restored line Marty returns to at
the end of I is the line II departs from.

Change. A franchise-level identity on Branch:

    sameAs?: { entry: string; branch: string };

Stitching union-finds `sameAs` chains onto one shared lane: one row, one
label (from the earliest part), events from all parts interleaved on it.
Lane vertical order becomes first-chronological-beat, earliest at top.

Proposed BTTF mapping (needs canon confirmation):

- II.prime      sameAs I.restored     (the repaired 1985 both films share)
- III.original  sameAs II.restored    (the line the DeLorean leaves from 1955)
- II and I keep their own endangered branches (I.divergent is Marty's 1955
  wobble; II.dystopia is Biff's 1985-A; they are distinct histories)

If the intended reading is instead that I2 and II2 are one timeline, the
mechanism is identical; only the mapping rows change.

## Open question

"In As Happened view, the events toggle from oldest to newest, not
following the time stream." Two readings:

1. stepping should follow the causal stream: walk a timeline through its
   beats (and across its jumps) before moving to the next branch, rather
   than strict calendar order hopping between lanes
2. strict calendar order is right, but the current tie-breaking feels wrong

Reading 1 is assumed for planning (it matches "following the time
stream"), but this changes navigation behaviour and needs a yes.

## Build order

1. A: corner layout, controls, panel height (fast, no risk)
2. C: cast schema + avatar presence (replaces rings; unlocks images)
3. D: photo nodes + label collision (biggest visual payoff)
4. B: structured time (deepest change; alignment, notches, exact labels)
5. E: saga identity (blocked on the canon mapping above)

Each step lands green (tests, content gate, build) and deploys on its own.
