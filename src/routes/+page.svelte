<script lang="ts">
	import { base } from '$app/paths';
	import { MagnifyingGlass, ListBullets, Crosshair, BookOpen, Path } from 'phosphor-svelte';
	import PrimeTimeline from '$lib/components/PrimeTimeline.svelte';
</script>

<svelte:head>
	<title>The Time Traveller's Almanac</title>
</svelte:head>

<section class="hero">
	<div class="intro">
		<p class="eyebrow reveal">Field edition · vol. ∞</p>
		<h1 class="reveal d1">You have come <em>loose</em> from time.</h1>
		<p class="lede reveal d2">
			Every timeline breaks in one of <b>four ways</b>. Follow the prime line to find the specimen
			that has you  -  <em>before</em> you try to fix it.
		</p>
		<div class="cta reveal d3">
			<a class="btn" href="{base}/specimens/">
				<MagnifyingGlass size={16} weight="bold" /> Diagnose your predicament
			</a>
			<a class="btn ghost" href="{base}/specimens/">
				<ListBullets size={16} weight="bold" /> Browse the specimens
			</a>
		</div>
		<div class="legend reveal d4" aria-label="The four rules of a timeline">
			<span class="li"><i class="sw" style="--c:var(--color-fixed)"></i><b>Fixed</b> can’t change</span>
			<span class="li"><i class="sw" style="--c:var(--color-mutable)"></i><b>Mutable</b> overwrites</span>
			<span class="li"><i class="sw" style="--c:var(--color-branching)"></i><b>Branching</b> splits</span>
			<span class="li"><i class="sw" style="--c:var(--color-loop)"></i><b>Loop</b> repeats</span>
		</div>
	</div>

	<div class="board reveal d3">
		<PrimeTimeline />
		<p class="board-hint">Each branch is a specimen’s own timeline. Hover to identify · click to open.</p>
	</div>
</section>

<section class="inside" id="inside">
	<div class="inside-inner">
		<h2>A guidebook for the temporally displaced.</h2>
		<p class="sub">
			One hundred specimens from film, television, books, games and the stage  -  each diagnosed,
			dissected, and mapped.
		</p>
		<div class="index">
			<article class="idx">
				<span class="no">01</span>
				<span class="ic"><Crosshair size={26} /></span>
				<h3>Diagnose</h3>
				<p>Enter your symptoms  -  a repeating Tuesday, a fading photograph, a second you  -  and get a verdict on the rules you’re bound by.</p>
			</article>
			<article class="idx">
				<span class="no">02</span>
				<span class="ic"><BookOpen size={26} /></span>
				<h3>Study a specimen</h3>
				<p>Every entry opens into a full dossier: mechanism, paradox exposure, related works, and field notes on what you’re allowed to do.</p>
			</article>
			<article class="idx">
				<span class="no">03</span>
				<span class="ic"><Path size={26} /></span>
				<h3>Walk the timeline</h3>
				<p>Toggle any story between <em>as told</em> and <em>as happened</em>, and watch the jumps and loops rearrange themselves.</p>
			</article>
		</div>
	</div>
</section>

<footer class="foot">Mostly harmless · a working prototype seeded with real specimens</footer>

<style>
	.hero {
		padding: clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 4vw, 3.5rem) 2rem;
		max-width: 1300px;
		margin: 0 auto;
	}
	.intro {
		max-width: 34rem;
	}
	h1 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(2.4rem, 6vw, 4.6rem);
		line-height: 0.98;
		letter-spacing: -0.015em;
		margin: 0.6rem 0 1.2rem;
		text-wrap: balance;
	}
	h1 em {
		font-style: italic;
		color: var(--color-branching);
	}
	.lede {
		font-size: clamp(1rem, 1.7vw, 1.2rem);
		color: #c8cee0;
		max-width: 34ch;
		line-height: 1.5;
		margin: 0 0 1.6rem;
	}
	.lede b {
		color: var(--color-paper);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.8rem 1.2rem;
		border-radius: 3px;
		background: var(--color-paper);
		color: var(--color-ink);
		border: 1px solid transparent;
		transition: transform 0.16s ease;
	}
	.btn:hover {
		transform: translateY(-2px);
	}
	.btn.ghost {
		background: transparent;
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 24%, transparent);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.5rem;
		margin-top: 2.2rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--color-line);
	}
	.li {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		font-size: 0.82rem;
		color: var(--color-muted);
	}
	.li b {
		color: var(--color-paper);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.sw {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		align-self: center;
		background: var(--c);
		box-shadow: 0 0 10px var(--c);
	}

	.board {
		margin-top: clamp(1.5rem, 5vw, 3rem);
	}
	.board-hint {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0.5rem 0 0;
	}

	.inside {
		border-top: 1px solid var(--color-line);
		background: linear-gradient(var(--color-ink), #070912);
		padding: clamp(3rem, 8vw, 6.5rem) clamp(1rem, 4vw, 3.5rem);
	}
	.inside-inner {
		max-width: 1140px;
		margin: 0 auto;
	}
	.inside h2 {
		font-family: var(--font-serif);
		font-weight: 600;
		font-size: clamp(1.5rem, 3.4vw, 2.1rem);
		margin: 0 0 0.4rem;
		letter-spacing: -0.01em;
	}
	.sub {
		color: var(--color-muted);
		margin: 0 0 2.6rem;
		max-width: 52ch;
	}
	.index {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border-top: 1px solid var(--color-line);
	}
	@media (max-width: 740px) {
		.index {
			grid-template-columns: 1fr;
		}
	}
	.idx {
		padding: 1.6rem 1.6rem 1.9rem;
		border-bottom: 1px solid var(--color-line);
		border-right: 1px solid var(--color-line);
	}
	@media (max-width: 740px) {
		.idx {
			border-right: 0;
		}
	}
	.no {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		color: var(--color-muted);
	}
	.ic {
		display: block;
		margin: 1rem 0 0.9rem;
		color: var(--color-paper);
	}
	.idx h3 {
		font-family: var(--font-serif);
		font-size: 1.3rem;
		margin: 0 0 0.5rem;
		font-weight: 600;
	}
	.idx p {
		margin: 0;
		color: #aab2c6;
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.foot {
		background: #070912;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-align: center;
		padding: 1.6rem;
		border-top: 1px solid var(--color-line);
	}

	/* entrance */
	.reveal {
		opacity: 0;
		transform: translateY(10px);
		animation: reveal 0.8s ease forwards;
	}
	.d1 {
		animation-delay: 0.1s;
	}
	.d2 {
		animation-delay: 0.25s;
	}
	.d3 {
		animation-delay: 0.4s;
	}
	.d4 {
		animation-delay: 0.55s;
	}
	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			opacity: 1;
			transform: none;
			animation: none;
		}
	}
</style>
