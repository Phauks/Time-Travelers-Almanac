<script lang="ts">
	import { base } from '$app/paths';
	import { specimens, MEDIUM_META, RULE_META, MODE_META, ruleColorVar } from '$lib/data';
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

	const dateLabel = (s: MediaEntry) => s.released ?? String(s.year);
	const shortSynopsis = (s: MediaEntry) => {
		const text = s.synopsis ?? s.logline;
		const firstStop = text.indexOf('. ');
		if (firstStop > 40 && firstStop < 220) return text.slice(0, firstStop + 1);
		return text.length > 220 ? text.slice(0, 217).trimEnd() + '...' : text;
	};
</script>

<svelte:head>
	<title>A History of Time Travel, The Time Traveller's Almanac</title>
</svelte:head>

<section class="page">
	<p class="eyebrow">The record</p>
	<h1>A History of Time Travel</h1>
	<p class="lede">
		Not the fictional timelines, but the real one: the order in which humankind imagined its ways
		out of time, from the page to the screen to the console. Every entry links back to its dossier.
	</p>

	<ol class="tl">
		{#each groups as g (g.year)}
			<li class="row" id="y{g.year}">
				<div class="year">{g.year}</div>
				<div class="items">
					{#each g.items as s (s.slug)}
						<a
							class="card"
							href="{base}/specimens/{s.slug}/"
							style="--accent:{ruleColorVar(s.rules[0])}"
						>
							<div class="thumb">
								{#if s.poster}
									<img src={s.poster} alt="{s.title} poster" loading="lazy" />
								{:else}
									<span class="ph">{MEDIUM_META[s.medium]}</span>
								{/if}
							</div>
							<div class="body">
								<div class="line1">
									<span class="title">{s.title}</span>
									<span class="medium">{MEDIUM_META[s.medium]}</span>
								</div>
								<p class="date">{dateLabel(s)}</p>
								<p class="syn">{shortSynopsis(s)}</p>
								<div class="tags">
									<span class="tag rule">{RULE_META[s.rules[0]].name}</span>
									{#each s.mode as m (m)}
										<span class="tag">{MODE_META[m]}</span>
									{/each}
									{#if s.loop}<span class="tag loop">Loop</span>{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			</li>
		{/each}
	</ol>
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
		letter-spacing: -0.01em;
	}
	.lede {
		color: var(--color-muted);
		max-width: 60ch;
		margin: 0 0 2.6rem;
		line-height: 1.6;
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
		left: 78px;
		top: 6px;
		bottom: 6px;
		width: 2px;
		background: var(--color-line);
	}
	.row {
		display: grid;
		grid-template-columns: 78px 1fr;
		gap: 1.6rem;
		padding: 0.7rem 0 1.4rem;
		scroll-margin-top: 90px;
	}
	.year {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--color-paper);
		text-align: right;
		position: relative;
		padding-top: 0.2rem;
	}
	.year::after {
		content: '';
		position: absolute;
		right: -22px;
		top: 0.5em;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--color-branching);
		box-shadow: 0 0 10px var(--color-branching);
	}
	.items {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		min-width: 0;
	}
	.card {
		display: grid;
		grid-template-columns: 78px 1fr;
		gap: 1rem;
		padding: 0.7rem;
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--accent);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.card:hover {
		background: color-mix(in srgb, var(--color-panel) 70%, transparent);
		border-color: color-mix(in srgb, var(--color-paper) 30%, var(--color-line));
	}
	.thumb {
		aspect-ratio: 2 / 3;
		border-radius: 4px;
		overflow: hidden;
		background: radial-gradient(120% 120% at 30% 20%, #10152a, #05070e);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb .ph {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.body {
		min-width: 0;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		flex-wrap: wrap;
	}
	.title {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		color: var(--color-paper);
	}
	.medium {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		white-space: nowrap;
	}
	.date {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--accent);
		margin: 0.2rem 0 0.5rem;
	}
	.syn {
		margin: 0 0 0.7rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: color-mix(in srgb, var(--color-paper) 82%, var(--color-muted));
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 999px;
		border: 1px solid var(--color-line);
		color: var(--color-muted);
	}
	.tag.rule {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 45%, transparent);
	}
	@media (max-width: 560px) {
		.tl::before {
			display: none;
		}
		.row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.year {
			text-align: left;
		}
		.year::after {
			display: none;
		}
		.card {
			grid-template-columns: 64px 1fr;
		}
	}
</style>
