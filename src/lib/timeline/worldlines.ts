// The world-lines lens: each branch is a flowing line that shares its
// parent's path until the moment history splits, then peels away to its own
// level  -  the Endgame-style river view. The axis is always chronological
// (elastic, with temporal registration); the As Told / As Happened toggle
// changes only the stepping/tour order, never the picture.

import type { Branch, TimelineEvent } from '$lib/types';
import {
	branchMembership,
	buildThreads,
	computeDecay,
	computeOffJumps,
	elasticXPositions,
	levelJumps,
	makeBranchColor,
	registeredMoments,
	type BeatPos,
	type LaneInfo,
	type LayoutOpts,
	type TimelineLayout,
	type TimelineOrder,
	type WorldLine
} from './layout';
import type { Frame, Layer } from './layers';
import type { Lens } from './lens';

const WL_DEFAULTS = { ml: 150, mr: 90, top: 130, gap: 115, step: 190, minW: 680 };

/** smoothstep, for the peel-away curve */
const easeK = (t: number) => t * t * (3 - 2 * t);

export function computeWorldLines(
	events: TimelineEvent[],
	branches: Branch[] = [],
	order: TimelineOrder = 'told',
	opts: LayoutOpts = {}
): TimelineLayout {
	const { ml, mr, top, gap, step, minW } = { ...WL_DEFAULTS, ...opts };

	const { byNarr, rootId, branchOf } = branchMembership(events, branches);
	const branchColor = makeBranchColor(branches);
	const branchById = new Map(branches.map((b) => [b.id, b]));

	const byChrono = [...events].sort((a, b) => a.chrono - b.chrono || a.narrative - b.narrative);
	const xOf = elasticXPositions(byChrono, branchOf, ml, step);
	const lastX = Math.max(ml, ...byChrono.map((e) => xOf.get(e.id)!));
	const W = Math.max(minW, lastX + mr);

	// where each branch's line begins: its branchAt beat (or first beat)
	const beatsXOf = (id: string) =>
		byChrono.filter((e) => branchOf(e.id) === id).map((e) => xOf.get(e.id)!);
	const birthX = new Map<string, number>();
	for (const b of branches) {
		if (b.id === rootId) {
			birthX.set(b.id, ml);
			continue;
		}
		const beats = beatsXOf(b.id);
		const at = b.branchAt && xOf.has(b.branchAt) ? xOf.get(b.branchAt)! : Infinity;
		const first = Math.min(at, ...(beats.length ? beats : [Infinity]));
		birthX.set(b.id, first === Infinity ? ml : first);
	}

	// vertical levels: root on top, the rest in order of birth
	const others = branches
		.filter((b) => b.id !== rootId)
		.sort((a, z) => (birthX.get(a.id) ?? 0) - (birthX.get(z.id) ?? 0));
	const slotOf = new Map<string, number>([
		[rootId, 0],
		...others.map((b, i) => [b.id, i + 1] as [string, number])
	]);
	const ownY = (id: string) => top + (slotOf.get(id) ?? 0) * gap;

	// a branch's line: on its parent's path before birth, easing to its own
	// level over EASE px after it
	const EASE = Math.min(step * 1.3, 260);
	function yAt(id: string, x: number, depth = 0): number {
		const b = branchById.get(id);
		if (id === rootId || !b?.parent || depth > 8) return ownY(id);
		const bx = birthX.get(id) ?? ml;
		if (x >= bx + EASE) return ownY(id);
		const py = yAt(b.parent, bx, depth + 1);
		if (x <= bx) return py;
		return py + (ownY(id) - py) * easeK((x - bx) / EASE);
	}

	const pos: BeatPos[] = byChrono.map((e) => {
		const branch = branchOf(e.id);
		const x = xOf.get(e.id)!;
		return { e, x, y: yAt(branch, x), branch, lane: slotOf.get(branch) ?? 0 };
	});
	const posById = new Map(pos.map((p) => [p.e.id, p]));
	const ordered = order === 'told' ? byNarr : byChrono;

	const fadeAfter = computeDecay(branches, posById);

	// sampled line paths for the extra layer
	const worldLines: WorldLine[] = branches
		.map((b) => {
			const beats = beatsXOf(b.id);
			const x0 = birthX.get(b.id) ?? ml;
			const x1 = Math.max(x0, ...(beats.length ? beats : [x0]));
			const n = Math.max(2, Math.ceil((x1 - x0) / 18));
			const pts: { x: number; y: number }[] = [];
			for (let i = 0; i <= n; i++) {
				const x = x0 + ((x1 - x0) * i) / n;
				pts.push({ x, y: yAt(b.id, x) });
			}
			return {
				branch: b.id,
				color: branchColor(b.id),
				pts,
				fadeAfterX: fadeAfter.get(b.id) ?? null
			};
		})
		.filter((l) => l.pts.length >= 2 && l.pts[l.pts.length - 1].x > l.pts[0].x);

	const lanes: LaneInfo[] = branches.map((b) => ({
		id: b.id,
		label: b.label,
		color: branchColor(b.id),
		y: ownY(b.id),
		startX: birthX.get(b.id) ?? ml,
		endX: worldLines.find((w) => w.branch === b.id)?.pts.at(-1)?.x ?? (birthX.get(b.id) ?? ml),
		fadeAfterX: fadeAfter.get(b.id) ?? null,
		status: b.status
	}));

	const maxSlot = Math.max(0, ...slotOf.values());

	return {
		pos,
		posById,
		ordered,
		// the world-lines replace the straight lane vocabulary
		segParts: [],
		splinters: [],
		births: [],
		jumps: levelJumps(pos, posById),
		offJumps: computeOffJumps(pos),
		moments: registeredMoments(pos),
		threads: buildThreads(events, byNarr, posById),
		lanes,
		departureIds: new Set(events.filter((e) => e.jumpTo || e.jumpToLabel).map((e) => e.id)),
		rootId,
		branchColor,
		branchOf,
		W,
		H: top + maxSlot * gap + 70,
		worldLines
	};
}

/** the river itself: each branch's sampled line, decaying past its overwrite */
const worldLinesLayer: Layer = {
	id: 'world-lines',
	draw(f: Frame) {
		const lines = f.layout.worldLines;
		if (!lines) return;
		const { ctx } = f;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (const l of lines) {
			const solid = l.fadeAfterX == null ? l.pts : l.pts.filter((p) => p.x <= l.fadeAfterX!);
			const fading = l.fadeAfterX == null ? [] : l.pts.filter((p) => p.x >= l.fadeAfterX!);
			const stroke = (pts: { x: number; y: number }[], alpha: number, dash: number[]) => {
				if (pts.length < 2) return;
				const x1 = f.sx(pts[0].x);
				const x2 = f.sx(pts[pts.length - 1].x);
				if (Math.max(x1, x2) < -30 || Math.min(x1, x2) > f.vw + 30) return;
				ctx.strokeStyle = l.color;
				ctx.globalAlpha = alpha;
				ctx.lineWidth = f.px(3, 1.6, 4.6);
				ctx.setLineDash(dash);
				ctx.save();
				ctx.shadowColor = l.color;
				ctx.shadowBlur = 6;
				ctx.beginPath();
				pts.forEach((p, i) =>
					i === 0 ? ctx.moveTo(f.sx(p.x), f.sy(p.y)) : ctx.lineTo(f.sx(p.x), f.sy(p.y))
				);
				ctx.stroke();
				ctx.restore();
			};
			stroke(solid, 0.95, []);
			stroke(fading, 0.4, [f.px(3, 2), f.px(8, 4)]);
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
		}
	}
};

export const worldLinesLens: Lens = {
	id: 'worldlines',
	label: 'World-lines',
	compute: computeWorldLines,
	extraLayers: [worldLinesLayer]
};
