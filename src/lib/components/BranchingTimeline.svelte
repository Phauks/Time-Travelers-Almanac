<script lang="ts">
	import { Flag, Lightning, MapPin, ArrowUUpLeft, ArrowsClockwise, DotOutline, Warning } from 'phosphor-svelte';
	import type { Branch, EventKind, TimelineEvent } from '$lib/types';

	let {
		events,
		branches = [],
		accent = 'var(--color-branching)'
	}: { events: TimelineEvent[]; branches?: Branch[]; accent?: string } = $props();

	// ---- branch membership: walk narrative order, switch at each branchAt marker ----
	const rootId = (branches.find((b) => !b.parent) ?? branches[0])?.id ?? 'main';
	const branchAtMap = new Map(branches.filter((b) => b.branchAt).map((b) => [b.branchAt!, b.id]));
	const memberOf = new Map<string, string>();
	{
		let cur = rootId;
		for (const e of [...events].sort((a, b) => a.narrative - b.narrative)) {
			if (branchAtMap.has(e.id)) cur = branchAtMap.get(e.id)!;
			memberOf.set(e.id, cur);
		}
	}
	const laneOf = (id: string) => Math.max(0, branches.findIndex((b) => b.id === id));
	const branchById = new Map(branches.map((b) => [b.id, b]));

	const STATUS: Record<string, string> = {
		original: '#9aa3b5',
		active: '#9aa3b5',
		endangered: '#ff6b74',
		erased: '#6b7280',
		restored: '#ffb454'
	};
	function branchColor(id: string): string {
		const b = branchById.get(id);
		return (b?.status && STATUS[b.status]) || '#b57cff';
	}

	// ---- layout ----
	const W = 1000,
		ML = 118,
		MR = 60,
		TOP = 66,
		GAP = 66;
	const SPAN = W - ML - MR;
	const laneCount = Math.max(1, branches.length);
	const H = TOP + (laneCount - 1) * GAP + 58;
	const laneY = (lane: number) => TOP + lane * GAP;

	let order = $state<'told' | 'happened'>('told');
	let n = $derived(events.length);
	let ordered = $derived(
		order === 'told'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono)
	);
	const xOf = (slot: number) => ML + (n <= 1 ? 0 : (slot / (n - 1)) * SPAN);
	let pos = $derived(
		ordered.map((e, i) => {
			const branch = memberOf.get(e.id) ?? rootId;
			return { e, x: xOf(i), lane: laneOf(branch), y: laneY(laneOf(branch)), branch };
		})
	);
	let posById = $derived(new Map(pos.map((p) => [p.e.id, p])));

	let segs = $derived(
		branches
			.map((b) => {
				const ps = pos.filter((p) => p.branch === b.id);
				if (!ps.length) return null;
				const xs = ps.map((p) => p.x);
				return { b, y: laneY(laneOf(b.id)), x1: Math.min(...xs), x2: Math.max(...xs) };
			})
			.filter((s): s is NonNullable<typeof s> => s !== null)
	);
	// connectors between consecutive events on different branches (jump or splinter)
	let connectors = $derived(
		pos
			.slice(1)
			.map((p, i) => {
				const prev = pos[i];
				if (prev.branch === p.branch) return null;
				return { from: prev, to: p, jump: prev.e.jumpTo === p.e.id };
			})
			.filter((c): c is NonNullable<typeof c> => c !== null)
	);
	// same-branch time jumps
	let jumps = $derived(
		pos
			.filter((p) => {
				const t = p.e.jumpTo ? posById.get(p.e.jumpTo) : undefined;
				return t && t.branch === p.branch;
			})
			.map((p) => ({ from: p, to: posById.get(p.e.jumpTo!)! }))
	);

	const byNarr = [...events].sort((a, b) => a.narrative - b.narrative);
	let selectedId = $state(byNarr[0]?.id ?? '');
	let selected = $derived(events.find((e) => e.id === selectedId) ?? byNarr[0]);

	const KIND: Record<EventKind, { label: string; icon: unknown | null }> = {
		origin: { label: 'Origin', icon: Flag },
		departure: { label: 'Time jump', icon: Lightning },
		jump: { label: 'Time jump', icon: Lightning },
		arrival: { label: 'Arrival', icon: MapPin },
		return: { label: 'Return', icon: ArrowUUpLeft },
		loop: { label: 'Loop', icon: ArrowsClockwise },
		event: { label: 'Event', icon: DotOutline },
		normal: { label: 'Event', icon: DotOutline }
	};
	const kmeta = (e: TimelineEvent) => KIND[e.kind ?? 'event'];
	const shortDate = (e: TimelineEvent) => (e.chronoLabel ?? '').split('·')[0].trim();
</script>

<div class="btl" style="--accent:{accent}">
	<div class="head">
		<div class="toggle" role="group" aria-label="Timeline ordering">
			<button class:on={order === 'told'} aria-pressed={order === 'told'} onclick={() => (order = 'told')}
				>As Told</button
			>
			<button
				class:on={order === 'happened'}
				aria-pressed={order === 'happened'}
				onclick={() => (order = 'happened')}>As Happened</button
			>
		</div>
		<p class="cap">
			{order === 'told'
				? 'The order you experience the story.'
				: 'The order the events truly occur in time.'}
			New branches splinter whenever the future is changed.
		</p>
	</div>

	<div class="board">
		<svg viewBox="0 0 {W} {H}" role="img" aria-label="Branching timeline" preserveAspectRatio="xMidYMid meet">
			<!-- lane labels -->
			{#each branches as b, i (b.id)}
				<text x="8" y={laneY(i) - 4} class="lane-lbl" style="fill:{branchColor(b.id)}">{b.label}</text>
				<text x="8" y={laneY(i) + 11} class="lane-sub">{b.status}</text>
			{/each}

			<!-- branch base lines -->
			{#each segs as s (s.b.id)}
				<line
					x1={s.x1}
					y1={s.y}
					x2={s.x2}
					y2={s.y}
					stroke={branchColor(s.b.id)}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-dasharray={s.b.status === 'endangered' ? '2 6' : '0'}
					opacity="0.9"
				/>
			{/each}

			<!-- connectors between branches -->
			{#each connectors as c (c.from.e.id + c.to.e.id)}
				{@const midx = (c.from.x + c.to.x) / 2}
				<path
					d="M {c.from.x} {c.from.y} C {midx} {c.from.y}, {midx} {c.to.y}, {c.to.x} {c.to.y}"
					fill="none"
					stroke={c.jump ? '#ffd9a0' : branchColor(c.to.branch)}
					stroke-width="2"
					stroke-dasharray={c.jump ? '5 5' : '0'}
					opacity="0.9"
				/>
				<text x={midx} y={(c.from.y + c.to.y) / 2 - 6} text-anchor="middle" class="mini">
					{c.jump ? 'jump' : 'splinters'}
				</text>
			{/each}

			<!-- same-branch jumps -->
			{#each jumps as j (j.from.e.id + j.to.e.id)}
				{@const top = j.from.y - 34}
				<path
					d="M {j.from.x} {j.from.y} C {j.from.x} {top}, {j.to.x} {top}, {j.to.x} {j.to.y}"
					fill="none"
					stroke="#ffd9a0"
					stroke-width="2"
					stroke-dasharray="5 5"
					opacity="0.85"
				/>
				<text x={(j.from.x + j.to.x) / 2} y={top + 2} text-anchor="middle" class="mini">jump</text>
			{/each}

			<!-- nodes -->
			{#each pos as p (p.e.id)}
				<g
					class="node"
					role="button"
					tabindex="0"
					aria-label={p.e.label}
					onclick={() => (selectedId = p.e.id)}
					onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (selectedId = p.e.id)}
				>
					{#if p.e.paradox}
						<circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#ff6b74" stroke-width="1.4" stroke-dasharray="3 3" />
					{/if}
					<circle cx={p.x} cy={p.y} r={selectedId === p.e.id ? 8 : 6} fill={branchColor(p.branch)} stroke="#05060c" stroke-width="3" />
					{#if selectedId === p.e.id}
						<circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#eef1f8" stroke-width="1.2" />
					{/if}
					<text x={p.x} y={p.y + 24} text-anchor="middle" class="node-date">{shortDate(p.e)}</text>
				</g>
			{/each}
		</svg>
	</div>

	{#if selected}
		{@const M = kmeta(selected)}
		{@const b = branchById.get(memberOf.get(selected.id) ?? rootId)}
		<div class="detail" style="border-left-color:{branchColor(memberOf.get(selected.id) ?? rootId)}">
			<div class="badges">
				<span class="badge" style="--c:{branchColor(memberOf.get(selected.id) ?? rootId)}">
					{#if M.icon}{@const Icon = M.icon}<Icon size={12} weight="fill" />{/if}{M.label}
				</span>
				{#if b}<span class="badge branch">{b.label}</span>{/if}
			</div>
			<h4>{selected.label}</h4>
			<p class="when">{selected.chronoLabel}{selected.location ? ` · ${selected.location}` : ''}</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
			{#if selected.paradox}
				<p class="para"><Warning size={13} weight="fill" /> {selected.paradox}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.btl {
		width: 100%;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.6rem;
	}
	.toggle {
		display: inline-flex;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}
	.toggle button {
		border: 0;
		background: transparent;
		color: var(--color-muted);
		padding: 0.5rem 1rem;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.toggle button.on {
		background: var(--accent);
		color: #06070c;
	}
	.toggle button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.cap {
		margin: 0;
		font-size: 0.82rem;
		color: var(--color-muted);
		max-width: 60ch;
	}
	.board {
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		padding: 0.5rem 0.5rem 0.25rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.lane-lbl {
		font-family: var(--font-serif);
		font-size: 13px;
	}
	.lane-sub {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--color-muted);
	}
	.mini {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		fill: var(--color-muted);
	}
	.node {
		cursor: pointer;
	}
	.node:focus-visible {
		outline: none;
	}
	.node-date {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--color-muted);
	}

	.detail {
		margin-top: 0.9rem;
		border: 1px solid var(--color-line);
		border-left: 3px solid var(--accent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-panel) 55%, transparent);
		padding: 0.85rem 1rem 1rem;
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
