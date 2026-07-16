// Pure timeline geometry, shared by the in-card SVG board and the Chronoscope
// canvas engine. One layout, two renderers: everything here is a function of
// (events, branches, order) with no DOM and no Svelte state.
//
// The traveler's path uses a uniform step per beat (narrative order, the
// order the traveller lives it). As Happened uses an elastic time-metric
// axis: spacing grows with the log of the real time gap, and beats that
// share an instant across branches share an x.

import type { Branch, TimelineEvent } from '$lib/types';

/**
 * 'traveler' walks the beats in the order the time traveller lives them
 * (the story's narrative order); 'happened' lays them on the elastic
 * chronological axis with temporal registration.
 */
export type TimelineOrder = 'traveler' | 'happened';

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

/**
 * Elastic time-metric x positions with temporal registration: spacing grows
 * with the log of the real gap, and beats sharing an instant share an x  - 
 * unless they share a branch, where they still need their own room. Expects
 * events pre-sorted by chrono.
 */
export function elasticXPositions(
	byChrono: TimelineEvent[],
	branchOf: (id: string) => string,
	ml: number,
	step: number
): Map<string, number> {
	const xOf = new Map<string, number>();
	let x = ml;
	let prev: TimelineEvent | null = null;
	for (const e of byChrono) {
		if (prev) {
			if (sameMoment(e.chrono, prev.chrono)) {
				if (branchOf(e.id) === branchOf(prev.id)) x += step * 0.45;
			} else {
				x += step * elasticWeight(e.chrono - prev.chrono);
			}
		}
		xOf.set(e.id, x);
		prev = e;
	}
	return xOf;
}

/** pack jump arcs into levels so they never cross; shared by lenses */
export function levelJumps(pos: BeatPos[], posById: Map<string, BeatPos>): JumpArc[] {
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
	return js.map((j) => {
		let lvl = 0;
		while (levels[lvl] && !levels[lvl].every((iv) => j.x2 < iv.x1 - 6 || j.x1 > iv.x2 + 6)) lvl++;
		(levels[lvl] ||= []).push({ x1: j.x1, x2: j.x2 });
		return { from: j.from, to: j.to, back: j.back, level: lvl };
	});
}

/** jumps whose other end is off this timeline (another era or work) */
export function computeOffJumps(pos: BeatPos[]): OffJump[] {
	const yearIn = (s: string) => {
		const m = s.match(/\d{3,4}/);
		return m ? Number(m[0]) : null;
	};
	return pos
		.filter((p) => p.e.jumpToLabel || p.e.jumpFromLabel)
		.map((p) => {
			const out = !!p.e.jumpToLabel;
			const label = (p.e.jumpToLabel ?? p.e.jumpFromLabel)!;
			const dest = yearIn(label);
			const back = dest != null && p.e.chrono > 1000 ? dest < p.e.chrono : false;
			return { p, label, out, back };
		});
}

/**
 * Decay: an endangered/erased branch is overwritten history from the moment
 * its successor exists (or from an explicit erasedAt).
 */
export function computeDecay(branches: Branch[], posById: Map<string, BeatPos>) {
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
	return fadeAfter;
}

/** each named traveller's path through the story, in narrative order */
export function buildThreads(
	events: TimelineEvent[],
	byNarr: TimelineEvent[],
	posById: Map<string, BeatPos>
): Thread[] {
	const travelers = [...new Set(events.filter((e) => e.traveler).map((e) => e.traveler!))];
	return travelers
		.map((t) => ({
			traveler: t,
			points: byNarr.filter((e) => e.traveler === t).map((e) => posById.get(e.id)!).filter(Boolean)
		}))
		.filter((t) => t.points.length >= 2);
}

export function computeLayout(
	events: TimelineEvent[],
	branches: Branch[] = [],
	order: TimelineOrder = 'traveler',
	opts: LayoutOpts = {}
): TimelineLayout {
	const { ml, mr, top, gap, step, minW } = { ...DEFAULTS, ...opts };

	const { byNarr, rootId, memberOf, branchOf } = branchMembership(events, branches);
	const narrIndex = new Map(byNarr.map((e, i) => [e.id, i]));
	const jumpTargets = new Set(events.filter((e) => e.jumpTo).map((e) => e.jumpTo));
	const branchColor = makeBranchColor(branches);

	// ---- x positions ----
	const ordered =
		order === 'traveler'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono || a.narrative - b.narrative);
	const xOf =
		order === 'traveler' || ordered.length === 0
			? new Map(ordered.map((e, i) => [e.id, ml + i * step]))
			: elasticXPositions(ordered, branchOf, ml, step);
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

	const fadeAfter = computeDecay(branches, posById);

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

	// ---- base line per adjacent same-branch pair ----
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

	const threads = buildThreads(events, byNarr, posById);
	const jumps = levelJumps(pos, posById);
	const offJumps = computeOffJumps(pos);

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
