<script lang="ts">
	import {
		Flag,
		Lightning,
		MapPin,
		ArrowUUpLeft,
		ArrowsClockwise,
		DotOutline,
		Warning,
		ArrowRight,
		ArrowLeft,
		CaretLeft,
		CaretRight
	} from 'phosphor-svelte';
	import { base } from '$app/paths';
	import type { Branch, EventKind, TimelineEvent } from '$lib/types';

	let {
		events,
		branches = [],
		accent = 'var(--color-branching)',
		continuesFrom = null,
		continuesTo = null,
		fallbackImage = undefined,
		onOpenImage
	}: {
		events: TimelineEvent[];
		branches?: Branch[];
		accent?: string;
		/** the media this timeline continues from, shown at the start */
		continuesFrom?: { slug: string; title: string } | null;
		/** the media this timeline continues into, shown at the end */
		continuesTo?: { slug: string; title: string } | null;
		/** poster to show in the event panel when a beat has no still of its own */
		fallbackImage?: string;
		/** open a given image in the page's gallery lightbox */
		onOpenImage?: (src: string) => void;
	} = $props();

	// ---- branch membership: walk narrative order, switch at each branchAt marker ----
	const byNarr = [...events].sort((a, b) => a.narrative - b.narrative);
	const narrIndex = new Map(byNarr.map((e, i) => [e.id, i]));
	const rootId = (branches.find((b) => !b.parent) ?? branches[0])?.id ?? 'main';
	const branchAtMap = new Map(branches.filter((b) => b.branchAt).map((b) => [b.branchAt!, b.id]));
	const jumpTargets = new Set(events.filter((e) => e.jumpTo).map((e) => e.jumpTo));
	// Membership: an event may name its branch explicitly (needed when the story
	// hops between timelines out of order, as in BTTF Part II). Otherwise we walk
	// narrative order and switch branch at each branchAt marker.
	const memberOf = new Map<string, string>();
	{
		let cur = rootId;
		for (const e of byNarr) {
			if (branchAtMap.has(e.id)) cur = branchAtMap.get(e.id)!;
			memberOf.set(e.id, e.branch ?? cur);
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
	// The board no longer squeezes every beat into the viewport: each event gets
	// a fixed step of room, so a long story makes a wide board that scrolls.
	const ML = 104, MR = 56, TOP = 98, GAP = 86, STEP = 150;
	const laneCount = Math.max(1, branches.length);
	const H = TOP + (laneCount - 1) * GAP + 54;
	const laneY = (lane: number) => TOP + lane * GAP;

	let order = $state<'told' | 'happened'>('told');
	let n = $derived(events.length);
	let W = $derived(Math.max(680, ML + MR + Math.max(0, n - 1) * STEP));
	let ordered = $derived(
		order === 'told'
			? [...events].sort((a, b) => a.narrative - b.narrative)
			: [...events].sort((a, b) => a.chrono - b.chrono)
	);
	const xOf = (slot: number) => ML + slot * STEP;
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
					dashed: bigGap(a.e.chrono, z.e.chrono)
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

	// time jumps within this timeline, packed into levels so arcs never cross.
	// `back` = the traveller lands in an earlier time than they left.
	let jumpsLeveled = $derived.by(() => {
		const js = pos
			.filter((p) => p.e.jumpTo && posById.get(p.e.jumpTo))
			.map((p) => {
				const to = posById.get(p.e.jumpTo!)!;
				return {
					from: p,
					to,
					back: to.e.chrono < p.e.chrono,
					x1: Math.min(p.x, to.x),
					x2: Math.max(p.x, to.x)
				};
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

	// jumps whose other end is off this timeline (another era or another work):
	// a departure to a labelled destination, or an arrival from one
	const yearIn = (s: string) => {
		const m = s.match(/\d{3,4}/);
		return m ? Number(m[0]) : null;
	};
	let offJumps = $derived(
		pos
			.filter((p) => p.e.jumpToLabel || p.e.jumpFromLabel)
			.map((p) => {
				const out = !!p.e.jumpToLabel;
				const label = (p.e.jumpToLabel ?? p.e.jumpFromLabel)!;
				const dest = yearIn(label);
				const back = dest != null && p.e.chrono > 1000 ? dest < p.e.chrono : false;
				return { p, label, out, back };
			})
	);

	let selectedId = $state(byNarr[0]?.id ?? '');
	let selected = $derived(events.find((e) => e.id === selectedId) ?? byNarr[0]);

	// step through events in whatever order is currently shown
	let selIndex = $derived(ordered.findIndex((e) => e.id === selectedId));
	function step(delta: number) {
		const i = selIndex < 0 ? 0 : selIndex + delta;
		if (i >= 0 && i < ordered.length) selectedId = ordered[i].id;
	}

	// nodes where a time machine fires (a departure) get a portal ring
	let departureIds = $derived(new Set(events.filter((e) => e.jumpTo || e.jumpToLabel).map((e) => e.id)));

	const KIND: Record<EventKind, { label: string; icon: unknown | null }> = {
		origin: { label: 'Origin', icon: Flag },
		departure: { label: 'Time jump', icon: Lightning },
		arrival: { label: 'Arrival', icon: MapPin },
		return: { label: 'Return', icon: ArrowUUpLeft },
		loop: { label: 'Loop', icon: ArrowsClockwise },
		event: { label: 'Event', icon: DotOutline }
	};
	const kmeta = (e: TimelineEvent) => KIND[e.kind ?? 'event'];
	const shortDate = (e: TimelineEvent) => {
		const l = e.chronoStartLabel ?? '';
		const m = l.match(/\d{4}/); // keep everything up to and including the year
		return (m ? l.slice(0, m.index! + 4) : l.split(',')[0]).trim();
	};
	// full display label, spanning start to end when the beat covers a range
	const whenLabel = (e: TimelineEvent) => {
		const base = e.chronoStartLabel ?? '';
		const loc = e.location ? `, ${e.location}` : '';
		return e.chronoEndLabel ? `${base} to ${e.chronoEndLabel}${loc}` : `${base}${loc}`;
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
	<div class="tlx">
	{#if continuesFrom || continuesTo}
		<div class="connectors">
			{#if continuesFrom}
				<a class="continues" href="{base}/specimens/{continuesFrom.slug}/">
					<ArrowLeft size={13} weight="bold" /> Continues from {continuesFrom.title}
				</a>
			{:else}
				<span></span>
			{/if}
			{#if continuesTo}
				<a class="continues" href="{base}/specimens/{continuesTo.slug}/">
					Continues in {continuesTo.title} <ArrowRight size={13} weight="bold" />
				</a>
			{/if}
		</div>
	{/if}
	<div class="tlx-body">
	<div class="board-col">
	<div class="board">
		<svg viewBox="0 0 {W} {H}" style="width:{W}px" role="img" aria-label="Branching timeline">
			<defs>
				<marker id="jarrow" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7" orient="auto">
					<path d="M1 1 L10 6 L1 11" fill="none" stroke="context-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</marker>
			</defs>
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
				{@const apex = Math.min(j.from.y, j.to.y) - (36 + j.level * 26)}
				{@const midx = (j.from.x + j.to.x) / 2}
				<path
					class="jumpline {j.back ? 'back' : 'fwd'}"
					d="M {j.from.x} {j.from.y} C {j.from.x} {apex}, {j.to.x} {apex}, {j.to.x} {j.to.y}"
					fill="none"
					stroke-width="2"
					stroke-dasharray="7 6"
					marker-end="url(#jarrow)"
					opacity="0.95"
				/>
				<text x={midx} y={apex - 5} text-anchor="middle" class="jumplbl {j.back ? 'back' : 'fwd'}">
					{j.back ? '◀' : '▶'} {jumpText(j.from.e.chrono, j.to.e.chrono)}
				</text>
			{/each}

			{#each offJumps as o (o.p.e.id)}
				{@const capX = o.p.x + (o.out ? 30 : -30)}
				{@const capY = o.p.y - 52}
				<path
					class="jumpline {o.back ? 'back' : 'fwd'}"
					d={o.out
						? `M ${o.p.x} ${o.p.y} C ${o.p.x} ${capY}, ${capX} ${capY + 8}, ${capX} ${capY}`
						: `M ${capX} ${capY} C ${capX} ${capY + 8}, ${o.p.x} ${capY}, ${o.p.x} ${o.p.y}`}
					fill="none"
					stroke-width="2"
					stroke-dasharray="7 6"
					marker-end="url(#jarrow)"
					opacity="0.95"
				/>
				<text x={capX} y={capY - 5} text-anchor="middle" class="jumplbl {o.back ? 'back' : 'fwd'}">
					{o.out ? 'to' : 'from'} {o.label}
				</text>
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
					{#if departureIds.has(p.e.id)}
						<circle class="dep-ring" cx={p.x} cy={p.y} r="10" fill="none" stroke-width="1.4" stroke-dasharray="2.5 2.5" />
					{/if}
					{#if p.e.kind === 'origin' || p.e.origin}
						<g class="origin-mark" transform="translate({p.x - 11}, {p.y - 3})">
							<line x1="0" y1="1" x2="0" y2="-12" stroke-width="1.5" stroke-linecap="round" />
							<path d="M0 -12 L7 -10 L0 -7.5 Z" />
						</g>
					{/if}
					<circle class="n-dot" cx={p.x} cy={p.y} r={selectedId === p.e.id ? 8 : 6} fill={branchColor(p.branch)} />
					{#if selectedId === p.e.id}
						<circle class="sel-ring" cx={p.x} cy={p.y} r="13" fill="none" stroke-width="1.2" />
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
	</div>

	<div class="side">
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
	{#if selected}
		{@const M = kmeta(selected)}
		{@const b = branchById.get(curBranch(selected.id))}
		<div class="detail" style="border-left-color:{branchColor(curBranch(selected.id))}">
			<div class="detnav">
				<button class="arrow" onclick={() => step(-1)} disabled={selIndex <= 0} aria-label="Previous event">
					<CaretLeft size={15} weight="bold" />
				</button>
				<span class="count">{selIndex + 1} / {ordered.length}</span>
				<button
					class="arrow"
					onclick={() => step(1)}
					disabled={selIndex >= ordered.length - 1}
					aria-label="Next event"
				>
					<CaretRight size={15} weight="bold" />
				</button>
			</div>
			<div class="media">
				{#if selected.image}
					<button
						class="shot"
						onclick={() => onOpenImage?.(selected.image!)}
						aria-label="Open {selected.label} in the gallery"
					>
						<img src={selected.image} alt={selected.label} />
					</button>
				{:else if fallbackImage}
					<img class="shot-fallback" src={fallbackImage} alt="" />
					<span class="media-note">no still for this moment yet</span>
				{:else}
					<span class="media-note">no image</span>
				{/if}
			</div>
			<div class="badges">
				<span class="badge" style="--c:{branchColor(curBranch(selected.id))}">
					{#if M.icon}{@const Icon = M.icon}<Icon size={12} weight="fill" />{/if}{M.label}
				</span>
				{#if b}<span class="badge branch">{b.label}</span>{/if}
				{#if selected.source}<span class="badge src">{selected.source}</span>{/if}
			</div>
			<h4>{selected.label}</h4>
			<p class="when">{whenLabel(selected)}</p>
			{#if selected.description}<p class="desc">{selected.description}</p>{/if}
			{#if selected.paradox}
				<p class="para"><Warning size={13} weight="fill" /> {selected.paradox}</p>
			{/if}
		</div>
	{/if}
	</div>
	</div>

	<div class="legend">
		{#each branches as b (b.id)}
			<span class="lg"><i class="dot" style="background:{branchColor(b.id)}"></i>{b.label}<em>{b.note}</em></span>
		{/each}
		<span class="lg"><i class="flag"></i>origin (story starts here)</span>
		<span class="lg"><i class="line fwd"></i>jump forward in time</span>
		<span class="lg"><i class="line back"></i>jump back in time</span>
		<span class="lg"><i class="ring"></i>time machine fires here</span>
		<span class="lg"><i class="haz"></i>paradox / continuity risk</span>
	</div>
	</div>
</div>

<style>
	.btl {
		width: 100%;
	}
	.toggle {
		display: flex;
		margin-bottom: 0.7rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 0.68rem;
	}
	.toggle button {
		flex: 1;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		padding: 0.45rem 0.8rem;
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
	/* one coherent card wrapping board, panel, and legend */
	.tlx {
		border: 1px solid var(--color-line);
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-panel) 45%, transparent);
		overflow: hidden;
	}
	.tlx-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		align-items: stretch;
	}
	.board-col {
		min-width: 0;
	}
	.board {
		padding: 0.35rem 0.5rem;
		overflow-x: auto;
	}
	/* board scales with the number of events; the wide svg scrolls in place */
	svg {
		display: block;
		height: auto;
	}
	.side {
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--color-line);
		background: color-mix(in srgb, var(--color-panel) 30%, transparent);
		padding: 0.8rem;
	}
	.side .detail {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
	@media (max-width: 860px) {
		.tlx-body {
			grid-template-columns: 1fr;
		}
		.side {
			border-left: 0;
			border-top: 1px solid var(--color-line);
		}
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
	/* forward in time = amber, backward in time = cool blue */
	.jumpline.fwd {
		stroke: var(--color-jump);
	}
	.jumpline.back {
		stroke: #2b93bd;
	}
	.jumplbl.fwd {
		fill: var(--color-jump);
	}
	.jumplbl.back {
		fill: #2b93bd;
	}
	.jumpline {
		stroke: var(--color-jump);
	}
	.dep-ring {
		stroke: var(--color-muted);
		opacity: 0.75;
	}
	.origin-mark line {
		stroke: var(--accent);
	}
	.origin-mark path {
		fill: var(--accent);
		stroke: none;
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
	.node:focus,
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

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.4rem;
		margin: 0;
		padding: 0.7rem 0.9rem;
		border-top: 1px solid var(--color-line);
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
	.lg .line.fwd {
		border-top-color: var(--color-jump);
	}
	.lg .line.back {
		border-top-color: #2b93bd;
	}
	.lg .ring {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.4px dashed var(--color-muted);
	}
	.lg .flag {
		width: 0;
		height: 12px;
		border-left: 1.5px solid var(--accent);
		position: relative;
	}
	.lg .flag::after {
		content: '';
		position: absolute;
		left: 1px;
		top: 0;
		border-top: 3px solid transparent;
		border-bottom: 3px solid transparent;
		border-left: 6px solid var(--accent);
	}
	.lg .haz {
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 10px solid #ffcc33;
	}

	.detail {
		border-left: 3px solid var(--accent);
		border-radius: 4px;
		padding: 0 0 0 0.8rem;
	}
	/* always-reserved image slot: the beat's still, else the poster, else blank */
	.media {
		position: relative;
		height: 150px;
		flex: none;
		margin-bottom: 0.7rem;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-panel) 70%, #000);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.media .shot {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: zoom-in;
	}
	.media .shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.media .shot-fallback {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.28;
		filter: grayscale(0.3);
	}
	.media-note {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
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

	.connectors {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--color-line);
	}
	.continues {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted);
		border: 1px solid var(--color-line);
		border-radius: 999px;
		padding: 0.3rem 0.7rem;
	}
	.continues:hover {
		color: var(--color-paper);
		border-color: color-mix(in srgb, var(--color-paper) 35%, var(--color-line));
	}

	.detnav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.7rem;
	}
	.detnav .count {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}
	.arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		background: transparent;
		color: var(--color-paper);
		cursor: pointer;
		transition:
			border-color 0.15s,
			opacity 0.15s;
	}
	.arrow:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--color-paper) 40%, var(--color-line));
	}
	.arrow:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.arrow:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.media .shot:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	.badge.src {
		--c: var(--accent);
	}
</style>
