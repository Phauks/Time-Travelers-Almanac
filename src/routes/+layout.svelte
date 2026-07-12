<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();

	let onLanding = $derived(page.url.pathname === `${base}/` || page.url.pathname === base);
</script>

<div class="shell">
	<header class="nav" class:transparent={onLanding}>
		<a class="brand" href="{base}/">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
				<path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5Z" opacity=".5" />
				<path d="M3 12c0-1.7 4-3 9-3s9 1.3 9 3-4 3-9 3-9-1.3-9-3Z" />
			</svg>
			<span>The Time Traveller's Almanac</span>
		</a>
		<nav>
			<a href="{base}/specimens/">Specimens</a>
		</nav>
	</header>

	{@render children()}
</div>

<style>
	.shell {
		min-height: 100svh;
	}
	.nav {
		position: sticky;
		top: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem clamp(1rem, 4vw, 3.5rem);
		border-bottom: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--color-ink) 82%, transparent);
		backdrop-filter: blur(10px);
	}
	.nav.transparent {
		background: transparent;
		border-bottom-color: transparent;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.brand:hover {
		color: var(--color-paper);
	}
	nav a {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	nav a:hover {
		color: var(--color-paper);
	}
</style>
