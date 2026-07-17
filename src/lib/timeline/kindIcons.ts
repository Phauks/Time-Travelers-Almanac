// The icon for each event kind, kept apart from display.ts so the pure text
// helpers stay importable without a Svelte compiler (layout code, unit tests).

import {
	Flag,
	Lightning,
	MapPin,
	ArrowUUpLeft,
	ArrowsClockwise,
	DotOutline
} from 'phosphor-svelte';
import type { EventKind } from '$lib/types';

export const KIND_ICONS: Record<EventKind, unknown> = {
	origin: Flag,
	departure: Lightning,
	arrival: MapPin,
	return: ArrowUUpLeft,
	loop: ArrowsClockwise,
	event: DotOutline
};
