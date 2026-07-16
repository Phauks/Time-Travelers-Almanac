import type { Loop, Medium, Mode, Ratings, Rule } from '$lib/types';
import { specimens } from './specimens';
import enrichment from './enrichment.json';

// merge build-time enrichment (posters, trailers, refreshed scores) over authored data
for (const s of specimens) {
	const e = (
		enrichment as Record<string, { poster?: string; trailer?: string; ratings?: Partial<Ratings> }>
	)[s.slug];
	if (!e) continue;
	if (e.poster) s.poster = e.poster;
	if (e.trailer) s.trailer = e.trailer;
	if (e.ratings) s.ratings = { ...(s.ratings ?? {}), ...e.ratings };
}

export { specimens };

export function getSpecimen(slug: string) {
	return specimens.find((s) => s.slug === slug);
}

export const RULE_META: Record<
	Rule,
	{ name: string; nickname: string; token: string; law: string }
> = {
	fixed: {
		name: 'Fixed',
		nickname: 'The Stone Tape',
		token: 'fixed',
		law: 'You cannot change the past  -  your trip was always part of history.'
	},
	mutable: {
		name: 'Mutable',
		nickname: 'The Palimpsest',
		token: 'mutable',
		law: 'One timeline. Change the past and the present redraws around you.'
	},
	branching: {
		name: 'Branching',
		nickname: 'The Fork',
		token: 'branching',
		law: 'Change the past and reality splits; the original carries on without you.'
	}
};

/** Long-form copy for each rule's own page. */
export const RULE_DETAIL: Record<
	Rule,
	{ tagline: string; body: string[]; tell: string; paradoxes: string }
> = {
	fixed: {
		tagline: 'The past is already written, and it always included your visit.',
		body: [
			'Under the Fixed rule there is one history and it cannot be edited, because every trip you take was already part of it. You do not travel back to change events; you travel back to cause the events you always caused. The universe is self consistent, and any attempt to break that consistency simply fails, often in the exact way that produces the outcome you were trying to avoid.',
			'Physicists call this the Novikov self consistency principle: the probability of anything that would create a contradiction is zero. A bullet meant for your grandfather jams. A warning you shout goes unheard, or is the very thing that sets the tragedy in motion. Free will is intact, but the ledger always balances.',
			'It is the least paradoxical of the three rules and the most fatalistic. There are no alternate versions of you and no second chances, only the slow realisation that you were always a thread in the weave.'
		],
		tell: 'A character tries to change the past and discovers they were the cause all along.',
		paradoxes: 'Predestination and bootstrap loops thrive here; grandfather paradoxes cannot occur.'
	},
	mutable: {
		tagline: 'One timeline, written in pencil. Change the past and the present redraws around you.',
		body: [
			'The Mutable rule keeps a single timeline but lets you overwrite it. Alter an event in the past and the present is redrawn to match, sometimes instantly, sometimes creeping forward like ink soaking through a page. There is only ever one "now", and it is whatever your last edit made it.',
			'This is the rule of the cautionary tale, because you can erase the good along with the bad, up to and including yourself. A photograph fades. A sibling vanishes. The traveller races to restore a chain of events before the change catches up with them. Cause and effect still run forward, but the past is a variable, not a constant.',
			'Its great weakness is logical: if you undo the reason you travelled, why did you travel? Mutable stories survive on momentum and rarely stop to answer, which is part of their charm.'
		],
		tell: 'A change in the past visibly rewrites the present, and can threaten the traveller.',
		paradoxes: 'Prone to the grandfather paradox and to self erasure; the timeline is one long palimpsest.'
	},
	branching: {
		tagline: 'Change the past and reality forks. The original carries on without you.',
		body: [
			'Under the Branching rule you cannot truly change your own past, because the moment you alter it you are no longer in it. Your meddling spawns a new timeline that diverges from the point of the change, while the original continues, untouched, somewhere you can no longer reach.',
			'This is the many worlds answer to the grandfather paradox: you can shoot your grandfather, but only in a branch where you were never born to make the trip, which is fine, because the you doing the shooting came from a different branch entirely. Nothing contradicts, because everything that can happen simply does, each on its own line.',
			'The cost is loss. Fixing a timeline often means abandoning the people on the broken one, who go on living a history you chose to leave. Branching stories are quietly the saddest, because every rescue is also a desertion.'
		],
		tell: 'Meddling spawns a divergent timeline; the original is not saved, only left behind.',
		paradoxes: 'Sidesteps the grandfather paradox entirely, at the price of proliferating worlds.'
	}
};

export const MODE_META: Record<Mode, string> = {
	contraption: 'Contraption',
	anomaly: 'Natural anomaly',
	relic: 'Relic & ritual',
	relativistic: 'Relativistic',
	sleep: 'The long sleep',
	mind: 'Mind over time',
	inverted: 'Inverted entropy',
	precognition: 'Vision of fate'
};

/** one-line hover explanations for each travel mode */
export const MODE_BLURB: Record<Mode, string> = {
	contraption: 'A built machine does the travelling: a car, a booth, a chamber.',
	anomaly: 'A natural rift or place where time misbehaves; nobody built it.',
	relic: 'An object or rite with power over time: a watch, a book, a ritual.',
	relativistic: 'Physics does it honestly: near-light speed or deep gravity wells.',
	sleep: 'The traveller simply outsleeps the calendar and wakes in the future.',
	mind: 'Only consciousness travels; the body stays where (and when) it was.',
	inverted: 'Entropy runs backwards; the traveller moves against time itself.',
	precognition: 'No body moves at all: the future arrives as visions of fate.'
};

export const LOOP_META: Record<Loop, string> = {
	groundhog: 'Groundhog loop',
	deathloop: 'Death loop',
	causal: 'Causal loop'
};

export const MEDIUM_META: Record<Medium, string> = {
	film: 'Film',
	tv: 'TV',
	book: 'Book',
	game: 'Game',
	stage: 'Stage',
	comic: 'Comic'
};

/** CSS custom property for a rule's colour, e.g. `var(--color-fixed)` */
export function ruleColorVar(rule: Rule): string {
	return `var(--color-${rule})`;
}

/** Other entries in the same franchise, in part order (the "same timeline" set). */
export function franchiseMates(entry: MediaEntry): MediaEntry[] {
	if (!entry.franchise) return [];
	return specimens
		.filter((s) => s.slug !== entry.slug && s.franchise === entry.franchise)
		.sort((a, b) => (a.partOrder ?? 0) - (b.partOrder ?? 0));
}

/**
 * Related specimens, computed from shared traits (rule, mode, loop) rather than
 * hand-listed. Excludes franchise-mates, which get their own section.
 */
export function relatedSpecimens(entry: MediaEntry, limit = 6): MediaEntry[] {
	const mates = new Set(franchiseMates(entry).map((s) => s.slug));
	return specimens
		.filter((s) => s.slug !== entry.slug && !mates.has(s.slug))
		.map((s) => {
			let score = 0;
			score += s.rules.filter((r) => entry.rules.includes(r)).length * 3;
			score += s.mode.filter((m) => entry.mode.includes(m)).length * 2;
			if (s.loop && s.loop === entry.loop) score += 2;
			if (s.medium === entry.medium) score += 1;
			return { s, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((x) => x.s);
}
