// The Chronoscope: the Almanac's own Canvas 2D timeline engine.
// It renders a TimelineLayout (from layout.ts) on an infinite pan/zoom
// surface with semantic zoom, rubber-band bounds, comet-ribbon jumps,
// hit-testing, and theme-native colours. See docs/CHRONOSCOPE.md.

import type { BeatPos, TimelineLayout } from './layout';
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

export interface ChronoCallbacks {
	/** a beat was picked with the pointer */
	onSelect?: (id: string) => void;
	/** the user grabbed the camera (used to pause a running tour) */
	onUserInteract?: () => void;
}

/** vertical clearance of a jump arc's apex above its higher endpoint */
const arcLift = (level: number) => 36 + level * 26;

/** smooth 0..1 ramp of v across [a, b] */
const ramp = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

interface Cam {
	x: number;
	y: number;
	s: number;
}

export class Chronoscope {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private layout: TimelineLayout | null = null;
	private theme: ChronoTheme | null = null;
	private cb: ChronoCallbacks;
	private reduced: boolean;

	private cam: Cam = { x: 0, y: 0, s: 1 };
	private vw = 0;
	private vh = 0;
	private dpr = 1;
	private minS = 0.15;
	private maxS = 3;

	private selectedId: string | null = null;
	private hoverId: string | null = null;

	// interaction state
	private pointers = new Map<number, { x: number; y: number }>();
	private dragging = false;
	private dragMoved = false;
	private pinchDist = 0;
	private raf = 0;
	private fly: { from: Cam; to: Cam; t0: number; dur: number } | null = null;
	private springing = false;
	private t0 = performance.now();
	private disposed = false;

	private images = new Map<string, { img: HTMLImageElement; ok: boolean }>();
	private ro: ResizeObserver;
	private detachEvents: () => void;

	constructor(canvas: HTMLCanvasElement, cb: ChronoCallbacks = {}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.cb = cb;
		this.reduced =
			typeof matchMedia !== 'undefined' &&
			matchMedia('(prefers-reduced-motion: reduce)').matches;

		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(canvas);

		const down = (e: PointerEvent) => this.onDown(e);
		const move = (e: PointerEvent) => this.onMove(e);
		const up = (e: PointerEvent) => this.onUp(e);
		const wheel = (e: WheelEvent) => this.onWheel(e);
		canvas.addEventListener('pointerdown', down);
		canvas.addEventListener('pointermove', move);
		canvas.addEventListener('pointerup', up);
		canvas.addEventListener('pointercancel', up);
		canvas.addEventListener('wheel', wheel, { passive: false });
		this.detachEvents = () => {
			canvas.removeEventListener('pointerdown', down);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerup', up);
			canvas.removeEventListener('pointercancel', up);
			canvas.removeEventListener('wheel', wheel);
		};
		this.resize();
	}

	destroy() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		this.detachEvents();
	}

	setScene(layout: TimelineLayout, theme: ChronoTheme) {
		const first = !this.layout;
		this.layout = layout;
		this.theme = theme;
		for (const p of layout.pos) if (p.e.image) this.loadImage(p.e.image);
		if (first) this.fitAll(false);
		else this.requestDraw();
	}

	setSelected(id: string | null, fly = false) {
		this.selectedId = id;
		if (fly && id) this.flyToBeat(id);
		this.requestDraw();
	}

	// ---------------------------------------------------------------- camera

	private worldBounds() {
		const L = this.layout!;
		const maxLevel = L.jumps.reduce((m, j) => Math.max(m, j.level), 0);
		const top = -(arcLift(maxLevel) + 60);
		return { x0: 0, x1: L.W, y0: top, y1: L.H + 20 };
	}

	fitAll(animate = true) {
		if (!this.layout || !this.vw) return;
		const bb = this.worldBounds();
		const pad = 60;
		const s = Math.min(
			(this.vw - pad) / (bb.x1 - bb.x0),
			(this.vh - pad) / (bb.y1 - bb.y0),
			1.1
		);
		this.minS = Math.min(s * 0.7, 0.6);
		const to = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2, s };
		if (animate && !this.reduced) this.flyTo(to, 500);
		else {
			this.cam = to;
			this.requestDraw();
		}
	}

	flyToBeat(id: string) {
		const p = this.layout?.posById.get(id);
		if (!p) return;
		const s = Math.max(this.cam.s, 1.3);
		this.flyTo({ x: p.x, y: p.y - 30, s }, 650);
	}

	private flyTo(to: Cam, dur: number) {
		if (this.reduced) {
			this.cam = { ...to };
			this.requestDraw();
			return;
		}
		this.fly = { from: { ...this.cam }, to, t0: performance.now(), dur };
		this.requestDraw();
	}

	private sx(wx: number) {
		return (wx - this.cam.x) * this.cam.s + this.vw / 2;
	}
	private sy(wy: number) {
		return (wy - this.cam.y) * this.cam.s + this.vh / 2;
	}
	private wx(px: number) {
		return (px - this.vw / 2) / this.cam.s + this.cam.x;
	}
	private wy(py: number) {
		return (py - this.vh / 2) / this.cam.s + this.cam.y;
	}

	/** where the camera ought to rest: soft bounds keep some content on screen */
	private clampedCam(): Cam {
		const bb = this.worldBounds();
		const mx = Math.min((bb.x1 - bb.x0) / 2, 120 / this.cam.s);
		const my = Math.min((bb.y1 - bb.y0) / 2, 90 / this.cam.s);
		return {
			x: Math.max(bb.x0 + mx, Math.min(bb.x1 - mx, this.cam.x)),
			y: Math.max(bb.y0 + my, Math.min(bb.y1 - my, this.cam.y)),
			s: this.cam.s
		};
	}

	// ----------------------------------------------------------- interaction

	private local(e: { clientX: number; clientY: number }) {
		const r = this.canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	private onDown(e: PointerEvent) {
		this.canvas.setPointerCapture(e.pointerId);
		this.pointers.set(e.pointerId, this.local(e));
		this.fly = null;
		this.springing = false;
		this.cb.onUserInteract?.();
		if (this.pointers.size === 1) {
			this.dragging = true;
			this.dragMoved = false;
			this.canvas.classList.add('dragging');
		} else if (this.pointers.size === 2) {
			const [a, b] = [...this.pointers.values()];
			this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
		}
	}

	private onMove(e: PointerEvent) {
		const pt = this.local(e);
		if (!this.pointers.has(e.pointerId)) {
			// plain hover: hit-test for the cursor
			const hit = this.hitTest(pt.x, pt.y);
			const id = hit?.e.id ?? null;
			if (id !== this.hoverId) {
				this.hoverId = id;
				this.canvas.style.cursor = id ? 'pointer' : 'grab';
				this.requestDraw();
			}
			return;
		}
		const prev = this.pointers.get(e.pointerId)!;
		this.pointers.set(e.pointerId, pt);

		if (this.pointers.size === 2) {
			// pinch: zoom about the midpoint
			const [a, b] = [...this.pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			if (this.pinchDist > 0) {
				const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
				this.zoomAbout(mid.x, mid.y, dist / this.pinchDist);
			}
			this.pinchDist = dist;
			return;
		}
		if (!this.dragging) return;
		const dx = pt.x - prev.x;
		const dy = pt.y - prev.y;
		if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
		// resistance outside the resting bounds (the rubber band stretching)
		const rest = this.clampedCam();
		const rx = this.cam.x !== rest.x ? 0.35 : 1;
		const ry = this.cam.y !== rest.y ? 0.35 : 1;
		this.cam.x -= (dx / this.cam.s) * rx;
		this.cam.y -= (dy / this.cam.s) * ry;
		this.requestDraw();
	}

	private onUp(e: PointerEvent) {
		const pt = this.local(e);
		this.pointers.delete(e.pointerId);
		if (this.pointers.size < 2) this.pinchDist = 0;
		if (this.pointers.size > 0) return;
		this.dragging = false;
		this.canvas.classList.remove('dragging');
		if (!this.dragMoved) {
			const hit = this.hitTest(pt.x, pt.y);
			if (hit) this.cb.onSelect?.(hit.e.id);
		}
		this.springing = true;
		this.requestDraw();
	}

	private onWheel(e: WheelEvent) {
		e.preventDefault();
		this.fly = null;
		this.cb.onUserInteract?.();
		const pt = this.local(e);
		// trackpad pinch arrives as ctrl+wheel with small deltas
		const k = e.ctrlKey ? 0.01 : 0.0014;
		this.zoomAbout(pt.x, pt.y, Math.exp(-e.deltaY * k));
		this.springing = true;
		this.requestDraw();
	}

	private zoomAbout(px: number, py: number, factor: number) {
		const wx = this.wx(px);
		const wy = this.wy(py);
		this.cam.s = Math.max(this.minS, Math.min(this.maxS, this.cam.s * factor));
		this.cam.x = wx - (px - this.vw / 2) / this.cam.s;
		this.cam.y = wy - (py - this.vh / 2) / this.cam.s;
	}

	private hitTest(px: number, py: number): BeatPos | null {
		if (!this.layout) return null;
		let best: BeatPos | null = null;
		let bd = 18;
		for (const p of this.layout.pos) {
			const d = Math.hypot(this.sx(p.x) - px, this.sy(p.y) - py);
			if (d < bd) {
				bd = d;
				best = p;
			}
		}
		return best;
	}

	// -------------------------------------------------------------- drawing

	private resize() {
		this.dpr = window.devicePixelRatio || 1;
		this.vw = this.canvas.clientWidth;
		this.vh = this.canvas.clientHeight;
		this.canvas.width = Math.max(1, this.vw * this.dpr);
		this.canvas.height = Math.max(1, this.vh * this.dpr);
		if (this.layout) this.fitAll(false);
	}

	private loadImage(src: string) {
		if (this.images.has(src)) return;
		const img = new Image();
		const rec = { img, ok: false };
		this.images.set(src, rec);
		img.onload = () => {
			rec.ok = true;
			this.requestDraw();
		};
		img.src = src;
	}

	/** true while something is in motion and needs another frame */
	private animating(): boolean {
		if (this.fly) return true;
		if (this.springing) return true;
		// a selected departure keeps its ribbon pulse alive
		if (!this.reduced && this.selectedId) {
			const sel = this.layout?.posById.get(this.selectedId);
			if (sel && (sel.e.jumpTo || sel.e.jumpToLabel)) return true;
		}
		return false;
	}

	requestDraw() {
		if (this.disposed) return;
		cancelAnimationFrame(this.raf);
		const frame = (now: number) => {
			if (this.disposed) return;
			this.step(now);
			this.draw(now);
			if (this.animating() && !this.dragging) this.raf = requestAnimationFrame(frame);
			else if (this.animating()) this.raf = requestAnimationFrame(frame);
		};
		this.raf = requestAnimationFrame(frame);
	}

	private step(now: number) {
		if (this.fly) {
			const { from, to, t0, dur } = this.fly;
			const t = Math.min(1, (now - t0) / dur);
			const k = easeOut(t);
			this.cam.x = from.x + (to.x - from.x) * k;
			this.cam.y = from.y + (to.y - from.y) * k;
			this.cam.s = from.s + (to.s - from.s) * k;
			if (t >= 1) this.fly = null;
		} else if (this.springing && !this.dragging) {
			const rest = this.clampedCam();
			if (this.reduced) {
				this.cam.x = rest.x;
				this.cam.y = rest.y;
				this.springing = false;
			} else {
				this.cam.x += (rest.x - this.cam.x) * 0.16;
				this.cam.y += (rest.y - this.cam.y) * 0.16;
				if (Math.abs(rest.x - this.cam.x) < 0.3 && Math.abs(rest.y - this.cam.y) < 0.3) {
					this.cam.x = rest.x;
					this.cam.y = rest.y;
					this.springing = false;
				}
			}
		}
	}

	private draw(now: number) {
		const { ctx, layout: L, theme: T } = this;
		if (!L || !T) return;
		const s = this.cam.s;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.vw, this.vh);

		// semantic zoom tiers
		const dateA = ramp(s, 0.45, 0.7);
		const labelA = ramp(s, 0.85, 1.15);
		const thumbA = ramp(s, 1.3, 1.7);
		const px = (v: number, min: number, max = 1e9) => Math.min(max, Math.max(min, v * s));

		// ---- lane base lines (per-pair segments; dashed across big gaps) ----
		ctx.lineCap = 'round';
		for (const g of L.segParts) {
			const x1 = this.sx(g.x1);
			const x2 = this.sx(g.x2);
			if (x2 < -20 || x1 > this.vw + 20) continue;
			const y = this.sy(g.y);
			ctx.strokeStyle = g.color;
			ctx.lineWidth = px(2.5, 1.4, 4);
			ctx.globalAlpha = 0.92;
			ctx.setLineDash(g.dashed ? [px(6, 3), px(7, 3.5)] : []);
			ctx.beginPath();
			ctx.moveTo(x1, y);
			ctx.lineTo(x2, y);
			ctx.stroke();
		}
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;

		// ---- lane labels pinned to the left edge while panning ----
		ctx.font = `${px(11, 9, 15)}px ${T.monoFont}`;
		ctx.textAlign = 'left';
		for (const ln of L.lanes) {
			const y = this.sy(ln.y);
			if (y < -20 || y > this.vh + 20) continue;
			ctx.fillStyle = ln.color;
			ctx.globalAlpha = 0.95;
			ctx.fillText(ln.label, 10, y - px(10, 7, 14));
			ctx.globalAlpha = 1;
		}

		// ---- splinters (a branch peeling off with no travel involved) ----
		for (const c of L.splinters) {
			const fx = this.sx(c.from.x);
			const tx = this.sx(c.to.x);
			if (Math.max(fx, tx) < -20 || Math.min(fx, tx) > this.vw + 20) continue;
			const fy = this.sy(c.from.y);
			const ty = this.sy(c.to.y);
			const mx = (fx + tx) / 2;
			ctx.strokeStyle = c.color;
			ctx.lineWidth = px(2, 1.2, 3.2);
			ctx.globalAlpha = 0.9;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			ctx.bezierCurveTo(mx, fy, mx, ty, tx, ty);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		// ---- jump ribbons ----
		const selected = this.selectedId;
		for (const j of L.jumps) {
			const x1 = Math.min(this.sx(j.from.x), this.sx(j.to.x));
			const x2 = Math.max(this.sx(j.from.x), this.sx(j.to.x));
			if (x2 < -40 || x1 > this.vw + 40) continue;
			const color = j.back ? T.jumpBack : T.jump;
			const apexW = Math.min(j.from.y, j.to.y) - arcLift(j.level);
			const from = { x: this.sx(j.from.x), y: this.sy(j.from.y) };
			const to = { x: this.sx(j.to.x), y: this.sy(j.to.y) };
			const apexY = this.sy(apexW);
			const isSel = selected === j.from.e.id;
			const mid = this.ribbon(from, to, apexY, color, isSel ? 1 : 0.9, px(5, 2.6, 9));
			if (isSel && !this.reduced) this.pulse(from, to, apexY, color, now);
			if (dateA > 0.03) {
				ctx.globalAlpha = dateA;
				ctx.fillStyle = color;
				ctx.font = `${px(9.5, 8, 13)}px ${T.monoFont}`;
				ctx.textAlign = 'center';
				ctx.fillText(
					`${j.back ? '◀' : '▶'} ${jumpText(j.from.e.chrono, j.to.e.chrono)}`,
					mid.x,
					apexY - px(6, 4, 9)
				);
				ctx.globalAlpha = 1;
			}
		}

		// ---- off-timeline jumps: a stub ribbon to/from a labelled cap ----
		for (const o of L.offJumps) {
			const nx = this.sx(o.p.x);
			if (nx < -60 || nx > this.vw + 60) continue;
			const ny = this.sy(o.p.y);
			const color = o.back ? T.jumpBack : T.jump;
			const capX = nx + (o.out ? 1 : -1) * px(34, 18, 60);
			const capY = ny - px(52, 26, 90);
			if (o.out) this.ribbon({ x: nx, y: ny }, { x: capX, y: capY }, Math.min(ny, capY) - px(14, 6, 24), color, 0.9, px(4, 2.2, 7));
			else this.ribbon({ x: capX, y: capY }, { x: nx, y: ny }, Math.min(ny, capY) - px(14, 6, 24), color, 0.9, px(4, 2.2, 7));
			if (dateA > 0.03) {
				ctx.globalAlpha = dateA;
				ctx.fillStyle = color;
				ctx.font = `${px(9.5, 8, 13)}px ${T.monoFont}`;
				ctx.textAlign = 'center';
				ctx.fillText(`${o.out ? 'to' : 'from'} ${o.label}`, capX, capY - px(6, 4, 9));
				ctx.globalAlpha = 1;
			}
		}

		// ---- beats ----
		ctx.textAlign = 'center';
		for (const p of L.pos) {
			const x = this.sx(p.x);
			if (x < -80 || x > this.vw + 80) continue;
			const y = this.sy(p.y);
			const isSel = selected === p.e.id;
			const isHover = this.hoverId === p.e.id;
			const color = L.branchColor(p.branch);
			const r = px(isSel ? 8 : 6, 3.5, isSel ? 13 : 10);

			// thumbnail above the node when the beat has a still and we're close
			if (thumbA > 0.02 && p.e.image) {
				const rec = this.images.get(p.e.image);
				const tw = px(88, 40, 132);
				const th = tw * 0.62;
				const ty = y - th - r - px(14, 8, 22);
				ctx.globalAlpha = thumbA;
				ctx.fillStyle = T.panel;
				ctx.strokeStyle = isSel ? color : T.line;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.roundRect(x - tw / 2, ty, tw, th, 5);
				ctx.fill();
				if (rec?.ok) {
					ctx.save();
					ctx.clip();
					// cover-crop into the frame
					const iw = rec.img.naturalWidth;
					const ih = rec.img.naturalHeight;
					const k = Math.max(tw / iw, th / ih);
					ctx.drawImage(rec.img, x - (iw * k) / 2, ty + th / 2 - (ih * k) / 2, iw * k, ih * k);
					ctx.restore();
					ctx.beginPath();
					ctx.roundRect(x - tw / 2, ty, tw, th, 5);
				}
				ctx.stroke();
				ctx.globalAlpha = 1;
			}

			// portal ring where a time machine fires
			if (L.departureIds.has(p.e.id)) {
				ctx.strokeStyle = T.muted;
				ctx.globalAlpha = 0.75;
				ctx.lineWidth = px(1.4, 0.9, 2.2);
				ctx.setLineDash([px(2.5, 1.5), px(2.5, 1.5)]);
				ctx.beginPath();
				ctx.arc(x, y, r + px(4, 2.5, 6), 0, 7);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.globalAlpha = 1;
			}

			// origin flag
			if (p.e.kind === 'origin' || p.e.origin) {
				const fx = x - px(11, 6, 16);
				ctx.strokeStyle = T.accent;
				ctx.fillStyle = T.accent;
				ctx.lineWidth = px(1.5, 1, 2.2);
				ctx.beginPath();
				ctx.moveTo(fx, y - px(3, 2, 5));
				ctx.lineTo(fx, y - px(15, 9, 22));
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(fx, y - px(15, 9, 22));
				ctx.lineTo(fx + px(7, 4, 10), y - px(13, 7.5, 19));
				ctx.lineTo(fx, y - px(10.5, 6, 16));
				ctx.closePath();
				ctx.fill();
			}

			// the node itself
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 7);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.lineWidth = px(3, 1.8, 4.5);
			ctx.strokeStyle = T.ink;
			ctx.stroke();
			if (isHover && !isSel) {
				ctx.beginPath();
				ctx.arc(x, y, r + px(3, 2, 5), 0, 7);
				ctx.strokeStyle = color;
				ctx.globalAlpha = 0.5;
				ctx.lineWidth = 1.4;
				ctx.stroke();
				ctx.globalAlpha = 1;
			}
			if (isSel) {
				ctx.beginPath();
				ctx.arc(x, y, r + px(5, 3.5, 8), 0, 7);
				ctx.strokeStyle = T.paper;
				ctx.lineWidth = 1.2;
				ctx.stroke();
			}

			// paradox warning
			if (p.e.paradox) {
				const wx = x + px(10, 6, 15);
				const wy = y - px(11, 7, 17);
				const w = px(7, 4.5, 10);
				ctx.beginPath();
				ctx.moveTo(wx, wy - w * 0.93);
				ctx.lineTo(wx + w, wy + w * 0.86);
				ctx.lineTo(wx - w, wy + w * 0.86);
				ctx.closePath();
				ctx.fillStyle = '#ffcc33';
				ctx.strokeStyle = T.ink;
				ctx.lineWidth = 1.2;
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = T.ink;
				ctx.font = `bold ${px(8, 5.5, 11)}px ${T.monoFont}`;
				ctx.fillText('!', wx, wy + w * 0.55);
			}

			// cross-reference marker (a crossing into another specimen)
			if (p.e.crossRef) {
				ctx.fillStyle = T.accent;
				ctx.font = `bold ${px(15, 10, 21)}px ${T.monoFont}`;
				ctx.fillText('»', x - px(12, 7, 17), y - px(6, 4, 9));
			}

			// date beneath (mid tier), then the beat title (near tier)
			if (dateA > 0.03) {
				ctx.globalAlpha = dateA;
				ctx.fillStyle = T.muted;
				ctx.font = `${px(9, 8, 12.5)}px ${T.monoFont}`;
				ctx.fillText(shortDate(p.e), x, y + r + px(15, 11, 21));
				ctx.globalAlpha = 1;
			}
			if (labelA > 0.03) {
				ctx.globalAlpha = labelA;
				ctx.fillStyle = T.paper;
				ctx.font = `${px(10.5, 9, 14)}px ${T.monoFont}`;
				const t = p.e.label.length > 30 ? p.e.label.slice(0, 28) + '…' : p.e.label;
				ctx.fillText(t, x, y + r + px(30, 22, 40));
				ctx.globalAlpha = 1;
			}
		}
	}

	/**
	 * A comet ribbon: the whole jump is one filled shape that swells from the
	 * departure, thins, and flares into a barbed head at the arrival.
	 */
	private ribbon(
		from: { x: number; y: number },
		to: { x: number; y: number },
		apexY: number,
		color: string,
		alpha: number,
		base: number
	): { x: number; y: number } {
		const ctx = this.ctx;
		const cx = (from.x + to.x) / 2;
		const N = 44;
		const pts: { x: number; y: number; t: number }[] = [];
		for (let i = 0; i <= N; i++) {
			const t = i / N;
			const u = 1 - t;
			pts.push({
				x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
				y: u * u * from.y + 2 * u * t * apexY + t * t * to.y,
				t
			});
		}
		const w = (t: number) =>
			t < 0.86
				? base * (0.28 + 0.9 * Math.sin(Math.PI * (t / 0.86)) ** 0.7)
				: base * 2.6 * (1 - (t - 0.86) / 0.14);
		const Lside: { x: number; y: number }[] = [];
		const Rside: { x: number; y: number }[] = [];
		for (let i = 0; i <= N; i++) {
			const p = pts[i];
			const q = pts[Math.min(i + 1, N)];
			const r = pts[Math.max(i - 1, 0)];
			let nx = -(q.y - r.y);
			let ny = q.x - r.x;
			const len = Math.hypot(nx, ny) || 1;
			nx /= len;
			ny /= len;
			const hw = w(p.t) / 2;
			Lside.push({ x: p.x + nx * hw, y: p.y + ny * hw });
			Rside.push({ x: p.x - nx * hw, y: p.y - ny * hw });
		}
		ctx.beginPath();
		ctx.moveTo(Lside[0].x, Lside[0].y);
		for (const p of Lside) ctx.lineTo(p.x, p.y);
		for (let i = N; i >= 0; i--) ctx.lineTo(Rside[i].x, Rside[i].y);
		ctx.closePath();
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = 8;
		ctx.fillStyle = color;
		ctx.globalAlpha = alpha;
		ctx.fill();
		ctx.restore();
		return pts[Math.floor(N / 2)];
	}

	/** a spark travelling along the selected beat's outgoing ribbon */
	private pulse(
		from: { x: number; y: number },
		to: { x: number; y: number },
		apexY: number,
		color: string,
		now: number
	) {
		const ctx = this.ctx;
		const t = ((now - this.t0) % 1600) / 1600;
		const u = 1 - t;
		const cx = (from.x + to.x) / 2;
		const x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
		const y = u * u * from.y + 2 * u * t * apexY + t * t * to.y;
		ctx.save();
		ctx.shadowColor = color;
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(x, y, 3.2, 0, 7);
		ctx.fillStyle = this.theme!.paper;
		ctx.fill();
		ctx.restore();
	}
}
