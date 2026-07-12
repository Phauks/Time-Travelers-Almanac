<script lang="ts">
	import type { TimelineEvent } from '$lib/types';

	let {
		events,
		accent = 'var(--color-branching)'
	}: { events: TimelineEvent[]; accent?: string } = $props();

	let order = $state<'told' | 'happened'>('told');

	let n = $derived(events.length);

	// slot index per event id under the current ordering
	let slots = $derived.by(() => {
		const arr =
			order === 'told'
				? [...events].sort((a, b) => a.narrative - b.narrative)
				: [...events].sort((a, b) => a.chrono - b.chrono);
		const map = new Map<string, number>();
		arr.forEach((e, i) => map.set(e.id, i));
		return map;
	});

	function xOf(id: string): number {
		const slot = slots.get(id) ?? 0;
		return ((slot + 0.5) / n) * 100;
	}

	function dotColor(e: TimelineEvent): string {
		if (e.kind === 'loop') return 'var(--color-loop)';
		if (e.kind === 'jump') return '#ffffff';
		return accent;
	}

	let jumps = $derived(events.filter((e) => e.jumpTo && slots.has(e.jumpTo)));
</script>

<div class="tl" style="--accent:{accent}">
	<div class="toggle" role="group" aria-label="Timeline ordering">
		<button class:on={order === 'told'} onclick={() => (order = 'told')} aria-pressed={order === 'told'}>
			As Told
		</button>
		<button
			class:on={order === 'happened'}
			onclick={() => (order = 'happened')}
			aria-pressed={order === 'happened'}
		>
			As Happened
		</button>
	</div>

	<div class="rail">
		<svg class="arcs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<line x1="0" y1="50" x2="100" y2="50" class="baseline" />
			{#each jumps as e (e.id)}
				{@const x1 = xOf(e.id)}
				{@const x2 = xOf(e.jumpTo!)}
				<path
					d="M {x1} 50 C {x1} 12, {x2} 12, {x2} 50"
					class="arc"
					vector-effect="non-scaling-stroke"
				/>
			{/each}
		</svg>

		{#each events as e (e.id)}
			<div class="node" style="left:{xOf(e.id)}%">
				<span class="dot" style="background:{dotColor(e)}; box-shadow:0 0 12px {dotColor(e)}"></span>
				<span class="yr">{e.chronoLabel ?? ''}</span>
				<span class="lb">{e.label}</span>
			</div>
		{/each}
	</div>

	<p class="hint">
		Toggle the ordering — nodes glide between the order you <em>experience</em> the story and the
		order it <em>really</em> happens.
	</p>
</div>

<style>
	.tl {
		width: 100%;
	}
	.toggle {
		display: inline-flex;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		margin-bottom: 0.5rem;
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

	.rail {
		position: relative;
		height: 150px;
		overflow-x: auto;
		overflow-y: visible;
	}
	.arcs {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.baseline {
		stroke: var(--color-line);
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}
	.arc {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
		stroke-dasharray: 4 4;
		opacity: 0.75;
	}
	.node {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 118px;
		text-align: center;
		transition: left 0.55s cubic-bezier(0.65, 0, 0.35, 1);
	}
	.dot {
		display: block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		margin: 0 auto;
		border: 3px solid var(--color-ink);
	}
	.yr {
		display: block;
		margin-top: 8px;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		color: var(--color-muted);
	}
	.lb {
		display: block;
		font-size: 0.78rem;
		line-height: 1.2;
		margin-top: 2px;
	}
	.hint {
		margin: 0.75rem 0 0;
		font-size: 0.8rem;
		color: var(--color-muted);
		max-width: 46ch;
	}

	@media (prefers-reduced-motion: reduce) {
		.node {
			transition: none;
		}
	}
</style>
