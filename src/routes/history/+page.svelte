<script lang="ts">
	import { base } from '$app/paths';
	import { specimens, MEDIUM_META } from '$lib/data';
	import type { MediaEntry } from '$lib/types';

	// group specimens by real-world release year
	const groups: { year: number; items: MediaEntry[] }[] = (() => {
		const map = new Map<number, MediaEntry[]>();
		for (const s of specimens) {
			if (!map.has(s.year)) map.set(s.year, []);
			map.get(s.year)!.push(s);
		}
		return [...map.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([year, items]) => ({ year, items: items.sort((a, b) => a.title.localeCompare(b.title)) }));
	})();
</script>

<svelte:head>
	<title>History, The Time Traveller's Almanac</title>
</svelte:head>

<section class="page">
	<p class="eyebrow">The record</p>
	<h1>A history of time travel, as released</h1>
	<p class="lede">
		Not the fictional timelines, but the real one: when each specimen arrived in our world. Every
		entry links back to its dossier.
	</p>

	<ol class="tl">
		{#each groups as g (g.year)}
			<li class="row" id="y{g.year}">
				<div class="year">{g.year}</div>
				<div class="items">
					{#each g.items as s (s.slug)}
						<a class="item" href="{base}/specimens/{s.slug}/">
							<span class="title">{s.title}</span>
							<span class="medium">{MEDIUM_META[s.medium]}</span>
						</a>
					{/each}
				</div>
			</li>
		{/each}
	</ol>
</section>

<style>
	.page {
		max-width: 940px;
		margin: 0 auto;
		padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 4vw, 3rem) 6rem;
	}
	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2rem, 4.5vw, 3rem);
		margin: 0.4rem 0 0.8rem;
		letter-spacing: -0.01em;
	}
	.lede {
		color: var(--color-muted);
		max-width: 56ch;
		margin: 0 0 2.6rem;
	}
	.tl {
		list-style: none;
		margin: 0;
		padding: 0;
		position: relative;
	}
	.tl::before {
		content: '';
		position: absolute;
		left: 92px;
		top: 6px;
		bottom: 6px;
		width: 2px;
		background: var(--color-line);
	}
	.row {
		display: grid;
		grid-template-columns: 92px 1fr;
		gap: 1.5rem;
		padding: 0.7rem 0;
		scroll-margin-top: 90px;
	}
	.year {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--color-paper);
		text-align: right;
		position: relative;
	}
	.year::after {
		content: '';
		position: absolute;
		right: -18px;
		top: 0.35em;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--color-branching);
		box-shadow: 0 0 10px var(--color-branching);
	}
	.items {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.item {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.35rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--color-line) 60%, transparent);
	}
	.item:hover .title {
		color: var(--color-paper);
	}
	.title {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		color: color-mix(in srgb, var(--color-paper) 85%, var(--color-muted));
	}
	.medium {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
	}
</style>
