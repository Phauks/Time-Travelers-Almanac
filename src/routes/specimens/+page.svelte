<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { specimens, RULE_META, MEDIUM_META } from '$lib/data';
	import type { Medium, Rule } from '$lib/types';
	import SpecimenCard from '$lib/components/SpecimenCard.svelte';

	const rules: Rule[] = ['fixed', 'mutable', 'branching'];
	// only offer medium chips for media that actually appear in the catalogue
	const media: Medium[] = [...new Set(specimens.map((s) => s.medium))].sort();

	let active = $state<Set<Rule>>(new Set(rules));
	let activeMedia = $state<Set<Medium>>(new Set(media));
	let loopOnly = $state(false);
	let sort = $state<'title' | 'newest' | 'oldest'>('title');

	// alphabetical by title, but keep saga parts in their real order (I, II, III)
	const byTitle = (a: (typeof specimens)[number], b: (typeof specimens)[number]) =>
		a.saga && a.saga === b.saga
			? (a.partOrder ?? 0) - (b.partOrder ?? 0)
			: a.title.localeCompare(b.title);

	// precise sortable date: parse the full release date, else fall back to the year
	const dateKey = (s: (typeof specimens)[number]) => {
		const t = s.released ? Date.parse(s.released) : NaN;
		return Number.isNaN(t) ? Date.parse(`Jan 1, ${s.year}`) : t;
	};

	// seed the medium filter from an inbound ?medium= link, on the client only
	// (query strings are not available while prerendering the static page)
	$effect(() => {
		const m = page.url.searchParams.get('medium') as Medium | null;
		if (m && media.includes(m)) activeMedia = new Set([m]);
	});

	function toggle(r: Rule) {
		const next = new Set(active);
		if (next.has(r)) next.delete(r);
		else next.add(r);
		active = next;
	}
	function toggleMedium(m: Medium) {
		const next = new Set(activeMedia);
		if (next.has(m)) next.delete(m);
		else next.add(m);
		activeMedia = next;
	}

	let sagaFilter = $derived(browser ? page.url.searchParams.get('saga') : null);

	let shown = $derived.by(() => {
		const list = specimens.filter(
			(s) =>
				s.rules.some((r) => active.has(r)) &&
				activeMedia.has(s.medium) &&
				(!loopOnly || s.loop !== null) &&
				(!sagaFilter || s.saga === sagaFilter)
		);
		if (sort === 'title') return list.sort(byTitle);
		const dir = sort === 'newest' ? -1 : 1;
		return list.sort((a, b) => dir * (dateKey(a) - dateKey(b)) || byTitle(a, b));
	});
</script>

<svelte:head>
	<title>Specimens, The Time Traveller's Almanac</title>
</svelte:head>

<section class="page">
	<p class="eyebrow">The catalogue</p>
	<h1>Diagnose by symptom</h1>
	<p class="lede">
		Filter the specimens by the <b>rule</b> that binds them. More of the hundred are catalogued with
		each edition.
	</p>

	{#if sagaFilter}
		<p class="scope">
			Showing the {sagaFilter.replace(/-/g, ' ')} saga
			<a href="{base}/specimens/">clear filter</a>
		</p>
	{/if}

	<div class="filterbar">
		<div class="fgroup" role="group" aria-label="Filter by rule">
			<span class="flabel">Rule</span>
			{#each rules as r (r)}
				<button
					class="chip"
					class:on={active.has(r)}
					style="--c:var(--color-{r})"
					aria-pressed={active.has(r)}
					onclick={() => toggle(r)}
				>
					<i class="dot"></i>{RULE_META[r].name}
				</button>
			{/each}
			<button
				class="chip loop"
				class:on={loopOnly}
				style="--c:var(--color-loop)"
				aria-pressed={loopOnly}
				onclick={() => (loopOnly = !loopOnly)}
			>
				<i class="dot"></i>Loops only
			</button>
		</div>

		<div class="fgroup" role="group" aria-label="Filter by medium">
			<span class="flabel">Medium</span>
			{#each media as m (m)}
				<button
					class="chip med"
					class:on={activeMedia.has(m)}
					aria-pressed={activeMedia.has(m)}
					onclick={() => toggleMedium(m)}
				>
					<i class="dot"></i>{MEDIUM_META[m]}
				</button>
			{/each}
		</div>

		<div class="fgroup" role="group" aria-label="Sort order">
			<span class="flabel">Sort</span>
			{#each [['title', 'A to Z'], ['newest', 'Newest'], ['oldest', 'Oldest']] as [key, label] (key)}
				<button
					class="chip sort"
					class:on={sort === key}
					aria-pressed={sort === key}
					onclick={() => (sort = key as typeof sort)}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<div class="grid">
		{#each shown as s (s.slug)}
			<SpecimenCard specimen={s} />
		{/each}
	</div>

	{#if shown.length === 0}
		<p class="empty">No specimens match. Widen the filters, time is generous like that.</p>
	{/if}
</section>

<style>
	.page {
		max-width: 1240px;
		margin: 0 auto;
		padding: clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 4vw, 3rem) 5rem;
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
		max-width: 52ch;
		margin: 0 0 1.4rem;
	}
	.lede b {
		color: var(--color-paper);
	}
	.scope {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--color-paper);
		margin: 0 0 1.4rem;
		text-transform: capitalize;
	}
	.scope a {
		margin-left: 0.6rem;
		color: var(--color-muted);
		text-transform: none;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.scope a:hover {
		color: var(--color-paper);
	}
	.filterbar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.4rem 2rem;
		margin-bottom: 2rem;
	}
	.fgroup {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.flabel {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-right: 0.15rem;
	}
	.chip.med {
		--c: var(--color-jump);
	}
	.chip.sort {
		--c: var(--color-branching);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--color-line);
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.chip .dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--c);
	}
	.chip.on {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--c) 60%, transparent);
	}
	.chip:focus-visible {
		outline: 2px solid var(--c);
		outline-offset: 2px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
	}
	.empty {
		color: var(--color-muted);
		margin-top: 2rem;
	}
</style>
