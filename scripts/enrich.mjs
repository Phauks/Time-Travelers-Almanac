#!/usr/bin/env node
/**
 * Build-time enrichment for posters and aggregator scores.
 *
 * The goal is to lean on KEYLESS, open sources first, so the site stays
 * self-sufficient with no secrets, and only reach for keyed services when a
 * key happens to be present (they give nicer art and the review scores).
 *
 * Poster / cover art, in priority order per entry:
 *   1. TMDB           (film, tv)      needs TMDB_API_KEY
 *   2. Wikidata P18   (anything)      KEYLESS, matched via the IMDb id or QID
 *   3. Open Library   (book, comic)   KEYLESS, matched via ISBN
 *
 * Review scores:
 *   OMDb (IMDb, Metacritic, RT critics)  needs OMDB_API_KEY
 *   Rotten Tomatoes AUDIENCE has no free API, so it is never overwritten here.
 *
 * With no keys set the keyless paths still run, so most entries still get art.
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

async function omdb(id) {
	if (!OMDB || !id) return null;
	try {
		const j = await getJson(`https://www.omdbapi.com/?apikey=${OMDB}&i=${id}`);
		if (j.Response === 'False') return null;
		const out = {};
		if (j.imdbRating && j.imdbRating !== 'N/A') out.imdb = Number(j.imdbRating);
		if (j.Metascore && j.Metascore !== 'N/A') out.metacritic = Number(j.Metascore);
		const rt = (j.Ratings || []).find((x) => x.Source === 'Rotten Tomatoes');
		if (rt) out.rtCritic = Number(String(rt.Value).replace('%', ''));
		return out;
	} catch (e) {
		console.warn('omdb failed for', id, e.message);
		return null;
	}
}

async function tmdbPoster(id) {
	if (!TMDB || !id) return null;
	try {
		const j = await getJson(
			`https://api.themoviedb.org/3/find/${id}?api_key=${TMDB}&external_source=imdb_id`
		);
		const hit = (j.movie_results && j.movie_results[0]) || (j.tv_results && j.tv_results[0]);
		return hit && hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null;
	} catch (e) {
		console.warn('tmdb failed for', id, e.message);
		return null;
	}
}

// KEYLESS: resolve a Wikidata item (by QID or by its IMDb id) and read its
// image (P18), returned as a stable Wikimedia Commons file URL.
async function wikidataPoster({ qid, imdb }) {
	try {
		let id = qid;
		if (!id && imdb) {
			const q = encodeURIComponent(
				`SELECT ?item WHERE { ?item wdt:P345 "${imdb}" } LIMIT 1`
			);
			const j = await getJson(`https://query.wikidata.org/sparql?format=json&query=${q}`);
			const uri = j.results?.bindings?.[0]?.item?.value;
			id = uri ? uri.split('/').pop() : null;
		}
		if (!id) return null;
		const ent = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);
		const claims = ent.entities?.[id]?.claims?.P18;
		const file = claims?.[0]?.mainsnak?.datavalue?.value;
		if (!file) return null;
		return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=500`;
	} catch (e) {
		console.warn('wikidata failed for', qid || imdb, e.message);
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
	const poster =
		(await tmdbPoster(e.imdb)) ||
		(await wikidataPoster({ qid: e.qid, imdb: e.imdb })) ||
		(await openLibraryPoster(e.isbn));
	const ratings = await omdb(e.imdb);
	const rec = {};
	if (poster) rec.poster = poster;
	if (ratings && Object.keys(ratings).length) rec.ratings = ratings;
	if (Object.keys(rec).length) enrichment[e.slug] = rec;
	console.log(`enrich: ${e.slug} ${poster ? 'poster' : '-'} ${ratings ? 'ratings' : '-'}`);
}

writeFileSync(OUT, JSON.stringify(enrichment, null, 2) + '\n');
console.log(`enrich: wrote ${Object.keys(enrichment).length} entries to ${OUT}`);
