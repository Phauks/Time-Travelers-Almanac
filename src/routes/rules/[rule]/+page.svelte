<script lang="ts">
	import { base } from '$app/paths';
	import { ArrowLeft, Warning } from 'phosphor-svelte';
	import { specimens, RULE_META, RULE_DETAIL, ruleColorVar } from '$lib/data';
	import SpecimenCard from '$lib/components/SpecimenCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let rule = $derived(data.rule);
	let meta = $derived(RULE_META[rule]);
	let detail = $derived(RULE_DETAIL[rule]);
	let examples = $derived(specimens.filter((s) => s.rules.includes(rule)));
	const RULES = ['fixed', 'mutable', 'branching'] as const;
</script>

<svelte:head>
	<title>{meta.name} time travel, The Time Traveller's Almanac</title>
</svelte:head>

<article class="rule" style="--accent:{ruleColorVar(rule)}">
	<a class="back" href="{base}/rules/"><ArrowLeft size={13} weight="bold" /> All rules</a>

	<header>
		<p class="eyebrow">The Rule</p>
		<h1>{meta.name}</h1>
		<p class="nick">{meta.nickname}</p>
		<p class="tagline">{detail.tagline}</p>
	</header>

	<div class="switch" role="group" aria-label="Other rules">
		{#each RULES as r (r)}
			<a class="pill" class:on={r === rule} style="--c:{ruleColorVar(r)}" href="{base}/rules/{r}/">
				{RULE_META[r].name}
			</a>
		{/each}
	</div>

	<section class="body">
		{#each detail.body as para (para)}
			<p>{para}</p>
		{/each}
	</section>

	<section class="facts">
		<div class="fact">
			<p class="k">The law</p>
			<p class="v">{meta.law}</p>
		</div>
		<div class="fact">
			<p class="k">Telltale sign</p>
			<p class="v">{detail.tell}</p>
		</div>
		<div class="fact">
			<p class="k"><Warning size={13} weight="fill" /> Paradox profile</p>
			<p class="v">{detail.paradoxes}</p>
		</div>
	</section>

	{#if examples.length}
		<section class="examples">
			<h2>Catalogued under {meta.name}</h2>
			<div class="grid">
				{#each examples as s (s.slug)}<SpecimenCard specimen={s} />{/each}
			</div>
		</section>
	{/if}
</article>

<style>
	.rule {
		max-width: 940px;
		margin: 0 auto;
		padding: clamp(1.2rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem) 5rem;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-bottom: 1.6rem;
	}
	.back:hover {
		color: var(--color-paper);
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
		margin: 0;
	}
	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2.4rem, 6vw, 4rem);
		margin: 0.3rem 0 0.2rem;
		line-height: 1;
	}
	.nick {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1.15rem;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}
	.tagline {
		font-size: 1.2rem;
		line-height: 1.5;
		max-width: 40ch;
		color: color-mix(in srgb, var(--color-paper) 92%, var(--color-muted));
		margin: 0;
	}
	.switch {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1.8rem 0;
	}
	.pill {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid var(--color-line);
		color: var(--color-muted);
	}
	.pill.on {
		color: #06070c;
		background: var(--c);
		border-color: var(--c);
	}
	.pill:not(.on):hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--c) 60%, var(--color-line));
	}
	.body {
		border-top: 1px solid var(--color-line);
		padding-top: 1.6rem;
	}
	.body p {
		font-size: 1.05rem;
		line-height: 1.7;
		color: color-mix(in srgb, var(--color-paper) 90%, var(--color-muted));
		margin: 0 0 1.1rem;
		max-width: 68ch;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.8rem;
		margin: 1.4rem 0 0.5rem;
	}
	.fact {
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--accent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-panel) 55%, transparent);
		padding: 0.85rem 0.95rem 1rem;
	}
	.fact .k {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.4rem;
	}
	.fact .v {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.5;
	}
	.examples h2 {
		font-family: var(--font-serif);
		font-size: 1.35rem;
		margin: 2.6rem 0 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
	}
</style>
