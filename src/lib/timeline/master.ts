// The master timeline: every specimen in the catalogue as one lane on a
// single chronological canvas. Branch structure inside a specimen is
// collapsed (each story reads as one line here; its own dossier holds the
// full branching board), ids are prefixed by slug, and lanes are coloured
// by the specimen's first rule.

import type { Branch, MediaEntry, TimelineEvent } from '$lib/types';

export interface MasterScene {
	events: TimelineEvent[];
	branches: Branch[];
}

export function masterScene(
	entries: MediaEntry[],
	ruleColor: (rule: MediaEntry['rules'][0]) => string
): MasterScene {
	const withTimelines = entries.filter((m) => m.timeline?.length);
	const branches: Branch[] = withTimelines.map((m) => ({
		id: m.slug,
		label: m.title,
		color: ruleColor(m.rules[0])
	}));
	const events: TimelineEvent[] = withTimelines.flatMap((m) =>
		m.timeline.map((e) => ({
			...e,
			id: `${m.slug}:${e.id}`,
			jumpTo: e.jumpTo ? `${m.slug}:${e.jumpTo}` : undefined,
			branch: m.slug,
			// presence chips would list every character in the catalogue; the
			// master view keeps the board about the stories themselves
			traveler: undefined,
			travelers: undefined
		}))
	);
	return { events, branches };
}

/** the specimen a master-board beat belongs to */
export const slugOfBeat = (beatId: string) => beatId.slice(0, beatId.indexOf(':'));
