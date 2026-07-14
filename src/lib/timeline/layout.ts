// Pure timeline geometry, shared by the in-card SVG board and the Chronoscope
// canvas engine. One layout, two renderers: everything here is a function of
// (events, branches, order) with no DOM and no Svelte state.

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

export interface LaneInfo {
	id: string;
	label: string;
	color: string;
	y: number;
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

export function computeLayout(
	events: TimelineEvent[],
	branches: Branch[] = [],
	order: TimelineOrder = 'told',
	opts: LayoutOpts = {}
): TimelineLayout {
	const { ml, mr, top, gap, step, minW } = { ...DEFAULTS, ...opts };

	// ---- branch membership: walk narrative order, switch at each branchAt marker ----
	const byNarr = [...events].sort((a, b) => a.narrative - b.narrative);
	const narrIndex = new Map(byNarr.map((e, i) => [e.id, i]));
	const rootId = (branches.find((b) => !b.parent) ?? branches[0])?.id ?? 'main';
	const branchAtMap = new Map(branches.filter((b) => b.branchAt).map((b) => [b.branchAt!, b.id]));
	const jumpTargets = new Set(events.filter((e) => e.jumpTo).map((e) => e.jumpTo));
	// An event may name its branch explicitly (needed when the story hops between
	// timelines out of order, as in BTTF Part II); otherwise walk narrative order.
	const memberOf = new Map<string, string>();
	{
		let cur = rootId;
		for (const e of byNarr) {
			if (branchAtMap.has(e.id)) cur = branchAtMap.get(e.id)!;
			memberOf.set(e.id, e.branch ?? cur);
		}
	}
	const laneOf = (id: string) => Math.max(0, branches.findIndex((b) => b.id === id));
	const branchById = new Map(branches.map((b) => [b.id, b]));
	const branchColor = (id: string) => {
		const st = branchById.get(id)?.status;
		return (st && STATUS_COLORS[st]) || FALLBACK_BRANCH_COLOR;
	};
	const branchOf = (eventId: string) => memberOf.get(eventId) ?? rootId;

	// ---- lane + beat positions: each beat gets a fixed step of room ----
	const laneCount = Math.max(1, branches.length);
	const H = top + (laneCount - 1) * gap + 54;
	const laneY = (lane: number) => top + lane * gap;
	const n = events.length;
	const W = Math.max(minW, ml + mr + Math.max(0, n - 1) * step);
	const ordered =
		order === 'told'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono);
	const pos: BeatPos[] = ordered.map((e, i) => {
		const branch = branchOf(e.id);
		const lane = laneOf(branch);
		return { e, x: ml + i * step, branch, lane, y: laneY(lane) };
	});
	const posById = new Map(pos.map((p) => [p.e.id, p]));

	const lanes: LaneInfo[] = branches.map((b, i) => ({
		id: b.id,
		label: b.label,
		color: branchColor(b.id),
		y: laneY(i),
		status: b.status
	}));

	// ---- base line per adjacent same-branch pair; dashed across a big time gap ----
	const segParts: SegPart[] = [];
	for (const b of branches) {
		const ps = pos.filter((p) => p.branch === b.id).sort((a, z) => a.x - z.x);
		for (let i = 0; i < ps.length - 1; i++) {
			const a = ps[i],
				z = ps[i + 1];
			if (a.e.jumpTo === z.e.id || z.e.jumpTo === a.e.id) continue; // a jump covers this hop
			segParts.push({
				x1: a.x,
				x2: z.x,
				y: laneY(laneOf(b.id)),
				color: branchColor(b.id),
				dashed: bigGap(a.e.chrono, z.e.chrono)
			});
		}
	}

	// ---- continuous splinters (a change in the timeline, same era, no travel) ----
	const splinters = branches
		.filter((b) => b.parent && b.branchAt && !jumpTargets.has(b.branchAt))
		.map((b) => {
			const to = posById.get(b.branchAt!);
			const cut = narrIndex.get(b.branchAt!) ?? 0;
			const before = byNarr
				.filter((e) => memberOf.get(e.id) === b.parent && (narrIndex.get(e.id) ?? 0) < cut)
				.pop();
			const from = before ? posById.get(before.id) : undefined;
			return to && from
				? { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, color: branchColor(b.id) }
				: null;
		})
		.filter(Boolean) as Splinter[];

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
	const departureIds = new Set(
		events.filter((e) => e.jumpTo || e.jumpToLabel).map((e) => e.id)
	);

	return {
		pos,
		posById,
		ordered,
		segParts,
		splinters,
		jumps,
		offJumps,
		lanes,
		departureIds,
		rootId,
		branchColor,
		branchOf,
		W,
		H
	};
}
