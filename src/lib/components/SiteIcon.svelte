<script lang="ts">
	import type { LinkKind } from '$lib/types';
	// Small brand marks for outbound links and rating sources.
	let { kind, size = 16 }: { kind: LinkKind | 'rottentomatoes'; size?: number } = $props();
</script>

{#if kind === 'imdb'}
	<svg width={size * 2} height={size} viewBox="0 0 64 32" aria-hidden="true">
		<rect width="64" height="32" rx="5" fill="#f5c518" />
		<text
			x="32"
			y="23"
			text-anchor="middle"
			font-family="Arial, sans-serif"
			font-weight="800"
			font-size="18"
			fill="#000">IMDb</text
		>
	</svg>
{:else if kind === 'rottentomatoes'}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="14" r="8.5" fill="#fa320a" />
		<path d="M12 6 C13 3 16 3 17.5 4.5 C16 7 13.5 7 12 6 Z" fill="#5aa700" />
	</svg>
{:else if kind === 'metacritic'}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<rect width="24" height="24" rx="5" fill="#ffcc33" />
		<text
			x="12"
			y="17.5"
			text-anchor="middle"
			font-family="Arial, sans-serif"
			font-weight="800"
			font-size="15"
			fill="#000">M</text
		>
	</svg>
{:else if kind === 'steam'}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="12" cy="12" r="11" fill="#1b2838" />
		<circle cx="15" cy="9" r="3" fill="none" stroke="#c7d5e0" stroke-width="1.4" />
		<circle cx="8.5" cy="15" r="2.2" fill="#c7d5e0" />
		<line x1="10.2" y1="13.8" x2="13.6" y2="10.4" stroke="#c7d5e0" stroke-width="1.4" />
	</svg>
{:else if kind === 'watch'}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<rect width="24" height="24" rx="5" fill="#1c2733" />
		<path d="M9.5 8 L16 12 L9.5 16 Z" fill="#fcd200" />
	</svg>
{:else if kind === 'wikipedia'}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<text
			x="12"
			y="18"
			text-anchor="middle"
			font-family="Georgia, serif"
			font-size="18"
			fill="currentColor">W</text
		>
	</svg>
{:else}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.7"
		aria-hidden="true"
	>
		<path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
	</svg>
{/if}
