<script lang="ts">
	import { Flag, Lightning, MapPin, ArrowUUpLeft, ArrowsClockwise, DotOutline, Warning } from 'phosphor-svelte';
	import type { Branch, EventKind, TimelineEvent } from '$lib/types';

	let {
		events,
		branches = [],
		accent = 'var(--color-branching)'
	}: { events: TimelineEvent[]; branches?: Branch[]; accent?: string } = $props();

	// ---- branch membership: walk narrative order, switch at each branchAt marker ----
	const byNarr = [...events].sort((a, b) => a.narrative - b.narrative);
	const narrIndex = new Map(byNarr.map((e, i) => [e.id, i]));
	const rootId = (branches.find((b) => !b.parent) ?? branches[0])?.id ?? 'main';
	const branchAtMap = new Map(branches.filter((b) => b.branchAt).map((b) => [b.branchAt!, b.id]));
	const jumpTargets = new Set(events.filter((e) => e.jumpTo).map((e) => e.jumpTo));
	const memberOf = new Map<string, string>();
	{
		let cur = rootId;
		for (const e of byNarr) {
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
	const branchColor = (id: string) => (branchById.get(id)?.status && STATUS[branchById.get(id)!.status!]) || '#b57cff';

	// ---- layout ----
	const W = 1000, ML = 128, MR = 60, TOP = 70, GAP = 72;
	const SPAN = W - ML - MR;
	const laneCount = Math.max(1, branches.length);
	const H = TOP + (laneCount - 1) * GAP + 56;
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
			return { e, x: xOf(i), branch, y: laneY(laneOf(branch)) };
		})
	);
	let posById = $derived(new Map(pos.map((p) => [p.e.id, p])));

	let segs = $derived(
		branches
			.map((b) => {
				const xs = pos.filter((p) => p.branch === b.id).map((p) => p.x);
				return xs.length ? { b, y: laneY(laneOf(b.id)), x1: Math.min(...xs), x2: Math.max(...xs) } : null;
			})
			.filter(Boolean) as { b: Branch; y: number; x1: number; x2: number }[]
	);
	// a branch splinters from its parent at an event NOT reached by a jump (continuous divergence)
	let splinters = $derived(
		branches
			.filter((b) => b.parent && b.branchAt && !jumpTargets.has(b.branchAt))
			.map((b) => {
				const to = posById.get(b.branchAt!);
				const cut = narrIndex.get(b.branchAt!) ?? 0;
				const before = byNarr
					.filter((e) => memberOf.get(e.id) === b.parent && (narrIndex.get(e.id) ?? 0) < cut)
					.pop();
				const from = before ? posById.get(before.id) : undefined;
				return to && from ? { from, to } : null;
			})
			.filter(Boolean) as { from: { x: number; y: number }; to: { x: number; y: number } }[]
	);
	// every jump, in either ordering
	let jumps = $derived(
		pos
			.filter((p) => p.e.jumpTo && posById.get(p.e.jumpTo))
			.map((p) => ({ from: p, to: posById.get(p.e.jumpTo!)! }))
	);

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
	function jumpText(fromC: number, toC: number): string {
		if (fromC < 1000 || toC < 1000) return 'jump';
		const d = Math.round(toC) - Math.round(fromC);
		if (d === 0) return 'jump';
		return d < 0 ? `${Math.abs(d)} yrs back` : `${d} yrs on`;
	}
	const curBranch = (id: string) => memberOf.get(id) ?? rootId;
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
	</div>
	<p class="cap">
		{order === 'told' ? 'The order you experience the story.' : 'The order the events truly occur in time.'}
		<span class="cap-note">New branches splinter whenever the future is changed.</span>
	</p>

	<div class="board">
		<svg viewBox="0 0 {W} {H}" role="img" aria-label="Branching timeline" preserveAspectRatio="xMidYMid meet">
			<defs>
				<marker id="tl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M0 0 L10 5 L0 10 z" fill="#ffd9a0" />
				</marker>
			</defs>

			{#each branches as b, i (b.id)}
				<text x="8" y={laneY(i) - 5} class="lane-lbl" style="fill:{branchColor(b.id)}">{b.label}</text>
				<text x="8" y={laneY(i) + 10} class="lane-sub">{b.status}</text>
			{/each}

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

			<!-- continuous splinters (a change in the timeline, same era) -->
			{#each splinters as c (c.to.x + '-' + c.to.y)}
				{@const midx = (c.from.x + c.to.x) / 2}
				<path
					d="M {c.from.x} {c.from.y} C {midx} {c.from.y}, {midx} {c.to.y}, {c.to.x} {c.to.y}"
					fill="none"
					stroke="#b57cff"
					stroke-width="2"
					opacity="0.9"
				/>
				<text x={midx} y={(c.from.y + c.to.y) / 2 - 5} text-anchor="middle" class="mini">splinters</text>
			{/each}

			<!-- time jumps (dashed, arrowed, with magnitude + a break) -->
			{#each jumps as j (j.from.e.id)}
				{@const cy = Math.min(j.from.y, j.to.y) - 44}
				{@const midx = (j.from.x + j.to.x) / 2}
				<path
					d="M {j.from.x} {j.from.y} C {j.from.x} {cy}, {j.to.x} {cy}, {j.to.x} {j.to.y}"
					fill="none"
					stroke="#ffd9a0"
					stroke-width="2.2"
					stroke-dasharray="5 5"
					marker-end="url(#tl-arrow)"
					opacity="0.95"
				/>
				<text x={midx} y={cy - 5} text-anchor="middle" class="dots">· · ·</text>
				<text x={midx} y={cy + 9} text-anchor="middle" class="jumplbl">{jumpText(j.from.e.chrono, j.to.e.chrono)}</text>
			{/each}

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
		{@const b = branchById.get(curBranch(selected.id))}
		<div class="detail" style="border-left-color:{branchColor(curBranch(selected.id))}">
			<div class="badges">
				<span class="badge" style="--c:{branchColor(curBranch(selected.id))}">
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
		margin: 0.55rem 0 0.9rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-muted);
	}
	.cap-note {
		color: color-mix(in srgb, var(--color-paper) 55%, var(--color-muted));
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
		fill: #c8a8ff;
	}
	.dots {
		fill: var(--color-muted);
		font-size: 12px;
		letter-spacing: 1px;
	}
	.jumplbl {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.04em;
		fill: #ffd9a0;
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
