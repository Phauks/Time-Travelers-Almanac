<script lang="ts">
	import { untrack } from 'svelte';
	import { X, Play, Pause, CornersOut } from 'phosphor-svelte';
	import EventPanel from './EventPanel.svelte';
	import { computeLayout } from '$lib/timeline/layout';
	import { Chronoscope, type ChronoTheme } from '$lib/timeline/chronoscope';
	import type { Branch, TimelineEvent } from '$lib/types';

	let {
		open = $bindable(false),
		title = 'Timeline',
		events,
		branches = [],
		accent = 'var(--color-branching)',
		fallbackImage = undefined,
		onOpenImage,
		initialSelected = undefined
	}: {
		open?: boolean;
		title?: string;
		events: TimelineEvent[];
		branches?: Branch[];
		accent?: string;
		fallbackImage?: string;
		onOpenImage?: (src: string) => void;
		/** beat to select when the view opens (the card's current selection) */
		initialSelected?: string;
	} = $props();

	let order = $state<'told' | 'happened'>('told');
	// roomier spacing than the in-card board: the full screen can afford it
	let layout = $derived(
		computeLayout(events, branches, order, { step: 210, gap: 130, top: 120, ml: 140, mr: 90 })
	);

	let selectedId = $state('');
	let selected = $derived(events.find((e) => e.id === selectedId));
	let selIndex = $derived(layout.ordered.findIndex((e) => e.id === selectedId));

	let rootEl = $state<HTMLElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	// $state.raw so the scene effect re-runs once the engine exists; the class
	// instance itself must not be proxied
	let engine = $state.raw<Chronoscope | null>(null);

	let touring = $state(false);
	let tourTimer: ReturnType<typeof setInterval> | undefined;

	function readTheme(el: HTMLElement): ChronoTheme {
		const cs = getComputedStyle(el);
		const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
		return {
			ink: v('--color-ink', '#05060c'),
			panel: v('--color-panel', '#0d1120'),
			paper: v('--color-paper', '#eef1f8'),
			muted: v('--color-muted', '#8b93a8'),
			line: v('--color-line', '#1c2233'),
			jump: v('--color-jump', '#ffd9a0'),
			jumpBack: '#2b93bd',
			accent: v('--color-branching', '#b57cff'),
			monoFont: v('--font-mono', 'ui-monospace, Menlo, monospace')
		};
	}

	function select(id: string, fly = false) {
		selectedId = id;
		engine?.setSelected(id, fly);
	}

	function step(delta: number) {
		const i = (selIndex < 0 ? 0 : selIndex) + delta;
		if (i >= 0 && i < layout.ordered.length) select(layout.ordered[i].id, true);
	}

	function stopTour() {
		touring = false;
		clearInterval(tourTimer);
	}

	function toggleTour() {
		if (touring) {
			stopTour();
			return;
		}
		touring = true;
		// begin from the start when the tour is kicked off at the end
		if (selIndex >= layout.ordered.length - 1) select(layout.ordered[0].id, true);
		else select(layout.ordered[Math.max(0, selIndex)].id, true);
		tourTimer = setInterval(() => {
			const i = layout.ordered.findIndex((e) => e.id === selectedId);
			if (i >= layout.ordered.length - 1) stopTour();
			else select(layout.ordered[i + 1].id, true);
		}, 3200);
	}

	function close() {
		stopTour();
		open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}

	// engine lifecycle: created when the overlay mounts its canvas. Selection
	// and layout are read untracked here — this effect must only rerun when the
	// overlay itself opens or closes, never on selection changes.
	$effect(() => {
		if (!open || !canvasEl) return;
		const eng = new Chronoscope(canvasEl, {
			onSelect: (id) => select(id),
			onUserInteract: stopTour
		});
		untrack(() => {
			selectedId =
				initialSelected && events.some((e) => e.id === initialSelected)
					? initialSelected
					: (layout.ordered[0]?.id ?? '');
		});
		engine = eng;
		return () => {
			eng.destroy();
			if (engine === eng) engine = null;
		};
	});

	// keep the scene fresh when the ordering (and so the layout) changes
	$effect(() => {
		if (!engine || !rootEl) return;
		engine.setScene(layout, readTheme(rootEl));
		engine.setSelected(untrack(() => selectedId));
	});

	// the page beneath must not scroll while the instrument is open
	$effect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div
		class="scope"
		bind:this={rootEl}
		style="--accent:{accent}"
		role="dialog"
		aria-modal="true"
		aria-label="{title} — full-screen timeline"
	>
		<header class="bar">
			<span class="ttl">{title}</span>
			<div class="acts">
				<div class="toggle" role="group" aria-label="Timeline ordering">
					<button class:on={order === 'told'} aria-pressed={order === 'told'} onclick={() => (order = 'told')}>As Told</button>
					<button class:on={order === 'happened'} aria-pressed={order === 'happened'} onclick={() => (order = 'happened')}>As Happened</button>
				</div>
				<button class="pill" onclick={toggleTour} aria-pressed={touring}>
					{#if touring}<Pause size={13} weight="fill" /> Pause tour{:else}<Play size={13} weight="fill" /> Tour{/if}
				</button>
				<button class="pill" onclick={() => engine?.fitAll()}>
					<CornersOut size={13} weight="bold" /> Fit
				</button>
				<button class="pill close" onclick={close} aria-label="Close full-screen timeline">
					<X size={15} weight="bold" />
				</button>
			</div>
		</header>

		<div class="stage">
			<div class="board">
				<canvas
					bind:this={canvasEl}
					aria-label="Timeline board. Drag to pan, scroll to zoom, click a beat to inspect it. Use the arrow keys to step through beats."
				></canvas>
				<span class="hint">drag to pan · scroll to zoom · click a beat</span>
			</div>
			<aside class="side">
				{#if selected}
					{@const b = branches.find((br) => br.id === layout.branchOf(selected.id))}
					<EventPanel
						{selected}
						branchLabel={b?.label}
						branchColor={layout.branchColor(layout.branchOf(selected.id))}
						selIndex={selIndex < 0 ? 0 : selIndex}
						total={layout.ordered.length}
						onStep={step}
						{fallbackImage}
						{onOpenImage}
					/>
				{/if}
			</aside>
		</div>

		<!-- the board as real buttons, for screen readers and Tab users -->
		<ol class="sr-beats">
			{#each layout.ordered as e, i (e.id)}
				<li>
					<button onclick={() => select(e.id, true)} aria-current={e.id === selectedId}>
						{i + 1}. {e.label}
					</button>
				</li>
			{/each}
		</ol>
	</div>
{/if}

<style>
	.scope {
		position: fixed;
		inset: 0;
		z-index: 220;
		display: flex;
		flex-direction: column;
		background: radial-gradient(130% 100% at 20% 12%, var(--color-ink-2), var(--color-ink) 72%);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		flex-wrap: wrap;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--color-line);
	}
	.ttl {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		color: var(--color-paper);
	}
	.acts {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex-wrap: wrap;
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
	.pill {
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
		padding: 0.38rem 0.75rem;
		cursor: pointer;
	}
	.pill:hover,
	.pill[aria-pressed='true'] {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}
	.pill:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.pill.close {
		padding: 0.38rem 0.5rem;
	}
	.stage {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
	}
	.board {
		position: relative;
		min-width: 0;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		cursor: grab;
		touch-action: none;
	}
	canvas:global(.dragging) {
		cursor: grabbing;
	}
	canvas:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.hint {
		position: absolute;
		left: 0.9rem;
		bottom: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		pointer-events: none;
	}
	.side {
		border-left: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--color-panel) 30%, transparent);
		padding: 0.9rem;
		overflow-y: auto;
	}
	@media (max-width: 860px) {
		.stage {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(0, 1fr) auto;
		}
		.side {
			border-left: 0;
			border-top: 1px solid var(--color-line);
			max-height: 42vh;
		}
	}
	.sr-beats {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
