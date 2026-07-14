// A lens is one way of looking at the same timeline data: a layout function
// plus any extra render passes it needs. The world-lanes lens is the default;
// future lenses (branching world-lines, story curve) plug in here without
// touching the engine, the camera, or the overlay shell.

import { computeLayout, type LayoutOpts, type TimelineLayout, type TimelineOrder } from './layout';
import type { Layer } from './layers';
import type { Branch, TimelineEvent } from '$lib/types';

export interface Lens {
	id: string;
	label: string;
	compute(
		events: TimelineEvent[],
		branches: Branch[],
		order: TimelineOrder,
		opts?: LayoutOpts
	): TimelineLayout;
	/** render passes beyond the standard set (engine.use()d on activation) */
	extraLayers?: Layer[];
}

export const lanesLens: Lens = {
	id: 'lanes',
	label: 'World-lanes',
	compute: computeLayout
};

/** all registered lenses; the overlay shows a switcher once there is more than one */
export const LENSES: Lens[] = [lanesLens];

// the story-curve lens registers itself on import (type-only import back into
// this module, so no runtime cycle)
import { storyCurveLens } from './storycurve';
LENSES.push(storyCurveLens);
