<script lang="ts">
	import { base } from '$app/paths';
	import { Warning, MagnifyingGlassPlus, ArrowRight, Play } from 'phosphor-svelte';
	import BranchingTimeline from '$lib/components/BranchingTimeline.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import SpecimenCard from '$lib/components/SpecimenCard.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import VideoModal from '$lib/components/VideoModal.svelte';
	import {
		RULE_META,
		MODE_META,
		MODE_BLURB,
		LOOP_META,
		MEDIUM_META,
		ruleColorVar,
		relatedSpecimens,
		franchiseMates
	} from '$lib/data';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let s = $derived(data.specimen);

	// timeline events that carry a still, and the full lightbox set (poster first,
	// then trailer is handled separately, then the stills)
	let eventShots = $derived(s.timeline.filter((e) => e.image));
	let gallery = $derived([
		...(s.poster ? [{ src: s.poster, caption: `${s.title} poster`, credit: '' }] : []),
		...eventShots.map((e) => ({ src: e.image!, caption: e.label, credit: e.imageCredit ?? '' }))
	]);
	const posterOffset = $derived(s.poster ? 1 : 0);
	function openImageBySrc(src: string) {
		const i = gallery.findIndex((g) => g.src === src);
		if (i >= 0) openLightbox(i);
	}
	let lbOpen = $state(false);
	let lbIndex = $state(0);
	function openLightbox(i = 0) {
		lbIndex = i;
		lbOpen = true;
	}

	// an embeddable YouTube id from the enrichment trailer, if we have one
	function youtubeId(url: string | undefined): string | null {
		if (!url) return null;
		const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
		return m ? m[1] : null;
	}
	let trailerId = $derived(youtubeId(s.trailer));
	let videoOpen = $state(false);

	const riskPct = { low: 33, medium: 66, high: 100 } as const;
	const PARADOX_BLURB = {
		low: 'Low risk: this story keeps its causality tidy; few contradictions to worry about.',
		medium: 'Medium risk: the rules bend in places; watch for loops with no first cause.',
		high: 'High risk: causality is under real strain here; paradoxes are part of the story.'
	} as const;
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
		// an embeddable trailer is shown as an in-page play button, not a link
		const out = trailerId ? links.filter((l) => l.kind !== 'trailer') : [...links];
		if (!trailerId && !has('trailer') && ['film', 'tv', 'game'].includes(s.medium)) {
			out.push({
				kind: 'trailer',
				url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.year} trailer`)}`
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
	let mates = $derived(franchiseMates(s));
	// every part of the franchise with a timeline, in order, for the saga view
	let saga = $derived.by(() => {
		if (!s.franchise) return [];
		return [s, ...mates]
			.filter((m) => m.timeline?.length && m.continuity === s.continuity)
			.sort((a, b) => (a.partOrder ?? 0) - (b.partOrder ?? 0))
			.map((m) => ({ slug: m.slug, title: m.title, events: m.timeline, branches: m.branches ?? [], cast: m.cast ?? [] }));
	});
	let related = $derived(relatedSpecimens(s));
	let franchiseLabel = $derived(s.franchise ? s.franchise.replace(/-/g, ' ') : '');
	// the franchise parts immediately before and after this one, shown as the
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
		<div class="lead">
		<div class="col-img">
			{#if s.poster}
				<button class="plate" onclick={() => openLightbox(0)} aria-label="View {s.title} artwork larger">
					<img src={s.poster} alt="{s.title} poster" />
					<span class="zoom"><MagnifyingGlassPlus size={16} weight="bold" /></span>
				</button>
			{:else}
				<div class="plate ph"><span>{MEDIUM_META[s.medium]}</span></div>
			{/if}

			{#if s.poster || trailerId || eventShots.length}
				<div class="media-strip">
					{#if s.poster}
						<button class="media-tile" onclick={() => openLightbox(0)} aria-label="View poster">
							<img src={s.poster} alt="{s.title} poster" loading="lazy" />
						</button>
					{/if}
					{#if trailerId}
						<button class="media-tile video" onclick={() => (videoOpen = true)} aria-label="Play trailer">
							<img
								src="https://img.youtube.com/vi/{trailerId}/mqdefault.jpg"
								alt="Trailer thumbnail"
								loading="lazy"
							/>
							<span class="play"><Play size={18} weight="fill" /></span>
						</button>
					{/if}
					{#each eventShots as g, j (g.id)}
						<button
							class="media-tile"
							onclick={() => openLightbox(posterOffset + j)}
							aria-label="View {g.label}"
						>
							<img src={g.image} alt={g.label} loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="col-main">
			<h1>{s.title}</h1>
			<p class="sub">
				<a href="{base}/history#y{s.year}">{s.year}</a>
				<span class="dot-sep"></span>
				<a href="{base}/specimens/?medium={s.medium}">{MEDIUM_META[s.medium]}</a>
				{#if s.franchise}
					<span class="dot-sep"></span>
					<a href="{base}/specimens/?franchise={s.franchise}" class="cap">{franchiseLabel} franchise</a>
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
		</div>

		<aside class="col-tt">
			<div class="tt para tip-host" style="--c:var(--color-mutable)">
				<p class="k"><Warning size={12} weight="fill" /> Paradox</p>
				<p class="v cap">{s.paradoxRisk}</p>
				<span class="bar"><i style="width:{riskPct[s.paradoxRisk]}%"></i></span>
				<span class="tip">{PARADOX_BLURB[s.paradoxRisk]}</span>
			</div>
			<div class="tt rule tip-host" style="--c:var(--color-{s.rules[0]})">
				<p class="k">The Rule</p>
				<p class="v">{RULE_META[s.rules[0]].name}</p>
				<span class="tip">
					<b>{RULE_META[s.rules[0]].nickname}.</b>
					{RULE_META[s.rules[0]].law}
					<a class="tip-more" href="{base}/rules/{s.rules[0]}/">See more <ArrowRight size={11} weight="bold" /></a>
				</span>
			</div>
			<div class="tt mode tip-host">
				<p class="k">The Mode</p>
				<p class="v">{s.mode.map((m) => MODE_META[m]).join(', ')}</p>
				<span class="tip">
					{#each s.mode as m (m)}
						<b>{MODE_META[m]}.</b> {MODE_BLURB[m]}<br />
					{/each}
				</span>
			</div>
			<div class="tt loop tip-host">
				<p class="k">Loop status</p>
				<p class="v">{s.loop ? LOOP_META[s.loop] : 'None'}</p>
				<span class="tip">{s.loop ? 'A repeating condition applies.' : 'Linear jumps, no repetition.'}</span>
			</div>
			{#if s.fieldNote}
				<div class="tt note">
					<p class="k">Field note</p>
					<p class="fn">{s.fieldNote}</p>
				</div>
			{/if}
			<div class="tt note mech-box">
				<p class="k">Mechanism</p>
				<p class="fn">{s.mechanism}</p>
			</div>
		</aside>
	</header>

	<section class="timeline">
		<h2>Timeline</h2>
		{#key s.slug}
			<BranchingTimeline
				title={s.title}
				events={s.timeline}
				branches={s.branches ?? []}
				accent={ruleColorVar(s.rules[0])}
				continuesFrom={prevPart}
				continuesTo={nextPart}
				onOpenImage={openImageBySrc}
				cast={s.cast ?? []}
				{saga}
			/>
		{/key}
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
	{#if trailerId}
		<VideoModal youtubeId={trailerId} title="{s.title} trailer" bind:open={videoOpen} />
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
		max-width: 1340px;
		margin: 0 auto;
		padding: clamp(1.2rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem) 5rem;
	}

	.top {
		display: grid;
		gap: clamp(1.2rem, 2.5vw, 2rem);
		grid-template-columns: minmax(0, 1fr) 320px;
		grid-template-areas: 'lead tt';
		align-items: start;
	}
	.lead {
		grid-area: lead;
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: clamp(1.2rem, 3vw, 2rem);
		align-items: start;
	}
	@media (max-width: 960px) {
		.top {
			grid-template-columns: 1fr;
			grid-template-areas: 'lead' 'tt';
		}
	}
	@media (max-width: 560px) {
		.lead {
			grid-template-columns: 1fr;
		}
	}
	/* mechanism reuses the field-note box style, but reads better upright */
	.mech-box .fn {
		font-style: normal;
	}
	.col-tt {
		grid-area: tt;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
		align-content: start;
	}
	/* field note spans the full width beneath the two-by-two grid */
	.col-tt :global(.tt.note) {
		grid-column: 1 / -1;
	}
	@media (max-width: 400px) {
		.col-tt {
			grid-template-columns: 1fr;
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

	/* time-travel info boxes, laid out two by two */
	.tt {
		position: relative;
		background: color-mix(in srgb, var(--color-panel) 60%, transparent);
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--c, var(--color-branching));
		border-radius: 6px;
		padding: 0.65rem 0.75rem 0.75rem;
	}
	.tt.mode {
		--c: var(--color-loop);
	}
	.tt.loop {
		--c: var(--color-muted);
	}
	.tt .k {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.3rem;
	}
	.tt .v {
		font-family: var(--font-serif);
		font-size: 1.05rem;
		margin: 0;
		line-height: 1.15;
	}
	.tt.para .v.cap {
		text-transform: capitalize;
	}
	.tt.para {
		--c: var(--color-mutable);
	}
	.tt.para .bar {
		display: block;
		height: 6px;
		margin-top: 0.45rem;
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

	/* hover / focus popup describing a box (e.g. what "Mutable" means) */
	.tip-host {
		cursor: help;
	}
	.tip-host .tip {
		position: absolute;
		/* these boxes sit in the right column near the top of the viewport, so
		   the popup opens DOWNWARD and LEFTWARD to always stay on-screen */
		right: 0;
		top: calc(100% + 8px);
		width: max-content;
		max-width: min(260px, 62vw);
		background: var(--color-panel);
		border: 1px solid var(--color-line);
		border-radius: 6px;
		padding: 0.6rem 0.7rem;
		font-size: 0.8rem;
		line-height: 1.45;
		color: color-mix(in srgb, var(--color-paper) 92%, var(--color-muted));
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
		opacity: 0;
		transform: translateY(4px);
		pointer-events: none;
		transition:
			opacity 0.15s,
			transform 0.15s;
		z-index: 20;
	}
	.tip-host .tip b {
		color: var(--color-paper);
	}
	.tip-host:hover .tip,
	.tip-host:focus-visible .tip,
	.tip-host:focus-within .tip {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
	.tip-more {
		display: flex;
		width: fit-content;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.tip-more:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.tip-host:focus-visible {
		outline: 2px solid var(--c, var(--accent));
		outline-offset: 2px;
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

	/* placeholder plate shown when no poster art exists yet */
	.plate.ph span {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	/* the gallery strip that sits directly under the poster */
	.media-strip {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 0.5rem;
		margin-top: 0.7rem;
	}
	.media-tile {
		position: relative;
		padding: 0;
		aspect-ratio: 16 / 10;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-panel);
		cursor: pointer;
	}
	.media-tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.2s;
	}
	.media-tile:hover img {
		transform: scale(1.06);
	}
	.media-tile:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.media-tile.video .play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		background: rgba(3, 5, 12, 0.35);
	}
	.media-tile.video::after {
		content: '';
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-jump) 70%, transparent);
		border-radius: 6px;
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
