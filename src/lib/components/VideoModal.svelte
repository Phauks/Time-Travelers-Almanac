<script lang="ts">
	import { X } from 'phosphor-svelte';

	let {
		youtubeId,
		title = 'Trailer',
		open = $bindable(false)
	}: { youtubeId: string; title?: string; open?: boolean } = $props();

	function close() {
		open = false;
	}
	function onKey(e: KeyboardEvent) {
		if (open && e.key === 'Escape') close();
	}
	// privacy-friendly embed; only built while open so it does not preload
	let src = $derived(
		`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`
	);
</script>

<svelte:window onkeydown={onKey} />

{#if open}
	<div class="backdrop" onclick={close} role="dialog" aria-modal="true" aria-label={title} tabindex="-1">
		<button class="close" onclick={close} aria-label="Close"><X size={20} weight="bold" /></button>
		<div class="frame" onclick={(e) => e.stopPropagation()} role="presentation">
			<iframe
				{src}
				title={title}
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 210;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1rem, 4vw, 3rem);
		background: rgba(3, 5, 12, 0.9);
		backdrop-filter: blur(3px);
	}
	.frame {
		width: min(92vw, 960px);
		aspect-ratio: 16 / 9;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
		background: #000;
	}
	.frame iframe {
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
	}
	.close {
		position: absolute;
		top: 1.1rem;
		right: 1.1rem;
		width: 40px;
		height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		border-radius: 999px;
		cursor: pointer;
	}
	.close:hover {
		background: rgba(255, 255, 255, 0.18);
	}
	.close:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}
</style>
