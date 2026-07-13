<script lang="ts">
	import { base } from '$app/paths';
	import type { MediaEntry } from '$lib/types';
	import { MEDIUM_META, RULE_META } from '$lib/data';

	let { specimen }: { specimen: MediaEntry } = $props();
</script>

<a class="card" href="{base}/specimens/{specimen.slug}">
	<div class="plate">
		{#if specimen.poster}
			<img src={specimen.poster} alt="{specimen.title} poster" loading="lazy" />
		{:else}
			<span class="src">{specimen.imageSource.split('→')[1]?.trim() ?? 'poster'}</span>
		{/if}
		<span class="medium">{MEDIUM_META[specimen.medium]}</span>
	</div>
	<div class="body">
		<h3>{specimen.title} <small>{specimen.year}</small></h3>
		<p class="log">{specimen.logline}</p>
		<div class="tags">
			{#each specimen.rules as r (r)}
				<span class="tag" style="--c:var(--color-{r})">{RULE_META[r].name}</span>
			{/each}
			{#if specimen.loop}
				<span class="tag loop" style="--c:var(--color-loop)">Loop</span>
			{/if}
		</div>
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-panel) 60%, transparent);
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}
	.card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--color-paper) 30%, var(--color-line));
	}
	.plate {
		position: relative;
		aspect-ratio: 2 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--color-panel) 90%, #000), #05070e);
		border-bottom: 1px solid var(--color-line);
		overflow: hidden;
	}
	.plate img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.medium {
		position: absolute;
		top: 8px;
		left: 8px;
		font-family: var(--font-mono);
		font-size: 0.6rem;
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
		right: 8px;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.body {
		padding: 0.85rem 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}
	h3 {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		margin: 0;
		line-height: 1.15;
	}
	h3 small {
		font-weight: normal;
		color: var(--color-muted);
		font-size: 0.85rem;
	}
	.log {
		margin: 0;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--color-paper) 78%, var(--color-muted));
		flex: 1;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 999px;
		color: var(--c);
		border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
	}
</style>
