<script lang="ts">
	import { base } from '$app/paths';
	import { ArrowRight, CornersOut, CaretLeft, CaretRight, Plus, Minus } from 'phosphor-svelte';
	import { specimens } from '$lib/data';
	import { Chronoscope } from '$lib/timeline/chronoscope';
	import { computeLayout } from '$lib/timeline/layout';
	import { masterScene, slugOfBeat } from '$lib/timeline/master';
	import { readChronoTheme, readRuleColors } from '$lib/timeline/theme';
	import { whenLabel } from '$lib/timeline/display';

	let rootEl = $state<HTMLElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let engine = $state.raw<Chronoscope | null>(null);
	let selectedId = $state('');

	// the scene needs resolved colours, so it is built once the page mounts
	let scene = $state.raw<ReturnType<typeof masterScene> | null>(null);
	let layout = $derived(
		scene
			? computeLayout(scene.events, scene.branches, 'happened', {
					step: 150,
					gap: 96,
					top: 110,
					ml: 150,
					mr: 90
				})
			: null
	);

	let selected = $derived(scene?.events.find((e) => e.id === selectedId));
	let selectedEntry = $derived(
		selectedId ? specimens.find((m) => m.slug === slugOfBeat(selectedId)) : undefined
	);

	$effect(() => {
		if (!canvasEl || !rootEl) return;
		const rules = readRuleColors(rootEl);
		scene = masterScene(specimens, (r) => rules[r]);
		const eng = new Chronoscope(canvasEl, {
			onSelect: (id) => (selectedId = id)
		});
		engine = eng;
		return () => {
			eng.destroy();
			if (engine === eng) engine = null;
		};
	});

	$effect(() => {
		if (!engine || !layout || !rootEl) return;
		engine.setScene(layout, readChronoTheme(rootEl));
	});

	// a theme flip re-colours both the board and the rule-coloured lanes
	$effect(() => {
		if (!engine || !rootEl) return;
		const mo = new MutationObserver(() => {
			if (!engine || !rootEl) return;
			const rules = readRuleColors(rootEl);
			scene = masterScene(specimens, (r) => rules[r]);
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => mo.disconnect();
	});

	$effect(() => {
		engine?.setSelected(selectedId || null);
	});
</script>

<svelte:head>
	<title>The Master Timeline, The Time Traveller's Almanac</title>
</svelte:head>

<section class="master" bind:this={rootEl}>
	<div class="board">
		<canvas
			bind:this={canvasEl}
			aria-label="The master timeline: every specimen in the catalogue on one chronological board. Drag to pan, scroll to zoom, click a beat."
		></canvas>
		<span class="corner-title">The Master Timeline</span>
		<div class="rulekey">
			<span class="rk"><i style="background:var(--color-fixed)"></i>Fixed</span>
			<span class="rk"><i style="background:var(--color-mutable)"></i>Mutable</span>
			<span class="rk"><i style="background:var(--color-branching)"></i>Branching</span>
		</div>
		<div class="controls">
			<button class="nav-btn" onclick={() => engine?.panBy(-260)} aria-label="Pan left">
				<CaretLeft size={15} weight="bold" />
			</button>
			<button class="nav-btn" onclick={() => engine?.panBy(260)} aria-label="Pan right">
				<CaretRight size={15} weight="bold" />
			</button>
			<button class="nav-btn" onclick={() => engine?.zoomBy(0.8)} aria-label="Zoom out">
				<Minus size={15} weight="bold" />
			</button>
			<button class="nav-btn" onclick={() => engine?.zoomBy(1.25)} aria-label="Zoom in">
				<Plus size={15} weight="bold" />
			</button>
			<button class="nav-btn" onclick={() => engine?.fitAll()} aria-label="Fit the whole timeline">
				<CornersOut size={14} weight="bold" />
			</button>
		</div>
		{#if selected && selectedEntry}
			<aside class="peek">
				<p class="peek-title">{selectedEntry.title}</p>
				<h3>{selected.label}</h3>
				<p class="peek-when">{whenLabel(selected)}</p>
				{#if selected.description}<p class="peek-desc">{selected.description}</p>{/if}
				<a class="peek-link" href="{base}/specimens/{selectedEntry.slug}/?view=scope&beat={selected.id.slice(selectedEntry.slug.length + 1)}">
					Open the full dossier board <ArrowRight size={13} weight="bold" />
				</a>
			</aside>
		{/if}
	</div>
</section>

<style>
	.master {
		height: calc(100svh - 74px);
		min-height: 420px;
	}
	.board {
		position: relative;
		height: 100%;
		overflow: hidden;
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
	.corner-title {
		position: absolute;
		top: 22px;
		left: 22px;
		z-index: 5;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 90%, transparent);
		font-family: var(--font-serif);
		font-size: 1.05rem;
		color: var(--color-paper);
		pointer-events: none;
	}
	.rulekey {
		position: absolute;
		left: 22px;
		bottom: 22px;
		z-index: 5;
		display: flex;
		gap: 0.8rem;
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 92%, transparent);
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.rk {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.rk i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.controls {
		position: absolute;
		right: 0.9rem;
		bottom: 0.9rem;
		z-index: 5;
		display: flex;
		gap: 0.4rem;
	}
	.nav-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 0.5rem;
		border: 1px solid var(--color-line);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-panel) 88%, transparent);
		color: var(--color-paper);
		cursor: pointer;
	}
	.nav-btn:hover {
		border-color: color-mix(in srgb, var(--color-paper) 40%, var(--color-line));
	}
	.nav-btn:focus-visible {
		outline: 2px solid var(--color-branching);
		outline-offset: 2px;
	}
	.peek {
		position: absolute;
		/* below the minimap, which owns the very corner (22px + 44px + frame) */
		top: 88px;
		right: 22px;
		z-index: 5;
		width: min(320px, 80vw);
		max-height: 60%;
		overflow-y: auto;
		padding: 0.8rem 0.95rem;
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 94%, transparent);
	}
	.peek-title {
		margin: 0 0 0.1rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.peek h3 {
		margin: 0 0 0.25rem;
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: var(--color-paper);
	}
	.peek-when {
		margin: 0 0 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-muted);
	}
	.peek-desc {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: color-mix(in srgb, var(--color-paper) 92%, var(--color-muted));
	}
	.peek-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-branching);
	}
	.peek-link:hover {
		color: var(--color-paper);
	}
</style>
