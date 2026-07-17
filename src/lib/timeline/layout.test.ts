import { describe, it, expect } from 'vitest';
import { chronoFromWhen, computeLayout, elasticWeight } from './layout';
import { jumpText } from './display';
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
		const L = computeLayout(EVENTS, BRANCHES, 'traveler');
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
			'traveler'
		);
		expect(L.branchOf('f')).toBe('prime');
	});
});

describe('traveler-path spacing', () => {
	it('gives every beat a uniform step', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'traveler', { step: 100, ml: 0, mr: 0, minW: 0 });
		const xs = L.ordered.map((e) => L.posById.get(e.id)!.x);
		expect(xs).toEqual([0, 100, 200, 300, 400]);
	});
});

describe('temporal registration (as happened)', () => {
	it('positions beats elastically but steps through one timeline at a time', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'happened');
		// stepping follows the stream: each branch walked through its beats
		// (branches ranked by earliest moment) instead of strict calendar order
		const ids = L.ordered.map((e) => e.id);
		expect(ids).toEqual(['b', 'c', 'd', 'e', 'a']);
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
	});

	it('still separates same-instant beats that share a lane', () => {
		const L = computeLayout(
			[ev('p1', 0, 1985), ev('p2', 1, 1985)],
			[{ id: 'prime', label: 'Prime' }],
			'happened'
		);
		expect(L.posById.get('p1')!.x).not.toBe(L.posById.get('p2')!.x);
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
		const L = computeLayout(EVENTS, BRANCHES, 'traveler', { step: 100, ml: 0, mr: 0, minW: 0 });
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.startX).toBe(100); // beat b
		expect(div.endX).toBe(200); // beat c
	});
});

describe('births and decay', () => {
	it('classifies a jump-target split as an arrival birth', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'traveler');
		const birth = L.births.find((b) => b.branch === 'divergent')!;
		expect(birth.kind).toBe('arrival');
		expect(birth.from).toBeNull();
	});

	it('classifies a non-jump split as a drift birth with a wye', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'traveler');
		const birth = L.births.find((b) => b.branch === 'restored')!;
		expect(birth.kind).toBe('drift');
		expect(birth.from).not.toBeNull();
		expect(L.splinters).toHaveLength(1);
	});

	it('fades an endangered branch from the moment its successor is born', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'traveler', { step: 100, ml: 0, mr: 0, minW: 0 });
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.fadeAfterX).toBe(L.posById.get('d')!.x);
	});

	it('honours an explicit erasedAt over the inferred point', () => {
		const branches = BRANCHES.map((b) =>
			b.id === 'divergent' ? { ...b, erasedAt: 'c' } : b
		);
		const L = computeLayout(EVENTS, branches, 'traveler');
		const div = L.lanes.find((l) => l.id === 'divergent')!;
		expect(div.fadeAfterX).toBe(L.posById.get('c')!.x);
	});
});

describe('traveller presence', () => {
	it('collects each traveller and the beats they appear in', () => {
		const L = computeLayout(EVENTS, BRANCHES, 'traveler');
		expect(L.travelers).toHaveLength(1);
		expect(L.travelers[0].name).toBe('Marty');
		expect(L.travelers[0].beats).toEqual(['a', 'b', 'e']);
	});

	it('keeps variants of a person separate and reads the presence list first', () => {
		const L = computeLayout(
			[
				ev('m1', 0, 1985, { travelers: ['Doc', 'Marty'] }),
				ev('m2', 1, 1955, { travelers: ['Doc (1955)', 'Marty'] }),
				// presence list wins over the jump traveller when both exist
				ev('m3', 2, 1985.1, { traveler: 'Marty', travelers: ['Marty', 'Doc'] })
			],
			[{ id: 'main', label: 'Main' }],
			'traveler'
		);
		expect(L.travelers.map((t) => t.name)).toEqual(['Doc', 'Marty', 'Doc (1955)']);
		expect(L.travelers.find((t) => t.name === 'Doc')!.beats).toEqual(['m1', 'm3']);
		expect(L.travelers.find((t) => t.name === 'Doc (1955)')!.beats).toEqual(['m2']);
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
			'traveler'
		);
		const levels = new Set(L.jumps.map((j) => j.level));
		expect(levels.size).toBe(2);
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

describe('structured calendar time', () => {
	it('derives an ordered sort key from year, month, day, and time', () => {
		const a = chronoFromWhen({ year: 1955, month: 11, day: 5, time: '06:00' });
		const b = chronoFromWhen({ year: 1955, month: 11, day: 5, time: '20:30' });
		const c = chronoFromWhen({ year: 1955, month: 11, day: 12 });
		const d = chronoFromWhen({ year: 1955, month: 11 });
		expect(a).toBeLessThan(b);
		expect(b).toBeLessThan(c);
		expect(d).toBeLessThan(a); // month-only sorts before its dated days
		expect(Math.floor(a)).toBe(1955);
	});

	it('aligns the same calendar day across timelines to one column', () => {
		const L = computeLayout(
			[
				ev('p1', 0, 0, { when: { year: 1955, month: 11, day: 5, time: '06:00' } }),
				ev('q1', 1, 0, {
					when: { year: 1955, month: 11, day: 5, time: '15:00' },
					branch: 'other'
				}),
				ev('p2', 2, 0, { when: { year: 1985, month: 10, day: 26 } })
			],
			[
				{ id: 'main', label: 'Main' },
				{ id: 'other', label: 'Other', parent: 'main', branchAt: 'q1' }
			],
			'happened'
		);
		// same day, different lanes: one column even though the times differ
		expect(L.posById.get('p1')!.x).toBe(L.posById.get('q1')!.x);
		expect(L.posById.get('p2')!.x).toBeGreaterThan(L.posById.get('p1')!.x);
	});

	it('marks large real gaps on lane segments for the notch', () => {
		const L = computeLayout(
			[ev('a', 0, 1955), ev('b', 1, 1985), ev('c', 2, 1985.01)],
			[{ id: 'main', label: 'Main' }],
			'traveler'
		);
		expect(L.segParts[0].gapYears).toBeCloseTo(30);
		expect(L.segParts[1].gapYears).toBeLessThan(1);
	});

	it('spells out jump spans in the best whole unit', () => {
		expect(jumpText(1955, 1985)).toBe('30 Years');
		expect(jumpText(1955, 1955 + 7 / 365.25)).toBe('1 Week');
		expect(jumpText(1955, 1955 + 2 / 365.25)).toBe('2 Days');
		expect(jumpText(1955, 1955 + 90 / 365.25)).toBe('3 Months');
		expect(jumpText(1955, 1955.0000019)).toBe('Moments');
	});
});

describe('cast resolution', () => {
	const CAST = [
		{ id: 'doc-a', name: 'Doc', person: 'Doc Brown', symbol: 'D' },
		{
			id: 'doc-b',
			name: 'Doc (later)',
			person: 'Doc Brown',
			images: [{ src: '/young.jpg' }, { src: '/old.jpg', fromEvent: 'd' }]
		}
	];
	const EVS = [
		ev('a', 0, 1985, { travelers: ['doc-a'] }),
		ev('b', 1, 1955, { travelers: ['Doc (later)', 'Stranger'] }),
		ev('d', 2, 1956, { travelers: ['doc-b'] })
	];

	it('resolves presence refs by id, then name, and keeps unknowns as implicit cast', () => {
		const L = computeLayout(EVS, [], 'traveler', { cast: CAST });
		const ids = L.travelers.map((t) => t.id);
		expect(ids).toEqual(['doc-a', 'doc-b', 'Stranger']);
		expect(L.travelers[1].beats).toEqual(['b', 'd']); // name ref and id ref unify
		expect(L.travelers[2].person).toBe('Stranger');
	});

	it('keeps variants of one person distinct but grouped by person', () => {
		const L = computeLayout(EVS, [], 'traveler', { cast: CAST });
		expect(L.travelers[0].person).toBe('Doc Brown');
		expect(L.travelers[1].person).toBe('Doc Brown');
		expect(L.travelers[0].id).not.toBe(L.travelers[1].id);
	});

	it('resolves portrait checkpoints to narrative positions', () => {
		const L = computeLayout(EVS, [], 'traveler', { cast: CAST });
		const docB = L.travelers.find((t) => t.id === 'doc-b')!;
		expect(docB.images.map((i) => i.src)).toEqual(['/young.jpg', '/old.jpg']);
		expect(docB.images[0].fromNarr).toBe(-Infinity);
		expect(docB.images[1].fromNarr).toBe(2); // active from beat d onward
	});
});

describe('saga identity (sameAs)', () => {
	const mk = (slug: string, branches: Branch[], events: TimelineEvent[]) => ({
		slug,
		title: slug,
		events,
		branches
	});
	// I: prime splits into repaired; II departs from that repaired line and its
	// own repaired line is the one III endangers
	const I = mk(
		'one',
		[
			{ id: 'prime', label: 'Timeline 1', status: 'original' },
			{ id: 'repaired', label: 'Timeline 2', parent: 'prime', branchAt: 'i2', status: 'restored' }
		],
		[ev('i1', 0, 1985), ev('i2', 1, 1985.1)]
	);
	const II = mk(
		'two',
		[
			{
				id: 'prime',
				label: 'Timeline 1',
				status: 'original',
				sameAs: { entry: 'one', branch: 'repaired' }
			},
			{ id: 'fixed', label: 'Timeline 2', parent: 'prime', branchAt: 'j2', status: 'restored' }
		],
		[ev('j1', 0, 2015), ev('j2', 1, 2015.1)]
	);
	const III = mk(
		'three',
		[
			{
				id: 'start',
				label: 'Timeline 1',
				status: 'endangered',
				sameAs: { entry: 'two', branch: 'fixed' }
			}
		],
		[ev('k1', 0, 1885)]
	);

	it('merges declared identities onto one lane, transitively', () => {
		const s = stitchTimelines([I, II, III]);
		// I.repaired absorbs II.prime; II.fixed absorbs III.start
		expect(s.branches.map((b) => b.id)).toEqual(['s0:prime', 's0:repaired', 's1:fixed']);
	});

	it('stamps every event with its resolved canonical lane', () => {
		const s = stitchTimelines([I, II, III]);
		const branchOf = (id: string) => s.events.find((e) => e.id === id)!.branch;
		expect(branchOf('s1:j1')).toBe('s0:repaired'); // II opens on I's repaired line
		expect(branchOf('s2:k1')).toBe('s1:fixed'); // III opens on II's repaired line
	});

	it("a merged lane's fate comes from the latest part that touched it", () => {
		const s = stitchTimelines([I, II, III]);
		// III declares the line II repaired to be endangered
		expect(s.branches.find((b) => b.id === 's1:fixed')!.status).toBe('endangered');
		// II declares I's repaired line its baseline
		expect(s.branches.find((b) => b.id === 's0:repaired')!.status).toBe('original');
	});

	it('remaps a surviving branch parent through the merge', () => {
		const s = stitchTimelines([I, II, III]);
		expect(s.branches.find((b) => b.id === 's1:fixed')!.parent).toBe('s0:repaired');
	});
});
