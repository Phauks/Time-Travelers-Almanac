// The Almanac's content model. Every specimen is tagged on three independent
// axes — Rule (what happens when you meddle), Mode (how you travel), and Loop
// (an optional special condition) — and may carry its own timeline.

export type Rule = 'fixed' | 'mutable' | 'branching';
export type Mode = 'contraption' | 'anomaly' | 'relic' | 'relativistic' | 'sleep' | 'mind';
export type Loop = 'groundhog' | 'deathloop' | 'causal';
export type Medium = 'film' | 'tv' | 'book' | 'game' | 'stage' | 'comic';
export type ParadoxRisk = 'low' | 'medium' | 'high';

export interface TimelineEvent {
	id: string;
	label: string;
	/** order the audience experiences it (0-based) */
	narrative: number;
	/** sortable "real" time — a year or an abstract index */
	chrono: number;
	/** how to display the chrono position, e.g. "1955" */
	chronoLabel?: string;
	kind?: 'origin' | 'normal' | 'jump' | 'loop';
	/** event id this jumps to (draws an arc) */
	jumpTo?: string;
	/** a crossing into another specimen's timeline (franchise continuity) */
	crossRef?: { entry: string; event: string };
}

export interface MediaEntry {
	slug: string;
	title: string;
	year: number;
	medium: Medium;
	/** franchise / shared-continuity grouping, e.g. "terminator" */
	saga?: string;

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

	timeline: TimelineEvent[];
}
