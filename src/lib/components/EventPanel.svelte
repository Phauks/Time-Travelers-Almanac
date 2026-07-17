<script lang="ts">
	import { Warning, CaretLeft, CaretRight, ArrowSquareOut, MagnifyingGlassPlus } from 'phosphor-svelte';
	import { base } from '$app/paths';
	import { kindMeta, whenLabel, STATUS_BLURB } from '$lib/timeline/display';
	import { KIND_ICONS } from '$lib/timeline/kindIcons';
	import type { TimelineEvent } from '$lib/types';

	let {
		selected,
		branchLabel = undefined,
		branchNote = undefined,
		branchStatus = undefined,
		branchColor,
		selIndex,
		total,
		onStep,
		onOpenImage
	}: {
		selected: TimelineEvent;
		/** shown as a badge when the fiction names the timeline */
		branchLabel?: string;
		/** one line on what this branch is, shown on hover */
		branchNote?: string;
		/** the branch's fate (original / endangered / erased / restored) */
		branchStatus?: string;
		/** lane colour of the selected beat's branch */
		branchColor: string;
		selIndex: number;
		total: number;
		onStep: (delta: number) => void;
		/** open a given image in the page's gallery lightbox */
		onOpenImage?: (src: string) => void;
	} = $props();

	let M = $derived(kindMeta(selected));
	let KindIcon = $derived(KIND_ICONS[selected.kind ?? 'event'] as typeof import('phosphor-svelte').Flag);
	const pretty = (slug: string) => slug.replace(/-/g, ' ');
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
		<div class="det-text">
			<h4>{selected.label}</h4>
			<p class="when">{whenLabel(selected)}</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
			{#if selected.paradox}
				<p class="para"><Warning size={13} weight="fill" /> {selected.paradox}</p>
			{/if}
			{#if selected.image}
				<button class="viewstill" onclick={() => onOpenImage?.(selected.image!)}>
					<MagnifyingGlassPlus size={13} weight="bold" /> View still
				</button>
			{/if}
			{#if selected.crossRef}
				<a class="xref-link" href="{base}/specimens/{selected.crossRef.entry}/">
					<ArrowSquareOut size={13} weight="bold" /> Crosses into {pretty(selected.crossRef.entry)}
				</a>
			{/if}
		</div>
	</div>
	<div class="badges">
		<span class="badge tip-host" tabindex="0" style="--c:{branchColor}">
			<KindIcon size={12} weight="fill" />{M.label}
			<span class="tip" role="tooltip">{M.blurb}</span>
		</span>
		{#if branchLabel}
			<span class="badge branch tip-host" tabindex="0">
				{branchLabel}
				<span class="tip" role="tooltip">
					{#if branchStatus}<b class="cap">{branchStatus}.</b> {STATUS_BLURB[branchStatus] ?? ''}{/if}
					{#if branchNote}{branchNote}{/if}
					{#if !branchStatus && !branchNote}One of this story's timelines.{/if}
				</span>
			</span>
		{/if}
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
	.det-main {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}
	.det-text {
		min-width: 0;
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
	/* hover explanations open DOWN and LEFT so they always stay on screen */
	.tip-host {
		position: relative;
		cursor: help;
	}
	.tip-host .tip {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 40;
		width: max-content;
		max-width: min(240px, 60vw);
		background: var(--color-panel);
		border: 1px solid var(--color-line);
		border-radius: 6px;
		padding: 0.5rem 0.6rem;
		font-family: var(--font-sans);
		font-size: 0.78rem;
		line-height: 1.45;
		letter-spacing: normal;
		text-transform: none;
		color: color-mix(in srgb, var(--color-paper) 92%, var(--color-muted));
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
		opacity: 0;
		transform: translateY(-4px);
		pointer-events: none;
		transition:
			opacity 0.15s,
			transform 0.15s;
	}
	.tip-host:hover .tip,
	.tip-host:focus-visible .tip {
		opacity: 1;
		transform: translateY(0);
	}
	.tip-host .tip b {
		color: var(--color-paper);
	}
	.tip-host .tip .cap {
		text-transform: capitalize;
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
	.viewstill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.6rem 0.5rem 0 0;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.28rem 0.65rem;
		cursor: pointer;
	}
	.viewstill:hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}
	.xref-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-branching);
		border: 1px solid color-mix(in srgb, var(--color-branching) 45%, transparent);
		border-radius: 999px;
		padding: 0.28rem 0.65rem;
	}
	.xref-link:hover {
		color: var(--color-paper);
		border-color: var(--color-branching);
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
