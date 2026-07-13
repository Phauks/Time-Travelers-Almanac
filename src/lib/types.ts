// The Almanac's content model. Every specimen is tagged on three independent
// axes: Rule (what happens when you meddle), Mode (how you travel), and Loop
// (an optional special condition), and may carry its own branching timeline.

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

/** An outbound link (IMDb, Rotten Tomatoes, Steam, where-to-watch, etc.). */
export type LinkKind =
	| 'imdb'
	| 'rottentomatoes'
	| 'metacritic'
	| 'steam'
	| 'watch'
	| 'wikipedia'
	| 'official'
	| 'other';

export interface LinkRef {
	kind: LinkKind;
	url: string;
	/** overrides the default label for the kind */
	label?: string;
}

/** Aggregator scores. rtAudience has no free API, so it is entered by hand. */
export interface Ratings {
	/** IMDb, out of 10 */
	imdb?: number;
	/** Metacritic metascore, out of 100 */
	metacritic?: number;
	/** Rotten Tomatoes critics (Tomatometer), percent */
	rtCritic?: number;
	/** Rotten Tomatoes audience, percent */
	rtAudience?: number;
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
	/** sortable "real" time: a year (may be fractional) or an abstract index */
	chrono: number;
	/** how to display the moment, e.g. "Nov 12, 1955 · 10:04 PM" */
	chronoLabel?: string;
	/** what happens in this beat */
	description?: string;
	/** where it happens, e.g. "Courthouse Square, Hill Valley" */
	location?: string;
	kind?: EventKind;
	/** event id a time jump lands on */
	jumpTo?: string;
	/** which timeline branch this beat lives on (see MediaEntry.branches) */
	branch?: string;
	/** legacy: superseded by `branch` */
	variant?: string;
	/** which saga part this event belongs to (for combined saga timelines) */
	part?: string;
	/** which media/part this beat is sourced from, shown on combined master timelines */
	source?: string;
	/** flags a paradox or continuity error at this beat, with an explanation */
	paradox?: string;
	/** an image for this point on the timeline */
	image?: string;
	/** a crossing into another specimen's timeline (franchise continuity) */
	crossRef?: { entry: string; event: string };
}

/**
 * A branch of a timeline. A new branch splinters off its parent whenever the
 * future is changed (e.g. Marty's arrival, then the dance that restores him).
 */
export interface Branch {
	id: string;
	label: string;
	/** the branch this one splinters from */
	parent?: string;
	/** event id at which it splinters from its parent */
	branchAt?: string;
	status?: 'original' | 'active' | 'endangered' | 'erased' | 'restored';
	/** one line on what this branch is */
	note?: string;
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

	/** position on the shared prime line, 0 (deep past) to 1 (deep future) */
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
	/** outbound links: IMDb, Rotten Tomatoes, Steam, where-to-watch, etc. */
	links?: LinkRef[];
	/** aggregator scores */
	ratings?: Ratings;

	/** the branches of this entry's timeline (splinters when the future changes) */
	branches?: Branch[];
	timeline: TimelineEvent[];
}
