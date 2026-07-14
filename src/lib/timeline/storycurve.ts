// The story-curve lens: every beat plotted at (narrative order, chronological
// rank). A linear telling draws a clean diagonal; flashbacks and time jumps
// bend the curve — As Told and As Happened become one picture. After Kim et
// al.'s "Visualizing Nonlinear Narratives with Story Curves".

import type { Branch, TimelineEvent } from '$lib/types';
import {
	branchMembership,
	makeBranchColor,
	type BeatPos,
	type LayoutOpts,
	type TimelineLayout,
	type TimelineOrder
} from './layout';
import type { Frame, Layer } from './layers';
import type { Lens } from './lens';

const CURVE_DEFAULTS = { ml: 150, mr: 90, top: 110, rowGap: 64, step: 170, minW: 680 };

export function computeStoryCurve(
	events: TimelineEvent[],
	branches: Branch[] = [],
	_order: TimelineOrder = 'told',
	opts: LayoutOpts = {}
): TimelineLayout {
	const { ml, mr, top, step, minW } = { ...CURVE_DEFAULTS, ...opts };
	const rowGap = CURVE_DEFAULTS.rowGap;

	const { byNarr, rootId, branchOf } = branchMembership(events, branches);
	const branchColor = makeBranchColor(branches);

	// chronological rank: beats sharing an instant share a row
	const chronos = [...new Set(events.map((e) => e.chrono))].sort((a, b) => a - b);
	const rankOf = new Map(chronos.map((c, i) => [c, i]));

	const pos: BeatPos[] = byNarr.map((e, i) => {
		const branch = branchOf(e.id);
		return {
			e,
			x: ml + i * step,
			y: top + (rankOf.get(e.chrono) ?? 0) * rowGap,
			branch,
			lane: rankOf.get(e.chrono) ?? 0
		};
	});
	const posById = new Map(pos.map((p) => [p.e.id, p]));

	const W = Math.max(minW, ml + Math.max(0, byNarr.length - 1) * step + mr);
	const H = top + Math.max(0, chronos.length - 1) * rowGap + 70;

	return {
		pos,
		posById,
		ordered: byNarr,
		// the curve layer replaces lanes, ribbons, and the rest of the lane
		// vocabulary; the standard layers no-op on these empties
		segParts: [],
		splinters: [],
		jumps: [],
		offJumps: [],
		births: [],
		moments: [],
		threads: [],
		lanes: [],
		departureIds: new Set(events.filter((e) => e.jumpTo || e.jumpToLabel).map((e) => e.id)),
		rootId,
		branchColor,
		branchOf,
		W,
		H
	};
}

/** the curve itself: segments coloured by which way time moves */
const curveLayer: Layer = {
	id: 'story-curve',
	draw(f: Frame) {
		const { ctx, theme, layout: L } = f;
		const pts = L.ordered.map((e) => L.posById.get(e.id)!);
		if (pts.length < 2) return;

		// faint diagonal: the line a strictly linear telling would draw
		const first = pts[0];
		const last = pts[pts.length - 1];
		const minY = Math.min(...pts.map((p) => p.y));
		const maxY = Math.max(...pts.map((p) => p.y));
		ctx.strokeStyle = theme.line;
		ctx.globalAlpha = 0.9;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 6]);
		ctx.beginPath();
		ctx.moveTo(f.sx(first.x), f.sy(minY));
		ctx.lineTo(f.sx(last.x), f.sy(maxY));
		ctx.stroke();
		ctx.setLineDash([]);

		// the story's actual path: down-steps are muted (time flowing on),
		// leaps down are forward jumps (amber), leaps up are flashbacks (blue)
		ctx.lineCap = 'round';
		for (let i = 0; i < pts.length - 1; i++) {
			const a = pts[i];
			const b = pts[i + 1];
			const dRank = b.lane - a.lane;
			const color = dRank < 0 ? theme.jumpBack : dRank > 1 ? theme.jump : theme.muted;
			const x1 = f.sx(a.x);
			const x2 = f.sx(b.x);
			if (Math.max(x1, x2) < -30 || Math.min(x1, x2) > f.vw + 30) continue;
			const y1 = f.sy(a.y);
			const y2 = f.sy(b.y);
			const mx = (x1 + x2) / 2;
			ctx.strokeStyle = color;
			ctx.globalAlpha = Math.abs(dRank) > 1 ? 0.95 : 0.7;
			ctx.lineWidth = f.px(Math.abs(dRank) > 1 ? 2.6 : 2, 1.3, 4);
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;

		// axes
		ctx.fillStyle = theme.muted;
		ctx.font = `${f.px(10, 8.5, 13)}px ${theme.monoFont}`;
		ctx.textAlign = 'left';
		ctx.fillText('story order →', f.sx(first.x), f.sy(maxY) + f.px(52, 34, 72));
		ctx.save();
		ctx.translate(f.sx(first.x) - f.px(64, 40, 96), f.sy(minY) + f.px(20, 12, 30));
		ctx.rotate(Math.PI / 2);
		ctx.fillText('chronology →', 0, 0);
		ctx.restore();
		ctx.textAlign = 'center';
	}
};

export const storyCurveLens: Lens = {
	id: 'curve',
	label: 'Story curve',
	compute: computeStoryCurve,
	extraLayers: [curveLayer]
};
