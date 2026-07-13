<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { GithubLogo, Bug, Sun, Moon } from 'phosphor-svelte';

	let { children } = $props();

	let onLanding = $derived(page.url.pathname === `${base}/` || page.url.pathname === base);

	let theme = $state<'light' | 'dark'>('light');
	onMount(() => {
		theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
	});
	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		try {
			localStorage.setItem('almanac-theme', theme);
		} catch (e) {
			// ignore
		}
	}
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
			<a href="{base}/history/">History</a>
			<button
				class="icon-link theme-btn"
				onclick={toggleTheme}
				aria-label="Toggle colour theme"
				title="Toggle colour theme"
			>
				{#if theme === 'dark'}<Sun size={18} weight="fill" />{:else}<Moon size={18} weight="fill" />{/if}
			</button>
			<a
				class="icon-link"
				href="https://github.com/Phauks/Time-Travelers-Almanac/issues/new/choose"
				target="_blank"
				rel="noreferrer noopener"
				aria-label="Report a correction or contribute"
				title="Report a correction or contribute"
			>
				<Bug size={18} />
			</a>
			<a
				class="icon-link"
				href="https://github.com/Phauks/Time-Travelers-Almanac"
				target="_blank"
				rel="noreferrer noopener"
				aria-label="View the source on GitHub"
				title="View the source on GitHub"
			>
				<GithubLogo size={19} weight="fill" />
			</a>
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
	nav {
		display: flex;
		align-items: center;
		gap: 1.1rem;
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
	.icon-link {
		display: inline-flex;
		align-items: center;
		background: none;
		border: 0;
		padding: 0;
		color: var(--color-muted);
		cursor: pointer;
	}
	.icon-link:hover {
		color: var(--color-paper);
	}
	.icon-link:focus-visible {
		outline: 2px solid var(--color-branching);
		outline-offset: 3px;
		border-radius: 3px;
	}
</style>
