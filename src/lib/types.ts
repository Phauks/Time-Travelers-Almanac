// The Almanac's content model. Every specimen is tagged on three independent
// axes — Rule (what happens when you meddle), Mode (how you travel), and Loop
// (an optional special condition) — and may carry its own timeline.

export type Rule = 'fixed' | 'mutable' | 'branching';
export type Mode = 'contraption' | 'anomaly' | 'relic' | 'relativistic' | 'sleep' | 'mind';
export type Loop = 'groundhog' | 'deathloop' | 'causal';
export type Medium = 'film' | 'tv' | 'book' | 'game' | 'stage' | 'comic';
export type ParadoxRisk = 'low' | 'medium' | 'high';

/**
 * A canon within a saga. Different continuities can flatly contradict each
 * other (the films vs the animated series vs the games vs the comics) and are
 * kept side-by-side rather than reconciled.
 */
export type Continuity =
	| 'film'
	| 'animated'
	| 'telltale-game'
	| 'nes-game'
	| 'harvey-comics'
	| 'idw-comics'
	| 'novel'
	| 'other';

/** A citation for a specimen's data, so accuracy is auditable and self-contained. */
export interface SourceRef {
	label: string;
	url: string;
}

export type EventKind =
	| 'origin' // the story's starting point in time
	| 'event' // an ordinary beat
	| 'departure' // a time jump leaves from here
	| 'arrival' // a traveller lands here
	| 'return' // a traveller comes back to their home era
	| 'loop' // a repeat / reset
	// legacy aliases still accepted by the renderer
	| 'normal'
	| 'jump';

export interface TimelineEvent {
	id: string;
	label: string;
	/** order the audience experiences it (0-based) */
	narrative: number;
	/** sortable "real" time — a year (may be fractional) or an abstract index */
	chrono: number;
	/** how to display the moment, e.g. "Nov 12, 1955 · 10:04 PM" */
	chronoLabel?: string;
	/** what happens in this beat */
	description?: string;
	/** where it happens, e.g. "Courthouse Square, Hill Valley" */
	location?: string;
	kind?: EventKind;
	/** event id a time jump lands on (draws an arc) */
	jumpTo?: string;
	/** which version of the timeline this belongs to, e.g. "prime-1985" | "altered-1985" */
	variant?: string;
	/** which saga part this event belongs to (for combined saga timelines) */
	part?: string;
	/** a crossing into another specimen's timeline (franchise continuity) */
	crossRef?: { entry: string; event: string };
}

export interface MediaEntry {
	slug: string;
	title: string;
	year: number;
	medium: Medium;
	/** franchise grouping, e.g. "back-to-the-future" */
	saga?: string;
	/** which canon within the saga this entry belongs to */
	continuity?: Continuity;
	/** order within its continuity (e.g. film 1, 2, 3) */
	partOrder?: number;

	rules: Rule[]; // some works are hybrids
	mode: Mode[];
	loop: Loop | null;

	/** position on the shared prime line, 0 (deep past) … 1 (deep future) */
	destEra: number;
	/** where it travels to, e.g. "1955" */
	destLabel: string;

	logline: string; // one cheeky sentence
	mechanism: string; // how travel works in-universe
	paradoxes: string[];
	paradoxRisk: ParadoxRisk;
	fieldNote?: string;
	related?: string[]; // slugs

	/** where hero/still art will come from (differs by medium) */
	imageSource: string;
	/** citations backing this entry's data */
	sources?: SourceRef[];

	timeline: TimelineEvent[];
}
