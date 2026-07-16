import { describe, it, expect } from 'vitest';
import { computeLayout, elasticWeight } from './layout';
import { computeStoryCurve } from './storycurve';
import { stitchTimelines } from './stitch';
import type { Branch, TimelineEvent } from '$lib/types';

const ev = (
	id: string,
	narrative: number,
	chrono: number,
	extra: Partial<TimelineEvent> = {}
): TimelineEvent => ({ id, label: id, narrative, chrono, ...extra });

// a miniature BTTF: prime → traveller lands (arrival birth) → repaired line (drift birth)
const EVENTS: TimelineEvent[] = [
	ev('a', 0, 1985.1, { kind: 'departure', jumpTo: 'b', traveler: 'Marty' }),
	ev('b', 1, 1955.1, { kind: 'arrival', traveler: 'Marty' }),
	ev('c', 2, 1955.2),
	ev('d', 3, 1955.3),
	ev('e', 4, 1985.2, { traveler: 'Marty' })
];
const BRANCHES: Branch[] = [
	{ id: 'prime', label: 'Prime', status: 'original' },
	{ id: 'divergent', label: 'Divergent', parent: 'prime', branchAt: 'b', status: 'endangered' },
	{ id: 'restored', label: 'Restored', parent: 'divergent', branchAt: 'd', status: 'restored' }
];

describe('branch membership', () => {
	it('walks narrative order and switches at each branchAt', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told');
		expect(L.branchOf('a')).toBe('prime');
		expect(L.branchOf('b')).toBe('divergent');
		expect(L.branchOf('c')).toBe('divergent');
		expect(L.branchOf('d')).toBe('restored');
		expect(L.branchOf('e')).toBe('restored');
	});

	it('honours an explicit event.branch override', () => {
		const L = computeLayout(
			[...EVENTS, ev('f', 5, 1985.3, { branch: 'prime' })],
			BRANCHES,
			'told'
		);
		expect(L.branchOf('f')).toBe('prime');
	});
});

describe('as-told spacing', () => {
	it('gives every beat a uniform step', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told', { step: 100, ml: 0, mr: 0, minW: 0 });
		const xs = L.ordered.map((e) => L.posById.get(e.id)!.x);
		expect(xs).toEqual([0, 100, 200, 300, 400]);
	});
});

describe('temporal registration (as happened)', () => {
	it('orders beats by chrono and spaces them elastically', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'happened');
		const ids = L.ordered.map((e) => e.id);
		expect(ids).toEqual(['b', 'c', 'd', 'a', 'e']);
		// the 30-year hop from d (1955.3) to a (1985.1) gets more room than
		// the same-week hop from b to c
		const x = (id: string) => L.posById.get(id)!.x;
		expect(x('a') - x('d')).toBeGreaterThan((x('c') - x('b')) * 1.5);
	});

	it('registers the same instant on two lanes to one x', () => {
		const L = computeLayout(
			[
				ev('p1', 0, 1955, {}),
				ev('q1', 1, 1985, { branch: 'divergent' }),
				ev('p2', 2, 1985, { branch: 'prime' })
			],
			[
				{ id: 'prime', label: 'Prime' },
				{ id: 'divergent', label: 'Div', parent: 'prime', branchAt: 'q1' }
			],
			'happened'
		);
		expect(L.posById.get('q1')!.x).toBe(L.posById.get('p2')!.x);
		expect(L.moments).toHaveLength(1);
		expect(L.moments[0].ys).toHaveLength(2);
	});

	it('still separates same-instant beats that share a lane', () => {
		const L = computeLayout(
			[ev('p1', 0, 1985), ev('p2', 1, 1985)],
			[{ id: 'prime', label: 'Prime' }],
			'happened'
		);
		expect(L.posById.get('p1')!.x).not.toBe(L.posById.get('p2')!.x);
		expect(L.moments).toHaveLength(0);
	});

	it('compresses gaps on a log scale', () => {
		expect(elasticWeight(0)).toBeCloseTo(0.6);
		expect(elasticWeight(1000)).toBeLessThanOrEqual(2.4);
		expect(elasticWeight(30)).toBeGreaterThan(elasticWeight(1));
	});
});

describe('lane slots', () => {
	it('lets a later branch reuse a freed row', () => {
		// two child branches with disjoint spans → same slot
		const L = computeLayout(
			[
				ev('r1', 0, 1900),
				ev('b1', 1, 1910, {}),
				ev('r2', 2, 1990),
				ev('c1', 3, 2000, {})
			],
			[
				{ id: 'root', label: 'Root' },
				{ id: 'bA', label: 'A', parent: 'root', branchAt: 'b1' },
				{ id: 'bB', label: 'B', parent: 'root', branchAt: 'c1' }
			],
			'happened',
			{ step: 100 }
		);
		// r2 must return to the root lane for the spans to be disjoint
		const withOverride = computeLayout(
			[
				ev('r1', 0, 1900),
				ev('b1', 1, 1910),
				ev('r2', 2, 1990, { branch: 'root' }),
				ev('c1', 3, 2000)
			],
			[
				{ id: 'root', label: 'Root' },
				{ id: 'bA', label: 'A', parent: 'root', branchAt: 'b1' },
				{ id: 'bB', label: 'B', parent: 'root', branchAt: 'c1' }
			],
			'happened',
			{ step: 100 }
		);
		const laneA = withOverride.posById.get('b1')!.lane;
		const laneB = withOverride.posById.get('c1')!.lane;
		expect(laneA).toBe(laneB);
		expect(laneA).not.toBe(0);
		void L;
	});

	it('records where each lane begins and ends', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told', { step: 100, ml: 0, mr: 0, minW: 0 });
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.startX).toBe(100); // beat b
		expect(div.endX).toBe(200); // beat c
	});
});

describe('births and decay', () => {
	it('classifies a jump-target split as an arrival birth', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told');
		const birth = L.births.find((b) => b.branch === 'divergent')!;
		expect(birth.kind).toBe('arrival');
		expect(birth.from).toBeNull();
	});

	it('classifies a non-jump split as a drift birth with a wye', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told');
		const birth = L.births.find((b) => b.branch === 'restored')!;
		expect(birth.kind).toBe('drift');
		expect(birth.from).not.toBeNull();
		expect(L.splinters).toHaveLength(1);
	});

	it('fades an endangered branch from the moment its successor is born', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told', { step: 100, ml: 0, mr: 0, minW: 0 });
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.fadeAfterX).toBe(L.posById.get('d')!.x);
	});

	it('honours an explicit erasedAt over the inferred point', () => {
		const branches = BRANCHES.map((b) =>
			b.id === 'divergent' ? { ...b, erasedAt: 'c' } : b
		);
		const L = computeLayout(EVENTS, branches, 'told');
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.fadeAfterX).toBe(L.posById.get('c')!.x);
	});
});

describe('traveller threads', () => {
	it('builds one thread per named traveller, in narrative order', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'told');
		expect(L.threads).toHaveLength(1);
		expect(L.threads[0].traveler).toBe('Marty');
		expect(L.threads[0].points.map((p) => p.e.id)).toEqual(['a', 'b', 'e']);
	});
});

describe('jump levelling', () => {
	it('stacks overlapping arcs onto separate levels', () => {
		const L = computeLayout(
			[
				ev('a', 0, 2000, { jumpTo: 'c' }),
				ev('b', 1, 1990, { jumpTo: 'd' }),
				ev('c', 2, 1950),
				ev('d', 3, 1960)
			],
			[{ id: 'main', label: 'Main' }],
			'told'
		);
		const levels = new Set(L.jumps.map((j) => j.level));
		expect(levels.size).toBe(2);
	});
});

describe('story-curve lens layout', () => {
	it('plots x by narrative order and y by chronological rank', () => {
		const L = computeStoryCurve(EVENTS, BRANCHES, 'told', { ml: 0, step: 100, top: 0 });
		const xs = L.ordered.map((e) => L.posById.get(e.id)!.x);
		expect(xs).toEqual([0, 100, 200, 300, 400]);
		// chrono ranks: 1955.1 < 1955.2 < 1955.3 < 1985.1 < 1985.2
		const rank = (id: string) => L.posById.get(id)!.lane;
		expect(rank('b')).toBe(0);
		expect(rank('a')).toBe(3);
		expect(rank('e')).toBe(4);
	});

	it('shares a row between beats at the same instant', () => {
		const L = computeStoryCurve(
			[ev('p', 0, 1985), ev('q', 1, 1985), ev('r', 2, 1990)],
			[],
			'told'
		);
		expect(L.posById.get('p')!.y).toBe(L.posById.get('q')!.y);
		expect(L.posById.get('r')!.y).toBeGreaterThan(L.posById.get('p')!.y);
	});

	it('keeps the lane vocabulary empty so standard layers no-op', () => {
		const L = computeStoryCurve(EVENTS, BRANCHES);
		expect(L.segParts).toEqual([]);
		expect(L.jumps).toEqual([]);
		expect(L.lanes).toEqual([]);
		// but membership and departures still power the panel and portal rings
		expect(L.branchOf('e')).toBe('restored');
		expect(L.departureIds.has('a')).toBe(true);
	});
});

describe('world-lines lens layout', () => {
	it('keeps a child branch on its parent line at birth, then peels to its own level', async () => {
		const { computeWorldLines } = await import('./worldlines');
		const L = computeWorldLines(EVENTS, BRANCHES, 'told');
		// b is divergent's branchAt: it sits exactly where the parent line is
		const primeY = L.lanes.find((l) => l.id === 'prime')!.y;
		expect(L.posById.get('b')!.y).toBe(primeY);
		// far after birth, e (restored) sits at its own level, below the root
		const far = L.posById.get('e')!;
		expect(far.y).toBeGreaterThan(L.lanes[0].y);
		expect(far.lane).toBeGreaterThan(0);
	});

	it('always uses the chronological elastic axis; order only re-sorts stepping', async () => {
		const { computeWorldLines } = await import('./worldlines');
		const told = computeWorldLines(EVENTS, BRANCHES, 'told');
		const happened = computeWorldLines(EVENTS, BRANCHES, 'happened');
		// positions identical across orders
		for (const e of EVENTS) {
			expect(told.posById.get(e.id)!.x).toBe(happened.posById.get(e.id)!.x);
		}
		// stepping order differs
		expect(told.ordered.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(happened.ordered.map((e) => e.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
	});

	it('emits sampled world lines with decay on the endangered branch', async () => {
		const { computeWorldLines } = await import('./worldlines');
		const L = computeWorldLines(EVENTS, BRANCHES, 'told');
		expect(L.worldLines!.length).toBeGreaterThanOrEqual(2);
		const div = L.worldLines!.find((w) => w.branch === 'divergent')!;
		expect(div.fadeAfterX).toBe(L.posById.get('d')!.x);
		// its line starts on the parent's level and ends on its own
		expect(div.pts[0].y).toBe(L.lanes.find((l) => l.id === 'prime')!.y);
		expect(div.pts.at(-1)!.y).not.toBe(div.pts[0].y);
	});
});

describe('saga stitching', () => {
	const partI = {
		slug: 'one',
		title: 'Part One',
		events: [
			ev('start', 0, 1985),
			ev('hook', 1, 1955, { jumpToLabel: '1885', crossRef: { entry: 'two', event: 'landing' } })
		],
		branches: [{ id: 'prime', label: 'Timeline 1' }] as Branch[]
	};
	const partII = {
		slug: 'two',
		title: 'Part Two',
		events: [ev('landing', 0, 1885, { jumpFromLabel: '1955' }), ev('end', 1, 1885.5)],
		branches: [{ id: 'prime', label: 'Timeline 1' }] as Branch[]
	};

	it('prefixes colliding ids and offsets narrative order per part', () => {
		const s = stitchTimelines([partI, partII]);
		expect(s.events.map((e) => e.id)).toEqual(['s0:start', 's0:hook', 's1:landing', 's1:end']);
		expect(s.branches.map((b) => b.id)).toEqual(['s0:prime', 's1:prime']);
		expect(s.branches.map((b) => b.label)).toEqual(['I - Timeline 1', 'II - Timeline 1']);
		expect(s.events[2].narrative).toBeGreaterThan(s.events[1].narrative);
	});

	it('promotes a cross-part reference into a real jump and drops both stubs', () => {
		const s = stitchTimelines([partI, partII]);
		const hook = s.events.find((e) => e.id === 's0:hook')!;
		const landing = s.events.find((e) => e.id === 's1:landing')!;
		expect(hook.jumpTo).toBe('s1:landing');
		expect(hook.jumpToLabel).toBeUndefined();
		expect(landing.jumpFromLabel).toBeUndefined();
	});

	it('does not mutate the source parts', () => {
		stitchTimelines([partI, partII]);
		expect(partI.events[1].jumpToLabel).toBe('1885');
		expect(partII.events[0].jumpFromLabel).toBe('1955');
	});
});
