// Pure timeline geometry, shared by the in-card SVG board and the Chronoscope
// canvas engine. One layout, two renderers: everything here is a function of
// (events, branches, order) with no DOM and no Svelte state.
//
// As Told uses a uniform step per beat. As Happened uses an elastic
// time-metric axis: spacing grows with the log of the real time gap, and
// beats that share an instant across branches share an x — "temporal
// registration", which makes a split legible as one moment with two futures.

import type { Branch, TimelineEvent } from '$lib/types';

export type TimelineOrder = 'told' | 'happened';

export interface LayoutOpts {
	/** left margin before the first beat */
	ml?: number;
	/** right margin after the last beat */
	mr?: number;
	/** y of the first lane */
	top?: number;
	/** vertical distance between lanes */
	gap?: number;
	/** horizontal room per beat */
	step?: number;
	/** minimum board width */
	minW?: number;
}

export interface BeatPos {
	e: TimelineEvent;
	x: number;
	y: number;
	branch: string;
	lane: number;
}

export interface SegPart {
	x1: number;
	x2: number;
	y: number;
	color: string;
	dashed: boolean;
	/** this stretch of history has been overwritten and is decaying */
	fading: boolean;
}

export interface Splinter {
	from: { x: number; y: number };
	to: { x: number; y: number };
	color: string;
}

export interface JumpArc {
	from: BeatPos;
	to: BeatPos;
	/** the traveller lands earlier than they left */
	back: boolean;
	/** stacking level so arcs never cross */
	level: number;
}

export interface OffJump {
	p: BeatPos;
	label: string;
	/** outbound (a departure to a labelled destination) vs an arrival from one */
	out: boolean;
	back: boolean;
}

/** the moment a branch comes into being */
export interface Birth {
	branch: string;
	/** 'arrival' = a traveller's landing split history; 'drift' = it diverged in place */
	kind: 'arrival' | 'drift';
	at: { x: number; y: number };
	/** the point on the parent lane it peels away from (drift births only) */
	from: { x: number; y: number } | null;
	color: string;
}

/** one instant shared by beats on two or more lanes (As Happened only) */
export interface Moment {
	x: number;
	chrono: number;
	ys: number[];
	label: string;
}

/** a traveller's path through their beats, in narrative order */
export interface Thread {
	traveler: string;
	points: BeatPos[];
}

export interface LaneInfo {
	id: string;
	label: string;
	color: string;
	y: number;
	/** where this lane begins (its birth) and ends */
	startX: number;
	endX: number;
	/** x beyond which the lane is overwritten history, fading out (if ever) */
	fadeAfterX: number | null;
	status?: Branch['status'];
}

export interface TimelineLayout {
	pos: BeatPos[];
	posById: Map<string, BeatPos>;
	ordered: TimelineEvent[];
	segParts: SegPart[];
	splinters: Splinter[];
	jumps: JumpArc[];
	offJumps: OffJump[];
	births: Birth[];
	moments: Moment[];
	threads: Thread[];
	lanes: LaneInfo[];
	departureIds: Set<string>;
	rootId: string;
	branchColor: (id: string) => string;
	branchOf: (eventId: string) => string;
	W: number;
	H: number;
}

/** branch status → lane colour (the violet fallback marks unknown branches) */
export const STATUS_COLORS: Record<string, string> = {
	original: '#9aa3b5',
	active: '#9aa3b5',
	endangered: '#ff6b74',
	erased: '#6b7280',
	restored: '#ffb454'
};
const FALLBACK_BRANCH_COLOR = '#b57cff';

const DEFAULTS: Required<LayoutOpts> = { ml: 104, mr: 56, top: 98, gap: 86, step: 150, minW: 680 };

const bigGap = (a: number, b: number) => a > 1000 && b > 1000 && Math.abs(a - b) >= 2;

/** two chrono values that count as the same instant */
const sameMoment = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Elastic spacing weight for a real time gap (in chrono units, usually
 * years): a beat three hours later sits close; a beat thirty years later
 * gets visibly more room, but compressed on a log scale so a millennium
 * cannot flatten everything else.
 */
export function elasticWeight(gap: number): number {
	if (!(gap > 0)) return 0.6;
	return Math.min(2.4, 0.6 + 0.55 * Math.log10(1 + gap));
}

/**
 * Branch membership: walk narrative order, switch at each branchAt marker.
 * An event may also name its branch explicitly (needed when the story hops
 * between timelines out of order, as in BTTF Part II). Shared by every lens.
 */
export function branchMembership(events: TimelineEvent[], branches: Branch[]) {
	const byNarr = [...events].sort((a, b) => a.narrative - b.narrative);
	const rootId = (branches.find((b) => !b.parent) ?? branches[0])?.id ?? 'main';
	const branchAtMap = new Map(branches.filter((b) => b.branchAt).map((b) => [b.branchAt!, b.id]));
	const memberOf = new Map<string, string>();
	let cur = rootId;
	for (const e of byNarr) {
		if (branchAtMap.has(e.id)) cur = branchAtMap.get(e.id)!;
		memberOf.set(e.id, e.branch ?? cur);
	}
	return { byNarr, rootId, memberOf, branchOf: (id: string) => memberOf.get(id) ?? rootId };
}

/** status-driven branch colour lookup, shared by every lens */
export function makeBranchColor(branches: Branch[]) {
	const branchById = new Map(branches.map((b) => [b.id, b]));
	return (id: string) => {
		const st = branchById.get(id)?.status;
		return (st && STATUS_COLORS[st]) || FALLBACK_BRANCH_COLOR;
	};
}

export function computeLayout(
	events: TimelineEvent[],
	branches: Branch[] = [],
	order: TimelineOrder = 'told',
	opts: LayoutOpts = {}
): TimelineLayout {
	const { ml, mr, top, gap, step, minW } = { ...DEFAULTS, ...opts };

	const { byNarr, rootId, memberOf, branchOf } = branchMembership(events, branches);
	const narrIndex = new Map(byNarr.map((e, i) => [e.id, i]));
	const jumpTargets = new Set(events.filter((e) => e.jumpTo).map((e) => e.jumpTo));
	const branchColor = makeBranchColor(branches);

	// ---- x positions ----
	const ordered =
		order === 'told'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono || a.narrative - b.narrative);
	const xOf = new Map<string, number>();
	if (order === 'told' || ordered.length === 0) {
		ordered.forEach((e, i) => xOf.set(e.id, ml + i * step));
	} else {
		// elastic time axis with registration: same instant → same x, unless the
		// beats share a lane (then they still need their own room)
		let x = ml;
		let prev: TimelineEvent | null = null;
		for (const e of ordered) {
			if (prev) {
				const g = e.chrono - prev.chrono;
				if (sameMoment(e.chrono, prev.chrono)) {
					// same instant: register to the same x across lanes, nudge apart on one
					if (branchOf(e.id) === branchOf(prev.id)) x += step * 0.45;
				} else {
					x += step * elasticWeight(g);
				}
			}
			xOf.set(e.id, x);
			prev = e;
		}
	}
	const lastX = Math.max(ml, ...ordered.map((e) => xOf.get(e.id)!));
	const W = Math.max(minW, lastX + mr);

	// ---- lane slots: a branch occupies a row only while it is alive, and a
	// freed row can be reused by a later branch (git-graph compaction) ----
	const beatsOf = (id: string) => ordered.filter((e) => branchOf(e.id) === id);
	const span = new Map<string, { startX: number; endX: number }>();
	for (const b of branches) {
		const bs = beatsOf(b.id).map((e) => xOf.get(e.id)!);
		if (bs.length) span.set(b.id, { startX: Math.min(...bs), endX: Math.max(...bs) });
	}
	const slotOf = new Map<string, number>();
	{
		const margin = step * 1.5;
		const slotEnd: number[] = [];
		// the root keeps row 0; the rest claim rows in order of birth
		const rest = branches
			.filter((b) => b.id !== rootId && span.has(b.id))
			.sort((a, z) => span.get(a.id)!.startX - span.get(z.id)!.startX);
		slotOf.set(rootId, 0);
		slotEnd[0] = span.get(rootId)?.endX ?? Infinity;
		for (const b of rest) {
			const s = span.get(b.id)!;
			let slot = 1;
			while (slotEnd[slot] !== undefined && slotEnd[slot] + margin > s.startX) slot++;
			slotOf.set(b.id, slot);
			slotEnd[slot] = s.endX;
		}
		// branches with no beats still deserve a stable row
		for (const b of branches) if (!slotOf.has(b.id)) slotOf.set(b.id, slotEnd.length);
	}
	const laneOf = (id: string) => slotOf.get(id) ?? 0;
	const slotCount = Math.max(1, new Set([...slotOf.values()]).size);
	const H = top + (slotCount - 1) * gap + 54;
	const laneY = (id: string) => top + laneOf(id) * gap;

	const pos: BeatPos[] = ordered.map((e) => {
		const branch = branchOf(e.id);
		return { e, x: xOf.get(e.id)!, branch, lane: laneOf(branch), y: laneY(branch) };
	});
	const posById = new Map(pos.map((p) => [p.e.id, p]));

	// ---- decay: an endangered/erased branch is overwritten history from the
	// moment its successor exists (or from an explicit erasedAt) ----
	const fadeAfter = new Map<string, number>();
	for (const b of branches) {
		if (b.erasedAt && posById.has(b.erasedAt)) {
			fadeAfter.set(b.id, posById.get(b.erasedAt)!.x);
			continue;
		}
		if (b.status === 'endangered' || b.status === 'erased') {
			const child = branches.find((c) => c.parent === b.id && c.branchAt && posById.has(c.branchAt));
			if (child) fadeAfter.set(b.id, posById.get(child.branchAt!)!.x);
		}
	}

	const lanes: LaneInfo[] = branches.map((b) => ({
		id: b.id,
		label: b.label,
		color: branchColor(b.id),
		y: laneY(b.id),
		startX: span.get(b.id)?.startX ?? ml,
		endX: span.get(b.id)?.endX ?? ml,
		fadeAfterX: fadeAfter.get(b.id) ?? null,
		status: b.status
	}));

	// ---- base line per adjacent same-branch pair; dashed across a big time gap ----
	const segParts: SegPart[] = [];
	for (const b of branches) {
		const ps = pos.filter((p) => p.branch === b.id).sort((a, z) => a.x - z.x);
		const fadeX = fadeAfter.get(b.id);
		for (let i = 0; i < ps.length - 1; i++) {
			const a = ps[i],
				z = ps[i + 1];
			if (a.e.jumpTo === z.e.id || z.e.jumpTo === a.e.id) continue; // a jump covers this hop
			segParts.push({
				x1: a.x,
				x2: z.x,
				y: laneY(b.id),
				color: branchColor(b.id),
				dashed: bigGap(a.e.chrono, z.e.chrono),
				fading: fadeX != null && a.x >= fadeX
			});
		}
	}

	// ---- births: every branch with a parent came into being somewhere ----
	const births: Birth[] = [];
	const splinters: Splinter[] = [];
	for (const b of branches) {
		if (!b.parent || !b.branchAt || !posById.has(b.branchAt)) continue;
		const to = posById.get(b.branchAt)!;
		if (jumpTargets.has(b.branchAt)) {
			// a traveller's landing split history: the jump ribbon shows the travel,
			// the birth burst marks the divergence itself
			births.push({ branch: b.id, kind: 'arrival', at: { x: to.x, y: to.y }, from: null, color: branchColor(b.id) });
		} else {
			// continuous drift: draw the wye peeling off the parent lane
			const cut = narrIndex.get(b.branchAt) ?? 0;
			const before = byNarr
				.filter((e) => memberOf.get(e.id) === b.parent && (narrIndex.get(e.id) ?? 0) < cut)
				.pop();
			const from = before ? posById.get(before.id) : undefined;
			if (from) {
				splinters.push({ from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, color: branchColor(b.id) });
				births.push({
					branch: b.id,
					kind: 'drift',
					at: { x: to.x, y: to.y },
					from: { x: from.x, y: from.y },
					color: branchColor(b.id)
				});
			}
		}
	}

	// ---- registered moments: one instant, several lanes (As Happened only) ----
	const moments: Moment[] = [];
	if (order === 'happened') {
		const byX = new Map<number, BeatPos[]>();
		for (const p of pos) {
			const k = Math.round(p.x * 100) / 100;
			(byX.get(k) ?? byX.set(k, []).get(k)!).push(p);
		}
		for (const [x, ps] of byX) {
			const lanesHit = new Set(ps.map((p) => p.lane));
			if (lanesHit.size >= 2 && ps.every((p) => sameMoment(p.e.chrono, ps[0].e.chrono))) {
				moments.push({
					x,
					chrono: ps[0].e.chrono,
					ys: [...ps.map((p) => p.y)].sort((a, z) => a - z),
					label: ps[0].e.chronoStartLabel ?? ''
				});
			}
		}
	}

	// ---- traveller threads: each named traveller's path in narrative order ----
	const travelers = [...new Set(events.filter((e) => e.traveler).map((e) => e.traveler!))];
	const threads: Thread[] = travelers
		.map((t) => ({
			traveler: t,
			points: byNarr.filter((e) => e.traveler === t).map((e) => posById.get(e.id)!).filter(Boolean)
		}))
		.filter((t) => t.points.length >= 2);

	// ---- time jumps within this timeline, packed into levels so arcs never cross ----
	const js = pos
		.filter((p) => p.e.jumpTo && posById.get(p.e.jumpTo))
		.map((p) => {
			const to = posById.get(p.e.jumpTo!)!;
			return {
				from: p,
				to,
				back: to.e.chrono < p.e.chrono,
				x1: Math.min(p.x, to.x),
				x2: Math.max(p.x, to.x)
			};
		})
		.sort((a, b) => b.x2 - b.x1 - (a.x2 - a.x1));
	const levels: { x1: number; x2: number }[][] = [];
	const jumps: JumpArc[] = js.map((j) => {
		let lvl = 0;
		while (levels[lvl] && !levels[lvl].every((iv) => j.x2 < iv.x1 - 6 || j.x1 > iv.x2 + 6)) lvl++;
		(levels[lvl] ||= []).push({ x1: j.x1, x2: j.x2 });
		return { from: j.from, to: j.to, back: j.back, level: lvl };
	});

	// ---- jumps whose other end is off this timeline (another era or work) ----
	const yearIn = (s: string) => {
		const m = s.match(/\d{3,4}/);
		return m ? Number(m[0]) : null;
	};
	const offJumps: OffJump[] = pos
		.filter((p) => p.e.jumpToLabel || p.e.jumpFromLabel)
		.map((p) => {
			const out = !!p.e.jumpToLabel;
			const label = (p.e.jumpToLabel ?? p.e.jumpFromLabel)!;
			const dest = yearIn(label);
			const back = dest != null && p.e.chrono > 1000 ? dest < p.e.chrono : false;
			return { p, label, out, back };
		});

	// nodes where a time machine fires (a departure) get a portal ring
	const departureIds = new Set(events.filter((e) => e.jumpTo || e.jumpToLabel).map((e) => e.id));

	return {
		pos,
		posById,
		ordered,
		segParts,
		splinters,
		jumps,
		offJumps,
		births,
		moments,
		threads,
		lanes,
		departureIds,
		rootId,
		branchColor,
		branchOf,
		W,
		H
	};
}
