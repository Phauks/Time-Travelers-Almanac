# The Time Traveller's Almanac — Project Plan & Research

> *"In the event that you have become unstuck in time, please remain calm and consult the relevant chapter. Do not attempt to attend your own birth until you have finished reading."*

A cheeky, Hitchhiker's-Guide-style field guide for anyone who finds themselves
mid-loop, mid-jump, or mid-paradox and needs to work out **what kind of time
travel they're dealing with** and **what they're allowed to do about it.**

---

## 1. The Concept

The site is framed as a *guidebook you consult in an emergency*. A visitor
arrives, picks the symptoms of their situation ("I keep reliving Tuesday",
"a photograph of me is fading", "there are now two of me"), and the Almanac
diagnoses their **temporal predicament**, cross-references the **media** that
document the same phenomenon, and lets them **walk the timeline** of any of
those stories to see how it plays out.

Three things a visitor can do:

1. **Diagnose** — browse/filter media by the *rules* and *mode* of time travel.
2. **Study a specimen** — a per-media page: the rules, the method, key
   paradoxes, and stills/art from the work.
3. **Walk the timeline** — an interactive timeline of a given story, toggleable
   between *narrative order* (the order you watch it) and *chronological order*
   (the order it "really" happens), with jumps and loops drawn as arcs.

---

## 2. The Classification System (the content spine)

Based on the MinutePhysics *"Time Travel in Fiction Rundown"* framework, extended
with mode + loop axes. Every media entry is tagged on three independent axes.

### Axis A — THE RULES (what happens when you meddle)

| Rule | Almanac nickname | Defining law | Watch out for | Canonical example |
|---|---|---|---|---|
| **Fixed / Self-Consistent** | *The Stone Tape* | You can't change the past — your trip was always part of history (Novikov self-consistency). | Bootstrap / causal loops; you *cause* the thing you tried to prevent. | *12 Monkeys*, *Prisoner of Azkaban* |
| **Mutable / Overwriting** | *The Palimpsest* | One timeline. Change the past and the present redraws around you. | Fading photographs, erasing yourself, butterfly effects. | *Back to the Future* |
| **Branching / Multiverse** | *The Fork* | Change the past and reality splits; the original carries on without you. | You can never go *home*, only sideways. | *Star Trek (2009)*, *Endgame* |

### Axis B — THE MODE (how you travel)

- **Contraption** — a machine (DeLorean, TARDIS, the Time Machine, Tenet turnstile)
- **Natural Anomaly** — wormhole, standing stones, comet, black hole
- **Relic & Ritual** — artifact or magic (Time-Turner, a spell, a wish)
- **Relativistic** — near-light travel / gravity well; forward-only time dilation
- **The Long Sleep** — cryo/hibernation; forward-only
- **Mind Over Time** — consciousness leaps, precognition, "unstuck" perception

### Axis C — THE LOOP (optional special condition)

- **Groundhog Loop** — a period repeats; the traveller keeps their memory
- **Death Loop / Respawn** — the loop resets on death
- **Causal Loop** — predestination; the effect is its own cause

This 3-axis tagging is what powers filtering, the "diagnose your predicament"
flow, and cross-referencing ("other specimens that share this rule").

---

## 3. Recommended Tech Stack

| Concern | Recommendation | Why |
|---|---|---|
| Framework | **SvelteKit** + `@sveltejs/adapter-static` | You asked for Svelte; static adapter → clean GitHub Pages deploy, no server. |
| Language | **TypeScript** | Typed content schema keeps 100+ entries consistent. |
| Styling | **Tailwind CSS v4** | Fast to build the "almanac" look; see note below on the alternative. |
| Animation | **anime.js** | Great for the timeline "jump" arcs, page transitions, loop pulses. |
| Content | **Typed content collection** (`.ts`/`.json` per entry, or Markdown+frontmatter via `mdsvex`) | Data-driven pages; one schema, many entries; easy to seed & PR. |
| Timeline | Custom **SVG** component + anime.js | Full control over jumps/loops as arcs; scales to any story. |
| Hosting | **GitHub Pages** via GitHub Actions | Free, matches "fun side project". |

**On Tailwind** — it's the pragmatic pick and I'd default to it. The one thing
worth weighing: the Almanac wants a strong, opinionated *print/woodcut* aesthetic
(serif display faces, hairline rules, aged-paper texture). That's very doable in
Tailwind with a custom theme, but if you'd rather lean fully bespoke,
**vanilla CSS with @layer + design tokens** or **UnoCSS** are the credible
alternatives. My recommendation: Tailwind v4 with a custom "almanac" theme.

### GitHub Pages specifics (already scoped, no surprises)
- `adapter-static` with `paths.base` set to the repo name (`/Time-Travelers-Almanac`).
- A `.nojekyll` file and a deploy workflow (`.github/workflows/deploy.yml`).
- All internal links go through `base` so they work under the subpath.

---

## 4. Data Model (draft schema)

```ts
type Rule = 'fixed' | 'mutable' | 'branching';
type Mode = 'contraption' | 'anomaly' | 'relic' | 'relativistic' | 'sleep' | 'mind';
type Loop = 'groundhog' | 'deathloop' | 'causal' | null;
type Medium = 'film' | 'tv' | 'book' | 'game' | 'stage' | 'comic';

interface MediaEntry {
  slug: string;
  title: string;
  year: number;
  medium: Medium;
  rules: Rule[];        // some works are hybrids
  mode: Mode[];
  loop: Loop;
  logline: string;      // one cheeky sentence
  mechanism: string;    // how travel works in-universe
  paradoxes: string[];  // e.g. 'bootstrap', 'grandfather'
  images: { src: string; credit: string; caption?: string }[];
  timeline?: TimelineEvent[];   // optional, powers the walk-the-timeline view
}

interface TimelineEvent {
  id: string;
  label: string;
  narrativeIndex: number;   // order you experience it
  chronoYear: number;       // when it "really" happens
  jumpTo?: string;          // event id this jumps to (draws an arc)
  loopBack?: string;        // event id this loops to
}
```

The two indices per event (`narrativeIndex` vs `chronoYear`) are what make the
timeline toggle between "as told" and "as happened" — the signature feature.

---

## 5. The "Walk the Timeline" Feature

For each story with timeline data:
- A horizontal, scrollable rail of events.
- A toggle: **As Told ⇄ As Happened**. anime.js re-tweens the nodes between the
  two orderings so you *see* the story unscramble.
- **Jumps** and **loops** drawn as SVG arcs above/below the rail.
- A global **meta-timeline** ("all of media, by era travelled to") as a stretch
  goal.

Feasible for hand-authored stories (BTTF, Primer, Dark, Steins;Gate, Terminator).
Complexity is bounded by how much timeline data we author per entry — it's
optional per entry, so we ship simple ones first and add rich ones over time.

---

## 6. Open Decisions (need your call)

1. **Images / IP.** Using real film stills on a public site is fan-project-common
   but technically fair-use-adjacent. Options:
   - **TMDB API** posters/stills with required attribution (clean, legal-ish).
   - Curated small **fair-use stills**.
   - **Commissioned/stylized SVG "woodcut" scene art** — dodges IP *and* nails the
     almanac aesthetic. My lean: TMDB posters + our own woodcut art for hero images.
2. **Scaffold now?** — whether to stand up the SvelteKit app + one sample entry
   + working timeline as the next step.
3. **Styling** — Tailwind (recommended) vs bespoke CSS.

---

## 7. Suggested Roadmap

- **Phase 0** — this plan + the 100-media seed list *(done, in `docs/`)*.
- **Phase 1** — Scaffold SvelteKit + Tailwind + adapter-static; GH Pages deploy
  pipeline; the 3-axis data schema; 5 fully-authored specimen entries.
- **Phase 2** — Browse/diagnose UI (filter by Rule/Mode/Loop) over the full 100.
- **Phase 3** — Walk-the-Timeline component + 5 richly-authored timelines.
- **Phase 4** — Aesthetic pass (woodcut theme, anime.js transitions), meta-timeline.

---

## Sources
- [MinutePhysics — *Time Travel in Fiction Rundown*](https://www.youtube.com/watch?v=d3zTfXvYZ9s)
- [Time travel in fiction — Wikipedia](https://en.wikipedia.org/wiki/Time_travel_in_fiction)
- [List of films featuring time loops — Wikipedia](https://en.wikipedia.org/wiki/List_of_films_featuring_time_loops)
- [Temporal Mutability — TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/TemporalMutability)
