import type { MediaEntry } from '$lib/types';

// Seed specimens  -  a small slice of the 100, authored with real timeline data
// so the reusable Timeline component and the prime-line landing have something
// true to render. Add entries here; routes and the landing pick them up.

export const specimens: MediaEntry[] = [
	{
		slug: 'a-connecticut-yankee',
		title: "A Connecticut Yankee in King Arthur's Court",
		year: 1889,
		released: 'December 10, 1889',
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
		timeline: [
			{ id: 'cy1', label: 'Hank in 1889', narrative: 0, chrono: 1889, chronoStartLabel: '1889', kind: 'origin' },
			{ id: 'cy2', label: 'Knocked to 528 AD', narrative: 1, chrono: 528, chronoStartLabel: '528', kind: 'departure', jumpTo: 'cy2' },
			{ id: 'cy3', label: 'Industrialises Camelot', narrative: 2, chrono: 528.5, chronoStartLabel: '528' },
			{ id: 'cy4', label: 'Wakes in 1889', narrative: 3, chrono: 1889.1, chronoStartLabel: '1889' }
		]
	},
	{
		slug: 'the-terminator',
		title: 'The Terminator',
		year: 1984,
		released: 'October 26, 1984',
		medium: 'film',
		franchise: 'terminator',
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
		timeline: [
			{ id: 't1', label: 'Machines rise', narrative: 0, chrono: 2029, chronoStartLabel: '2029', kind: 'origin' },
			{ id: 't2', label: 'Kyle sent back', narrative: 1, chrono: 1984, chronoStartLabel: '1984', kind: 'departure', jumpTo: 't3' },
			{ id: 't3', label: "John's conception", narrative: 2, chrono: 1984.3, chronoStartLabel: '1984', kind: 'loop' },
			{ id: 't4', label: 'Future war continues', narrative: 3, chrono: 2029.2, chronoStartLabel: '2029' }
		]
	},
	{
		slug: 'back-to-the-future',
		title: 'Back to the Future',
		year: 1985,
		released: 'July 3, 1985',
		medium: 'film',
		franchise: 'back-to-the-future',
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
				chronoStartLabel: 'Nov 1955 (original)',
				location: 'Downtown Hill Valley',
				kind: 'event',
				description:
					"Lorraine's father hits George with the car; she nurses him back to health and the two fall in love."
			},
			{
				id: 'demo',
				travelers: ['Marty', 'Doc', 'Einstein'],
				traveler: 'Einstein',
				label: 'The DeLorean revealed',
				narrative: 0,
				chrono: 1985.82,
				chronoStartLabel: 'Oct 26, 1985, 1:15 AM',
				location: 'Twin Pines Mall, Hill Valley',
				kind: 'departure',
				origin: true,
				jumpTo: 'einstein',
				description:
					'Doc Brown demonstrates the time machine, sending Einstein the dog one minute into the future  -  the first time travel on the timeline.'
			},
			{
				id: 'einstein',
				travelers: ['Marty', 'Doc', 'Einstein'],
				traveler: 'Einstein',
				label: 'Einstein arrives, one minute on',
				narrative: 0.5,
				chrono: 1985.8201,
				chronoStartLabel: 'Oct 26, 1985, 1:16 AM',
				location: 'Twin Pines Mall, Hill Valley',
				kind: 'arrival',
				description:
					'The DeLorean reappears with its clock exactly one minute behind. Einstein becomes the first time traveller, and Doc proves the machine works.'
			},
			{
				id: 'flee',
				travelers: ['Marty', 'Doc'],
				traveler: 'Marty',
				label: 'Libyans attack  -  Marty flees',
				narrative: 1,
				chrono: 1985.8205,
				chronoStartLabel: 'Oct 26, 1985, 1:20 AM',
				location: 'Twin Pines Mall, Hill Valley',
				kind: 'departure',
				jumpTo: 'arrive55',
				description:
					'Doc is gunned down. Marty escapes in the DeLorean, hits 88 mph, and is thrown back to the date on the time circuits.'
			},
			{
				id: 'arrive55',
				travelers: ['Marty'],
				traveler: 'Marty',
				label: 'Arrival in 1955',
				narrative: 2,
				chrono: 1955.845,
				chronoStartLabel: 'Nov 5, 1955, 6:00 AM',
				location: 'Peabody Ranch, Hill Valley',
				kind: 'arrival',
				description:
					'Marty crashes into a barn and flattens one of the Peabodys’ twin pines  -  which is why he will return to a "Lone Pine Mall".'
			},
			{
				id: 'interfere',
				travelers: ['Marty'],
				label: 'The meeting is disrupted',
				narrative: 3,
				chrono: 1955.847,
				chronoStartLabel: 'Nov 5, 1955',
				location: 'Downtown Hill Valley',
				kind: 'event',
				description:
					'Marty pushes George clear of the car meant to introduce him to Lorraine. She becomes infatuated with Marty instead  -  and he begins to fade from the family photograph.',
				paradox:
					'Ontological risk: with his parents no longer destined to meet, Marty starts to erase himself. For a while he stands on a timeline where he was never born.'
			},
			{
				id: 'finddoc',
				travelers: ['Marty', 'Doc (1955)'],
				label: 'Finds the young Doc',
				narrative: 4,
				chrono: 1955.848,
				chronoStartLabel: 'Nov 5, 1955',
				location: "Doc's mansion, Hill Valley",
				kind: 'event',
				description:
					'The 1955 Doc has no power source strong enough to get Marty home  -  except the lightning known to strike the clock tower a week later.'
			},
			{
				id: 'plan',
				travelers: ['Marty', 'Doc (1955)'],
				label: 'Engineering the romance',
				narrative: 5,
				chrono: 1955.855,
				chronoEnd: 1955.862,
				chronoStartLabel: 'Nov 6, 1955',
				chronoEndLabel: 'Nov 11, 1955',
				location: 'Hill Valley High',
				kind: 'event',
				description:
					'Marty schemes to get George and Lorraine to fall in love at the Enchantment Under the Sea dance and repair the damage to his own existence.'
			},
			{
				id: 'dance',
				travelers: ['Marty'],
				label: 'Enchantment Under the Sea',
				narrative: 6,
				chrono: 1955.864,
				chronoStartLabel: 'Nov 12, 1955, night',
				location: 'Hill Valley High gym',
				kind: 'event',
				description:
					'George stands up to Biff and kisses Lorraine. His parents fall in love, Marty’s existence is secured, and the photograph is restored.'
			},
			{
				id: 'depart55',
				travelers: ['Marty', 'Doc (1955)'],
				traveler: 'Marty',
				label: 'The clock-tower lightning',
				narrative: 7,
				chrono: 1955.866,
				chronoStartLabel: 'Nov 12, 1955, 10:04 PM',
				location: 'Courthouse Square, Hill Valley',
				kind: 'departure',
				jumpTo: 'return85',
				description:
					'Doc runs a wire from the tower to the street; the lightning strikes as the DeLorean hits 88 mph, sending Marty home.'
			},
			{
				id: 'return85',
				travelers: ['Marty'],
				traveler: 'Marty',
				label: 'Back to 1985',
				narrative: 8,
				chrono: 1985.821,
				chronoStartLabel: 'Oct 26, 1985, 1:24 AM',
				location: 'Lone Pine Mall, Hill Valley',
				kind: 'return',
				description:
					'Marty arrives ten minutes before he first left and watches Doc be shot again  -  but Doc survives, having read Marty’s warning letter and worn a vest.'
			},
			{
				id: 'altered',
				travelers: ['Marty', 'Doc'],
				label: 'A better 1985',
				narrative: 9,
				chrono: 1985.822,
				chronoStartLabel: 'Oct 26, 1985, morning',
				location: 'The McFly home',
				kind: 'event',
				description:
					'Marty wakes to an overwritten present: George is a confident author, Lorraine is happy, and Biff is now their meek valet.'
			},
			{
				id: 'hook',
				travelers: ['Marty', 'Doc'],
				label: '“…we don’t need roads.”',
				narrative: 10,
				chrono: 1985.823,
				chronoStartLabel: 'Oct 26, 1985, later',
				location: 'The McFly home',
				kind: 'departure',
				jumpToLabel: '2015',
				crossRef: { entry: 'back-to-the-future-part-ii', event: 'depart85' },
				description: 'Doc returns from 2015 and takes Marty and Jennifer into the future.'
			}
		]
	},
	{
		slug: 'back-to-the-future-part-ii',
		title: 'Back to the Future Part II',
		year: 1989,
		released: 'November 22, 1989',
		medium: 'film',
		franchise: 'back-to-the-future',
		continuity: 'film',
		partOrder: 2,
		rules: ['mutable', 'branching'],
		mode: ['contraption'],
		loop: null,
		destEra: 0.72,
		destLabel: '2015',
		logline: 'A sports almanac in the wrong hands turns one hometown into a nightmare.',
		synopsis:
			'Doc Brown takes Marty and Jennifer to 2015 to head off trouble with their future children. While there, an elderly Biff Tannen steals the time machine and gives a sports almanac to his younger self in 1955, rewriting the present into a corrupt alternate 1985. Marty and Doc must return to 1955 to undo the change without disturbing the events of their first trip.',
		aliases: ['Back to the Future Part 2', 'Back to the Future II'],
		mechanism:
			'The same DeLorean, now Mr. Fusion powered and hover converted. Altering the events of 1955 rewrites the timeline forward into a divergent 1985.',
		paradoxes: ['alternate timeline', 'information from the future', 'self-visitation'],
		paradoxRisk: 'high',
		fieldNote:
			'If you must revisit a day you have already lived, do not let your earlier self see you, and never leave an almanac lying around.',
		sources: [
			{ label: 'Wikipedia, Back to the Future Part II', url: 'https://en.wikipedia.org/wiki/Back_to_the_Future_Part_II' },
			{ label: 'Futurepedia, Back to the Future timeline', url: 'https://backtothefuture.fandom.com/wiki/Back_to_the_Future_timeline' }
		],
		links: [
			{ kind: 'imdb', url: 'https://www.imdb.com/title/tt0096874/' },
			{ kind: 'rottentomatoes', url: 'https://www.rottentomatoes.com/m/back_to_the_future_part_ii' },
			{ kind: 'metacritic', url: 'https://www.metacritic.com/movie/back-to-the-future-part-ii/' },
			{ kind: 'watch', url: 'https://www.justwatch.com/us/movie/back-to-the-future-part-ii' }
		],
		ratings: { imdb: 7.8, rtCritic: 63, rtAudience: 86, metacritic: 57 },
		branches: [
			{
				id: 'prime',
				label: 'Timeline 1',
				status: 'original',
				note: 'the 1985 and 2015 the travellers set out from'
			},
			{
				id: 'dystopia',
				label: 'Timeline 2',
				parent: 'prime',
				branchAt: 'biff-gives',
				status: 'endangered',
				note: "Biff's corrupt alternate 1955 to 1985"
			},
			{
				id: 'restored',
				label: 'Timeline 3',
				parent: 'dystopia',
				branchAt: 'retrieve',
				status: 'restored',
				note: 'the almanac burned, the line set right again'
			}
		],
		timeline: [
			{
				id: 'depart85',
				label: 'Off to the future',
				narrative: 0,
				chrono: 1985.83,
				chronoStartLabel: 'Oct 26, 1985',
				location: 'Hill Valley',
				kind: 'departure',
				origin: true,
				jumpTo: 'arrive15',
				branch: 'prime',
				description: 'Doc arrives from 2015 and takes Marty and Jennifer forward to sort out their children.'
			},
			{
				id: 'arrive15',
				label: 'Arrival in 2015',
				narrative: 1,
				chrono: 2015.8,
				chronoStartLabel: 'Oct 21, 2015',
				location: 'Hill Valley',
				kind: 'arrival',
				branch: 'prime',
				description: 'The whole reason for the trip: in the future Doc read about, Marty Jr. is talked into a robbery and jailed, and the family falls apart. Marty poses as his own son to stop it.'
			},
			{
				id: 'griff',
				label: "Marty Jr. and the jail future",
				narrative: 1.5,
				chrono: 2015.805,
				chronoStartLabel: 'Oct 21, 2015, 4:00 PM',
				location: "Cafe 80s, Hill Valley",
				kind: 'event',
				branch: 'prime',
				paradox:
					"The averted future: left alone, Marty Jr. joins Griff Tannen's hoverboard robbery, is arrested within two hours, and in trying to free him Marlene is jailed too. It is the ruin Doc came back to prevent.",
				description: "Griff Tannen tries to recruit Marty Jr. for a heist. Marty, disguised as his son, turns Griff down; Griff's gang crash into the courthouse and are arrested instead, and the jail future never happens."
			},
			{
				id: 'almanac',
				label: 'The sports almanac',
				narrative: 2,
				chrono: 2015.81,
				chronoStartLabel: 'Oct 21, 2015',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'prime',
				description: 'Marty buys a book listing fifty years of sports results, meaning to gamble with it.'
			},
			{
				id: 'biff-steals',
				label: 'Old Biff takes the DeLorean',
				narrative: 3,
				chrono: 2015.82,
				chronoStartLabel: 'Oct 21, 2015',
				location: 'Hill Valley',
				kind: 'departure',
				jumpTo: 'biff-gives',
				branch: 'prime',
				description: 'The elderly Biff overhears the plan, pockets the almanac, and borrows the time machine.'
			},
			{
				id: 'biff-gives',
				label: 'Biff arms his younger self',
				narrative: 4,
				chrono: 1955.9,
				chronoStartLabel: 'Nov 12, 1955',
				location: 'Hill Valley',
				kind: 'arrival',
				jumpTo: 'biff-return',
				branch: 'dystopia',
				description: 'Old Biff hands the almanac to the teenage Biff, splitting off a corrupt new timeline from 1955 onward.'
			},
			{
				id: 'biff-return',
				label: 'The impossible return',
				narrative: 5,
				chrono: 2015.83,
				chronoStartLabel: 'Oct 21, 2015',
				location: 'Hill Valley',
				kind: 'return',
				branch: 'prime',
				paradox:
					"Having just changed 1955, Old Biff drives the DeLorean back to the very 2015 he left. By the film's own rules he should return to his own altered future, not this one. He crosses back onto Timeline 1: the saga's best known continuity error.",
				description: 'Old Biff returns the machine and staggers off, apparently unaffected.'
			},
			{
				id: 'marty-home',
				label: 'The group flies home',
				narrative: 5.5,
				chrono: 2015.835,
				chronoStartLabel: 'Oct 21, 2015',
				location: 'Hill Valley',
				kind: 'departure',
				jumpTo: 'arrive-a',
				branch: 'prime',
				description: 'Unaware of the swap, Doc flies Marty and Jennifer out of 2015 toward home, and into the altered line.'
			},
			{
				id: 'arrive-a',
				label: 'A different 1985',
				narrative: 6,
				chrono: 1985.84,
				chronoStartLabel: 'Oct 26, 1985 (altered)',
				location: 'Hill Valley',
				kind: 'return',
				branch: 'dystopia',
				description: 'They land not in their own 1985 but in the Hill Valley the almanac built, remade in Biff’s image.'
			},
			{
				id: 'discover',
				label: "Biff's empire",
				narrative: 7,
				chrono: 1985.85,
				chronoStartLabel: '1985 (altered)',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'dystopia',
				description: 'They learn Biff is rich and powerful, George McFly is dead, and the almanac is the cause.'
			},
			{
				id: 'to55',
				label: 'Back to 1955 again',
				narrative: 8,
				chrono: 1985.86,
				chronoStartLabel: 'Oct 1985 (altered)',
				location: 'Hill Valley',
				kind: 'departure',
				jumpTo: 'retrieve',
				branch: 'dystopia',
				description: 'They trace the change to the day of the Enchantment Under the Sea dance and set off to undo it.'
			},
			{
				id: 'retrieve',
				label: 'Retrieving the almanac',
				narrative: 9,
				chrono: 1955.905,
				chronoStartLabel: 'Nov 12, 1955',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'restored',
				description: 'Working around their earlier selves, they take the almanac from young Biff and burn it, restoring the line.'
			},
			{
				id: 'doc-1885',
				label: 'Doc is struck to 1885',
				narrative: 10,
				chrono: 1955.92,
				chronoStartLabel: 'Nov 12, 1955',
				location: 'Hill Valley',
				kind: 'departure',
				branch: 'restored',
				jumpToLabel: '1885',
				traveler: 'Doc',
				crossRef: { entry: 'back-to-the-future-part-iii', event: 'letter' },
				description: 'As Doc stands by the DeLorean, a bolt of lightning strikes it and hurls him, machine and all, back to the year 1885.'
			}
		]
	},
	{
		slug: 'back-to-the-future-part-iii',
		title: 'Back to the Future Part III',
		year: 1990,
		released: 'May 25, 1990',
		medium: 'film',
		franchise: 'back-to-the-future',
		continuity: 'film',
		partOrder: 3,
		rules: ['mutable'],
		mode: ['contraption'],
		loop: null,
		destEra: 0.2,
		destLabel: '1885',
		logline: 'The old West, a runaway locomotive, and a scientist in love.',
		synopsis:
			'Stranded in 1955, Marty receives a letter from Doc, who is living in 1885 and, Marty learns, is about to be killed. Marty travels to the Old West to rescue him, only to find that Doc has fallen for a schoolteacher named Clara. With the DeLorean out of fuel, the two must use a steam locomotive to reach 88 mph and send Marty home.',
		aliases: ['Back to the Future Part 3', 'Back to the Future III'],
		mechanism:
			'The DeLorean, hidden in a mine since 1885. With no gasoline to be had, the momentum of a driven locomotive substitutes for the engine to reach 88 mph.',
		paradoxes: ['predestination', 'bootstrap'],
		paradoxRisk: 'medium',
		fieldNote:
			'If your machine runs dry in a century without petrol, a fast enough train will serve. Mind the ravine.',
		sources: [
			{ label: 'Wikipedia, Back to the Future Part III', url: 'https://en.wikipedia.org/wiki/Back_to_the_Future_Part_III' },
			{ label: 'Futurepedia, Back to the Future timeline', url: 'https://backtothefuture.fandom.com/wiki/Back_to_the_Future_timeline' }
		],
		links: [
			{ kind: 'imdb', url: 'https://www.imdb.com/title/tt0099088/' },
			{ kind: 'rottentomatoes', url: 'https://www.rottentomatoes.com/m/back_to_the_future_3' },
			{ kind: 'metacritic', url: 'https://www.metacritic.com/movie/back-to-the-future-part-iii/' },
			{ kind: 'watch', url: 'https://www.justwatch.com/us/movie/back-to-the-future-part-iii' }
		],
		ratings: { imdb: 7.5, rtCritic: 79, rtAudience: 78, metacritic: 55 },
		branches: [
			{
				id: 'original',
				label: 'Timeline 1',
				status: 'endangered',
				note: 'the history Marty found: Buford Tannen shoots Doc dead in 1885'
			},
			{
				id: 'saved',
				label: 'Timeline 2',
				parent: 'original',
				branchAt: 'showdown',
				status: 'restored',
				note: 'Marty prevents the killing; Doc lives and both make it home'
			}
		],
		timeline: [
			{
				id: 'letter',
				label: 'A letter from 1885',
				narrative: 0,
				chrono: 1955.95,
				chronoStartLabel: 'Nov 15, 1955',
				location: 'Hill Valley',
				kind: 'origin',
				branch: 'original',
				description: "Marty, still in 1955, receives Doc's seventy-year-old letter. Doc is alive and well in 1885, having been sent there by lightning."
			},
			{
				id: 'grave',
				label: 'The tombstone',
				narrative: 0.5,
				chrono: 1955.955,
				chronoStartLabel: 'Nov 1955',
				location: 'Boot Hill, Hill Valley',
				kind: 'event',
				branch: 'original',
				description: "The 1955 Doc and Marty find a photograph of Doc's headstone: he is shot in the back by Buford Tannen days after the letter was written. This is the timeline Marty must overwrite."
			},
			{
				id: 'depart55',
				label: 'Off to the Old West',
				narrative: 1,
				chrono: 1955.96,
				chronoStartLabel: 'Nov 16, 1955',
				location: 'Pohatchee Drive-In, Hill Valley',
				kind: 'departure',
				jumpTo: 'arrive85',
				branch: 'original',
				description: 'The 1955 Doc repairs the mine-stored DeLorean and sends Marty back to save his friend.'
			},
			{
				id: 'arrive85',
				label: 'Arrival in 1885',
				narrative: 2,
				chrono: 1885.67,
				chronoStartLabel: 'Sep 2, 1885, 8:00 AM',
				location: 'Hill Valley',
				kind: 'arrival',
				branch: 'original',
				description: 'Marty lands in the frontier, tears the DeLorean fuel line on arrival, and finds Doc with five days to live.'
			},
			{
				id: 'clara',
				label: 'Doc meets Clara',
				narrative: 3,
				chrono: 1885.68,
				chronoStartLabel: 'Sep 4, 1885',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'original',
				description: 'Doc catches the new schoolteacher, Clara Clayton, from a fall into the ravine and falls in love, complicating the escape.'
			},
			{
				id: 'fuel',
				label: 'No fuel, one plan',
				narrative: 3.5,
				chrono: 1885.69,
				chronoStartLabel: 'Sep 5, 1885',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'original',
				description: 'With no gasoline in 1885, the two plot to push the DeLorean to 88 mph using a stolen steam locomotive.'
			},
			{
				id: 'tannen',
				label: 'Mad Dog Tannen',
				narrative: 4,
				chrono: 1885.7,
				chronoStartLabel: 'Sep 6, 1885',
				location: 'Hill Valley',
				kind: 'event',
				branch: 'original',
				description: 'Marty, going by "Clint Eastwood", is goaded into a pistol duel with the gunman Buford Tannen, set for dawn the next day.'
			},
			{
				id: 'showdown',
				label: 'The showdown and the train',
				narrative: 5,
				chrono: 1885.71,
				chronoStartLabel: 'Sep 7, 1885, 8:00 AM',
				location: 'Hill Valley',
				kind: 'departure',
				jumpTo: 'return85',
				branch: 'saved',
				description: 'Marty faces Buford and lives, splitting off a new timeline where Doc is not killed. He then rides a hijacked locomotive that drives the DeLorean to 88 mph. Doc stays behind for Clara.'
			},
			{
				id: 'doc-fate',
				label: "Doc's original fate",
				narrative: 5.5,
				chrono: 1885.712,
				chronoStartLabel: 'Sep 7, 1885',
				location: 'Palace Saloon, Hill Valley',
				kind: 'event',
				branch: 'original',
				paradox:
					'The death Marty came to prevent. In the unaltered 1885, Buford guns Doc down over an eighty-dollar debt; the Boot Hill headstone is its record. It survives only as the timeline Marty overwrites.',
				description: 'The endangered timeline runs on without Marty: here Buford shoots Doc in the back the morning of the duel.'
			},
			{
				id: 'return85',
				label: 'Home, and the machine destroyed',
				narrative: 6,
				chrono: 1985.83,
				chronoStartLabel: 'Oct 27, 1985',
				location: 'Hill Valley',
				kind: 'return',
				branch: 'saved',
				description: 'Marty arrives in 1985, and a freight train smashes the empty DeLorean to pieces on the tracks.'
			},
			{
				id: 'doc-train',
				label: 'Doc returns by rail',
				narrative: 7,
				chrono: 1985.84,
				chronoStartLabel: 'Oct 27, 1985',
				location: 'Hill Valley',
				kind: 'arrival',
				jumpFromLabel: '1885',
				traveler: 'Doc',
				branch: 'saved',
				description: 'Doc, who stayed behind in 1885, spent years turning a steam locomotive into a time machine. It materialises at the tracks with Clara and their sons aboard, a second time traveller arriving under his own power.'
			}
		]
	},
	{
		slug: 'twelve-monkeys',
		title: '12 Monkeys',
		year: 1995,
		released: 'December 29, 1995',
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
		timeline: [
			{ id: 'm1', label: 'Plague future', narrative: 0, chrono: 2035, chronoStartLabel: '2035', kind: 'origin' },
			{ id: 'm2', label: 'Sent to the 1990s', narrative: 1, chrono: 1996, chronoStartLabel: '1996', kind: 'departure' },
			{ id: 'm3', label: 'The airport', narrative: 2, chrono: 1996.5, chronoStartLabel: '1996', kind: 'loop' },
			{ id: 'm4', label: 'The memory completes', narrative: 3, chrono: 1996.6, chronoStartLabel: '1996' }
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
		timeline: [
			{ id: 's1', label: 'Send a D-Mail', narrative: 0, chrono: 0, chronoStartLabel: 'α', kind: 'origin', jumpTo: 's2' },
			{ id: 's2', label: 'Worldline shifts', narrative: 1, chrono: 0.1, chronoStartLabel: 'β', kind: 'departure' },
			{ id: 's3', label: 'Divergence 1.048596', narrative: 2, chrono: 0.2, chronoStartLabel: 'β', kind: 'loop' },
			{ id: 's4', label: 'Steins Gate reached', narrative: 3, chrono: 0.3, chronoStartLabel: 'Ω' }
		]
	},
	{
		slug: 'primer',
		title: 'Primer',
		year: 2004,
		released: 'October 8, 2004',
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
		timeline: [
			{ id: 'p1', label: 'The box works', narrative: 0, chrono: 1, chronoStartLabel: 'day 1', kind: 'origin' },
			{ id: 'p2', label: 'Ride back six hours', narrative: 1, chrono: 0.75, chronoStartLabel: '−6h', kind: 'departure', jumpTo: 'p2' },
			{ id: 'p3', label: 'Doubled selves', narrative: 2, chrono: 0.8, chronoStartLabel: '−6h', kind: 'loop' },
			{ id: 'p4', label: 'Timelines multiply', narrative: 3, chrono: 1.5, chronoStartLabel: 'day 1+' }
		]
	},
	{
		slug: 'edge-of-tomorrow',
		title: 'Edge of Tomorrow',
		year: 2014,
		released: 'June 6, 2014',
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
		timeline: [
			{ id: 'e1', label: 'Die on the beach', narrative: 0, chrono: 1, chronoStartLabel: 'day', kind: 'origin' },
			{ id: 'e2', label: 'Reset to morning', narrative: 1, chrono: 0, chronoStartLabel: 'morning', kind: 'loop', jumpTo: 'e1' },
			{ id: 'e3', label: 'Learn, advance', narrative: 2, chrono: 0.5, chronoStartLabel: 'day' },
			{ id: 'e4', label: 'Break the loop', narrative: 3, chrono: 2, chronoStartLabel: 'after' }
		]
	},
	{
		slug: 'groundhog-day',
		title: 'Groundhog Day',
		year: 1993,
		released: 'February 12, 1993',
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
		timeline: [
			{ id: 'g1', label: 'Feb 2  -  wake', narrative: 0, chrono: 0, chronoStartLabel: '6:00', kind: 'origin' },
			{ id: 'g2', label: 'The day plays out', narrative: 1, chrono: 0.5, chronoStartLabel: 'day' },
			{ id: 'g3', label: 'Midnight  -  reset', narrative: 2, chrono: 1, chronoStartLabel: '00:00', kind: 'loop', jumpTo: 'g1' },
			{ id: 'g4', label: 'Feb 3 at last', narrative: 3, chrono: 2, chronoStartLabel: 'Feb 3' }
		]
	},
	{
		slug: 'interstellar',
		title: 'Interstellar',
		year: 2014,
		released: 'November 7, 2014',
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
		timeline: [
			{ id: 'i1', label: 'Leave a dying Earth', narrative: 0, chrono: 2067, chronoStartLabel: '2067', kind: 'origin' },
			{ id: 'i2', label: "Miller's planet (dilation)", narrative: 1, chrono: 2067.1, chronoStartLabel: '2067' },
			{ id: 'i3', label: 'Into the tesseract', narrative: 2, chrono: 2070, chronoStartLabel: '2070', kind: 'departure', jumpTo: 'i4' },
			{ id: 'i4', label: 'Message to Murph (past)', narrative: 3, chrono: 2040, chronoStartLabel: '2040', kind: 'loop' }
		]
	}
];
