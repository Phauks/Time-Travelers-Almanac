// Saga stitching: several franchise parts combined into one master timeline.
//
// Identity is declared, never guessed: a later part's branch may carry
// `sameAs: { entry, branch }` naming the earlier branch it canonically IS
// (the repaired 1985 that ends Part I is the line Part II departs from).
// Declarations resolve transitively (union-find), so III can point at II
// which points at I, and all three collapse onto one lane. Merged lanes
// keep the earliest part's name and birth, and take their fate (status)
// from the LATEST part that touched them, because a timeline's fate can
// evolve across films: the line II repairs is the one III endangers.
//
// Ids are prefixed per part (they collide across films), narrative order is
// offset so parts play in sequence, every event is stamped with its resolved
// branch (per-part membership is computed BEFORE merging, so the walk can
// never leak across a seam), and cross-part references are promoted from
// labelled off-timeline stubs into real jump arrows.

import type { Branch, TimelineEvent } from '$lib/types';
import { branchMembership } from './layout';

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
	const gid = (slug: string, id: string) => `${pfxOf.get(slug)}:${id}`;

	// ---- identity resolution: follow sameAs chains to their canonical root ----
	const link = new Map<string, string>();
	for (const part of parts) {
		for (const b of part.branches) {
			if (b.sameAs && pfxOf.has(b.sameAs.entry)) {
				const from = gid(part.slug, b.id);
				const to = gid(b.sameAs.entry, b.sameAs.branch);
				if (from !== to) link.set(from, to);
			}
		}
	}
	const canon = (id: string): string => {
		let cur = id;
		for (let hops = 0; link.has(cur) && hops < parts.length + 1; hops++) cur = link.get(cur)!;
		return cur;
	};

	// ---- branches: merged ones vanish; survivors may inherit a later fate ----
	const branches: Branch[] = [];
	const statusOf = new Map<string, Branch['status']>();
	const erasedAtOf = new Map<string, string | undefined>();
	parts.forEach((part) => {
		const pfx = pfxOf.get(part.slug)!;
		const short = shortOf.get(part.slug)!;
		const local = (id: string | undefined) => (id ? `${pfx}:${id}` : undefined);
		for (const b of part.branches) {
			const id = gid(part.slug, b.id);
			const target = canon(id);
			// the latest part to touch a lane declares its current fate
			if (b.status) statusOf.set(target, b.status);
			erasedAtOf.set(target, local(b.erasedAt) ?? erasedAtOf.get(target));
			if (target !== id) continue; // merged away: no lane of its own
			branches.push({
				...b,
				id,
				parent: b.parent ? canon(gid(part.slug, b.parent)) : undefined,
				branchAt: local(b.branchAt),
				erasedAt: local(b.erasedAt),
				restoredAt: local(b.restoredAt),
				sameAs: undefined,
				label: `${short} - ${b.label}`
			});
		}
	});
	for (const b of branches) {
		b.status = statusOf.get(b.id) ?? b.status;
		b.erasedAt = erasedAtOf.get(b.id) ?? b.erasedAt;
	}

	// ---- events: membership resolved per part, then stamped explicitly ----
	const events: TimelineEvent[] = [];
	parts.forEach((part, i) => {
		const pfx = pfxOf.get(part.slug)!;
		const short = shortOf.get(part.slug)!;
		const local = (id: string | undefined) => (id ? `${pfx}:${id}` : undefined);
		const { branchOf } = branchMembership(part.events, part.branches);
		for (const e of part.events) {
			events.push({
				...e,
				id: local(e.id)!,
				jumpTo: local(e.jumpTo),
				branch: canon(gid(part.slug, branchOf(e.id))),
				narrative: i * 1000 + e.narrative,
				part: short,
				source: e.source ?? short
			});
		}
	});

	// promote cross-part references into real jumps: a departure whose
	// destination lives in another stitched part gets a true arrow, and the
	// arrival drops its "from ..." stub so the travel is not drawn twice
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
