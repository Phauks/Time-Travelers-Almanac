// The Chronoscope: the Almanac's own Canvas 2D timeline engine.
// Orchestration only — geometry lives in layout.ts, the viewpoint in
// camera.ts, and every draw pass in layers.ts. Static layers render into an
// offscreen cache that is blitted during pans; dynamic layers (selection,
// pulse, lane labels, minimap) draw live every frame. See docs/CHRONOSCOPE.md.

import type { BeatPos, TimelineLayout } from './layout';
import { Camera } from './camera';
import {
	STATIC_LAYERS,
	DYNAMIC_LAYERS,
	arcLift,
	drawMinimapViewport,
	minimapGeom,
	type ChronoTheme,
	type Frame,
	type Layer
} from './layers';

export type { ChronoTheme } from './layers';

export interface ChronoCallbacks {
	/** a beat was picked with the pointer */
	onSelect?: (id: string) => void;
	/** the user grabbed the camera (used to pause a running tour) */
	onUserInteract?: () => void;
}

/** smooth 0..1 ramp of v across [a, b] */
const ramp = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));

/** how far beyond the viewport the static cache extends, in px */
const CACHE_MARGIN = 320;

export class Chronoscope {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private layout: TimelineLayout | null = null;
	private theme: ChronoTheme | null = null;
	private cb: ChronoCallbacks;
	private reduced: boolean;

	readonly cam: Camera;
	private vw = 0;
	private vh = 0;
	private dpr = 1;

	private selectedId: string | null = null;
	private hoverId: string | null = null;
	private showThreads = false;

	// interaction
	private pointers = new Map<number, { x: number; y: number }>();
	private dragMoved = false;
	private pinchDist = 0;
	private scrubbing = false;
	private raf = 0;
	private disposed = false;

	// layers + static cache
	private staticLayers: Layer[] = [...STATIC_LAYERS];
	private dynamicLayers: Layer[] = [...DYNAMIC_LAYERS];
	private cache: HTMLCanvasElement | null = null;
	private cacheState: { x: number; y: number; s: number; v: number } | null = null;
	private sceneVersion = 0;

	private images = new Map<string, { img: HTMLImageElement; ok: boolean }>();
	private ro: ResizeObserver;
	private detachEvents: () => void;

	constructor(canvas: HTMLCanvasElement, cb: ChronoCallbacks = {}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.cb = cb;
		this.reduced =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.cam = new Camera(this.reduced);

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

	/** add a render pass (plugins: era bands, parallax, density skylines…) */
	use(layer: Layer) {
		(layer.dynamic ? this.dynamicLayers : this.staticLayers).push(layer);
		this.invalidate();
	}

	setScene(layout: TimelineLayout, theme: ChronoTheme) {
		const first = !this.layout;
		this.layout = layout;
		this.theme = theme;
		const maxLevel = layout.jumps.reduce((m, j) => Math.max(m, j.level), 0);
		this.cam.setBounds({
			x0: 0,
			x1: layout.W,
			y0: -(arcLift(maxLevel) + 60),
			y1: layout.H + 20
		});
		for (const p of layout.pos) if (p.e.image) this.loadImage(p.e.image);
		this.invalidate();
		if (first) this.fitAll(false);
		else this.requestDraw();
	}

	setSelected(id: string | null, fly = false) {
		this.selectedId = id;
		if (fly && id) this.flyToBeat(id);
		this.requestDraw();
	}

	setShowThreads(on: boolean) {
		this.showThreads = on;
		this.invalidate();
		this.requestDraw();
	}

	fitAll(animate = true) {
		if (!this.layout || !this.vw) return;
		const to = this.cam.fitState(this.vw, this.vh);
		this.cam.minS = Math.min(to.s * 0.7, 0.6);
		if (animate && !this.reduced) this.cam.flyTo(to, 500);
		else {
			this.cam.set(to);
			this.cam.mode = 'idle';
		}
		this.requestDraw();
	}

	flyToBeat(id: string) {
		const p = this.layout?.posById.get(id);
		if (!p) return;
		const s = Math.max(this.cam.s, 1.3);
		this.cam.flyTo({ x: p.x, y: p.y - 30, s }, 650);
		this.requestDraw();
	}

	// ----------------------------------------------------------- interaction

	private local(e: { clientX: number; clientY: number }) {
		const r = this.canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	private inMinimap(px: number, py: number): boolean {
		if (!this.layout) return false;
		const g = minimapGeom({ vw: this.vw, vh: this.vh, layout: this.layout });
		return px >= g.x - 6 && px <= g.x + g.w + 6 && py >= g.y - 6 && py <= g.y + g.h + 6;
	}

	private scrubTo(px: number, py: number) {
		if (!this.layout) return;
		const g = minimapGeom({ vw: this.vw, vh: this.vh, layout: this.layout });
		const w = g.world(px, py);
		this.cam.x = Math.max(0, Math.min(this.layout.W, w.x));
		this.cam.y = w.y;
		this.requestDraw();
	}

	private onDown(e: PointerEvent) {
		this.canvas.setPointerCapture(e.pointerId);
		const pt = this.local(e);
		this.pointers.set(e.pointerId, pt);
		this.cam.interrupt();
		this.cb.onUserInteract?.();
		if (this.pointers.size === 1) {
			if (this.inMinimap(pt.x, pt.y)) {
				this.scrubbing = true;
				this.scrubTo(pt.x, pt.y);
			}
			this.dragMoved = false;
			this.canvas.classList.add('dragging');
		} else if (this.pointers.size === 2) {
			const [a, b] = [...this.pointers.values()];
			this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
			this.cam.mode = 'pinch';
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

		if (this.scrubbing) {
			this.scrubTo(pt.x, pt.y);
			return;
		}
		if (this.pointers.size === 2) {
			const [a, b] = [...this.pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			if (this.pinchDist > 0) {
				const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
				this.cam.zoomAbout(mid.x, mid.y, dist / this.pinchDist, this.vw, this.vh);
			}
			this.pinchDist = dist;
			this.requestDraw();
			return;
		}
		const dx = pt.x - prev.x;
		const dy = pt.y - prev.y;
		if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
		this.cam.dragBy(dx, dy);
		this.requestDraw();
	}

	private onUp(e: PointerEvent) {
		const pt = this.local(e);
		this.pointers.delete(e.pointerId);
		if (this.pointers.size < 2) this.pinchDist = 0;
		if (this.pointers.size > 0) return;
		this.canvas.classList.remove('dragging');
		const wasScrub = this.scrubbing;
		this.scrubbing = false;
		if (!this.dragMoved && !wasScrub) {
			const hit = this.hitTest(pt.x, pt.y);
			if (hit) this.cb.onSelect?.(hit.e.id);
		}
		this.cam.release();
		this.requestDraw();
	}

	private onWheel(e: WheelEvent) {
		e.preventDefault();
		this.cb.onUserInteract?.();
		const pt = this.local(e);
		// trackpad pinch arrives as ctrl+wheel with small deltas
		const k = e.ctrlKey ? 0.01 : 0.0014;
		this.cam.zoomAbout(pt.x, pt.y, Math.exp(-e.deltaY * k), this.vw, this.vh);
		this.cam.release();
		this.requestDraw();
	}

	private hitTest(px: number, py: number): BeatPos | null {
		if (!this.layout) return null;
		let best: BeatPos | null = null;
		let bd = 18;
		for (const p of this.layout.pos) {
			const d = Math.hypot(
				this.cam.sx(p.x, this.vw) - px,
				this.cam.sy(p.y, this.vh) - py
			);
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
		this.invalidate();
		if (this.layout) this.fitAll(false);
	}

	private loadImage(src: string) {
		if (this.images.has(src)) return;
		const img = new Image();
		const rec = { img, ok: false };
		this.images.set(src, rec);
		img.onload = () => {
			rec.ok = true;
			this.invalidate();
			this.requestDraw();
		};
		img.src = src;
	}

	/** drop the static cache (scene, theme, tiers, or viewport changed) */
	private invalidate() {
		this.sceneVersion++;
	}

	private makeFrame(
		ctx: CanvasRenderingContext2D,
		camX: number,
		camY: number,
		vw: number,
		vh: number,
		now: number
	): Frame {
		const s = this.cam.s;
		return {
			ctx,
			vw,
			vh,
			now,
			scale: s,
			sx: (wx) => (wx - camX) * s + vw / 2,
			sy: (wy) => (wy - camY) * s + vh / 2,
			layout: this.layout!,
			theme: this.theme!,
			tiers: {
				dateA: ramp(s, 0.45, 0.7),
				labelA: ramp(s, 0.85, 1.15),
				thumbA: ramp(s, 1.3, 1.7)
			},
			selectedId: this.selectedId,
			hoverId: this.hoverId,
			showThreads: this.showThreads,
			image: (src) => {
				const rec = this.images.get(src);
				return rec?.ok ? rec.img : null;
			},
			px: (v, min, max = 1e9) => Math.min(max, Math.max(min, v * s))
		};
	}

	/** true while something is in motion and needs another frame */
	private animating(): boolean {
		if (this.cam.mode === 'fly' || this.cam.mode === 'spring') return true;
		// a selected departure keeps its ribbon pulse alive
		if (!this.reduced && this.selectedId) {
			const sel = this.layout?.posById.get(this.selectedId);
			if (sel && sel.e.jumpTo) return true;
		}
		return false;
	}

	requestDraw() {
		if (this.disposed) return;
		cancelAnimationFrame(this.raf);
		const frame = (now: number) => {
			if (this.disposed) return;
			this.cam.step(now);
			this.draw(now);
			if (this.animating()) this.raf = requestAnimationFrame(frame);
		};
		this.raf = requestAnimationFrame(frame);
	}

	/** render all static layers into the offscreen cache around the current view */
	private renderCache(now: number) {
		const cw = this.vw + CACHE_MARGIN * 2;
		const ch = this.vh + CACHE_MARGIN * 2;
		if (!this.cache) this.cache = document.createElement('canvas');
		this.cache.width = cw * this.dpr;
		this.cache.height = ch * this.dpr;
		const cctx = this.cache.getContext('2d')!;
		cctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		cctx.clearRect(0, 0, cw, ch);
		const f = this.makeFrame(cctx, this.cam.x, this.cam.y, cw, ch, now);
		for (const layer of this.staticLayers) layer.draw(f);
		this.cacheState = { x: this.cam.x, y: this.cam.y, s: this.cam.s, v: this.sceneVersion };
	}

	private draw(now: number) {
		const { ctx } = this;
		if (!this.layout || !this.theme) return;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.vw, this.vh);

		// static pass: blit the cache, rebuilding when stale or out of range
		const c = this.cacheState;
		const inRange =
			c &&
			c.v === this.sceneVersion &&
			c.s === this.cam.s &&
			Math.abs((c.x - this.cam.x) * this.cam.s) < CACHE_MARGIN &&
			Math.abs((c.y - this.cam.y) * this.cam.s) < CACHE_MARGIN;
		if (!inRange) this.renderCache(now);
		const cs = this.cacheState!;
		const ox = (cs.x - this.cam.x) * this.cam.s - CACHE_MARGIN;
		const oy = (cs.y - this.cam.y) * this.cam.s - CACHE_MARGIN;
		ctx.drawImage(
			this.cache!,
			ox,
			oy,
			this.vw + CACHE_MARGIN * 2,
			this.vh + CACHE_MARGIN * 2
		);

		// dynamic pass: live every frame
		const f = this.makeFrame(ctx, this.cam.x, this.cam.y, this.vw, this.vh, now);
		for (const layer of this.dynamicLayers) layer.draw(f);
		drawMinimapViewport(f, { x: this.cam.x, y: this.cam.y, s: this.cam.s }, this.theme);
	}
}
