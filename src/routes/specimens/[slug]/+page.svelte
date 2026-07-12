<script lang="ts">
	import { base } from '$app/paths';
	import { ArrowLeft, Warning } from 'phosphor-svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import {
		RULE_META,
		MODE_META,
		LOOP_META,
		MEDIUM_META,
		getSpecimen,
		ruleColorVar
	} from '$lib/data';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let s = $derived(data.specimen);

	const riskPct = { low: 33, medium: 66, high: 100 } as const;

	let related = $derived(
		(s.related ?? []).map((slug) => getSpecimen(slug)).filter((x) => x !== undefined)
	);
</script>

<svelte:head>
	<title>{s.title} · The Time Traveller's Almanac</title>
</svelte:head>

<article class="dossier" style="--accent:{ruleColorVar(s.rules[0])}">
	<a class="back" href="{base}/specimens/"><ArrowLeft size={14} weight="bold" /> All specimens</a>

	<header class="head">
		<div class="plate">
			<span class="medium">{MEDIUM_META[s.medium]}</span>
			<span class="src">{s.imageSource}</span>
		</div>
		<div>
			<p class="eyebrow">Specimen · {s.destLabel}</p>
			<h1>{s.title}</h1>
			<p class="sub">
				{s.year} · {MEDIUM_META[s.medium]}{s.saga ? ` · ${s.saga.replace(/-/g, ' ')} saga` : ''}
			</p>
			<p class="logline">{s.logline}</p>
		</div>
	</header>

	<section class="verdict">
		<div class="cell" style="--c:var(--color-{s.rules[0]})">
			<p class="k">The Rule</p>
			<p class="v">
				{RULE_META[s.rules[0]].name}
				<small>{RULE_META[s.rules[0]].nickname} — {RULE_META[s.rules[0]].law}</small>
			</p>
		</div>
		<div class="cell mode">
			<p class="k">The Mode</p>
			<p class="v">
				{s.mode.map((m) => MODE_META[m]).join(' · ')}
				<small>How the travel happens</small>
			</p>
		</div>
		<div class="cell loop">
			<p class="k">Loop status</p>
			<p class="v">
				{s.loop ? LOOP_META[s.loop] : 'None'}
				<small>{s.loop ? 'A repeating condition applies' : 'Linear jumps, no repetition'}</small>
			</p>
		</div>
	</section>

	<section class="prose">
		<h2>Mechanism</h2>
		<p>{s.mechanism}</p>

		<div class="meter" title="Paradox exposure">
			<span class="lab"><Warning size={13} weight="fill" /> Paradox exposure</span>
			<span class="bar"><i style="width:{riskPct[s.paradoxRisk]}%"></i></span>
			<span class="lab val">{s.paradoxRisk}</span>
		</div>
		{#if s.paradoxes.length}
			<p class="paradoxes">
				Documented paradoxes: {#each s.paradoxes as p, i (p)}<span>{p}</span>{i < s.paradoxes.length - 1 ? ', ' : ''}{/each}
			</p>
		{/if}

		{#if s.fieldNote}
			<p class="fieldnote">Field note — {s.fieldNote}</p>
		{/if}
	</section>

	<section class="timeline">
		<h2>Walk the timeline</h2>
		<Timeline events={s.timeline} accent={ruleColorVar(s.rules[0])} />
	</section>

	{#if related.length}
		<section class="related">
			<h2>Related specimens</h2>
			<div class="rel-list">
				{#each related as r (r.slug)}
					<a href="{base}/specimens/{r.slug}/">{r.title}</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if s.sources?.length}
		<section class="sources">
			<h2>Sources</h2>
			<ul>
				{#each s.sources as src (src.url)}
					<li><a href={src.url} target="_blank" rel="noreferrer noopener">{src.label}</a></li>
				{/each}
			</ul>
		</section>
	{/if}
</article>

<style>
	.dossier {
		max-width: 960px;
		margin: 0 auto;
		padding: clamp(1.2rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3.5rem) 5rem;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-bottom: 1.8rem;
	}
	.back:hover {
		color: var(--color-paper);
	}
	.head {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: clamp(1.2rem, 3vw, 2.4rem);
		align-items: start;
	}
	@media (max-width: 640px) {
		.head {
			grid-template-columns: 1fr;
		}
	}
	.plate {
		position: relative;
		aspect-ratio: 3 / 4;
		border: 1px solid var(--color-line);
		border-radius: 4px;
		background: radial-gradient(120% 120% at 30% 20%, #10152a, #05070e);
	}
	.medium {
		position: absolute;
		top: 8px;
		left: 8px;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: var(--color-paper);
		color: var(--color-ink);
		padding: 3px 7px;
		border-radius: 4px;
	}
	.src {
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2rem, 4.5vw, 3rem);
		line-height: 1.02;
		margin: 0.3rem 0 0.3rem;
	}
	.sub {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		margin: 0 0 1rem;
		text-transform: capitalize;
	}
	.logline {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1.15rem;
		color: color-mix(in srgb, var(--color-paper) 88%, var(--color-muted));
		margin: 0;
	}

	.verdict {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8rem;
		margin: 2.4rem 0;
	}
	@media (max-width: 640px) {
		.verdict {
			grid-template-columns: 1fr;
		}
	}
	.cell {
		background: color-mix(in srgb, var(--color-panel) 60%, transparent);
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--c, var(--color-branching));
		border-radius: 4px;
		padding: 0.85rem 0.9rem;
	}
	.cell.mode {
		--c: var(--color-loop);
	}
	.cell.loop {
		--c: var(--color-muted);
	}
	.k {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.35rem;
	}
	.v {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		margin: 0;
	}
	.v small {
		display: block;
		font-family: var(--font-sans);
		font-size: 0.74rem;
		color: var(--color-muted);
		margin-top: 0.25rem;
		line-height: 1.35;
	}

	.prose {
		max-width: 62ch;
	}
	.prose h2,
	.timeline h2,
	.related h2 {
		font-family: var(--font-serif);
		font-size: 1.2rem;
		margin: 2rem 0 0.6rem;
	}
	.prose p {
		margin: 0 0 0.9rem;
		font-size: 1rem;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-paper) 90%, var(--color-muted));
	}
	.meter {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 1rem 0 0.5rem;
	}
	.meter .bar {
		flex: 1;
		height: 8px;
		border-radius: 999px;
		background: var(--color-panel);
		border: 1px solid var(--color-line);
		overflow: hidden;
	}
	.meter .bar i {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--color-loop), var(--color-mutable), var(--color-fixed));
	}
	.meter .lab {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.meter .val {
		color: var(--color-paper);
	}
	.paradoxes {
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.paradoxes span {
		color: var(--color-paper);
	}
	.fieldnote {
		border-left: 2px solid var(--accent);
		padding-left: 0.9rem;
		font-family: var(--font-serif);
		font-style: italic;
		color: color-mix(in srgb, var(--color-paper) 82%, var(--color-muted));
	}

	.timeline {
		margin-top: 1.5rem;
	}
	.rel-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.rel-list a {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		color: var(--color-muted);
	}
	.rel-list a:hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 30%, var(--color-line));
	}

	.sources ul {
		margin: 0;
		padding-left: 1.1rem;
	}
	.sources li {
		font-size: 0.85rem;
		color: var(--color-muted);
		margin: 0.25rem 0;
	}
	.sources a {
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.sources a:hover {
		color: var(--color-paper);
	}
</style>
