// Shared presentation helpers for timeline beats, used by the SVG card,
// the event panel, and the Chronoscope.

import type { EventKind, TimelineEvent } from '$lib/types';

// icons live in kindIcons.ts so this module stays free of Svelte imports
// (it is consumed by pure layout code and by the unit tests)
export const KIND_META: Record<EventKind, { label: string; blurb: string }> = {
	origin: { label: 'Origin', blurb: "The story's starting point in time." },
	departure: { label: 'Time jump', blurb: 'A time machine fires here; the traveller leaves this moment.' },
	arrival: { label: 'Arrival', blurb: 'A traveller lands here from another time.' },
	return: { label: 'Return', blurb: 'The traveller comes back to their home era.' },
	loop: { label: 'Loop', blurb: 'A repeat or reset; this moment happens more than once.' },
	event: { label: 'Event', blurb: 'An ordinary beat of the story; no travel here.' }
};

/** one-line meaning of each branch status, for hovers */
export const STATUS_BLURB: Record<string, string> = {
	original: 'The unaltered history, as it stood before any meddling.',
	active: 'A live timeline; events here are still in play.',
	endangered: 'This history is being overwritten; it is fading from existence.',
	erased: 'Overwritten history; this timeline no longer exists.',
	restored: 'A repaired line; history set right (or close to it) again.'
};

export const kindMeta = (e: TimelineEvent) => KIND_META[e.kind ?? 'event'];

/** compact date under a node: everything up to and including the year */
export const shortDate = (e: TimelineEvent) => {
	const l = e.chronoStartLabel ?? '';
	const m = l.match(/\d{4}/);
	return (m ? l.slice(0, m.index! + 4) : l.split(',')[0]).trim();
};

/** full display label, spanning start to end when the beat covers a range */
export const whenLabel = (e: TimelineEvent) => {
	const base = e.chronoStartLabel ?? '';
	const loc = e.location ? `, ${e.location}` : '';
	return e.chronoEndLabel ? `${base} to ${e.chronoEndLabel}${loc}` : `${base}${loc}`;
};

/**
 * The span of a jump, spelled out in full: "30 Years", "1 Year". Direction
 * is carried by the arrow itself. Jumps within the same year read "Moments";
 * index-based chronologies (loops counted 1, 2, 3) read "Jump".
 */
export function jumpText(fromC: number, toC: number): string {
	if (fromC < 1000 || toC < 1000) return 'Jump';
	const days = Math.abs(toC - fromC) * 365.25;
	if (days < 0.9) return 'Moments';
	if (days < 6.5) {
		const d = Math.round(days);
		return `${d} ${d === 1 ? 'Day' : 'Days'}`;
	}
	if (days < 29) {
		const w = Math.round(days / 7);
		return `${w} ${w === 1 ? 'Week' : 'Weeks'}`;
	}
	if (days < 350) {
		const m = Math.round(days / 30.4375);
		return `${m} ${m === 1 ? 'Month' : 'Months'}`;
	}
	const y = Math.round(days / 365.25);
	return `${y} ${y === 1 ? 'Year' : 'Years'}`;
}
