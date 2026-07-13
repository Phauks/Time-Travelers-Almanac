<script lang="ts">
	// Official brand marks from simple-icons (used per each brand's linking guidelines).
	import {
		siImdb,
		siRottentomatoes,
		siMetacritic,
		siSteam,
		siWikipedia,
		siGoodreads,
		siYoutube,
		siThemoviedatabase
	} from 'simple-icons';

	let { kind, size = 15, color }: { kind: string; size?: number; color?: string } = $props();

	type Ico = { path: string; hex: string; title: string };
	// JustWatch has no simple-icons mark, so we ship a close play-badge stand-in.
	const JUSTWATCH: Ico = {
		title: 'JustWatch',
		hex: 'FDD835',
		path: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2 5.5l7 4.5-7 4.5v-9z'
	};
	const ICONS: Record<string, Ico> = {
		imdb: siImdb,
		rottentomatoes: siRottentomatoes,
		metacritic: siMetacritic,
		steam: siSteam,
		wikipedia: siWikipedia,
		goodreads: siGoodreads,
		trailer: siYoutube,
		tmdb: siThemoviedatabase,
		watch: JUSTWATCH
	};
	// on a dark ground, pure-black brand hexes need lightening
	const OVERRIDE: Record<string, string> = {
		metacritic: '#ffcc33',
		steam: '#c7d5e0',
		wikipedia: '#e8ebf2',
		goodreads: '#d8c7a6'
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
