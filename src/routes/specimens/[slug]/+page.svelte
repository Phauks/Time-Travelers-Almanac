<script lang="ts">
	import { base } from '$app/paths';
	import { Warning, MagnifyingGlassPlus } from 'phosphor-svelte';
	import BranchingTimeline from '$lib/components/BranchingTimeline.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import SpecimenCard from '$lib/components/SpecimenCard.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import {
		RULE_META,
		MODE_META,
		LOOP_META,
		MEDIUM_META,
		ruleColorVar,
		relatedSpecimens,
		sagaMates
	} from '$lib/data';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let s = $derived(data.specimen);

	// poster plus any timeline stills, for the lightbox gallery
	let gallery = $derived([
		...(s.poster ? [{ src: s.poster, caption: `${s.title} poster` }] : []),
		...s.timeline.filter((e) => e.image).map((e) => ({ src: e.image!, caption: e.label }))
	]);
	let lbOpen = $state(false);
	let lbIndex = $state(0);
	function openLightbox(i = 0) {
		lbIndex = i;
		lbOpen = true;
	}

	const riskPct = { low: 33, medium: 66, high: 100 } as const;
	const LINK_META: Record<string, string> = {
		steam: 'Steam',
		watch: 'JustWatch',
		trailer: 'Trailer',
		goodreads: 'Goodreads',
		wikipedia: 'Wikipedia',
		official: 'Official site',
		other: 'Link'
	};

	let linkMap = $derived(Object.fromEntries((s.links ?? []).map((l) => [l.kind, l.url])));
	// non-score links, plus auto-generated trailer (video media) and Goodreads (books)
	// searches when the entry does not supply its own, so every specimen has them
	let extraLinks = $derived.by(() => {
		const links = (s.links ?? []).filter(
			(l) => !['imdb', 'rottentomatoes', 'metacritic'].includes(l.kind)
		);
		const has = (k: string) => links.some((l) => l.kind === k);
		const out = [...links];
		if (!has('trailer') && ['film', 'tv', 'game'].includes(s.medium)) {
			out.push({
				kind: 'trailer',
				// a real TMDB trailer if enrichment found one, else a YouTube search
				url:
					s.trailer ??
					`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.year} trailer`)}`
			});
		}
		if (!has('goodreads') && s.medium === 'book') {
			out.push({
				kind: 'goodreads',
				url: `https://www.goodreads.com/search?q=${encodeURIComponent(s.title)}`
			});
		}
		return out;
	});
	let mates = $derived(sagaMates(s));
	let related = $derived(relatedSpecimens(s));
	let sagaLabel = $derived(s.saga ? s.saga.replace(/-/g, ' ') : '');
	// the saga parts immediately before and after this one, shown as the
	// incoming and outgoing connections at the ends of the timeline
	let prevPart = $derived.by(() => {
		if (s.partOrder == null) return null;
		const earlier = mates
			.filter((m) => (m.partOrder ?? 0) < (s.partOrder ?? 0))
			.sort((a, b) => (b.partOrder ?? 0) - (a.partOrder ?? 0));
		return earlier[0] ? { slug: earlier[0].slug, title: earlier[0].title } : null;
	});
	let nextPart = $derived.by(() => {
		if (s.partOrder == null) return null;
		const later = mates
			.filter((m) => (m.partOrder ?? 0) > (s.partOrder ?? 0))
			.sort((a, b) => (a.partOrder ?? 0) - (b.partOrder ?? 0));
		return later[0] ? { slug: later[0].slug, title: later[0].title } : null;
	});
</script>

<svelte:head>
	<title>{s.title}, The Time Traveller's Almanac</title>
</svelte:head>

<article class="dossier" style="--accent:{ruleColorVar(s.rules[0])}">
	<header class="top">
		<div class="col-img">
			{#if gallery.length}
				<button class="plate" onclick={() => openLightbox(0)} aria-label="View {s.title} artwork larger">
					{#if s.poster}
						<img src={s.poster} alt="{s.title} poster" />
					{:else}
						<span class="src">{s.imageSource}</span>
					{/if}
					<span class="zoom"><MagnifyingGlassPlus size={16} weight="bold" /></span>
				</button>
			{:else}
				<div class="plate"><span class="src">{s.imageSource}</span></div>
			{/if}
		</div>

		<div class="col-main">
			<h1>{s.title}</h1>
			<p class="sub">
				<a href="{base}/history#y{s.year}">{s.year}</a>
				<span class="dot-sep"></span>
				<a href="{base}/specimens/?medium={s.medium}">{MEDIUM_META[s.medium]}</a>
				{#if s.saga}
					<span class="dot-sep"></span>
					<a href="{base}/specimens/?saga={s.saga}" class="cap">{sagaLabel} franchise</a>
				{/if}
			</p>

			<p class="synopsis">{s.synopsis ?? s.logline}</p>

			<div class="linkrow">
				{#if s.ratings?.imdb != null}
					<a class="chip rt" href={linkMap.imdb} target="_blank" rel="noreferrer noopener">
						<BrandLogo kind="imdb" size={16} /> <b>{s.ratings.imdb.toFixed(1)}</b><span class="unit">/10</span>
					</a>
				{/if}
				{#if s.ratings?.tmdb != null}
					<a
						class="chip rt"
						href={`https://www.themoviedb.org/search?query=${encodeURIComponent(s.title)}`}
						target="_blank"
						rel="noreferrer noopener"
					>
						<BrandLogo kind="tmdb" size={16} /> <b>{s.ratings.tmdb.toFixed(1)}</b><span class="unit">/10</span>
					</a>
				{/if}
				{#if s.ratings?.rtCritic != null}
					<a class="chip rt" href={linkMap.rottentomatoes} target="_blank" rel="noreferrer noopener">
						<BrandLogo kind="rottentomatoes" size={16} /> <b>{s.ratings.rtCritic}%</b><span class="unit">Critics</span>
					</a>
				{/if}
				{#if s.ratings?.rtAudience != null}
					<a class="chip rt" href={linkMap.rottentomatoes} target="_blank" rel="noreferrer noopener">
						<BrandLogo kind="rottentomatoes" size={16} /> <b>{s.ratings.rtAudience}%</b><span class="unit">Audience</span>
					</a>
				{/if}
				{#if s.ratings?.metacritic != null}
					<a class="chip rt" href={linkMap.metacritic} target="_blank" rel="noreferrer noopener">
						<BrandLogo kind="metacritic" size={16} /> <b>{s.ratings.metacritic}</b><span class="unit">/100</span>
					</a>
				{/if}
				{#each extraLinks as link (link.url)}
					<a class="chip lk" href={link.url} target="_blank" rel="noreferrer noopener">
						<BrandLogo kind={link.kind} size={15} /> {link.label ?? LINK_META[link.kind] ?? 'Link'}
					</a>
				{/each}
			</div>
		</div>

		<aside class="col-tt">
			<div class="tt para" style="--c:var(--color-mutable)">
				<p class="k"><Warning size={12} weight="fill" /> Paradox exposure</p>
				<p class="v cap">{s.paradoxRisk}</p>
				<span class="bar"><i style="width:{riskPct[s.paradoxRisk]}%"></i></span>
				{#if s.paradoxes.length}
					<p class="d">Documented: {#each s.paradoxes as p, i (p)}<span>{p}</span>{i < s.paradoxes.length - 1 ? ', ' : ''}{/each}</p>
				{/if}
			</div>
			<div class="tt" style="--c:var(--color-{s.rules[0]})">
				<p class="k">The Rule</p>
				<p class="v">{RULE_META[s.rules[0]].name}</p>
				<p class="d">{RULE_META[s.rules[0]].nickname}. {RULE_META[s.rules[0]].law}</p>
			</div>
			<div class="tt mode">
				<p class="k">The Mode</p>
				<p class="v">{s.mode.map((m) => MODE_META[m]).join(', ')}</p>
			</div>
			<div class="tt loop">
				<p class="k">Loop status</p>
				<p class="v">{s.loop ? LOOP_META[s.loop] : 'None'}</p>
				<p class="d">{s.loop ? 'A repeating condition applies.' : 'Linear jumps, no repetition.'}</p>
			</div>
			{#if s.fieldNote}
				<div class="tt note">
					<p class="k">Field note</p>
					<p class="fn">{s.fieldNote}</p>
				</div>
			{/if}
		</aside>
	</header>

	<section class="mech">
		<h2>Mechanism</h2>
		<p>{s.mechanism}</p>
	</section>

	<section class="timeline">
		<h2>Timeline</h2>
		<BranchingTimeline
			events={s.timeline}
			branches={s.branches ?? []}
			accent={ruleColorVar(s.rules[0])}
			continuesFrom={prevPart}
			continuesTo={nextPart}
		/>
	</section>

	{#if mates.length}
		<section class="gallery">
			<h2>More in this timeline</h2>
			<div class="grid">
				{#each mates as m (m.slug)}<SpecimenCard specimen={m} />{/each}
			</div>
		</section>
	{/if}

	{#if related.length}
		<section class="gallery">
			<h2>Related specimens</h2>
			<div class="grid">
				{#each related as r (r.slug)}<SpecimenCard specimen={r} />{/each}
			</div>
		</section>
	{/if}

	<Lightbox images={gallery} bind:open={lbOpen} bind:index={lbIndex} />

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
		max-width: 1340px;
		margin: 0 auto;
		padding: clamp(1.2rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem) 5rem;
	}

	.top {
		display: grid;
		gap: clamp(1.4rem, 3vw, 2.5rem);
		grid-template-columns: 280px minmax(0, 1fr) 300px;
		grid-template-areas: 'img main tt';
		align-items: start;
	}
	@media (max-width: 1040px) {
		.top {
			grid-template-columns: 240px minmax(0, 1fr);
			grid-template-areas: 'img main' 'tt tt';
		}
	}
	@media (max-width: 600px) {
		.top {
			grid-template-columns: 1fr;
			grid-template-areas: 'img' 'main' 'tt';
		}
	}
	.col-img {
		grid-area: img;
	}
	.mech {
		margin-top: 1.6rem;
	}
	.mech h2 {
		font-family: var(--font-serif);
		font-size: 1.25rem;
		margin: 0 0 0.5rem;
	}
	.mech p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-paper) 90%, var(--color-muted));
	}
	.col-main {
		grid-area: main;
	}
	.col-tt {
		grid-area: tt;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	@media (max-width: 1040px) and (min-width: 601px) {
		.col-tt {
			flex-direction: row;
		}
		.col-tt > .tt {
			flex: 1;
		}
	}

	.plate {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 3;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		overflow: hidden;
		background: radial-gradient(120% 120% at 30% 20%, #10152a, #05070e);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}
	button.plate {
		cursor: zoom-in;
		font: inherit;
		color: inherit;
	}
	.zoom {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 999px;
		background: rgba(3, 5, 12, 0.6);
		color: #fff;
		opacity: 0;
		transition: opacity 0.15s;
	}
	button.plate:hover .zoom,
	button.plate:focus-visible .zoom {
		opacity: 1;
	}
	button.plate:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.plate img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.plate .src {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-align: center;
		padding: 0 12%;
	}

	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2rem, 4.2vw, 3.1rem);
		line-height: 1.02;
		margin: 0 0 0.5rem;
	}
	.sub {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		margin: 0 0 1.2rem;
	}
	.sub a {
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-muted) 45%, transparent);
	}
	.sub a:hover {
		color: var(--color-paper);
	}
	.sub .cap {
		text-transform: capitalize;
	}
	.dot-sep {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--color-muted);
		opacity: 0.6;
	}
	.synopsis {
		font-size: 1.05rem;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-paper) 90%, var(--color-muted));
		margin: 0 0 1.4rem;
	}

	.linkrow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		padding: 0.4rem 0.7rem;
		font-family: var(--font-mono);
		color: var(--color-paper);
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.chip:hover {
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}
	.rt {
		font-size: 0.85rem;
	}
	.rt b {
		font-weight: 700;
	}
	.rt .unit {
		color: var(--color-muted);
		font-size: 0.72rem;
		margin-left: 0.1rem;
	}
	.lk {
		font-size: 0.68rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.lk:hover {
		color: var(--color-paper);
	}

	/* time-travel info column */
	.tt {
		background: color-mix(in srgb, var(--color-panel) 60%, transparent);
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--c, var(--color-branching));
		border-radius: 6px;
		padding: 0.85rem 0.95rem 1rem;
	}
	.tt.mode {
		--c: var(--color-loop);
	}
	.tt.loop {
		--c: var(--color-muted);
	}
	.tt .k {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.35rem;
	}
	.tt .v {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		margin: 0;
	}
	.tt .d {
		font-size: 0.78rem;
		color: var(--color-muted);
		line-height: 1.4;
		margin: 0.3rem 0 0;
	}
	.tt .k {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.tt.para .v.cap {
		text-transform: capitalize;
	}
	.tt.para {
		--c: var(--color-mutable);
	}
	.tt.para .bar {
		display: block;
		height: 7px;
		margin-top: 0.5rem;
		border-radius: 999px;
		background: var(--color-panel);
		border: 1px solid var(--color-line);
		overflow: hidden;
	}
	.tt.para .bar i {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--color-loop), var(--color-mutable), var(--color-fixed));
	}
	.tt.para .d span {
		color: var(--color-paper);
	}
	.tt.note {
		--c: var(--accent);
	}
	.tt.note .fn {
		margin: 0.3rem 0 0;
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 0.86rem;
		line-height: 1.5;
		color: color-mix(in srgb, var(--color-paper) 82%, var(--color-muted));
	}

	.timeline h2,
	.gallery h2,
	.sources h2 {
		font-family: var(--font-serif);
		font-size: 1.25rem;
		margin: 2.4rem 0 0.8rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
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
