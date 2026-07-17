// Pure timeline geometry, shared by the in-card SVG board and the Chronoscope
// canvas engine. One layout, two renderers: everything here is a function of
// (events, branches, order) with no DOM and no Svelte state.
//
// The traveler's path uses a uniform step per beat (narrative order, the
// order the traveller lives it). As Happened uses an elastic time-metric
// axis: spacing grows with the log of the real time gap, and beats that
// share an instant across branches share an x.

import type { Branch, CastMember, TimelineEvent } from '$lib/types';

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
	/** the entry's cast registry, for resolving traveller presence */
	cast?: CastMember[];
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

/** a resolved cast entry: a person (or variant) and the beats they appear in */
export interface TravelerInfo {
	id: string;
	name: string;
	/** the human being; variants of one person share this */
	person: string;
	variant?: string;
	/** a single character or emoji drawn as this traveller's board token */
	symbol?: string;
	/** explicit colour override (else assigned from the palette by index) */
	color?: string;
	/** portrait checkpoints: active from the beat with that narrative value on */
	images: { fromNarr: number; src: string }[];
	/** beat ids, in narrative order */
	beats: string[];
}

/** everyone present at a beat: the presence list, or the jump's traveller */
export const presentAt = (e: TimelineEvent): string[] =>
	e.travelers ?? (e.traveler ? [e.traveler] : []);

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
	travelers: TravelerInfo[];
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

/**
 * Every traveller with the beats they appear in, ordered by first appearance.
 * Event presence strings resolve against the cast registry by id, then by
 * name; unknown names become implicit cast entries, so untagged entries keep
 * working. Variants stay distinct ("Doc (1955)" is not "Doc"); `person`
 * groups them.
 */
export function buildTravelers(byNarr: TimelineEvent[], cast: CastMember[] = []): TravelerInfo[] {
	const byId = new Map(cast.map((c) => [c.id, c]));
	const byName = new Map(cast.map((c) => [c.name, c]));
	const narrOf = new Map(byNarr.map((e) => [e.id, e.narrative]));
	const order: string[] = [];
	const beats = new Map<string, string[]>();
	const member = new Map<string, CastMember | undefined>();
	for (const e of byNarr) {
		for (const ref of presentAt(e)) {
			const c = byId.get(ref) ?? byName.get(ref);
			const key = c?.id ?? ref;
			if (!beats.has(key)) {
				order.push(key);
				beats.set(key, []);
				member.set(key, c);
			}
			beats.get(key)!.push(e.id);
		}
	}
	return order.map((key) => {
		const c = member.get(key);
		return {
			id: key,
			name: c?.name ?? key,
			person: c?.person ?? key,
			variant: c?.variant,
			symbol: c?.symbol,
			color: c?.color,
			images: (c?.images ?? [])
				.map((img) => ({
					src: img.src,
					fromNarr: img.fromEvent != null ? (narrOf.get(img.fromEvent) ?? -Infinity) : -Infinity
				}))
				.sort((a, z) => a.fromNarr - z.fromNarr),
			beats: beats.get(key)!
		};
	});
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
	const byChrono = [...events].sort((a, b) => a.chrono - b.chrono || a.narrative - b.narrative);
	const positioned = order === 'traveler' ? byNarr : byChrono;
	const xOf =
		order === 'traveler' || positioned.length === 0
			? new Map(positioned.map((e, i) => [e.id, ml + i * step]))
			: elasticXPositions(byChrono, branchOf, ml, step);
	const lastX = Math.max(ml, ...positioned.map((e) => xOf.get(e.id)!));
	const W = Math.max(minW, lastX + mr);

	// ---- stepping order ----
	// traveler: the order the time traveller lives it (narrative). happened:
	// follow the time stream, walking each timeline through its beats before
	// moving to the next branch (branches ranked by their earliest moment).
	let ordered: TimelineEvent[];
	if (order === 'traveler') {
		ordered = byNarr;
	} else {
		const laneFirst = new Map<string, number>();
		for (const e of byChrono) {
			const b = branchOf(e.id);
			if (!laneFirst.has(b)) laneFirst.set(b, e.chrono);
		}
		const laneRank = new Map(
			[...laneFirst.entries()].sort((a, z) => a[1] - z[1]).map(([id], i) => [id, i])
		);
		ordered = [...byChrono].sort(
			(a, z) =>
				(laneRank.get(branchOf(a.id)) ?? 0) - (laneRank.get(branchOf(z.id)) ?? 0) ||
				a.chrono - z.chrono ||
				a.narrative - z.narrative
		);
	}

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
		// rows are claimed strictly in order of each timeline's earliest moment,
		// so lanes read top-to-bottom from earliest to latest; a freed row may be
		// reused, which never disturbs that reading (its next occupant is later)
		const inBirthOrder = branches
			.filter((b) => span.has(b.id))
			.sort((a, z) => span.get(a.id)!.startX - span.get(z.id)!.startX);
		for (const b of inBirthOrder) {
			const s = span.get(b.id)!;
			let slot = 0;
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

	const travelers = buildTravelers(byNarr, opts.cast ?? []);
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
		travelers,
		lanes,
		departureIds,
		rootId,
		branchColor,
		branchOf,
		W,
		H
	};
}
