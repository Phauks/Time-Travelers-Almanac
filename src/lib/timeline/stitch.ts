// Saga stitching: several franchise parts combined into one master timeline.
// Ids are prefixed per part (they collide across films), narrative order is
// offset so parts play in sequence, and cross-references between parts are
// promoted from labelled off-timeline stubs into real jump ribbons.

import type { Branch, TimelineEvent } from '$lib/types';

export interface SagaPart {
	slug: string;
	title: string;
	events: TimelineEvent[];
	branches: Branch[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export interface StitchedTimeline {
	events: TimelineEvent[];
	branches: Branch[];
}

export function stitchTimelines(parts: SagaPart[]): StitchedTimeline {
	const pfxOf = new Map(parts.map((p, i) => [p.slug, `s${i}`]));
	const shortOf = new Map(parts.map((p, i) => [p.slug, ROMAN[i] ?? String(i + 1)]));

	const events: TimelineEvent[] = [];
	const branches: Branch[] = [];

	parts.forEach((part, i) => {
		const pfx = pfxOf.get(part.slug)!;
		const short = shortOf.get(part.slug)!;
		const local = (id: string | undefined) => (id ? `${pfx}:${id}` : undefined);

		for (const b of part.branches) {
			branches.push({
				...b,
				id: local(b.id)!,
				parent: local(b.parent),
				branchAt: local(b.branchAt),
				erasedAt: local(b.erasedAt),
				restoredAt: local(b.restoredAt),
				label: `${short} · ${b.label}`
			});
		}
		for (const e of part.events) {
			events.push({
				...e,
				id: local(e.id)!,
				jumpTo: local(e.jumpTo),
				branch: local(e.branch),
				narrative: i * 1000 + e.narrative,
				part: short,
				source: e.source ?? short
			});
		}
	});

	// promote cross-part references into real jumps: a departure whose
	// destination lives in another stitched part gets a true ribbon, and the
	// arrival drops its "from …" stub so the travel is not drawn twice
	const byId = new Map(events.map((e) => [e.id, e]));
	for (const e of events) {
		const x = e.crossRef;
		if (!x || !pfxOf.has(x.entry)) continue;
		const targetId = `${pfxOf.get(x.entry)}:${x.event}`;
		const target = byId.get(targetId);
		if (!target || e.jumpTo) continue;
		if (e.jumpToLabel) {
			e.jumpTo = targetId;
			delete e.jumpToLabel;
			if (target.jumpFromLabel) delete target.jumpFromLabel;
		}
	}

	return { events, branches };
}
