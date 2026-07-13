#!/usr/bin/env node
/**
 * Build-time enrichment. Given API keys, fills posters (TMDB) and aggregator
 * scores (OMDb) for every specimen and writes src/lib/data/enrichment.json,
 * which the data layer merges over the authored values.
 *
 * Keys (as env vars / GitHub secrets), both optional:
 *   TMDB_API_KEY  -> posters/backdrops via image.tmdb.org
 *   OMDB_API_KEY  -> IMDb, Metacritic, and Rotten Tomatoes critics scores
 *
 * Rotten Tomatoes AUDIENCE has no free API, so it is never overwritten here.
 * With no keys set, this is a no-op and the authored data is used as-is.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const TMDB = process.env.TMDB_API_KEY;
const OMDB = process.env.OMDB_API_KEY;
const SRC = 'src/lib/data/specimens.ts';
const OUT = 'src/lib/data/enrichment.json';

if (!TMDB && !OMDB) {
	console.log('enrich: no TMDB_API_KEY or OMDB_API_KEY set; skipping (authored data is used).');
	process.exit(0);
}

// crude, dependency-free parse: pair each slug with the imdb id inside its block
const src = readFileSync(SRC, 'utf8');
const slugRe = /slug:\s*'([^']+)'/g;
const marks = [];
let m;
while ((m = slugRe.exec(src))) marks.push({ slug: m[1], idx: m.index });
const entries = marks.map((mk, i) => {
	const block = src.slice(mk.idx, i + 1 < marks.length ? marks[i + 1].idx : src.length);
	const imdb = block.match(/imdb\.com\/title\/(tt\d+)/);
	return { slug: mk.slug, imdb: imdb ? imdb[1] : null };
});

async function omdb(id) {
	if (!OMDB) return null;
	try {
		const r = await fetch(`https://www.omdbapi.com/?apikey=${OMDB}&i=${id}`);
		const j = await r.json();
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
	if (!TMDB) return null;
	try {
		const r = await fetch(
			`https://api.themoviedb.org/3/find/${id}?api_key=${TMDB}&external_source=imdb_id`
		);
		const j = await r.json();
		const hit = (j.movie_results && j.movie_results[0]) || (j.tv_results && j.tv_results[0]);
		return hit && hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null;
	} catch (e) {
		console.warn('tmdb failed for', id, e.message);
		return null;
	}
}

const enrichment = {};
for (const e of entries) {
	if (!e.imdb) continue;
	const [ratings, poster] = await Promise.all([omdb(e.imdb), tmdbPoster(e.imdb)]);
	const rec = {};
	if (poster) rec.poster = poster;
	if (ratings && Object.keys(ratings).length) rec.ratings = ratings;
	if (Object.keys(rec).length) enrichment[e.slug] = rec;
	console.log(`enrich: ${e.slug} ${poster ? 'poster' : ''} ${ratings ? 'ratings' : ''}`);
}

writeFileSync(OUT, JSON.stringify(enrichment, null, 2) + '\n');
console.log(`enrich: wrote ${Object.keys(enrichment).length} entries to ${OUT}`);
