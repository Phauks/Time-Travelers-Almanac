<script lang="ts">
	import { Flag, Lightning, MapPin, ArrowUUpLeft, ArrowsClockwise, DotOutline } from 'phosphor-svelte';
	import type { EventKind, TimelineEvent } from '$lib/types';

	let {
		events,
		accent = 'var(--color-branching)'
	}: { events: TimelineEvent[]; accent?: string } = $props();

	const STEP = 132; // px between nodes on the rail
	const BASE_Y = 74; // baseline within the rail
	const RAIL_H = 116;

	let order = $state<'told' | 'happened'>('told');

	const byNarrative = [...events].sort((a, b) => a.narrative - b.narrative);
	let selectedId = $state<string>(byNarrative[0]?.id ?? '');
	let selected = $derived(events.find((e) => e.id === selectedId) ?? byNarrative[0]);

	let ordered = $derived(
		order === 'told'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono)
	);
	let slots = $derived.by(() => {
		const m = new Map<string, number>();
		ordered.forEach((e, i) => m.set(e.id, i));
		return m;
	});
	const innerW = $derived(events.length * STEP);
	function xOf(id: string): number {
		return (slots.get(id) ?? 0) * STEP + STEP / 2;
	}
	let jumps = $derived(events.filter((e) => e.jumpTo && slots.has(e.jumpTo)));

	const KIND: Record<EventKind, { label: string; icon: unknown | null; color: string }> = {
		origin: { label: 'Origin', icon: Flag, color: accent },
		departure: { label: 'Time jump', icon: Lightning, color: accent },
		jump: { label: 'Time jump', icon: Lightning, color: accent },
		arrival: { label: 'Arrival', icon: MapPin, color: accent },
		return: { label: 'Return', icon: ArrowUUpLeft, color: accent },
		loop: { label: 'Loop', icon: ArrowsClockwise, color: 'var(--color-loop)' },
		event: { label: 'Event', icon: DotOutline, color: 'var(--color-muted)' },
		normal: { label: 'Event', icon: DotOutline, color: 'var(--color-muted)' }
	};
	function meta(e: TimelineEvent) {
		return KIND[e.kind ?? 'event'];
	}
	function variantLabel(v?: string): string {
		if (!v) return '';
		return v
			.split('-')
			.map((w) => w[0].toUpperCase() + w.slice(1))
			.join(' ');
	}

	// short date for the rail (first line of chronoLabel)
	function shortDate(e: TimelineEvent): string {
		return (e.chronoLabel ?? '').split('·')[0].trim();
	}
</script>

<div class="tl" style="--accent:{accent}">
	<div class="head">
		<div class="toggle" role="group" aria-label="Timeline ordering">
			<button class:on={order === 'told'} aria-pressed={order === 'told'} onclick={() => (order = 'told')}>
				As Told
			</button>
			<button
				class:on={order === 'happened'}
				aria-pressed={order === 'happened'}
				onclick={() => (order = 'happened')}
			>
				As Happened
			</button>
		</div>
		<p class="caption">
			{order === 'told'
				? 'The order you experience the story.'
				: 'The order the events truly occur in time.'}
		</p>
	</div>

	<div class="rail" style="height:{RAIL_H}px">
		<div class="inner" style="width:{innerW}px; height:{RAIL_H}px">
			<svg class="arcs" width={innerW} height={RAIL_H} aria-hidden="true">
				<line x1="0" y1={BASE_Y} x2={innerW} y2={BASE_Y} class="baseline" />
				{#each jumps as e (e.id)}
					{@const x1 = xOf(e.id)}
					{@const x2 = xOf(e.jumpTo!)}
					<path d="M {x1} {BASE_Y} C {x1} {BASE_Y - 54}, {x2} {BASE_Y - 54}, {x2} {BASE_Y}" class="arc" />
				{/each}
			</svg>

			{#each events as e (e.id)}
				{@const M = meta(e)}
				<button
					class="node"
					class:sel={selectedId === e.id}
					style="left:{xOf(e.id)}px; top:{BASE_Y}px"
					onclick={() => (selectedId = e.id)}
					aria-label={e.label}
				>
					<span class="dot" style="background:{M.color}; box-shadow:0 0 12px {M.color}"></span>
					<span class="date">{shortDate(e)}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if selected}
		{@const M = meta(selected)}
		<div class="detail">
			<div class="badges">
				<span class="badge" style="--c:{M.color}">
					{#if M.icon}{@const Icon = M.icon}<Icon size={13} weight="fill" />{/if}
					{M.label}
				</span>
				{#if selected.variant}
					<span class="badge variant">{variantLabel(selected.variant)}</span>
				{/if}
				{#if selected.jumpTo}
					{@const tgt = events.find((x) => x.id === selected.jumpTo)}
					{#if tgt}<span class="badge jump">→ {tgt.label}</span>{/if}
				{/if}
			</div>
			<h4>{selected.label}</h4>
			<p class="when">
				{selected.chronoLabel}{selected.location ? `  -  ${selected.location}` : ''}
			</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
		</div>
	{/if}
</div>

<style>
	.tl {
		width: 100%;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.toggle {
		display: inline-flex;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
	}
	.toggle button {
		border: 0;
		background: transparent;
		color: var(--color-muted);
		padding: 0.5rem 1rem;
		cursor: pointer;
		text-transform: uppercase;
	}
	.toggle button.on {
		background: var(--accent);
		color: #06070c;
	}
	.toggle button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.caption {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.rail {
		position: relative;
		overflow-x: auto;
		overflow-y: hidden;
		padding-bottom: 0.4rem;
	}
	.inner {
		position: relative;
	}
	.arcs {
		position: absolute;
		inset: 0;
	}
	.baseline {
		stroke: var(--color-line);
		stroke-width: 2;
	}
	.arc {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
		stroke-dasharray: 4 4;
		opacity: 0.8;
	}
	.node {
		position: absolute;
		transform: translate(-50%, -50%);
		width: 116px;
		background: transparent;
		border: 0;
		cursor: pointer;
		transition: left 0.55s cubic-bezier(0.65, 0, 0.35, 1);
		padding: 0;
	}
	.dot {
		display: block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		margin: 0 auto;
		border: 3px solid var(--color-ink);
		transition: transform 0.15s ease;
	}
	.node.sel .dot {
		transform: scale(1.5);
		outline: 1.5px solid color-mix(in srgb, var(--color-paper) 70%, transparent);
		outline-offset: 2px;
	}
	.node:focus-visible {
		outline: none;
	}
	.node:focus-visible .dot {
		outline: 2px solid var(--color-paper);
		outline-offset: 2px;
	}
	.date {
		display: block;
		margin-top: 12px;
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
		line-height: 1.2;
	}
	.node.sel .date {
		color: var(--color-paper);
	}

	.detail {
		margin-top: 0.75rem;
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--accent);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-panel) 55%, transparent);
		padding: 0.9rem 1rem 1rem;
		min-height: 96px;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.55rem;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 999px;
		color: var(--c, var(--color-muted));
		border: 1px solid color-mix(in srgb, var(--c, var(--color-muted)) 45%, transparent);
	}
	.badge.variant {
		--c: var(--color-mutable);
	}
	.badge.jump {
		--c: var(--color-paper);
		color: var(--color-muted);
	}
	.detail h4 {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		margin: 0 0 0.2rem;
	}
	.when {
		margin: 0 0 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-muted);
	}
	.desc {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.55;
		color: color-mix(in srgb, var(--color-paper) 88%, var(--color-muted));
	}

	@media (prefers-reduced-motion: reduce) {
		.node {
			transition: none;
		}
	}
</style>
