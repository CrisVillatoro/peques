# Peques — working notes for Claude

A web app that answers one question for a parent in Berlin: **what can we do
with the kids today?** Built for Crista's own family first, then a handful of
friends, and as a portfolio piece for her AI-engineering work.

Read this before changing anything structural.

## How it works

Plain Next.js (App Router, JavaScript, no TypeScript), **exported as a static
site** and uploaded to IONOS webspace at `peques.cristavillatoro.com`. There is
no server: every "backend" job happens in a script, ahead of time.

```
scripts/      one-off imports, run by hand on the Mac (they need network)
public/       places-osm.json — the place library, fetched by the browser
data/         places.json (hand-written, trusted) · streets.json (naming only)
lib/          all the logic: rules, hours, when, geocode, places, i18n, saved
components/   PequesApp (the whole interface), ResultsMap, Art
supabase/     SQL for favourites + visits (optional; app works without it)
```

## Rules this project keeps

1. **Code decides, AI explains.** Scoring, weather thresholds, opening hours
   and distances are arithmetic in `lib/rules.js` — readable, testable, and
   explainable to a user. No model ranks places.
2. **Never invent a fact about a place.** A facility is `"yes"` only because a
   source said so. `"unknown"` means nobody recorded it, never `"no"`, and the
   interface hides unknowns rather than implying absence.
3. **Say where things come from.** Real OpenStreetMap opening hours beat our
   category guess, and the card shows which it is. Guesses are labelled
   ("meist 08:00–20:00"); facts are not.
4. **German first.** The interface is German by default, English via the DE/EN
   switch, both in `lib/i18n.js`. Place names stay in their own language.
   Internal keys (`playground`, `library`) stay English — they are identifiers.
5. **Nothing about children leaves the browser.** Birth month only, no names,
   no photos, no location history. Favourites and visits are per account and
   protected by Row Level Security; signed out, they stay in `localStorage`.
6. **The app must work when things are missing.** No Supabase keys, no
   `places-osm.json`, no weather, no geolocation — each degrades, none breaks.

## Commands

```bash
npm run dev            # local development
npm run build          # static site into out/ — upload its contents to IONOS

npm run import-places  # OpenStreetMap, 11 categories (slow, Overpass is busy)
npm run import-berlin  # the city's own playground data, no rate limits
npm run import-streets # street points, needed once for naming
npm run name-places    # turn "Spielplatz" into "Spielplatz Lauterstraße"
npm run ortsteile      # give every place its Berlin Ortsteil
npm run slim-places    # shrink an already-imported file
npm run import-food    # kid-friendly cafés from OSM (feeds "Und danach?")
npm run fix-coordinates # fix the hand-written list's approximate coordinates
```

Imports are polite: `scripts/lib/overpass.mjs` identifies itself, waits for a
free slot and backs off. Never hammer Overpass; it is run by volunteers. A
failed run must never overwrite good data with an empty file.

## Where it stands

- ~4,400 places in the library (an earlier run reached 6,872 — a partial
  re-run overwrote it, so `npm run import-places` is worth repeating).
- Suggestions: one per category so three playgrounds never fill the list.
- Map: MapLibre + OpenFreeMap vector tiles, every open place clustered.
- Saving: hearts and "Wart ihr da?" work in the browser; Supabase project
  exists (`ffuddslbncfwlyaabkfs`) but the anon key and the SQL migration have
  not been applied yet.

## What matters next

1. **Re-run the import** and get the count back above 6,000.
2. **The reading layer** — the point of the project. Thousands of places have
   a name and nothing else. Agents that read a venue's own website for hours,
   prices and age suitability, and extract parent-relevant signals with a
   quote as evidence. Google reviews are **not** an option: their terms forbid
   storing the content and forbid using it next to a non-Google map.
3. **Impressum and privacy policy** before the link is public.
4. Real BVG travel times instead of distance-based estimates.

## Tone

Crista is an engineer, not a beginner: explain decisions, don't narrate
keystrokes. Say when something is a guess. Push back when an idea would make
the app worse — she asked for that explicitly, and the audit that produced the
current version came from exactly that.
