<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, ArrowLeft, ArrowsOutSimple, Info } from 'phosphor-svelte';
	import { base } from '$app/paths';
	import EventPanel from './EventPanel.svelte';
	import Chronoscope from './Chronoscope.svelte';
	import { computeLayout } from '$lib/timeline/layout';
	import { shortDate, jumpText } from '$lib/timeline/display';
	import type { SagaPart } from '$lib/timeline/stitch';
	import type { Branch, TimelineEvent } from '$lib/types';

	let {
		title = 'Timeline',
		events,
		branches = [],
		accent = 'var(--color-branching)',
		continuesFrom = null,
		continuesTo = null,
		fallbackImage = undefined,
		onOpenImage,
		saga = []
	}: {
		title?: string;
		events: TimelineEvent[];
		branches?: Branch[];
		accent?: string;
		/** the media this timeline continues from, shown at the start */
		continuesFrom?: { slug: string; title: string } | null;
		/** the media this timeline continues into, shown at the end */
		continuesTo?: { slug: string; title: string } | null;
		/** poster to show in the event panel when a beat has no still of its own */
		fallbackImage?: string;
		/** open a given image in the page's gallery lightbox */
		onOpenImage?: (src: string) => void;
		/** every part of this franchise, in order, for the Chronoscope's saga view */
		saga?: SagaPart[];
	} = $props();

	let order = $state<'told' | 'happened'>('told');
	let showLegend = $state(false);
	let scopeOpen = $state(false);

	// all board geometry lives in the shared layout module (one layout, two
	// renderers: this SVG card and the full-screen Chronoscope canvas)
	let L = $derived(computeLayout(events, branches, order));

	let selectedId = $state(
		[...events].sort((a, b) => a.narrative - b.narrative)[0]?.id ?? ''
	);
	let selected = $derived(events.find((e) => e.id === selectedId) ?? L.ordered[0]);

	// step through events in whatever order is currently shown
	let selIndex = $derived(L.ordered.findIndex((e) => e.id === selectedId));
	function step(delta: number) {
		const i = selIndex < 0 ? 0 : selIndex + delta;
		if (i >= 0 && i < L.ordered.length) selectedId = L.ordered[i].id;
	}

	// deep link: ?view=scope&beat=<id> opens the Chronoscope on a given beat
	onMount(() => {
		const q = new URLSearchParams(window.location.search);
		const beat = q.get('beat');
		if (beat && events.some((e) => e.id === beat)) selectedId = beat;
		if (q.get('view') === 'scope') scopeOpen = true;
	});
</script>

{#snippet legendBody()}
	{#each branches as b (b.id)}
		<span class="lg"><i class="dot" style="background:{L.branchColor(b.id)}"></i>{b.label}</span>
	{/each}
	<span class="lg"><i class="flag"></i>origin</span>
	<span class="lg"><i class="line fwd"></i>jump forward</span>
	<span class="lg"><i class="line back"></i>jump back</span>
	<span class="lg"><i class="ring"></i>time machine fires</span>
	<span class="lg"><i class="haz"></i>paradox / continuity risk</span>
{/snippet}

<div class="btl" style="--accent:{accent}">
	<div class="tlx">
	<div class="tlx-head">
		<span class="tlx-title">
			{title}
			<span class="legend legend-pop">{@render legendBody()}</span>
		</span>
		<div class="tlx-head-actions">
			<div class="toggle" role="group" aria-label="Timeline ordering">
				<button class:on={order === 'told'} aria-pressed={order === 'told'} onclick={() => (order = 'told')}>As Told</button>
				<button class:on={order === 'happened'} aria-pressed={order === 'happened'} onclick={() => (order = 'happened')}>As Happened</button>
			</div>
			<button class="legend-btn" class:on={showLegend} aria-pressed={showLegend} onclick={() => (showLegend = !showLegend)}>
				<Info size={13} weight="bold" /> Legend
			</button>
			<button class="legend-btn" onclick={() => (scopeOpen = true)}>
				<ArrowsOutSimple size={13} weight="bold" /> Full screen
			</button>
		</div>
	</div>
	{#if continuesFrom || continuesTo}
		<div class="connectors">
			{#if continuesFrom}
				<a class="continues" href="{base}/specimens/{continuesFrom.slug}/">
					<ArrowLeft size={13} weight="bold" /> Continues from {continuesFrom.title}
				</a>
			{:else}
				<span></span>
			{/if}
			{#if continuesTo}
				<a class="continues" href="{base}/specimens/{continuesTo.slug}/">
					Continues in {continuesTo.title} <ArrowRight size={13} weight="bold" />
				</a>
			{/if}
		</div>
	{/if}
	<div class="tlx-body">
	<div class="board-col">
	<div class="board">
		{#if showLegend}
			<div class="legend legend-overlay">{@render legendBody()}</div>
		{/if}
		<svg viewBox="0 0 {L.W} {L.H}" style="min-width:{L.W}px" role="img" aria-label="Branching timeline">
			<defs>
				<marker id="jarrow" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M1 1 L10 6 L1 11" fill="none" stroke="context-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</marker>
			</defs>
			{#each L.lanes as ln (ln.id)}
				<!-- a born lane's name sits at its birth, so shared rows don't collide -->
				<text x={Math.max(6, ln.startX - 98)} y={ln.y - 6} class="lane-lbl" style="fill:{ln.color}">{ln.label}</text>
			{/each}

			{#each L.segParts as s, i (i)}
				<line
					x1={s.x1}
					y1={s.y}
					x2={s.x2}
					y2={s.y}
					stroke={s.color}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-dasharray={s.fading ? '3 8' : s.dashed ? '6 7' : '0'}
					opacity={s.fading ? 0.35 : 0.92}
				/>
			{/each}

			{#each L.splinters as c, i (i)}
				{@const midx = (c.from.x + c.to.x) / 2}
				<path
					d="M {c.from.x} {c.from.y} C {midx} {c.from.y}, {midx} {c.to.y}, {c.to.x} {c.to.y}"
					fill="none"
					stroke={c.color}
					stroke-width="2"
					opacity="0.9"
				/>
			{/each}

			{#each L.jumps as j (j.from.e.id)}
				{@const apex = Math.min(j.from.y, j.to.y) - (36 + j.level * 26)}
				{@const midx = (j.from.x + j.to.x) / 2}
				<path
					class="jumpline {j.back ? 'back' : 'fwd'}"
					d="M {j.from.x} {j.from.y} C {j.from.x} {apex}, {j.to.x} {apex}, {j.to.x} {j.to.y}"
					fill="none"
					stroke-width="2"
					stroke-dasharray="7 6"
					marker-end="url(#jarrow)"
					opacity="0.95"
				/>
				<text x={midx} y={apex - 5} text-anchor="middle" class="jumplbl {j.back ? 'back' : 'fwd'}">
					{j.back ? '◀' : '▶'} {jumpText(j.from.e.chrono, j.to.e.chrono)}
				</text>
			{/each}

			{#each L.offJumps as o (o.p.e.id)}
				{@const capX = o.p.x + (o.out ? 30 : -30)}
				{@const capY = o.p.y - 52}
				<path
					class="jumpline {o.back ? 'back' : 'fwd'}"
					d={o.out
						? `M ${o.p.x} ${o.p.y} C ${o.p.x} ${capY}, ${capX} ${capY + 8}, ${capX} ${capY}`
						: `M ${capX} ${capY} C ${capX} ${capY + 8}, ${o.p.x} ${capY}, ${o.p.x} ${o.p.y}`}
					fill="none"
					stroke-width="2"
					stroke-dasharray="7 6"
					marker-end="url(#jarrow)"
					opacity="0.95"
				/>
				<text x={capX} y={capY - 5} text-anchor="middle" class="jumplbl {o.back ? 'back' : 'fwd'}">
					{o.out ? 'to' : 'from'} {o.label}
				</text>
			{/each}

			{#each L.pos as p (p.e.id)}
				<g
					class="node"
					role="button"
					tabindex="0"
					aria-label={p.e.label}
					onclick={() => (selectedId = p.e.id)}
					onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (selectedId = p.e.id)}
				>
					{#if L.departureIds.has(p.e.id)}
						<circle class="dep-ring" cx={p.x} cy={p.y} r="10" fill="none" stroke-width="1.4" stroke-dasharray="2.5 2.5" />
					{/if}
					{#if p.e.kind === 'origin' || p.e.origin}
						<g class="origin-mark" transform="translate({p.x - 11}, {p.y - 3})">
							<line x1="0" y1="1" x2="0" y2="-12" stroke-width="1.5" stroke-linecap="round" />
							<path d="M0 -12 L7 -10 L0 -7.5 Z" />
						</g>
					{/if}
					<circle class="n-dot" cx={p.x} cy={p.y} r={selectedId === p.e.id ? 8 : 6} fill={L.branchColor(p.branch)} />
					{#if selectedId === p.e.id}
						<circle class="sel-ring" cx={p.x} cy={p.y} r="13" fill="none" stroke-width="1.2" />
					{/if}
					{#if p.e.paradox}
						<g transform="translate({p.x + 10}, {p.y - 11})">
							<path d="M0 -6.5 L7 6 L-7 6 Z" fill="#ffcc33" stroke="#05060c" stroke-width="1.2" stroke-linejoin="round" />
							<rect x="-0.9" y="-2.6" width="1.8" height="4.6" rx="0.9" fill="#05060c" />
							<circle cx="0" cy="4" r="1" fill="#05060c" />
						</g>
					{/if}
					{#if p.e.crossRef}
						<text x={p.x - 12} y={p.y - 6} class="xref">&#187;</text>
					{/if}
					<text x={p.x} y={p.y + 24} text-anchor="middle" class="node-date">{shortDate(p.e)}</text>
				</g>
			{/each}
		</svg>
	</div>
	</div>

	<div class="side">
	{#if selected}
		{@const b = branches.find((br) => br.id === L.branchOf(selected.id))}
		<EventPanel
			{selected}
			branchLabel={b?.label}
			branchColor={L.branchColor(L.branchOf(selected.id))}
			selIndex={selIndex < 0 ? 0 : selIndex}
			total={L.ordered.length}
			onStep={step}
			{fallbackImage}
			{onOpenImage}
		/>
	{/if}
	</div>
	</div>
	</div>
</div>

<Chronoscope
	bind:open={scopeOpen}
	{title}
	{events}
	{branches}
	{accent}
	{fallbackImage}
	{onOpenImage}
	{saga}
	initialSelected={selectedId}
/>

<style>
	.btl {
		width: 100%;
	}
	.toggle {
		display: flex;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.66rem;
	}
	.toggle button {
		flex: 1;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		padding: 0.45rem 0.8rem;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.toggle button.on {
		background: var(--accent);
		color: #06070c;
	}
	.toggle button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	/* one coherent card wrapping header, board, and panel */
	.tlx {
		position: relative;
		border: 1px solid var(--color-line);
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		overflow: hidden;
	}
	.tlx-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		flex-wrap: wrap;
		padding: 0.6rem 0.9rem;
		border-bottom: 1px solid var(--color-line);
	}
	.tlx-title {
		position: relative;
		font-family: var(--font-serif);
		font-size: 1.1rem;
		cursor: default;
	}
	/* legend appears on hovering the title, or via the Legend button */
	.tlx-title .legend-pop {
		position: absolute;
		left: 0;
		top: calc(100% + 8px);
		z-index: 30;
		width: max-content;
		max-width: min(320px, 80vw);
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--color-line);
		border-radius: 8px;
		background: var(--color-panel);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
		opacity: 0;
		transform: translateY(4px);
		pointer-events: none;
		transition:
			opacity 0.15s,
			transform 0.15s;
	}
	.tlx-title:hover .legend-pop,
	.tlx-title:focus-within .legend-pop {
		opacity: 1;
		transform: translateY(0);
	}
	.tlx-head-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.legend-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.35rem 0.7rem;
		cursor: pointer;
	}
	.legend-btn.on,
	.legend-btn:hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}
	.legend-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.tlx-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		align-items: stretch;
	}
	.board-col {
		min-width: 0;
	}
	.board {
		position: relative;
		padding: 0.35rem 0.5rem;
		overflow-x: auto;
	}
	/* board fills the column when short, scrolls when the story is long */
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.legend-overlay {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		z-index: 5;
		max-width: 320px;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-line);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-panel) 92%, transparent);
		box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
	}
	.side {
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--color-panel) 30%, transparent);
		padding: 0.8rem;
	}
	.side :global(.detail) {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
	@media (max-width: 860px) {
		.tlx-body {
			grid-template-columns: 1fr;
		}
		.side {
			border-left: 0;
			border-top: 1px solid var(--color-line);
		}
	}
	.lane-lbl {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.02em;
	}
	.jumplbl {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.04em;
		fill: var(--color-jump);
	}
	/* forward in time = amber, backward in time = cool blue */
	.jumpline.fwd {
		stroke: var(--color-jump);
	}
	.jumpline.back {
		stroke: #2b93bd;
	}
	.jumplbl.fwd {
		fill: var(--color-jump);
	}
	.jumplbl.back {
		fill: #2b93bd;
	}
	.jumpline {
		stroke: var(--color-jump);
	}
	.dep-ring {
		stroke: var(--color-muted);
		opacity: 0.75;
	}
	.origin-mark line {
		stroke: var(--accent);
	}
	.origin-mark path {
		fill: var(--accent);
		stroke: none;
	}
	.n-dot {
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.sel-ring {
		stroke: var(--color-paper);
	}
	.node {
		cursor: pointer;
	}
	.node:focus,
	.node:focus-visible {
		outline: none;
	}
	.node-date {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--color-muted);
	}
	.xref {
		fill: var(--color-branching);
		font-size: 15px;
		font-weight: 700;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		color: var(--color-muted);
	}
	.lg {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}
	.lg .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.lg .line {
		width: 20px;
		height: 0;
		border-top: 2px dashed var(--color-jump);
	}
	.lg .line.fwd {
		border-top-color: var(--color-jump);
	}
	.lg .line.back {
		border-top-color: #2b93bd;
	}
	.lg .ring {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.4px dashed var(--color-muted);
	}
	.lg .flag {
		width: 0;
		height: 12px;
		border-left: 1.5px solid var(--accent);
		position: relative;
	}
	.lg .flag::after {
		content: '';
		position: absolute;
		left: 1px;
		top: 0;
		border-top: 3px solid transparent;
		border-bottom: 3px solid transparent;
		border-left: 6px solid var(--accent);
	}
	.lg .haz {
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 10px solid #ffcc33;
	}

	.connectors {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--color-line);
	}
	.continues {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted);
		border: 1px solid var(--color-line);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
	}
	.continues:hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}
</style>
