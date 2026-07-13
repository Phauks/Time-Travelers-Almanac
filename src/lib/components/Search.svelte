<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { MagnifyingGlass } from 'phosphor-svelte';
	import { specimens, MEDIUM_META } from '$lib/data';

	let q = $state('');
	let open = $state(false);
	let active = $state(0);

	let results = $derived.by(() => {
		const term = q.trim().toLowerCase();
		if (!term) return [];
		return specimens
			.filter((s) => {
				const hay = [s.title, ...(s.aliases ?? []), s.franchise ?? '', String(s.year)]
					.join(' ')
					.toLowerCase();
				return hay.includes(term);
			})
			.slice(0, 8);
	});

	function choose(slug: string) {
		q = '';
		open = false;
		goto(`${base}/specimens/${slug}/`);
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			active = Math.min(active + 1, results.length - 1);
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			active = Math.max(active - 1, 0);
			e.preventDefault();
		} else if (e.key === 'Enter' && results[active]) {
			choose(results[active].slug);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="search" class:open={open && results.length > 0}>
	<MagnifyingGlass size={15} weight="bold" />
	<input
		type="search"
		placeholder="Search specimens"
		bind:value={q}
		oninput={() => {
			open = true;
			active = 0;
		}}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 140)}
		onkeydown={onKey}
		aria-label="Search specimens"
	/>
	{#if open && results.length > 0}
		<ul class="drop" role="listbox">
			{#each results as r, i (r.slug)}
				<li>
					<button
						class:active={i === active}
						onmousedown={() => choose(r.slug)}
						role="option"
						aria-selected={i === active}
					>
						<span class="t">{r.title}</span>
						<span class="m">{r.year}, {MEDIUM_META[r.medium]}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		padding: 0.4rem 0.85rem;
		color: var(--color-muted);
		background: color-mix(in srgb, var(--color-panel) 40%, transparent);
		min-width: 0;
		max-width: 320px;
		flex: 1 1 220px;
	}
	.search.open {
		border-color: color-mix(in srgb, var(--color-paper) 30%, var(--color-line));
	}
	input {
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--color-paper);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		width: 100%;
		min-width: 0;
	}
	input::placeholder {
		color: var(--color-muted);
	}
	.drop {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 0.3rem;
		list-style: none;
		background: var(--color-panel);
		border: 1px solid var(--color-line);
		border-radius: 8px;
		box-shadow: 0 16px 44px -18px rgba(0, 0, 0, 0.55);
		z-index: 60;
		max-height: 60vh;
		overflow-y: auto;
	}
	.drop button {
		display: flex;
		flex-direction: column;
		gap: 1px;
		width: 100%;
		text-align: left;
		background: transparent;
		border: 0;
		border-radius: 5px;
		padding: 0.5rem 0.6rem;
		cursor: pointer;
		color: var(--color-paper);
	}
	.drop button.active,
	.drop button:hover {
		background: color-mix(in srgb, var(--color-branching) 16%, transparent);
	}
	.drop .t {
		font-family: var(--font-serif);
		font-size: 0.95rem;
	}
	.drop .m {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
</style>
