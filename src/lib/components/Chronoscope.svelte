<script lang="ts">
	import { untrack } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { X, CornersOut, Path, FilmSlate } from 'phosphor-svelte';
	import EventPanel from './EventPanel.svelte';
	import { Chronoscope, type ChronoTheme } from '$lib/timeline/chronoscope';
	import { computeLayout } from '$lib/timeline/layout';
	import { stitchTimelines, type SagaPart } from '$lib/timeline/stitch';
	import type { Branch, TimelineEvent } from '$lib/types';

	let {
		open = $bindable(false),
		title = 'Timeline',
		events,
		branches = [],
		accent = 'var(--color-branching)',
		fallbackImage = undefined,
		onOpenImage,
		initialSelected = undefined,
		saga = []
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
		/** every part of this franchise, in order, for the stitched saga view */
		saga?: SagaPart[];
	} = $props();

	let order = $state<'traveler' | 'happened'>('traveler');
	let sagaOn = $state(false);
	let showThreads = $state(false);

	const canSaga = $derived(saga.length > 1);
	// the scene on the board: this one story, or the whole stitched saga
	let scene = $derived(sagaOn && canSaga ? stitchTimelines(saga) : { events, branches });
	// roomier spacing than the in-card board: the full screen can afford it
	let layout = $derived(
		computeLayout(scene.events, scene.branches, order, {
			step: 210,
			gap: 130,
			top: 120,
			ml: 140,
			mr: 90
		})
	);

	let selectedId = $state('');
	let selected = $derived(scene.events.find((e) => e.id === selectedId));
	let selIndex = $derived(layout.ordered.findIndex((e) => e.id === selectedId));
	let selectedBranch = $derived(
		selected ? scene.branches.find((br) => br.id === layout.branchOf(selected.id)) : undefined
	);

	let rootEl = $state<HTMLElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	// $state.raw so the scene effect re-runs once the engine exists; the class
	// instance itself must not be proxied
	let engine = $state.raw<Chronoscope | null>(null);

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
		syncUrl(open);
	}

	function step(delta: number) {
		const i = (selIndex < 0 ? 0 : selIndex) + delta;
		if (i >= 0 && i < layout.ordered.length) select(layout.ordered[i].id, true);
	}

	function close() {
		open = false;
		syncUrl(false);
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}

	// deep-linking: ?view=scope&beat=<id> mirrors the open state and selection.
	// isOpen is explicit  -  call sites in teardown paths must not depend on
	// reading the bindable prop mid-transition.
	function syncUrl(isOpen: boolean) {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (isOpen) {
			url.searchParams.set('view', 'scope');
			if (selectedId) url.searchParams.set('beat', selectedId);
		} else {
			url.searchParams.delete('view');
			url.searchParams.delete('beat');
		}
		try {
			replaceState(url, {});
		} catch {
			// router not ready yet (first paint); the plain API is fine here
			history.replaceState(history.state, '', url);
		}
	}

	// engine lifecycle: created when the overlay mounts its canvas. Selection
	// and layout are read untracked here  -  this effect must only rerun when
	// the overlay itself opens or closes, never on selection changes.
	$effect(() => {
		if (!open || !canvasEl) return;
		const eng = new Chronoscope(canvasEl, {
			onSelect: (id) => select(id)
		});
		untrack(() => {
			const L = layout;
			selectedId =
				initialSelected && L.posById.has(initialSelected)
					? initialSelected
					: (L.ordered[0]?.id ?? '');
		});
		engine = eng;
		// untracked: syncUrl reads selectedId, and a tracked read here would
		// recreate the engine on every selection change (see handover watch-outs)
		untrack(() => syncUrl(true));
		return () => {
			eng.destroy();
			if (engine === eng) engine = null;
			syncUrl(false);
		};
	});

	// keep the scene fresh when ordering or saga mode changes; selection that
	// no longer exists in the new scene falls back to the first beat
	$effect(() => {
		if (!engine || !rootEl) return;
		engine.setScene(layout, readTheme(rootEl));
		untrack(() => {
			if (!layout.posById.has(selectedId)) selectedId = layout.ordered[0]?.id ?? '';
			engine!.setSelected(selectedId);
			engine!.setShowThreads(showThreads && layout.threads.length > 0);
		});
	});

	// threads toggle without a full scene rebuild
	$effect(() => {
		engine?.setShowThreads(showThreads && layout.threads.length > 0);
	});

	// the engine paints with resolved token values, so a theme flip while the
	// overlay is open must re-read them
	$effect(() => {
		if (!open || !engine) return;
		const mo = new MutationObserver(() => {
			if (engine && rootEl) engine.setScene(layout, readTheme(rootEl));
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => mo.disconnect();
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
		aria-label="{title}: full-screen timeline"
	>
		<header class="bar">
			<span class="ttl">{sagaOn && canSaga ? `${title}: the full saga` : title}</span>
			<div class="acts">
				<div class="toggle" role="group" aria-label="Timeline ordering">
					<button
						class:on={order === 'traveler'}
						aria-pressed={order === 'traveler'}
						onclick={() => (order = 'traveler')}>Traveler's Path</button
					>
					<button
						class:on={order === 'happened'}
						aria-pressed={order === 'happened'}
						onclick={() => (order = 'happened')}>As Happened</button
					>
				</div>
				{#if canSaga}
					<button class="pill" class:on={sagaOn} aria-pressed={sagaOn} onclick={() => (sagaOn = !sagaOn)}>
						<FilmSlate size={13} weight="bold" /> Full saga
					</button>
				{/if}
				{#if layout.threads.length}
					<button
						class="pill"
						class:on={showThreads}
						aria-pressed={showThreads}
						onclick={() => (showThreads = !showThreads)}
					>
						<Path size={13} weight="bold" /> Travelers
					</button>
				{/if}
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
				<span class="hint">drag to pan, scroll to zoom, click a beat</span>
			</div>
			<aside class="side">
				{#if selected}
					<EventPanel
						{selected}
						branchLabel={selectedBranch?.label}
						branchNote={selectedBranch?.note}
						branchStatus={selectedBranch?.status}
						branchColor={layout.branchColor(layout.branchOf(selected.id))}
						selIndex={selIndex < 0 ? 0 : selIndex}
						total={layout.ordered.length}
						onStep={step}
						{fallbackImage}
						{onOpenImage}
					/>
				{/if}
				<div class="legend" role="note" aria-label="Legend">
					<p class="legend-title">Legend</p>
					{#each scene.branches as b (b.id)}
						<span class="lg"><i class="swatch" style="background:{layout.branchColor(b.id)}"></i>{b.label}</span>
					{/each}
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M2 10 Q13 0 22 7" fill="none" stroke="var(--color-jump)" stroke-width="1.8"/><path d="M24 9 L17 8 L21 3 Z" fill="var(--color-jump)"/></svg>jump forward in time</span>
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M24 10 Q13 0 4 7" fill="none" stroke="#2b93bd" stroke-width="1.8"/><path d="M2 9 L9 8 L5 3 Z" fill="#2b93bd"/></svg>jump back in time</span>
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><circle cx="13" cy="6" r="4.5" fill="none" stroke="var(--color-muted)" stroke-width="1.4" stroke-dasharray="2 2"/></svg>a time machine fires</span>
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M9 5 A5 5 0 0 1 17 5" fill="none" stroke="var(--color-branching)" stroke-width="1.4"/><path d="M9 8 A5 5 0 0 0 17 8" fill="none" stroke="var(--color-branching)" stroke-width="1.4"/></svg>history splits here</span>
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M2 6 H24" stroke="#ff6b74" stroke-width="2" stroke-dasharray="2 5" opacity="0.6"/></svg>overwritten, fading away</span>
					{#if layout.threads.length}
						<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M2 9 C8 9 10 3 14 3 S22 8 24 8" fill="none" stroke="#35d6a4" stroke-width="1.6" stroke-dasharray="4 3"/></svg>a traveler's own path</span>
					{/if}
					<span class="lg"><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M13 1 L19 10 L7 10 Z" fill="#ffcc33" stroke="var(--color-ink)" stroke-width="0.8"/></svg>paradox risk</span>
				</div>
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
	.pill.on,
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
		right: 0.9rem;
		bottom: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		pointer-events: none;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border-left: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--color-panel) 30%, transparent);
		padding: 0.9rem;
		overflow-y: auto;
	}
	.legend {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		border-top: 1px solid var(--color-line);
		padding-top: 0.8rem;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		color: var(--color-muted);
	}
	.legend-title {
		margin: 0 0 0.15rem;
		font-size: 0.6rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-paper);
	}
	.lg {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.lg svg {
		width: 26px;
		height: 12px;
		flex: none;
	}
	.lg .swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex: none;
		margin: 0 8px;
	}
	@media (max-width: 860px) {
		.stage {
			grid-template-columns: 1fr;
			grid-template-rows: minmax(0, 1fr) auto;
		}
		.side {
			border-left: 0;
			border-top: 1px solid var(--color-line);
			max-height: 46vh;
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
