#!/usr/bin/env node
/**
 * Build-time enrichment for posters and aggregator scores.
 *
 * The goal is to lean on KEYLESS, open sources first, so the site stays
 * self-sufficient with no secrets, and only reach for keyed services when a
 * key happens to be present (they give nicer art and the review scores).
 *
 * The free setup: TMDB for posters and trailers (a free key, no cost), OMDb's
 * free tier for the review scores it uniquely provides. OMDb's poster IMAGE
 * api is paid, so we never use it; TMDB art is free and looks great.
 *
 * Poster / cover art, in priority order per entry:
 *   1. TMDB           (film, tv)      needs TMDB_API_KEY (free)
 *   2. Wikidata P18   (anything)      KEYLESS, but ONLY with an explicit `wikidata`
 *                                     QID (fuzzy id matching picked wrong art)
 *   3. Open Library   (book, comic)   KEYLESS, matched via ISBN
 *
 * Trailers:
 *   TMDB videos endpoint yields an official YouTube trailer key (free).
 *
 * Review scores:
 *   OMDb free tier gives IMDb rating, Metacritic, Rotten Tomatoes critics.
 *   Rotten Tomatoes AUDIENCE has no free API, so it is never overwritten here.
 *
 * Every network call is guarded; on failure the authored data is used as-is.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TMDB = process.env.TMDB_API_KEY;
const OMDB = process.env.OMDB_API_KEY;
const SRC = 'src/lib/data/specimens.ts';
const OUT = 'src/lib/data/enrichment.json';
const UA = 'TimeTravellersAlmanac/1.0 (build enrichment; https://github.com)';

// crude, dependency-free parse: pull the ids that live inside each slug's block
const src = readFileSync(SRC, 'utf8');
const slugRe = /slug:\s*'([^']+)'/g;
const marks = [];
let m;
while ((m = slugRe.exec(src))) marks.push({ slug: m[1], idx: m.index });
const entries = marks.map((mk, i) => {
	const block = src.slice(mk.idx, i + 1 < marks.length ? marks[i + 1].idx : src.length);
	const imdb = block.match(/imdb\.com\/title\/(tt\d+)/);
	const qid = block.match(/wikidata:\s*'(Q\d+)'/);
	const isbn = block.match(/isbn:\s*'([\dxX-]+)'/);
	return {
		slug: mk.slug,
		imdb: imdb ? imdb[1] : null,
		qid: qid ? qid[1] : null,
		isbn: isbn ? isbn[1].replace(/-/g, '') : null
	};
});

async function getJson(url) {
	const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
	if (!r.ok) throw new Error(`${r.status} ${url}`);
	return r.json();
}

// OMDb free tier: the review scores it uniquely provides (no poster, that is paid).
async function omdb(id) {
	if (!OMDB || !id) return null;
	try {
		const j = await getJson(`https://www.omdbapi.com/?apikey=${OMDB}&i=${id}`);
		if (j.Response === 'False') return null;
		const ratings = {};
		if (j.imdbRating && j.imdbRating !== 'N/A') ratings.imdb = Number(j.imdbRating);
		if (j.Metascore && j.Metascore !== 'N/A') ratings.metacritic = Number(j.Metascore);
		const rt = (j.Ratings || []).find((x) => x.Source === 'Rotten Tomatoes');
		if (rt) ratings.rtCritic = Number(String(rt.Value).replace('%', ''));
		return Object.keys(ratings).length ? ratings : null;
	} catch (e) {
		console.warn('omdb failed for', id, e.message);
		return null;
	}
}

// TMDB (free key): poster art and an official YouTube trailer in one lookup.
async function tmdb(id) {
	if (!TMDB || !id) return { poster: null, trailer: null };
	try {
		const j = await getJson(
			`https://api.themoviedb.org/3/find/${id}?api_key=${TMDB}&external_source=imdb_id`
		);
		const movie = j.movie_results && j.movie_results[0];
		const hit = movie || (j.tv_results && j.tv_results[0]);
		if (!hit) return { poster: null, trailer: null };
		const poster = hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null;
		const type = movie ? 'movie' : 'tv';
		let trailer = null;
		try {
			const v = await getJson(`https://api.themoviedb.org/3/${type}/${hit.id}/videos?api_key=${TMDB}`);
			const vids = v.results || [];
			const pick =
				vids.find((x) => x.site === 'YouTube' && x.type === 'Trailer' && x.official) ||
				vids.find((x) => x.site === 'YouTube' && x.type === 'Trailer') ||
				vids.find((x) => x.site === 'YouTube');
			if (pick) trailer = `https://www.youtube.com/watch?v=${pick.key}`;
		} catch (e) {
			console.warn('tmdb videos failed for', id, e.message);
		}
		return { poster, trailer };
	} catch (e) {
		console.warn('tmdb failed for', id, e.message);
		return { poster: null, trailer: null };
	}
}

// KEYLESS: read an explicit Wikidata item's image (P18) as a Commons file URL.
// Only used with a hand-set QID; fuzzy id matching was dropped because it
// pulled odd, off-topic art (e.g. the wrong Back to the Future image).
async function wikidataPoster(qid) {
	if (!qid) return null;
	try {
		const ent = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
		const claims = ent.entities?.[qid]?.claims?.P18;
		const file = claims?.[0]?.mainsnak?.datavalue?.value;
		if (!file) return null;
		return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=500`;
	} catch (e) {
		console.warn('wikidata failed for', qid, e.message);
		return null;
	}
}

// KEYLESS: Open Library serves a cover straight from an ISBN. Ask for the
// metadata first so a missing cover 404 does not become a broken image.
async function openLibraryPoster(isbn) {
	if (!isbn) return null;
	try {
		const j = await getJson(`https://openlibrary.org/isbn/${isbn}.json`);
		if (j.covers && j.covers[0]) return `https://covers.openlibrary.org/b/id/${j.covers[0]}-L.jpg`;
		return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
	} catch (e) {
		console.warn('openlibrary failed for', isbn, e.message);
		return null;
	}
}

const enrichment = {};
for (const e of entries) {
	const { poster: tmdbPoster, trailer } = await tmdb(e.imdb);
	const ratings = await omdb(e.imdb);
	const poster =
		tmdbPoster || (await wikidataPoster(e.qid)) || (await openLibraryPoster(e.isbn));
	const rec = {};
	if (poster) rec.poster = poster;
	if (ratings) rec.ratings = ratings;
	if (trailer) rec.trailer = trailer;
	if (Object.keys(rec).length) enrichment[e.slug] = rec;
	console.log(
		`enrich: ${e.slug} ${poster ? 'poster' : '-'} ${ratings ? 'ratings' : '-'} ${trailer ? 'trailer' : '-'}`
	);
}

writeFileSync(OUT, JSON.stringify(enrichment, null, 2) + '\n');
console.log(`enrich: wrote ${Object.keys(enrichment).length} entries to ${OUT}`);
