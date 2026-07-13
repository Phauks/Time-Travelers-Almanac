import type { MediaEntry } from '$lib/types';

// Seed specimens  -  a small slice of the 100, authored with real timeline data
// so the reusable Timeline component and the prime-line landing have something
// true to render. Add entries here; routes and the landing pick them up.

export const specimens: MediaEntry[] = [
	{
		slug: 'a-connecticut-yankee',
		title: "A Connecticut Yankee in King Arthur's Court",
		year: 1889,
		medium: 'book',
		rules: ['mutable'],
		mode: ['anomaly'],
		loop: null,
		destEra: 0.045,
		destLabel: '528 AD',
		logline: 'A blow to the head is, apparently, a valid mode of temporal transit.',
		mechanism:
			'Hank Morgan is knocked unconscious and wakes in Arthurian Britain, which he proceeds to industrialise with 19th-century know-how.',
		paradoxes: ['anachronism'],
		paradoxRisk: 'medium',
		fieldNote:
			'Should you find yourself advising a king, resist the urge to introduce gunpowder. It rarely ends the way you hope.',
		related: ['back-to-the-future'],
		imageSource: 'Book covers → Open Library',
		timeline: [
			{ id: 'cy1', label: 'Hank in 1889', narrative: 0, chrono: 1889, chronoLabel: '1889', kind: 'origin' },
			{ id: 'cy2', label: 'Knocked to 528 AD', narrative: 1, chrono: 528, chronoLabel: '528', kind: 'jump', jumpTo: 'cy2' },
			{ id: 'cy3', label: 'Industrialises Camelot', narrative: 2, chrono: 528.5, chronoLabel: '528' },
			{ id: 'cy4', label: 'Wakes in 1889', narrative: 3, chrono: 1889.1, chronoLabel: '1889' }
		]
	},
	{
		slug: 'the-terminator',
		title: 'The Terminator',
		year: 1984,
		medium: 'film',
		saga: 'terminator',
		rules: ['fixed'],
		mode: ['contraption'],
		loop: 'causal',
		destEra: 0.43,
		destLabel: '1984',
		logline: 'The war sends its soldier back to father the man who will win the war.',
		mechanism:
			'A one-way temporal-displacement field flings a person (nothing dead will travel) from 2029 to 1984. Whatever they do there already happened.',
		paradoxes: ['bootstrap', 'causal loop'],
		paradoxRisk: 'high',
		fieldNote:
			'You cannot prevent the future by visiting the past  -  you are how the future was arranged. Bring a jacket; you arrive with nothing.',
		related: ['twelve-monkeys'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 't1', label: 'Machines rise', narrative: 0, chrono: 2029, chronoLabel: '2029', kind: 'origin' },
			{ id: 't2', label: 'Kyle sent back', narrative: 1, chrono: 1984, chronoLabel: '1984', kind: 'jump', jumpTo: 't3' },
			{ id: 't3', label: "John's conception", narrative: 2, chrono: 1984.3, chronoLabel: '1984', kind: 'loop' },
			{ id: 't4', label: 'Future war continues', narrative: 3, chrono: 2029.2, chronoLabel: '2029' }
		]
	},
	{
		slug: 'back-to-the-future',
		title: 'Back to the Future',
		year: 1985,
		medium: 'film',
		saga: 'back-to-the-future',
		continuity: 'film',
		partOrder: 1,
		rules: ['mutable'],
		mode: ['contraption'],
		loop: null,
		destEra: 0.35,
		destLabel: '1955',
		logline: 'The timeline is clay; the family photograph is the warning light.',
		synopsis:
			'A teenager, Marty McFly, is accidentally sent from 1985 to 1955 in a time machine built by his friend, the scientist Doc Brown. Stranded in the past, he disrupts the meeting of his own parents and must set their romance right, and find a way home, before he is erased from history.',
		aliases: ['Back to the Future Part I', 'Back to the Future Part 1'],
		mechanism:
			'A plutonium-fuelled DeLorean reaching 88 mph displaces its occupants to a set date. Change the past and the present  -  and your own existence  -  redraws accordingly.',
		paradoxes: ['grandfather', 'ontological'],
		paradoxRisk: 'high',
		fieldNote:
			'Keep the almanac dry and the flux capacitor charged. If your siblings begin vanishing from photographs, prioritise your parents’ courtship.',
		related: ['a-connecticut-yankee'],
		imageSource: 'Film stills → TMDB',
		sources: [
			{ label: 'Wikipedia  -  Back to the Future', url: 'https://en.wikipedia.org/wiki/Back_to_the_Future' },
			{ label: 'Futurepedia  -  Twin Pines Mall', url: 'https://backtothefuture.fandom.com/wiki/Twin_Pines_Mall' },
			{
				label: 'Futurepedia  -  Minute by minute in Back to the Future',
				url: 'https://backtothefuture.fandom.com/wiki/Minute_by_minute_in_Back_to_the_Future'
			},
			{ label: 'Screenplay, 4th draft (Gale & Zemeckis)', url: 'https://www.dailyscript.com/scripts/bttf4th.pdf' }
		],
		links: [
			{ kind: 'imdb', url: 'https://www.imdb.com/title/tt0088763/' },
			{ kind: 'rottentomatoes', url: 'https://www.rottentomatoes.com/m/back_to_the_future' },
			{ kind: 'metacritic', url: 'https://www.metacritic.com/movie/back-to-the-future/' },
			{ kind: 'watch', url: 'https://www.justwatch.com/us/movie/back-to-the-future-part-i' }
		],
		ratings: { imdb: 8.5, rtCritic: 93, rtAudience: 94, metacritic: 87 },
		branches: [
			{
				id: 'prime',
				label: 'Timeline 1',
				status: 'original',
				note: 'the original 1985 and the past behind it'
			},
			{
				id: 'divergent',
				label: 'Timeline 2',
				parent: 'prime',
				branchAt: 'arrive55',
				status: 'endangered',
				note: "Marty's presence in 1955; his own existence is threatened"
			},
			{
				id: 'restored',
				label: 'Timeline 3',
				parent: 'divergent',
				branchAt: 'dance',
				status: 'restored',
				note: 'the repaired 1955 and the altered 1985 he returns to'
			}
		],
		timeline: [
			{
				id: 'orig-meet',
				label: 'The original 1955',
				narrative: -2,
				chrono: 1955.35,
				chronoLabel: 'Nov 1955 (original)',
				location: 'Downtown Hill Valley',
				kind: 'event',
				description:
					"Lorraine's father hits George with the car; she nurses him back to health and the two fall in love."
			},
			{
				id: 'demo',
				label: 'The DeLorean revealed',
				narrative: 0,
				chrono: 1985.82,
				chronoLabel: 'Oct 26, 1985, 1:15 AM',
				location: 'Twin Pines Mall, Hill Valley',
				kind: 'origin',
				variant: 'prime-1985',
				description:
					'Doc Brown demonstrates the time machine, sending Einstein the dog one minute into the future  -  the first time travel on the timeline.'
			},
			{
				id: 'flee',
				label: 'Libyans attack  -  Marty flees',
				narrative: 1,
				chrono: 1985.8205,
				chronoLabel: 'Oct 26, 1985, 1:20 AM',
				location: 'Twin Pines Mall, Hill Valley',
				kind: 'departure',
				jumpTo: 'arrive55',
				variant: 'prime-1985',
				description:
					'Doc is gunned down. Marty escapes in the DeLorean, hits 88 mph, and is thrown back to the date on the time circuits.'
			},
			{
				id: 'arrive55',
				label: 'Arrival in 1955',
				narrative: 2,
				chrono: 1955.845,
				chronoLabel: 'Nov 5, 1955, 6:00 AM',
				location: 'Peabody Ranch, Hill Valley',
				kind: 'arrival',
				description:
					'Marty crashes into a barn and flattens one of the Peabodys’ twin pines  -  which is why he will return to a "Lone Pine Mall".'
			},
			{
				id: 'interfere',
				label: 'The meeting is disrupted',
				narrative: 3,
				chrono: 1955.847,
				chronoLabel: 'Nov 5, 1955',
				location: 'Downtown Hill Valley',
				kind: 'event',
				description:
					'Marty pushes George clear of the car meant to introduce him to Lorraine. She becomes infatuated with Marty instead  -  and he begins to fade from the family photograph.',
				paradox:
					'Ontological risk: with his parents no longer destined to meet, Marty starts to erase himself. For a while he stands on a timeline where he was never born.'
			},
			{
				id: 'finddoc',
				label: 'Finds the young Doc',
				narrative: 4,
				chrono: 1955.848,
				chronoLabel: 'Nov 5, 1955',
				location: "Doc's mansion, Hill Valley",
				kind: 'event',
				description:
					'The 1955 Doc has no power source strong enough to get Marty home  -  except the lightning known to strike the clock tower a week later.'
			},
			{
				id: 'plan',
				label: 'Engineering the romance',
				narrative: 5,
				chrono: 1955.855,
				chronoLabel: 'Nov 6-11, 1955',
				location: 'Hill Valley High',
				kind: 'event',
				description:
					'Marty schemes to get George and Lorraine to fall in love at the Enchantment Under the Sea dance and repair the damage to his own existence.'
			},
			{
				id: 'dance',
				label: 'Enchantment Under the Sea',
				narrative: 6,
				chrono: 1955.864,
				chronoLabel: 'Nov 12, 1955, night',
				location: 'Hill Valley High gym',
				kind: 'event',
				variant: 'altered-1985',
				description:
					'George stands up to Biff and kisses Lorraine. His parents fall in love, Marty’s existence is secured, and the photograph is restored.'
			},
			{
				id: 'depart55',
				label: 'The clock-tower lightning',
				narrative: 7,
				chrono: 1955.866,
				chronoLabel: 'Nov 12, 1955, 10:04 PM',
				location: 'Courthouse Square, Hill Valley',
				kind: 'departure',
				jumpTo: 'return85',
				description:
					'Doc runs a wire from the tower to the street; the lightning strikes as the DeLorean hits 88 mph, sending Marty home.'
			},
			{
				id: 'return85',
				label: 'Back to 1985',
				narrative: 8,
				chrono: 1985.821,
				chronoLabel: 'Oct 26, 1985, 1:24 AM',
				location: 'Lone Pine Mall, Hill Valley',
				kind: 'return',
				description:
					'Marty arrives ten minutes before he first left and watches Doc be shot again  -  but Doc survives, having read Marty’s warning letter and worn a vest.'
			},
			{
				id: 'altered',
				label: 'A better 1985',
				narrative: 9,
				chrono: 1985.822,
				chronoLabel: 'Oct 26, 1985, morning',
				location: 'The McFly home',
				kind: 'event',
				variant: 'altered-1985',
				description:
					'Marty wakes to an overwritten present: George is a confident author, Lorraine is happy, and Biff is now their meek valet.'
			},
			{
				id: 'hook',
				label: '“…we don’t need roads.”',
				narrative: 10,
				chrono: 1985.823,
				chronoLabel: 'Oct 26, 1985, later',
				location: 'The McFly home',
				kind: 'departure',
				variant: 'altered-1985',
				description:
					'Doc returns from 2015 and whisks Marty and Jennifer into the future  -  the thread Part II picks up.'
			}
		]
	},
	{
		slug: 'twelve-monkeys',
		title: '12 Monkeys',
		year: 1995,
		medium: 'film',
		rules: ['fixed'],
		mode: ['contraption'],
		loop: 'causal',
		destEra: 0.4,
		destLabel: '1990s',
		logline: 'You cannot stop it. You were always the one who watched it happen.',
		mechanism:
			'Convicts are sent from a plague-ruined future to gather information  -  never to change events, because the events are already fixed.',
		paradoxes: ['predestination'],
		paradoxRisk: 'high',
		fieldNote:
			'If a childhood memory seems to be about you, sit down. It probably is, and it does not improve.',
		related: ['the-terminator'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 'm1', label: 'Plague future', narrative: 0, chrono: 2035, chronoLabel: '2035', kind: 'origin' },
			{ id: 'm2', label: 'Sent to the 1990s', narrative: 1, chrono: 1996, chronoLabel: '1996', kind: 'jump' },
			{ id: 'm3', label: 'The airport', narrative: 2, chrono: 1996.5, chronoLabel: '1996', kind: 'loop' },
			{ id: 'm4', label: 'The memory completes', narrative: 3, chrono: 1996.6, chronoLabel: '1996' }
		]
	},
	{
		slug: 'steins-gate',
		title: 'Steins;Gate',
		year: 2011,
		medium: 'game',
		rules: ['branching'],
		mode: ['contraption'],
		loop: 'causal',
		destEra: 0.49,
		destLabel: 'the present',
		logline: 'Text a microwave, split a worldline. A perfectly ordinary Tuesday.',
		mechanism:
			'"D-Mails" sent to the past nudge events onto a different worldline, measured by a divergence meter. Certain outcomes cluster into stubborn attractor fields.',
		paradoxes: ['butterfly', 'worldline convergence'],
		paradoxRisk: 'medium',
		fieldNote:
			'El Psy Kongroo. Every message you send to yesterday costs you the world you are standing in.',
		related: ['primer'],
		imageSource: 'Game art → IGDB / RAWG',
		timeline: [
			{ id: 's1', label: 'Send a D-Mail', narrative: 0, chrono: 0, chronoLabel: 'α', kind: 'origin', jumpTo: 's2' },
			{ id: 's2', label: 'Worldline shifts', narrative: 1, chrono: 0.1, chronoLabel: 'β', kind: 'jump' },
			{ id: 's3', label: 'Divergence 1.048596', narrative: 2, chrono: 0.2, chronoLabel: 'β', kind: 'loop' },
			{ id: 's4', label: 'Steins Gate reached', narrative: 3, chrono: 0.3, chronoLabel: 'Ω' }
		]
	},
	{
		slug: 'primer',
		title: 'Primer',
		year: 2004,
		medium: 'film',
		rules: ['branching'],
		mode: ['contraption'],
		loop: null,
		destEra: 0.6,
		destLabel: 'hours ago',
		logline: 'Two friends, one box, and more timelines than a whiteboard can hold.',
		mechanism:
			'A machine run for six hours lets you ride it backward six hours, spawning a doubled, divergent version of the same afternoon  -  repeatedly, recursively.',
		paradoxes: ['doubling', 'recursion'],
		paradoxRisk: 'high',
		fieldNote:
			'Are you talking or listening? By the time you are sure, there may be a third of you doing the other thing.',
		related: ['steins-gate'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 'p1', label: 'The box works', narrative: 0, chrono: 1, chronoLabel: 'day 1', kind: 'origin' },
			{ id: 'p2', label: 'Ride back six hours', narrative: 1, chrono: 0.75, chronoLabel: '−6h', kind: 'jump', jumpTo: 'p2' },
			{ id: 'p3', label: 'Doubled selves', narrative: 2, chrono: 0.8, chronoLabel: '−6h', kind: 'loop' },
			{ id: 'p4', label: 'Timelines multiply', narrative: 3, chrono: 1.5, chronoLabel: 'day 1+' }
		]
	},
	{
		slug: 'edge-of-tomorrow',
		title: 'Edge of Tomorrow',
		year: 2014,
		medium: 'film',
		rules: ['fixed'],
		mode: ['relic'],
		loop: 'deathloop',
		destEra: 0.71,
		destLabel: 'near future',
		logline: 'Live. Die. Repeat. Then repeat the repeating.',
		mechanism:
			'Alien blood resets the day on the soldier’s death  -  he keeps his memories, the world keeps nothing, and he grinds the same battle like a save-scummed level.',
		paradoxes: ['information from the future'],
		paradoxRisk: 'medium',
		fieldNote:
			'Death is now a checkpoint, not a full stop. Small comfort, given how often you will reach it.',
		related: ['twelve-monkeys'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 'e1', label: 'Die on the beach', narrative: 0, chrono: 1, chronoLabel: 'day', kind: 'origin' },
			{ id: 'e2', label: 'Reset to morning', narrative: 1, chrono: 0, chronoLabel: 'morning', kind: 'loop', jumpTo: 'e1' },
			{ id: 'e3', label: 'Learn, advance', narrative: 2, chrono: 0.5, chronoLabel: 'day' },
			{ id: 'e4', label: 'Break the loop', narrative: 3, chrono: 2, chronoLabel: 'after' }
		]
	},
	{
		slug: 'groundhog-day',
		title: 'Groundhog Day',
		year: 1993,
		medium: 'film',
		rules: ['fixed'],
		mode: ['anomaly'],
		loop: 'groundhog',
		destEra: 0.545,
		destLabel: 'the present',
		logline: 'A weatherman is issued the same Tuesday until further notice.',
		mechanism:
			'No mechanism is ever offered. Phil simply wakes to the same 6:00 a.m. and the same song, indefinitely, until he becomes worth releasing.',
		paradoxes: ['unexplained repetition'],
		paradoxRisk: 'low',
		fieldNote:
			'There is no machine to sabotage and no button to press. The only exit is self-improvement, which is the cruellest mechanism of all.',
		related: ['edge-of-tomorrow'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 'g1', label: 'Feb 2  -  wake', narrative: 0, chrono: 0, chronoLabel: '6:00', kind: 'origin' },
			{ id: 'g2', label: 'The day plays out', narrative: 1, chrono: 0.5, chronoLabel: 'day' },
			{ id: 'g3', label: 'Midnight  -  reset', narrative: 2, chrono: 1, chronoLabel: '00:00', kind: 'loop', jumpTo: 'g1' },
			{ id: 'g4', label: 'Feb 3 at last', narrative: 3, chrono: 2, chronoLabel: 'Feb 3' }
		]
	},
	{
		slug: 'interstellar',
		title: 'Interstellar',
		year: 2014,
		medium: 'film',
		rules: ['fixed'],
		mode: ['relativistic', 'anomaly'],
		loop: 'causal',
		destEra: 0.965,
		destLabel: 'deep future',
		logline: 'Love and gravity, it turns out, both reach across time.',
		mechanism:
			'Relativistic time dilation near a black hole plus a tesseract built by future humans let a father push a message into his daughter’s past  -  a message that was always received.',
		paradoxes: ['bootstrap', 'predestination'],
		paradoxRisk: 'high',
		fieldNote:
			'An hour here may cost you seven years back home. Budget your away-missions accordingly.',
		related: ['twelve-monkeys'],
		imageSource: 'Film stills → TMDB',
		timeline: [
			{ id: 'i1', label: 'Leave a dying Earth', narrative: 0, chrono: 2067, chronoLabel: '2067', kind: 'origin' },
			{ id: 'i2', label: "Miller's planet (dilation)", narrative: 1, chrono: 2067.1, chronoLabel: '2067' },
			{ id: 'i3', label: 'Into the tesseract', narrative: 2, chrono: 2070, chronoLabel: '2070', kind: 'jump', jumpTo: 'i4' },
			{ id: 'i4', label: 'Message to Murph (past)', narrative: 3, chrono: 2040, chronoLabel: '2040', kind: 'loop' }
		]
	}
];
