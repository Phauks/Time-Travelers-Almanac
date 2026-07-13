<script lang="ts">
	import { onMount } from 'svelte';
	import { createTimeline, stagger, svg } from 'animejs';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { specimens, RULE_META, MEDIUM_META, LOOP_META } from '$lib/data';
	import type { MediaEntry, TimelineEvent } from '$lib/types';

	// ---- virtual layout space (scaled responsively by the SVG viewBox) ----
	const VW = 1000;
	const VH = 560;
	const PRIME_Y = 320;
	const PAD = 70;
	const SPAN = VW - PAD * 2;
	const STEM = 150;
	const HW = 62; // mini-rail half-width

	type Placed = {
		s: MediaEntry;
		cx: number;
		side: number;
		railY: number;
		titleY: number;
		nodes: { e: TimelineEvent; x: number }[];
		poly: string;
		jump: string | null;
		color: string;
	};

	const eras = [
		{ t: 0.05, l: 'ANTIQUITY' },
		{ t: 0.25, l: '19TH C.' },
		{ t: 0.45, l: '20TH C.' },
		{ t: 0.55, l: 'NOW' },
		{ t: 0.75, l: 'NEAR FUTURE' },
		{ t: 0.95, l: 'DEEP FUTURE' }
	];

	function eventColor(e: TimelineEvent, base: string): string {
		if (e.kind === 'loop') return 'var(--color-loop)';
		if (e.kind === 'jump') return '#ffffff';
		return base;
	}

	const placed: Placed[] = specimens.map((s, i) => {
		const cx = PAD + s.destEra * SPAN;
		const side = i % 2 === 0 ? -1 : 1;
		const railY = PRIME_Y + side * STEM;
		const ordered = [...s.timeline].sort((a, b) => a.narrative - b.narrative);
		const m = ordered.length;
		const nodes = ordered.map((e, j) => ({
			e,
			x: m === 1 ? cx : cx - HW + (j / (m - 1)) * HW * 2
		}));
		const poly = nodes.map((nd) => `${nd.x.toFixed(1)},${railY}`).join(' ');
		// first jump inside this mini-timeline
		let jump: string | null = null;
		const je = ordered.find((e) => e.jumpTo && ordered.some((o) => o.id === e.jumpTo));
		if (je) {
			const from = nodes.find((nd) => nd.e.id === je.id)!.x;
			const to = nodes.find((nd) => nd.e.id === je.jumpTo)!.x;
			const bow = railY - side * 42;
			jump = `M ${from} ${railY} C ${from} ${bow}, ${to} ${bow}, ${to} ${railY}`;
		}
		return {
			s,
			cx,
			side,
			railY,
			titleY: railY + side * -1 * (side < 0 ? 30 : 0) + side * 30,
			nodes,
			poly,
			jump,
			color: `var(--color-${s.rules[0]})`
		};
	});

	let hovered = $state<string | null>(null);
	let tip = $state<{ x: number; y: number; s: MediaEntry } | null>(null);
	let primeEl: SVGPathElement;
	let rootEl: HTMLDivElement;

	function onEnter(p: Placed, ev: MouseEvent) {
		hovered = p.s.slug;
		const r = (ev.currentTarget as SVGGElement).getBoundingClientRect();
		tip = { x: r.left + r.width / 2, y: r.top, s: p.s };
	}
	function onLeave() {
		hovered = null;
		tip = null;
	}
	function open(p: Placed) {
		goto(`${base}/specimens/${p.s.slug}`);
	}

	onMount(() => {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;
		const groups = rootEl.querySelectorAll('.spec');
		const tl = createTimeline({ defaults: { ease: 'outQuad' } });
		const drawable = svg.createDrawable(primeEl);
		tl.add(drawable, { draw: ['0 0', '0 1'], ease: 'inOutSine', duration: 1100 });
		tl.add(groups, { opacity: [0, 1], duration: 520, delay: stagger(80) }, '-=500');
	});
</script>

<div class="wrap" bind:this={rootEl}>
	<svg viewBox="0 0 {VW} {VH}" class="scene" role="img" aria-label="A prime timeline with specimens branching off it">
		<!-- era ticks -->
		{#each eras as era (era.l)}
			{@const ex = PAD + era.t * SPAN}
			<line x1={ex} y1={PRIME_Y + 10} x2={ex} y2={PRIME_Y + 18} class="tick" />
			<text x={ex} y={PRIME_Y + 34} class="eratext" text-anchor="middle">{era.l}</text>
		{/each}

		<!-- prime line -->
		<line x1={PAD} y1={PRIME_Y} x2={VW - PAD} y2={PRIME_Y} class="prime-glow" />
		<path bind:this={primeEl} d="M {PAD} {PRIME_Y} H {VW - PAD}" class="prime" />

		<!-- specimens -->
		{#each placed as p (p.s.slug)}
			<g
				class="spec"
				class:dim={hovered && hovered !== p.s.slug}
				class:hot={hovered === p.s.slug}
				role="button"
				tabindex="0"
				aria-label={p.s.title}
				onmouseenter={(e) => onEnter(p, e)}
				onmouseleave={onLeave}
				onfocus={(e) => onEnter(p, e as unknown as MouseEvent)}
				onblur={onLeave}
				onclick={() => open(p)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && open(p)}
			>
				<!-- stem from prime line to the mini-rail -->
				<line x1={p.cx} y1={PRIME_Y} x2={p.cx} y2={p.railY} class="stem" style="stroke:{p.color}" />
				<!-- node on the prime line -->
				<circle cx={p.cx} cy={PRIME_Y} r="4" class="primenode" style="fill:{p.color}" />

				<!-- the specimen's own timeline -->
				<polyline points={p.poly} class="minirail" style="stroke:{p.color}" />
				{#if p.jump}
					<path d={p.jump} class="minijump" style="stroke:{p.color}" />
				{/if}
				{#each p.nodes as nd (nd.e.id)}
					<circle cx={nd.x} cy={p.railY} r="3.4" style="fill:{eventColor(nd.e, p.color)}" class="evt" />
				{/each}

				<text x={p.cx} y={p.railY + p.side * 26} text-anchor="middle" class="title" style="fill:{p.color}">
					{p.s.title}
				</text>
			</g>
		{/each}
	</svg>

	{#if tip}
		<div
			class="tip"
			style="left:{tip.x}px; top:{tip.y}px; --c:var(--color-{tip.s.rules[0]})"
		>
			<span class="bar"></span>
			<strong>{tip.s.title} <span>{tip.s.year}</span></strong>
			<span class="meta">
				{RULE_META[tip.s.rules[0]].name}, {MEDIUM_META[tip.s.medium]}{tip.s.loop
					? `, ${LOOP_META[tip.s.loop]}`
					: ''}, travels to {tip.s.destLabel}
			</span>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
	}
	.scene {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.tick {
		stroke: color-mix(in srgb, var(--color-paper) 14%, transparent);
		stroke-width: 1;
	}
	.eratext {
		fill: color-mix(in srgb, var(--color-paper) 32%, transparent);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
	}
	.prime-glow {
		stroke: color-mix(in srgb, var(--color-paper) 12%, transparent);
		stroke-width: 6;
		stroke-linecap: round;
	}
	.prime {
		stroke: color-mix(in srgb, var(--color-paper) 85%, transparent);
		stroke-width: 1.6;
		fill: none;
		stroke-linecap: round;
	}

	.spec {
		cursor: pointer;
		transition: opacity 0.25s ease;
	}
	.spec:focus-visible {
		outline: none;
	}
	.spec.dim {
		opacity: 0.28;
	}

	.stem {
		stroke-width: 1.2;
		opacity: 0.55;
	}
	.minirail {
		fill: none;
		stroke-width: 1.6;
		opacity: 0.85;
	}
	.minijump {
		fill: none;
		stroke-width: 1.3;
		stroke-dasharray: 4 4;
		opacity: 0.85;
	}
	.primenode {
		stroke: var(--color-ink);
		stroke-width: 2;
	}
	.evt {
		stroke: var(--color-ink);
		stroke-width: 1.6;
	}
	.hot .minirail,
	.hot .minijump {
		opacity: 1;
		stroke-width: 2.4;
	}
	.title {
		font-family: var(--font-serif);
		font-size: 13px;
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}
	.spec:hover .title,
	.hot .title {
		opacity: 1;
	}

	.tip {
		position: fixed;
		z-index: 20;
		transform: translate(-50%, calc(-100% - 14px));
		pointer-events: none;
		background: color-mix(in srgb, var(--color-panel) 94%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-paper) 22%, transparent);
		border-radius: 5px;
		padding: 9px 12px;
		max-width: 250px;
		backdrop-filter: blur(8px);
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
	}
	.tip .bar {
		display: block;
		width: 26px;
		height: 2px;
		border-radius: 2px;
		background: var(--c);
		margin-bottom: 7px;
	}
	.tip strong {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: 1rem;
	}
	.tip strong span {
		color: var(--color-muted);
		font-weight: normal;
		font-size: 0.8rem;
	}
	.tip .meta {
		display: block;
		margin-top: 3px;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
</style>
