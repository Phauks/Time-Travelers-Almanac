// The Chronoscope's camera: a pan/zoom viewpoint over world coordinates with
// soft bounds, drag resistance, a spring-back rubber band, and eased flights.
// Deliberately renderer-agnostic so the master timeline can reuse it as-is.

export interface CamState {
	x: number;
	y: number;
	s: number;
}

export interface WorldBounds {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
}

/** what the camera is currently doing; one mode at a time, no boolean soup */
export type CamMode = 'idle' | 'drag' | 'pinch' | 'fly' | 'spring';

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export class Camera {
	x = 0;
	y = 0;
	s = 1;
	minS = 0.15;
	maxS = 3;
	mode: CamMode = 'idle';

	private bounds: WorldBounds = { x0: 0, x1: 1000, y0: 0, y1: 1000 };
	private flight: { from: CamState; to: CamState; t0: number; dur: number } | null = null;
	private reduced: boolean;

	constructor(reducedMotion = false) {
		this.reduced = reducedMotion;
	}

	setBounds(b: WorldBounds) {
		this.bounds = b;
	}

	set(state: CamState) {
		this.x = state.x;
		this.y = state.y;
		this.s = state.s;
	}

	// world → screen and back, for a viewport of vw × vh
	sx(wx: number, vw: number) {
		return (wx - this.x) * this.s + vw / 2;
	}
	sy(wy: number, vh: number) {
		return (wy - this.y) * this.s + vh / 2;
	}
	wx(px: number, vw: number) {
		return (px - vw / 2) / this.s + this.x;
	}
	wy(py: number, vh: number) {
		return (py - vh / 2) / this.s + this.y;
	}

	/** the state that fits the whole world into the viewport */
	fitState(vw: number, vh: number, pad = 60): CamState {
		const b = this.bounds;
		const s = Math.min((vw - pad) / (b.x1 - b.x0), (vh - pad) / (b.y1 - b.y0), 1.1);
		return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s };
	}

	/** where the camera ought to rest: soft bounds keep some content on screen */
	restState(): CamState {
		const b = this.bounds;
		const mx = Math.min((b.x1 - b.x0) / 2, 120 / this.s);
		const my = Math.min((b.y1 - b.y0) / 2, 90 / this.s);
		return {
			x: Math.max(b.x0 + mx, Math.min(b.x1 - mx, this.x)),
			y: Math.max(b.y0 + my, Math.min(b.y1 - my, this.y)),
			s: this.s
		};
	}

	/** pan by a screen-space delta, with resistance outside the resting bounds */
	dragBy(dx: number, dy: number) {
		const rest = this.restState();
		const rx = this.x !== rest.x ? 0.35 : 1;
		const ry = this.y !== rest.y ? 0.35 : 1;
		this.x -= (dx / this.s) * rx;
		this.y -= (dy / this.s) * ry;
		this.mode = 'drag';
	}

	/** zoom by a factor keeping the world point under (px, py) fixed */
	zoomAbout(px: number, py: number, factor: number, vw: number, vh: number) {
		const wx = this.wx(px, vw);
		const wy = this.wy(py, vh);
		this.s = Math.max(this.minS, Math.min(this.maxS, this.s * factor));
		this.x = wx - (px - vw / 2) / this.s;
		this.y = wy - (py - vh / 2) / this.s;
	}

	flyTo(to: CamState, dur = 650, now = performance.now()) {
		if (this.reduced) {
			this.set(to);
			this.mode = 'idle';
			this.flight = null;
			return;
		}
		this.flight = { from: { x: this.x, y: this.y, s: this.s }, to, t0: now, dur };
		this.mode = 'fly';
	}

	/** release the camera: it springs back into bounds if stretched */
	release() {
		this.flight = null;
		this.mode = 'spring';
	}

	interrupt() {
		this.flight = null;
		this.mode = 'idle';
	}

	/** advance animations; returns true while another frame is needed */
	step(now: number): boolean {
		if (this.mode === 'fly' && this.flight) {
			const { from, to, t0, dur } = this.flight;
			const t = Math.min(1, (now - t0) / dur);
			const k = easeOut(t);
			this.x = from.x + (to.x - from.x) * k;
			this.y = from.y + (to.y - from.y) * k;
			this.s = from.s + (to.s - from.s) * k;
			if (t >= 1) {
				this.flight = null;
				this.mode = 'spring';
			}
			return true;
		}
		if (this.mode === 'spring') {
			const rest = this.restState();
			if (this.reduced) {
				this.x = rest.x;
				this.y = rest.y;
				this.mode = 'idle';
				return false;
			}
			this.x += (rest.x - this.x) * 0.16;
			this.y += (rest.y - this.y) * 0.16;
			if (Math.abs(rest.x - this.x) < 0.3 && Math.abs(rest.y - this.y) < 0.3) {
				this.x = rest.x;
				this.y = rest.y;
				this.mode = 'idle';
				return false;
			}
			return true;
		}
		return false;
	}
}
