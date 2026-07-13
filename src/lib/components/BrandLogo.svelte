<script lang="ts">
	// Official brand marks from simple-icons (used per each brand's linking guidelines).
	import { siImdb, siRottentomatoes, siMetacritic, siSteam, siWikipedia } from 'simple-icons';

	let { kind, size = 15, color }: { kind: string; size?: number; color?: string } = $props();

	type Ico = { path: string; hex: string; title: string };
	const ICONS: Record<string, Ico> = {
		imdb: siImdb,
		rottentomatoes: siRottentomatoes,
		metacritic: siMetacritic,
		steam: siSteam,
		wikipedia: siWikipedia
	};
	// on a dark ground, pure-black brand hexes need lightening
	const OVERRIDE: Record<string, string> = {
		metacritic: '#ffcc33',
		steam: '#c7d5e0',
		wikipedia: '#e8ebf2'
	};

	let icon = $derived(ICONS[kind]);
	let fill = $derived(color ?? OVERRIDE[kind] ?? (icon ? `#${icon.hex}` : 'currentColor'));
</script>

{#if icon}
	<svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={icon.title}>
		<path d={icon.path} {fill} />
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
