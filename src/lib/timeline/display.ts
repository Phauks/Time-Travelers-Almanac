// Shared presentation helpers for timeline beats, used by the SVG card,
// the event panel, and the Chronoscope.

import {
	Flag,
	Lightning,
	MapPin,
	ArrowUUpLeft,
	ArrowsClockwise,
	DotOutline
} from 'phosphor-svelte';
import type { EventKind, TimelineEvent } from '$lib/types';

export const KIND_META: Record<EventKind, { label: string; icon: unknown | null }> = {
	origin: { label: 'Origin', icon: Flag },
	departure: { label: 'Time jump', icon: Lightning },
	arrival: { label: 'Arrival', icon: MapPin },
	return: { label: 'Return', icon: ArrowUUpLeft },
	loop: { label: 'Loop', icon: ArrowsClockwise },
	event: { label: 'Event', icon: DotOutline }
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

/** "30 yrs back" / "25 yrs on" between two chrono values (years only) */
export function jumpText(fromC: number, toC: number): string {
	if (fromC < 1000 || toC < 1000) return 'jump';
	const d = Math.round(toC) - Math.round(fromC);
	if (d === 0) return 'jump';
	return d < 0 ? `${Math.abs(d)} yrs back` : `${d} yrs on`;
}
