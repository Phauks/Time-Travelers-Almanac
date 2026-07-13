import type { Loop, Medium, Mode, Rule } from '$lib/types';
import { specimens } from './specimens';

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

export const MODE_META: Record<Mode, string> = {
	contraption: 'Contraption',
	anomaly: 'Natural anomaly',
	relic: 'Relic & ritual',
	relativistic: 'Relativistic',
	sleep: 'The long sleep',
	mind: 'Mind over time'
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

/** Other entries in the same saga, in part order (the "same timeline" set). */
export function sagaMates(entry: MediaEntry): MediaEntry[] {
	if (!entry.saga) return [];
	return specimens
		.filter((s) => s.slug !== entry.slug && s.saga === entry.saga)
		.sort((a, b) => (a.partOrder ?? 0) - (b.partOrder ?? 0));
}

/**
 * Related specimens, computed from shared traits (rule, mode, loop) rather than
 * hand-listed. Excludes saga-mates, which get their own section.
 */
export function relatedSpecimens(entry: MediaEntry, limit = 6): MediaEntry[] {
	const mates = new Set(sagaMates(entry).map((s) => s.slug));
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
