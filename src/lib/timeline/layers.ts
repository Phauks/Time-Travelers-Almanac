// The Chronoscope's render passes. Each layer draws one concern from a Frame;
// the engine composes them, caches the static ones during pans, and plugins
// can add layers with engine.use(). No layer holds state.

import type { TimelineLayout } from './layout';
import { shortDate, jumpText } from './display';

export interface ChronoTheme {
	/** page background (node outline colour, thumbnail frame fill) */
	ink: string;
	panel: string;
	paper: string;
	muted: string;
	line: string;
	/** forward-jump colour (--color-jump) */
	jump: string;
	/** backward-jump colour */
	jumpBack: string;
	/** accent (--color-branching by default) */
	accent: string;
	monoFont: string;
}

export interface Frame {
	ctx: CanvasRenderingContext2D;
	vw: number;
	vh: number;
	now: number;
	scale: number;
	sx: (wx: number) => number;
	sy: (wy: number) => number;
	layout: TimelineLayout;
	theme: ChronoTheme;
	/** semantic zoom tiers: dates, beat titles, thumbnails */
	tiers: { dateA: number; labelA: number; thumbA: number };
	selectedId: string | null;
	hoverId: string | null;
	/** traveller names whose presence is highlighted on the board */
	visibleTravelers: Set<string>;
	image: (src: string) => HTMLImageElement | null;
	/** a world size in screen px, clamped for legibility */
	px: (v: number, min: number, max?: number) => number;
}

export interface Layer {
	id: string;
	/** dynamic layers redraw every frame; static ones are cached during pans */
	dynamic?: boolean;
	draw(f: Frame): void;
}

/** vertical clearance of a jump arc's apex above its higher endpoint */
export const arcLift = (level: number) => 36 + level * 26;

/** distinct hues for traveller presence, cycled; none may resemble a branch
 * status colour (grey/red/amber) or the jump blues */
export const TRAVELER_COLORS = ['#35d6a4', '#c99cff', '#7cc4ff', '#ffd166'];

/** a traveller's stable colour, by their position in layout.travelers */
export const travelerColor = (layout: TimelineLayout, id: string) =>
	TRAVELER_COLORS[
		Math.max(0, layout.travelers.findIndex((t) => t.id === id)) % TRAVELER_COLORS.length
	];

// ---------------------------------------------------------------- geometry

/**
 * A jump arrow: a slim constant-width arc with a compact filled head at the
 * arrival. Width never balloons with distance, so long jumps stay graceful
 * and never smother the lanes beneath them.
 */
export function jumpArrow(
	ctx: CanvasRenderingContext2D,
	from: { x: number; y: number },
	to: { x: number; y: number },
	apexY: number,
	color: string,
	alpha: number,
	width: number,
	glow = 4
): { x: number; y: number } {
	const cx = (from.x + to.x) / 2;
	ctx.save();
	ctx.strokeStyle = color;
	ctx.globalAlpha = alpha;
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.shadowColor = color;
	ctx.shadowBlur = glow;
	ctx.beginPath();
	ctx.moveTo(from.x, from.y);
	ctx.quadraticCurveTo(cx, apexY, to.x, to.y);
	ctx.stroke();

	// head aligned to the end tangent (quadratic derivative at t=1)
	const dx = to.x - cx;
	const dy = to.y - apexY;
	const len = Math.hypot(dx, dy) || 1;
	const ux = dx / len;
	const uy = dy / len;
	const h = Math.max(7, width * 3.6);
	const w = h * 0.42;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(to.x, to.y);
	ctx.lineTo(to.x - ux * h - uy * w, to.y - uy * h + ux * w);
	ctx.lineTo(to.x - ux * h + uy * w, to.y - uy * h - ux * w);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	// the arc's midpoint (t = 0.5), where the label sits
	return { x: (from.x + 2 * cx + to.x) / 4, y: (from.y + 2 * apexY + to.y) / 4 };
}

/** a point along the same quadratic the arrow follows */
export function arcPoint(
	from: { x: number; y: number },
	to: { x: number; y: number },
	apexY: number,
	t: number
) {
	const u = 1 - t;
	const cx = (from.x + to.x) / 2;
	return {
		x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
		y: u * u * from.y + 2 * u * t * apexY + t * t * to.y
	};
}

const offJumpCap = (f: Frame, o: { p: { x: number; y: number }; out: boolean }) => ({
	x: f.sx(o.p.x) + (o.out ? 1 : -1) * f.px(34, 18, 60),
	y: f.sy(o.p.y) - f.px(52, 26, 90)
});

// ------------------------------------------------------------ static layers

/** lane base lines; overwritten stretches decay into fading dashes */
const lanesLayer: Layer = {
	id: 'lanes',
	draw(f) {
		const { ctx } = f;
		ctx.lineCap = 'round';
		for (const g of f.layout.segParts) {
			const x1 = f.sx(g.x1);
			const x2 = f.sx(g.x2);
			if (x2 < -20 || x1 > f.vw + 20) continue;
			const y = f.sy(g.y);
			ctx.lineWidth = f.px(2.5, 1.4, 4);
			if (g.fading) {
				const grad = ctx.createLinearGradient(x1, 0, x2, 0);
				grad.addColorStop(0, g.color);
				grad.addColorStop(1, g.color + '00');
				ctx.strokeStyle = grad;
				ctx.globalAlpha = 0.5;
				ctx.setLineDash([f.px(3, 2), f.px(8, 4)]);
			} else {
				ctx.strokeStyle = g.color;
				ctx.globalAlpha = 0.92;
			}
			ctx.beginPath();
			ctx.moveTo(x1, y);
			ctx.lineTo(x2, y);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		ctx.globalAlpha = 1;
	}
};

/** drift births peel off their parent lane as a wye */
const splintersLayer: Layer = {
	id: 'splinters',
	draw(f) {
		const { ctx } = f;
		for (const c of f.layout.splinters) {
			const fx = f.sx(c.from.x);
			const tx = f.sx(c.to.x);
			if (Math.max(fx, tx) < -20 || Math.min(fx, tx) > f.vw + 20) continue;
			const fy = f.sy(c.from.y);
			const ty = f.sy(c.to.y);
			const mx = (fx + tx) / 2;
			ctx.strokeStyle = c.color;
			ctx.lineWidth = f.px(2, 1.2, 3.2);
			ctx.globalAlpha = 0.9;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			ctx.bezierCurveTo(mx, fy, mx, ty, tx, ty);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}
};

/** the moment history split: a burst for arrivals, a node cap for drifts */
const birthsLayer: Layer = {
	id: 'births',
	draw(f) {
		const { ctx } = f;
		for (const b of f.layout.births) {
			const x = f.sx(b.at.x);
			if (x < -40 || x > f.vw + 40) continue;
			const y = f.sy(b.at.y);
			ctx.strokeStyle = b.color;
			if (b.kind === 'arrival') {
				// a shockwave: two off-centre arcs + radial ticks, history cracking open
				ctx.globalAlpha = 0.85;
				ctx.lineWidth = f.px(1.4, 0.9, 2.2);
				ctx.beginPath();
				ctx.arc(x, y, f.px(13, 8, 20), -0.9, 0.9);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(x, y, f.px(13, 8, 20), Math.PI - 0.9, Math.PI + 0.9);
				ctx.stroke();
				ctx.globalAlpha = 0.6;
				for (const a of [-0.45, 0.45, Math.PI - 0.45, Math.PI + 0.45]) {
					const r0 = f.px(15, 9, 23);
					const r1 = f.px(19, 12, 29);
					ctx.beginPath();
					ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
					ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
					ctx.stroke();
				}
			} else {
				ctx.globalAlpha = 0.9;
				ctx.lineWidth = f.px(1.2, 0.8, 2);
				ctx.beginPath();
				ctx.arc(x, y, f.px(11, 7, 17), 0, 7);
				ctx.setLineDash([f.px(1.5, 1), f.px(3, 2)]);
				ctx.stroke();
				ctx.setLineDash([]);
			}
			ctx.globalAlpha = 1;
		}
	}
};

/** jump arrows with their labels, plus off-timeline stubs */
const jumpsLayer: Layer = {
	id: 'jumps',
	draw(f) {
		const { ctx, theme } = f;
		ctx.textAlign = 'center';
		const width = f.px(2.2, 1.5, 3.2);
		for (const j of f.layout.jumps) {
			const xa = f.sx(j.from.x);
			const xb = f.sx(j.to.x);
			if (Math.max(xa, xb) < -40 || Math.min(xa, xb) > f.vw + 40) continue;
			const color = j.back ? theme.jumpBack : theme.jump;
			const apexY = f.sy(Math.min(j.from.y, j.to.y) - arcLift(j.level));
			const mid = jumpArrow(
				ctx,
				{ x: xa, y: f.sy(j.from.y) },
				{ x: xb, y: f.sy(j.to.y) },
				apexY,
				color,
				0.9,
				width
			);
			if (f.tiers.dateA > 0.03) {
				ctx.globalAlpha = f.tiers.dateA;
				ctx.fillStyle = color;
				ctx.font = `${f.px(9.5, 8, 13)}px ${theme.monoFont}`;
				ctx.fillText(
					`${j.back ? '◀' : '▶'} ${jumpText(j.from.e.chrono, j.to.e.chrono)}`,
					mid.x,
					mid.y - f.px(8, 5, 12)
				);
				ctx.globalAlpha = 1;
			}
		}
		for (const o of f.layout.offJumps) {
			const nx = f.sx(o.p.x);
			if (nx < -60 || nx > f.vw + 60) continue;
			const ny = f.sy(o.p.y);
			const color = o.back ? theme.jumpBack : theme.jump;
			const cap = offJumpCap(f, o);
			const apexY = Math.min(ny, cap.y) - f.px(14, 6, 24);
			if (o.out) jumpArrow(ctx, { x: nx, y: ny }, cap, apexY, color, 0.9, width);
			else jumpArrow(ctx, cap, { x: nx, y: ny }, apexY, color, 0.9, width);
			if (f.tiers.dateA > 0.03) {
				ctx.globalAlpha = f.tiers.dateA;
				ctx.fillStyle = color;
				ctx.font = `${f.px(9.5, 8, 13)}px ${theme.monoFont}`;
				ctx.fillText(`${o.out ? 'to' : 'from'} ${o.label}`, cap.x, cap.y - f.px(6, 4, 9));
				ctx.globalAlpha = 1;
			}
		}
	}
};

/** the beats whose enabled travellers will draw a token row */
export function beatsWithTokens(f: Frame): Set<string> {
	const out = new Set<string>();
	for (const t of f.layout.travelers) {
		if (!f.visibleTravelers.has(t.id)) continue;
		for (const id of t.beats) out.add(id);
	}
	return out;
}

/** vertical room the token row occupies beneath a beat */
export const tokenRowHeight = (f: Frame) => f.px(9, 7, 13) * 2 + f.px(7, 4, 10);

/**
 * Traveller presence as a row of tokens beneath each beat: a portrait when
 * the cast member has one active at that point in the story, else their
 * symbol or emoji, else an initial. Several travellers stack side by side,
 * so presence stays readable at distance and never encodes by colour alone.
 */
const presenceLayer: Layer = {
	id: 'presence',
	draw(f) {
		if (!f.visibleTravelers.size || !f.layout.travelers.length) return;
		const { ctx, theme, layout: L } = f;
		const visible = L.travelers.filter((t) => f.visibleTravelers.has(t.id));
		if (!visible.length) return;
		const atBeat = new Map<string, typeof visible>();
		for (const t of visible) {
			for (const id of t.beats) (atBeat.get(id) ?? atBeat.set(id, []).get(id)!).push(t);
		}
		const tr = f.px(9, 7, 13);
		const gap = 3;
		for (const p of L.pos) {
			const here = atBeat.get(p.e.id);
			if (!here) continue;
			const x = f.sx(p.x);
			if (x < -80 || x > f.vw + 80) continue;
			const y = f.sy(p.y);
			const nodeR = f.px(6, 3.5, 10);
			const total = here.length * (tr * 2 + gap) - gap;
			let tx = x - total / 2 + tr;
			const ty = y + nodeR + tr + f.px(5, 3, 8);
			for (const t of here) {
				const color = t.color ?? travelerColor(L, t.id);
				ctx.beginPath();
				ctx.arc(tx, ty, tr, 0, 7);
				ctx.fillStyle = theme.panel;
				ctx.fill();
				ctx.lineWidth = 1.6;
				ctx.strokeStyle = color;
				ctx.stroke();
				const active = t.images.filter((im) => im.fromNarr <= p.e.narrative).at(-1);
				const img = active ? f.image(active.src) : null;
				if (img) {
					ctx.save();
					ctx.beginPath();
					ctx.arc(tx, ty, tr - 1, 0, 7);
					ctx.clip();
					const iw = img.naturalWidth;
					const ih = img.naturalHeight;
					const k = Math.max((tr * 2) / iw, (tr * 2) / ih);
					ctx.drawImage(img, tx - (iw * k) / 2, ty - (ih * k) / 2, iw * k, ih * k);
					ctx.restore();
				} else {
					ctx.fillStyle = theme.paper;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.font = t.symbol
						? `${Math.round(tr * 1.35)}px ${theme.monoFont}`
						: `bold ${Math.round(tr * 1.05)}px ${theme.monoFont}`;
					ctx.fillText(t.symbol ?? t.name.slice(0, 1).toUpperCase(), tx, ty + 0.5);
					ctx.textBaseline = 'alphabetic';
				}
				tx += tr * 2 + gap;
			}
		}
	}
};

/** the beats: nodes, origin flags, portal rings, paradox marks, dates, titles */
const beatsLayer: Layer = {
	id: 'beats',
	draw(f) {
		const { ctx, theme, layout: L } = f;
		ctx.textAlign = 'center';
		const tokened = beatsWithTokens(f);
		const rowH = tokenRowHeight(f);
		for (const p of L.pos) {
			const x = f.sx(p.x);
			if (x < -80 || x > f.vw + 80) continue;
			const y = f.sy(p.y);
			const color = L.branchColor(p.branch);
			const r = f.px(6, 3.5, 10);
			const dropY = tokened.has(p.e.id) ? rowH : 0;

			if (L.departureIds.has(p.e.id)) {
				ctx.strokeStyle = theme.muted;
				ctx.globalAlpha = 0.75;
				ctx.lineWidth = f.px(1.4, 0.9, 2.2);
				ctx.setLineDash([f.px(2.5, 1.5), f.px(2.5, 1.5)]);
				ctx.beginPath();
				ctx.arc(x, y, r + f.px(4, 2.5, 6), 0, 7);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.globalAlpha = 1;
			}

			if (p.e.kind === 'origin' || p.e.origin) {
				const fx = x - f.px(11, 6, 16);
				ctx.strokeStyle = theme.accent;
				ctx.fillStyle = theme.accent;
				ctx.lineWidth = f.px(1.5, 1, 2.2);
				ctx.beginPath();
				ctx.moveTo(fx, y - f.px(3, 2, 5));
				ctx.lineTo(fx, y - f.px(15, 9, 22));
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(fx, y - f.px(15, 9, 22));
				ctx.lineTo(fx + f.px(7, 4, 10), y - f.px(13, 7.5, 19));
				ctx.lineTo(fx, y - f.px(10.5, 6, 16));
				ctx.closePath();
				ctx.fill();
			}

			ctx.beginPath();
			ctx.arc(x, y, r, 0, 7);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.lineWidth = f.px(3, 1.8, 4.5);
			ctx.strokeStyle = theme.ink;
			ctx.stroke();

			if (p.e.paradox) {
				const wx = x + f.px(10, 6, 15);
				const wy = y - f.px(11, 7, 17);
				const w = f.px(7, 4.5, 10);
				ctx.beginPath();
				ctx.moveTo(wx, wy - w * 0.93);
				ctx.lineTo(wx + w, wy + w * 0.86);
				ctx.lineTo(wx - w, wy + w * 0.86);
				ctx.closePath();
				ctx.fillStyle = '#ffcc33';
				ctx.strokeStyle = theme.ink;
				ctx.lineWidth = 1.2;
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = theme.ink;
				ctx.font = `bold ${f.px(8, 5.5, 11)}px ${theme.monoFont}`;
				ctx.fillText('!', wx, wy + w * 0.55);
			}

			if (p.e.crossRef) {
				ctx.fillStyle = theme.accent;
				ctx.font = `bold ${f.px(15, 10, 21)}px ${theme.monoFont}`;
				ctx.fillText('»', x - f.px(12, 7, 17), y - f.px(6, 4, 9));
			}

			if (f.tiers.dateA > 0.03) {
				ctx.globalAlpha = f.tiers.dateA;
				ctx.fillStyle = theme.muted;
				ctx.font = `${f.px(9, 8, 12.5)}px ${theme.monoFont}`;
				ctx.fillText(shortDate(p.e), x, y + r + dropY + f.px(15, 11, 21));
				ctx.globalAlpha = 1;
			}
			if (f.tiers.labelA > 0.03) {
				ctx.globalAlpha = f.tiers.labelA;
				ctx.fillStyle = theme.paper;
				ctx.font = `${f.px(10.5, 9, 14)}px ${theme.monoFont}`;
				const t = p.e.label.length > 30 ? p.e.label.slice(0, 28) + '…' : p.e.label;
				ctx.fillText(t, x, y + r + dropY + f.px(30, 22, 40));
				ctx.globalAlpha = 1;
			}
			if (p.e.source && f.tiers.labelA > 0.03) {
				ctx.globalAlpha = f.tiers.labelA * 0.85;
				ctx.fillStyle = theme.accent;
				ctx.font = `${f.px(8, 7, 11)}px ${theme.monoFont}`;
				ctx.fillText(p.e.source.toUpperCase(), x, y + r + dropY + f.px(43, 32, 56));
				ctx.globalAlpha = 1;
			}
		}
	}
};

/**
 * Beat thumbnails in their own pass, above every other static layer, so an
 * arrow or a neighbouring node can never draw across a photo at close zoom.
 */
const thumbsLayer: Layer = {
	id: 'thumbs',
	draw(f) {
		if (f.tiers.thumbA <= 0.02) return;
		const { ctx, theme, layout: L } = f;
		for (const p of L.pos) {
			if (!p.e.image) continue;
			const x = f.sx(p.x);
			if (x < -80 || x > f.vw + 80) continue;
			const y = f.sy(p.y);
			const r = f.px(6, 3.5, 10);
			const img = f.image(p.e.image);
			const tw = f.px(88, 40, 132);
			const th = tw * 0.62;
			const ty = y - th - r - f.px(14, 8, 22);
			ctx.globalAlpha = f.tiers.thumbA;
			ctx.fillStyle = theme.panel;
			ctx.strokeStyle = theme.line;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(x - tw / 2, ty, tw, th, 5);
			ctx.fill();
			if (img) {
				ctx.save();
				ctx.clip();
				const iw = img.naturalWidth;
				const ih = img.naturalHeight;
				const k = Math.max(tw / iw, th / ih);
				ctx.drawImage(img, x - (iw * k) / 2, ty + th / 2 - (ih * k) / 2, iw * k, ih * k);
				ctx.restore();
				ctx.beginPath();
				ctx.roundRect(x - tw / 2, ty, tw, th, 5);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}
};

// ----------------------------------------------------------- dynamic layers

/** lane names ride the left edge of the viewport until their lane ends */
const laneLabelsLayer: Layer = {
	id: 'lane-labels',
	dynamic: true,
	draw(f) {
		const { ctx, theme } = f;
		ctx.font = `${f.px(11, 9, 15)}px ${theme.monoFont}`;
		ctx.textAlign = 'left';
		for (const ln of f.layout.lanes) {
			const y = f.sy(ln.y);
			if (y < -20 || y > f.vh + 20) continue;
			const endX = f.sx(ln.endX);
			if (endX < 12) continue;
			const x = Math.max(12, f.sx(ln.startX) - f.px(60, 30, 96));
			if (x > f.vw - 20) continue;
			ctx.fillStyle = ln.color;
			ctx.globalAlpha = 0.95;
			ctx.fillText(ln.label, x, y - f.px(10, 7, 14));
			ctx.globalAlpha = 1;
		}
		ctx.textAlign = 'center';
	}
};

/** selection ring, re-glowed arrow, the travelling pulse, and hover-pair glow */
const selectionLayer: Layer = {
	id: 'selection',
	dynamic: true,
	draw(f) {
		const { ctx, theme, layout: L } = f;
		const width = f.px(2.2, 1.5, 3.2);

		// hovering a jump endpoint lights up BOTH ends of the travel together
		if (f.hoverId && f.hoverId !== f.selectedId) {
			const h = L.posById.get(f.hoverId);
			if (h) {
				const ring = (bx: number, by: number, color: string, alpha: number) => {
					ctx.beginPath();
					ctx.arc(f.sx(bx), f.sy(by), f.px(9, 5.5, 14), 0, 7);
					ctx.strokeStyle = color;
					ctx.globalAlpha = alpha;
					ctx.lineWidth = 1.4;
					ctx.stroke();
					ctx.globalAlpha = 1;
				};
				ring(h.x, h.y, L.branchColor(h.branch), 0.55);
				const j = L.jumps.find((jj) => jj.from.e.id === f.hoverId || jj.to.e.id === f.hoverId);
				if (j) {
					const other = j.from.e.id === f.hoverId ? j.to : j.from;
					const color = j.back ? theme.jumpBack : theme.jump;
					ring(other.x, other.y, color, 0.7);
					const apexY = f.sy(Math.min(j.from.y, j.to.y) - arcLift(j.level));
					jumpArrow(
						ctx,
						{ x: f.sx(j.from.x), y: f.sy(j.from.y) },
						{ x: f.sx(j.to.x), y: f.sy(j.to.y) },
						apexY,
						color,
						1,
						width,
						9
					);
				}
			}
		}

		if (!f.selectedId) return;
		const p = L.posById.get(f.selectedId);
		if (!p) return;
		const x = f.sx(p.x);
		const y = f.sy(p.y);
		const r = f.px(8, 4.5, 13);

		// the selected node, re-drawn larger with its ring
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 7);
		ctx.fillStyle = L.branchColor(p.branch);
		ctx.fill();
		ctx.lineWidth = f.px(3, 1.8, 4.5);
		ctx.strokeStyle = theme.ink;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(x, y, r + f.px(5, 3.5, 8), 0, 7);
		ctx.strokeStyle = theme.paper;
		ctx.lineWidth = 1.2;
		ctx.stroke();

		// its outgoing arrow glows brighter and carries the pulse
		const j = L.jumps.find((jj) => jj.from.e.id === f.selectedId);
		if (j) {
			const color = j.back ? theme.jumpBack : theme.jump;
			const from = { x: f.sx(j.from.x), y: f.sy(j.from.y) };
			const to = { x: f.sx(j.to.x), y: f.sy(j.to.y) };
			const apexY = f.sy(Math.min(j.from.y, j.to.y) - arcLift(j.level));
			jumpArrow(ctx, from, to, apexY, color, 1, width, 8);
			const t = (((f.now % 1600) + 1600) % 1600) / 1600;
			const sp = arcPoint(from, to, apexY, t);
			ctx.save();
			ctx.shadowColor = color;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(sp.x, sp.y, 3, 0, 7);
			ctx.fillStyle = theme.paper;
			ctx.fill();
			ctx.restore();
		}
	}
};

// ---------------------------------------------------------------- minimap

export interface MinimapGeom {
	x: number;
	y: number;
	w: number;
	h: number;
	/** world → minimap */
	mx: (wx: number) => number;
	my: (wy: number) => number;
	/** minimap point → world point */
	world: (px: number, py: number) => { x: number; y: number };
}

export function minimapGeom(f: { vw: number; vh: number; layout: TimelineLayout }): MinimapGeom {
	const maxLevel = f.layout.jumps.reduce((m, j) => Math.max(m, j.level), 0);
	const wy0 = -(arcLift(maxLevel) + 60);
	const wy1 = f.layout.H + 20;
	// top-right corner, spaced off the edges (the sidebar sits beyond vw)
	const w = Math.min(280, Math.max(160, f.vw * 0.24));
	const h = 44;
	const x = f.vw - w - 22;
	const y = 22;
	const kx = w / f.layout.W;
	const ky = h / (wy1 - wy0);
	return {
		x,
		y,
		w,
		h,
		mx: (wx) => x + wx * kx,
		my: (wy) => y + (wy - wy0) * ky,
		world: (px, py) => ({ x: (px - x) / kx, y: (py - y) / ky + wy0 })
	};
}

/** a scrub strip: the whole board in miniature with the viewport framed */
const minimapLayer: Layer = {
	id: 'minimap',
	dynamic: true,
	draw(f) {
		const { ctx, theme } = f;
		const g = minimapGeom(f);
		ctx.save();
		ctx.globalAlpha = 0.92;
		ctx.fillStyle = theme.panel;
		ctx.strokeStyle = theme.line;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(g.x - 6, g.y - 6, g.w + 12, g.h + 12, 6);
		ctx.fill();
		ctx.stroke();
		for (const ln of f.layout.lanes) {
			ctx.strokeStyle = ln.color;
			ctx.globalAlpha = 0.7;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(g.mx(ln.startX), g.my(ln.y));
			ctx.lineTo(g.mx(ln.endX), g.my(ln.y));
			ctx.stroke();
		}
		// the jumps themselves, so time travel is visible in miniature
		for (const j of f.layout.jumps) {
			const x1 = g.mx(j.from.x);
			const x2 = g.mx(j.to.x);
			const yy1 = g.my(j.from.y);
			const yy2 = g.my(j.to.y);
			ctx.strokeStyle = j.back ? theme.jumpBack : theme.jump;
			ctx.globalAlpha = 0.85;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x1, yy1);
			ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(yy1, yy2) - 6, x2, yy2);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		for (const p of f.layout.pos) {
			ctx.fillStyle = f.layout.branchColor(p.branch);
			ctx.beginPath();
			ctx.arc(g.mx(p.x), g.my(p.y), 1.4, 0, 7);
			ctx.fill();
		}
		ctx.restore();
		// the viewport frame is drawn by the engine (it needs the camera itself)
	}
};

/**
 * The minimap viewport frame needs the camera itself, not just sx/sy, so the
 * engine draws it via this helper after the layer list runs.
 */
export function drawMinimapViewport(
	f: Frame,
	cam: { x: number; y: number; s: number },
	theme: ChronoTheme
) {
	const g = minimapGeom(f);
	const { ctx } = f;
	const x0 = cam.x - f.vw / 2 / cam.s;
	const x1 = cam.x + f.vw / 2 / cam.s;
	const y0 = cam.y - f.vh / 2 / cam.s;
	const y1 = cam.y + f.vh / 2 / cam.s;
	ctx.strokeStyle = theme.paper;
	ctx.globalAlpha = 0.9;
	ctx.lineWidth = 1.2;
	ctx.strokeRect(
		g.mx(Math.max(0, x0)),
		Math.max(g.y - 4, g.my(y0)),
		Math.max(4, g.mx(Math.min(f.layout.W, x1)) - g.mx(Math.max(0, x0))),
		Math.min(g.h + 8, g.my(y1) - g.my(y0))
	);
	ctx.globalAlpha = 1;
}

export const STATIC_LAYERS: Layer[] = [
	lanesLayer,
	splintersLayer,
	birthsLayer,
	jumpsLayer,
	presenceLayer,
	beatsLayer,
	thumbsLayer
];

export const DYNAMIC_LAYERS: Layer[] = [laneLabelsLayer, selectionLayer, minimapLayer];
