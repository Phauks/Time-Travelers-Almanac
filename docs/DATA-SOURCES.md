# Data sources

The Almanac tries to stay self sufficient: authored data lives in
`src/lib/data/specimens.ts`, and a build step (`scripts/enrich.mjs`) layers
posters and review scores on top. The guiding rule is **keyless first**, so the
site keeps working with no secrets, and keyed services are only a bonus.

## The free setup: TMDB + OMDb free tier

Two free keys, no subscriptions:

- **TMDB** (`TMDB_API_KEY`): posters and trailers. Free, generous, good art.
- **OMDb free tier** (`OMDB_API_KEY`): the review scores TMDB does not carry
  (IMDb, Metacritic, Rotten Tomatoes critics). We do **not** use OMDb's poster
  image api, which is the paid part; TMDB covers art for free.

## Posters and cover art

| Source | Covers | Key needed | Notes |
| --- | --- | --- | --- |
| **TMDB** | film, tv | `TMDB_API_KEY` (free) | Primary poster art. |
| **Wikidata** (P18 image) | anything | no | Only when an entry sets an explicit `wikidata` QID. Fuzzy id matching was removed: it pulled odd, off topic images (a wrong Back to the Future still). |
| **Open Library** covers | books, comics | no | Matched by an optional `isbn`, straight from the ISBN. |

With no keys, films fall back to a clean placeholder rather than a guessed
image.

## Trailers and video

TMDB's videos endpoint returns an official YouTube trailer key, which the
enrichment step turns into a direct trailer link. When no TMDB trailer is found
(or no key is set), the dossier falls back to a keyless YouTube search link, so
every screen entry still has a working "Trailer" button.

## Review scores

| Source | Gives | Key needed |
| --- | --- | --- |
| **TMDB** | TMDB community score (out of 10) | `TMDB_API_KEY` (free) |
| **OMDb** free tier | IMDb rating, Metacritic, Rotten Tomatoes critics | `OMDB_API_KEY` (free) |
| Rotten Tomatoes audience | audience score | no public API, entered by hand |

TMDB carries its own community rating, so a single TMDB key already gives a
score alongside the poster and trailer. OMDb's free tier adds the scores TMDB
does not have (IMDb, Metacritic, RT critics). The RT audience score has no open
API anywhere, so it stays authored.

## Other media, if the catalogue grows

- **Games**: Wikidata covers most; IGDB is richer but needs a Twitch OAuth
  client (a key). Wikidata keeps it keyless.
- **Radio / audio drama**: Wikidata is the practical universal source; there is
  no dedicated open ratings feed.
- **Books beyond covers**: Open Library and Google Books both expose metadata
  keylessly (Google Books has a quota but no mandatory key). Goodreads has no
  public API anymore, so we link out to a Goodreads search instead.

## How to add a key later

Set repository secrets `TMDB_API_KEY` and/or `OMDB_API_KEY`. The deploy workflow
passes them to `enrich.mjs` on every push and on a weekly schedule, so posters
and scores refresh on their own. With no secrets the keyless paths run instead.
