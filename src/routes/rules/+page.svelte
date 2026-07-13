<script lang="ts">
	import { base } from '$app/paths';
	import { ArrowRight } from 'phosphor-svelte';
	import { specimens, RULE_META, RULE_DETAIL, ruleColorVar } from '$lib/data';
	import type { Rule } from '$lib/types';

	const RULES: Rule[] = ['fixed', 'mutable', 'branching'];
	const countOf = (r: Rule) => specimens.filter((s) => s.rules.includes(r)).length;
</script>

<svelte:head>
	<title>The Rules of Time Travel, The Time Traveller's Almanac</title>
</svelte:head>

<section class="page">
	<p class="eyebrow">The field guide</p>
	<h1>The Rules of Time Travel</h1>
	<p class="lede">
		Every story answers one question: what happens when you change the past? There are only three
		honest answers. Learn to spot which rule a tale obeys and half its mysteries resolve themselves.
	</p>

	<div class="rules">
		{#each RULES as r (r)}
			<a class="card" style="--accent:{ruleColorVar(r)}" href="{base}/rules/{r}/">
				<span class="dot"></span>
				<p class="name">{RULE_META[r].name}</p>
				<p class="nick">{RULE_META[r].nickname}</p>
				<p class="tag">{RULE_DETAIL[r].tagline}</p>
				<span class="foot">
					{countOf(r)} catalogued <ArrowRight size={13} weight="bold" />
				</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.page {
		max-width: 1040px;
		margin: 0 auto;
		padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 4vw, 3rem) 6rem;
	}
	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
	}
	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2rem, 4.5vw, 3rem);
		margin: 0.4rem 0 0.8rem;
	}
	.lede {
		color: var(--color-muted);
		max-width: 60ch;
		line-height: 1.6;
		margin: 0 0 2.6rem;
	}
	.rules {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-line);
		border-top: 3px solid var(--accent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		padding: 1.3rem 1.2rem 1.1rem;
		transition:
			background 0.15s,
			border-color 0.15s,
			transform 0.15s;
	}
	.card:hover {
		background: color-mix(in srgb, var(--color-panel) 70%, transparent);
		transform: translateY(-2px);
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 12px var(--accent);
		margin-bottom: 0.8rem;
	}
	.name {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		margin: 0;
	}
	.nick {
		font-family: var(--font-serif);
		font-style: italic;
		color: var(--color-muted);
		margin: 0.1rem 0 0.8rem;
	}
	.tag {
		font-size: 0.92rem;
		line-height: 1.55;
		color: color-mix(in srgb, var(--color-paper) 88%, var(--color-muted));
		margin: 0 0 1.4rem;
	}
	.foot {
		margin-top: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
	}
</style>
