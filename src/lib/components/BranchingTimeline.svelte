<script lang="ts">
	import {
		Flag,
		Lightning,
		MapPin,
		ArrowUUpLeft,
		ArrowsClockwise,
		DotOutline,
		Warning,
		ArrowRight
	} from 'phosphor-svelte';
	import { base } from '$app/paths';
	import { getSpecimen } from '$lib/data';
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
	const branchColor = (id: string) =>
		(branchById.get(id)?.status && STATUS[branchById.get(id)!.status!]) || '#b57cff';

	// ---- layout ----
	const W = 1000, ML = 104, MR = 40, TOP = 98, GAP = 86;
	const SPAN = W - ML - MR;
	const laneCount = Math.max(1, branches.length);
	const H = TOP + (laneCount - 1) * GAP + 54;
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

	const bigGap = (a: number, b: number) => a > 1000 && b > 1000 && Math.abs(a - b) >= 2;

	// base line drawn per adjacent same-branch pair; dashed across a big time gap
	let segParts = $derived.by(() => {
		const parts: { x1: number; x2: number; y: number; color: string; dashed: boolean }[] = [];
		for (const b of branches) {
			const ps = pos.filter((p) => p.branch === b.id).sort((a, z) => a.x - z.x);
			for (let i = 0; i < ps.length - 1; i++) {
				const a = ps[i], z = ps[i + 1];
				if (a.e.jumpTo === z.e.id || z.e.jumpTo === a.e.id) continue; // a jump covers this hop
				parts.push({
					x1: a.x, x2: z.x, y: laneY(laneOf(b.id)),
					color: branchColor(b.id),
					dashed: b.status === 'endangered' || bigGap(a.e.chrono, z.e.chrono)
				});
			}
		}
		return parts;
	});

	// continuous splinters (a change in the timeline, same era, no travel)
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
				return to && from ? { from, to, color: branchColor(b.id) } : null;
			})
			.filter(Boolean) as { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[]
	);

	// time jumps, packed into non-overlapping levels so the arcs never cross
	let jumpsLeveled = $derived.by(() => {
		const js = pos
			.filter((p) => p.e.jumpTo && posById.get(p.e.jumpTo))
			.map((p) => {
				const to = posById.get(p.e.jumpTo!)!;
				return { from: p, to, x1: Math.min(p.x, to.x), x2: Math.max(p.x, to.x) };
			})
			.sort((a, b) => b.x2 - b.x1 - (a.x2 - a.x1));
		const levels: { x1: number; x2: number }[][] = [];
		return js.map((j) => {
			let lvl = 0;
			while (levels[lvl] && !levels[lvl].every((iv) => j.x2 < iv.x1 - 6 || j.x1 > iv.x2 + 6)) lvl++;
			(levels[lvl] ||= []).push({ x1: j.x1, x2: j.x2 });
			return { ...j, level: lvl };
		});
	});

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
	const shortDate = (e: TimelineEvent) => {
		const l = e.chronoLabel ?? '';
		const m = l.match(/\d{4}/); // keep everything up to and including the year
		return (m ? l.slice(0, m.index! + 4) : l.split(',')[0]).trim();
	};
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
	</p>

	<div class="board">
		<svg viewBox="0 0 {W} {H}" role="img" aria-label="Branching timeline" preserveAspectRatio="none">
			{#each branches as b, i (b.id)}
				<text x="6" y={laneY(i) - 6} class="lane-lbl" style="fill:{branchColor(b.id)}">{b.label}</text>
			{/each}

			{#each segParts as s, i (i)}
				<line
					x1={s.x1}
					y1={s.y}
					x2={s.x2}
					y2={s.y}
					stroke={s.color}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-dasharray={s.dashed ? '6 7' : '0'}
					opacity="0.92"
				/>
			{/each}

			{#each splinters as c, i (i)}
				{@const midx = (c.from.x + c.to.x) / 2}
				<path
					d="M {c.from.x} {c.from.y} C {midx} {c.from.y}, {midx} {c.to.y}, {c.to.x} {c.to.y}"
					fill="none"
					stroke={c.color}
					stroke-width="2"
					opacity="0.9"
				/>
			{/each}

			{#each jumpsLeveled as j (j.from.e.id)}
				{@const apex = Math.min(j.from.y, j.to.y) - (34 + j.level * 26)}
				{@const midx = (j.from.x + j.to.x) / 2}
				<path
					class="jumpline"
					d="M {j.from.x} {j.from.y} C {j.from.x} {apex}, {j.to.x} {apex}, {j.to.x} {j.to.y}"
					fill="none"
					stroke-width="2"
					stroke-dasharray="7 6"
					opacity="0.95"
				/>
				<text x={midx} y={apex - 5} text-anchor="middle" class="jumplbl">{jumpText(j.from.e.chrono, j.to.e.chrono)}</text>
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
					<circle class="n-dot" cx={p.x} cy={p.y} r={selectedId === p.e.id ? 8 : 6} fill={branchColor(p.branch)} />
					{#if selectedId === p.e.id}
						<circle class="sel-ring" cx={p.x} cy={p.y} r="12" fill="none" stroke-width="1.2" />
					{/if}
					{#if p.e.paradox}
						<g transform="translate({p.x + 10}, {p.y - 11})">
							<path d="M0 -6.5 L7 6 L-7 6 Z" fill="#ffcc33" stroke="#05060c" stroke-width="1.2" stroke-linejoin="round" />
							<rect x="-0.9" y="-2.6" width="1.8" height="4.6" rx="0.9" fill="#05060c" />
							<circle cx="0" cy="4" r="1" fill="#05060c" />
						</g>
					{/if}
					{#if p.e.crossRef}
						<text x={p.x - 12} y={p.y - 6} class="xref">&#187;</text>
					{/if}
					<text x={p.x} y={p.y + 24} text-anchor="middle" class="node-date">{shortDate(p.e)}</text>
				</g>
			{/each}
		</svg>
	</div>

	<div class="legend">
		{#each branches as b (b.id)}
			<span class="lg"><i class="dot" style="background:{branchColor(b.id)}"></i>{b.label}<em>{b.note}</em></span>
		{/each}
		<span class="lg"><i class="line"></i>time jump (dashed = distance in time)</span>
		<span class="lg"><i class="haz"></i>paradox / continuity risk</span>
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
			<p class="when">{selected.chronoLabel}{selected.location ? `, ${selected.location}` : ''}</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
			{#if selected.paradox}
				<p class="para"><Warning size={13} weight="fill" /> {selected.paradox}</p>
			{/if}
			{#if selected.crossRef}
				{@const tgt = getSpecimen(selected.crossRef.entry)}
				{#if tgt}
					<a class="crossref" href="{base}/specimens/{tgt.slug}/">
						Continues in {tgt.title} <ArrowRight size={13} weight="bold" />
					</a>
				{/if}
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
		margin: 0.55rem 0 0.8rem;
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.board {
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		padding: 0.35rem 0.5rem;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.lane-lbl {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.02em;
	}
	.jumplbl {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.04em;
		fill: var(--color-jump);
	}
	.jumpline {
		stroke: var(--color-jump);
	}
	.n-dot {
		stroke: var(--color-ink);
		stroke-width: 3;
	}
	.sel-ring {
		stroke: var(--color-paper);
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
	.xref {
		fill: var(--color-branching);
		font-size: 15px;
		font-weight: 700;
	}
	.crossref {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.7rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-branching);
	}
	.crossref:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.4rem;
		margin: 0.9rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: var(--color-muted);
	}
	.lg {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}
	.lg em {
		font-style: normal;
		opacity: 0.7;
		margin-left: 0.35rem;
	}
	.lg .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.lg .line {
		width: 20px;
		height: 0;
		border-top: 2px dashed var(--color-jump);
	}
	.lg .haz {
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 10px solid #ffcc33;
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
