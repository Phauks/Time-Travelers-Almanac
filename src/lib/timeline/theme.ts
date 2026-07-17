// Resolve the app's CSS design tokens into concrete colours for the canvas.
// The engine cannot read var() strings, so callers sample the computed style
// of any element inside the themed tree (and re-sample on theme flips).

import type { ChronoTheme } from './layers';

export function readChronoTheme(el: HTMLElement): ChronoTheme {
	const cs = getComputedStyle(el);
	const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
	return {
		ink: v('--color-ink', '#05060c'),
		panel: v('--color-panel', '#0d1120'),
		paper: v('--color-paper', '#eef1f8'),
		muted: v('--color-muted', '#8b93a8'),
		line: v('--color-line', '#1c2233'),
		jump: v('--color-jump', '#ffd9a0'),
		jumpBack: '#2b93bd',
		accent: v('--color-branching', '#b57cff'),
		monoFont: v('--font-mono', 'ui-monospace, Menlo, monospace')
	};
}

/** the three rule colours, resolved for canvas use */
export function readRuleColors(el: HTMLElement): Record<'fixed' | 'mutable' | 'branching', string> {
	const cs = getComputedStyle(el);
	const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
	return {
		fixed: v('--color-fixed', '#4f9cff'),
		mutable: v('--color-mutable', '#ffa24a'),
		branching: v('--color-branching', '#b57cff')
	};
}
