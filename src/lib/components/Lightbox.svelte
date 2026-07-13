<script lang="ts">
	import { X, CaretLeft, CaretRight, DownloadSimple } from 'phosphor-svelte';

	let {
		images = [],
		index = $bindable(0),
		open = $bindable(false)
	}: {
		images: { src: string; caption?: string }[];
		index?: number;
		open?: boolean;
	} = $props();

	let current = $derived(images[index]);
	const many = $derived(images.length > 1);

	function close() {
		open = false;
	}
	function prev() {
		index = (index - 1 + images.length) % images.length;
	}
	function next() {
		index = (index + 1) % images.length;
	}
	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowLeft' && many) prev();
		else if (e.key === 'ArrowRight' && many) next();
	}
	const stop = (e: Event) => e.stopPropagation();
	const fileName = (src: string) => src.split('/').pop()?.split('?')[0] || 'image';
</script>

<svelte:window onkeydown={onKey} />

{#if open && current}
	<div
		class="backdrop"
		onclick={close}
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
	>
		<button class="ctl close" onclick={close} aria-label="Close"><X size={20} weight="bold" /></button>

		{#if many}
			<button class="ctl nav left" onclick={(e) => { stop(e); prev(); }} aria-label="Previous image">
				<CaretLeft size={26} weight="bold" />
			</button>
			<button class="ctl nav right" onclick={(e) => { stop(e); next(); }} aria-label="Next image">
				<CaretRight size={26} weight="bold" />
			</button>
		{/if}

		<figure class="frame" onclick={stop} role="presentation">
			<img src={current.src} alt={current.caption ?? 'Image'} />
			<figcaption>
				<span class="cap">{current.caption ?? ''}{many ? `  (${index + 1} of ${images.length})` : ''}</span>
				<a
					class="dl"
					href={current.src}
					download={fileName(current.src)}
					target="_blank"
					rel="noreferrer noopener"
				>
					<DownloadSimple size={15} weight="bold" /> Download
				</a>
			</figcaption>
		</figure>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1rem, 4vw, 3rem);
		background: rgba(3, 5, 12, 0.86);
		backdrop-filter: blur(3px);
	}
	.frame {
		margin: 0;
		max-width: min(92vw, 900px);
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.frame img {
		display: block;
		max-width: 100%;
		max-height: 78vh;
		margin: 0 auto;
		object-fit: contain;
		border-radius: 6px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}
	figcaption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: #cfd4e0;
	}
	.dl {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: #cfd4e0;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
		white-space: nowrap;
	}
	.dl:hover {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.55);
	}
	.ctl {
		position: absolute;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		border-radius: 999px;
		cursor: pointer;
	}
	.ctl:hover {
		background: rgba(255, 255, 255, 0.18);
	}
	.close {
		top: 1.1rem;
		right: 1.1rem;
		width: 40px;
		height: 40px;
	}
	.nav {
		top: 50%;
		transform: translateY(-50%);
		width: 46px;
		height: 46px;
	}
	.nav.left {
		left: clamp(0.5rem, 2vw, 2rem);
	}
	.nav.right {
		right: clamp(0.5rem, 2vw, 2rem);
	}
	.ctl:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}
</style>
