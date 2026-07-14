<script lang="ts">
	import { Warning, CaretLeft, CaretRight } from 'phosphor-svelte';
	import { kindMeta, whenLabel } from '$lib/timeline/display';
	import type { TimelineEvent } from '$lib/types';

	let {
		selected,
		branchLabel = undefined,
		branchColor,
		selIndex,
		total,
		onStep,
		fallbackImage = undefined,
		onOpenImage
	}: {
		selected: TimelineEvent;
		/** shown as a badge when the fiction names the timeline */
		branchLabel?: string;
		/** lane colour of the selected beat's branch */
		branchColor: string;
		selIndex: number;
		total: number;
		onStep: (delta: number) => void;
		/** poster to show when a beat has no still of its own */
		fallbackImage?: string;
		/** open a given image in the page's gallery lightbox */
		onOpenImage?: (src: string) => void;
	} = $props();

	let M = $derived(kindMeta(selected));
</script>

<div class="detail" style="border-left-color:{branchColor}">
	<div class="detnav">
		<button class="arrow" onclick={() => onStep(-1)} disabled={selIndex <= 0} aria-label="Previous event">
			<CaretLeft size={15} weight="bold" />
		</button>
		<span class="count">{selIndex + 1} / {total}</span>
		<button
			class="arrow"
			onclick={() => onStep(1)}
			disabled={selIndex >= total - 1}
			aria-label="Next event"
		>
			<CaretRight size={15} weight="bold" />
		</button>
	</div>
	<div class="det-main">
		<div class="media">
			{#if selected.image}
				<button
					class="shot"
					onclick={() => onOpenImage?.(selected.image!)}
					aria-label="Open {selected.label} in the gallery"
				>
					<img src={selected.image} alt={selected.label} />
				</button>
			{:else if fallbackImage}
				<img class="shot-fallback" src={fallbackImage} alt="" />
				<span class="media-note">no still yet</span>
			{:else}
				<span class="media-note">no image</span>
			{/if}
		</div>
		<div class="det-text">
			<h4>{selected.label}</h4>
			<p class="when">{whenLabel(selected)}</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
			{#if selected.paradox}
				<p class="para"><Warning size={13} weight="fill" /> {selected.paradox}</p>
			{/if}
		</div>
	</div>
	<div class="badges">
		<span class="badge" style="--c:{branchColor}">
			{#if M.icon}{@const Icon = M.icon}<Icon size={12} weight="fill" />{/if}{M.label}
		</span>
		{#if branchLabel}<span class="badge branch">{branchLabel}</span>{/if}
		{#if selected.source}<span class="badge src">{selected.source}</span>{/if}
	</div>
</div>

<style>
	.detail {
		border-left: 3px solid var(--accent);
		border-radius: 4px;
		padding: 0 0 0 0.8rem;
	}
	.detnav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.7rem;
	}
	.detnav .count {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}
	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		background: transparent;
		color: var(--color-paper);
		cursor: pointer;
		transition:
			border-color 0.15s,
			opacity 0.15s;
	}
	.arrow:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-paper) 40%, var(--color-line));
	}
	.arrow:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.arrow:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	/* three regions: image left, text right, tags beneath */
	.det-main {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr);
		gap: 0.7rem;
		align-items: start;
	}
	.det-text {
		min-width: 0;
	}
	/* always-reserved image slot: still, poster, or blank */
	.media {
		position: relative;
		aspect-ratio: 3 / 4;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-panel) 70%, #000);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.media .shot {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: zoom-in;
	}
	.media .shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.media .shot:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.media .shot-fallback {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.28;
		filter: grayscale(0.3);
	}
	.media-note {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 999px;
		color: var(--c, var(--color-muted));
		border: 1px solid color-mix(in srgb, var(--c, var(--color-muted)) 45%, transparent);
	}
	.badge.branch {
		--c: var(--color-muted);
	}
	.badge.src {
		--c: var(--accent);
	}
	.detail h4 {
		font-family: var(--font-serif);
		font-size: 1.2rem;
		margin: 0 0 0.2rem;
	}
	.when {
		margin: 0 0 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-muted);
	}
	.desc {
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
	}
	.para {
		margin: 0.7rem 0 0;
		display: flex;
		gap: 0.4rem;
		align-items: flex-start;
		font-size: 0.9rem;
		color: #ff8a92;
		border-top: 1px dashed color-mix(in srgb, #ff6b74 40%, transparent);
		padding-top: 0.6rem;
	}
</style>
