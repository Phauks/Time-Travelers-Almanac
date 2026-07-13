# Data sources

The Almanac tries to stay self sufficient: authored data lives in
`src/lib/data/specimens.ts`, and a build step (`scripts/enrich.mjs`) layers
posters and review scores on top. The guiding rule is **keyless first**, so the
site keeps working with no secrets, and keyed services are only a bonus.

## Posters and cover art

| Source | Covers | Key needed | Notes |
| --- | --- | --- | --- |
| **Wikidata** (P18 image) | everything: film, tv, radio, comics, games, books | no | Matched by the IMDb id already in each entry, or an optional `wikidata` QID. Images resolve to stable Wikimedia Commons URLs. This is the workhorse. |
| **Open Library** covers | books, comics | no | Matched by an optional `isbn`. A cover comes straight from the ISBN. |
| **TMDB** | film, tv | `TMDB_API_KEY` | Best looking posters; used first when the key is present. |

Because every film/tv entry carries an IMDb id, Wikidata alone gives keyless
posters for the whole screen catalogue. Books and comics fall to Open Library.
Nothing here is required: with a `TMDB_API_KEY` the film and tv art gets nicer,
without it Wikidata fills in.

## Review scores

| Source | Gives | Key needed |
| --- | --- | --- |
| **OMDb** | IMDb rating, Metacritic, Rotten Tomatoes critics | `OMDB_API_KEY` (free tier) |
| Rotten Tomatoes audience | audience score | no public API, entered by hand |

Scores are the one place a key genuinely helps: there is no reliable keyless
feed for IMDb / Metacritic / RT numbers. OMDb's free key covers three of the
four. The RT audience score has no open API anywhere, so it stays authored.

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
