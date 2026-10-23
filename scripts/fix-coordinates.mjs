/**
 * Replaces the approximate coordinates in data/places.json with real ones
 * from OpenStreetMap's Nominatim search.
 *
 * Run once on your Mac:   npm run fix-coordinates
 *
 * It is polite to Nominatim: one request per second, a real User-Agent, and it
 * only touches places still marked "approxCoords": true. Check the result —
 * if a lookup picks the wrong spot, set the coordinates by hand (right-click a
 * point on openstreetmap.org → "Show address" gives you lat/lon).
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../data/places.json", import.meta.url);
const CONTACT = process.env.SCOUT_CONTACT || "berlin-family-scout (personal project)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const raw = JSON.parse(await readFile(FILE, "utf8"));
let changed = 0;

for (const place of raw.places) {
  if (!place.approxCoords) continue;
  const query = `${place.name}, Berlin, Germany`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": CONTACT, "Accept-Language": "de,en" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const hits = await res.json();
    if (hits.length) {
      const lat = Number(hits[0].lat);
      const lon = Number(hits[0].lon);
      const movedKm = haversine(place, { lat, lon });
      place.lat = Number(lat.toFixed(5));
      place.lon = Number(lon.toFixed(5));
      place.approxCoords = false;
      changed++;
      console.log(`✓ ${place.name} → ${place.lat}, ${place.lon} (moved ${movedKm.toFixed(1)} km)`);
      if (movedKm > 8) console.log("   ⚠️  moved a long way — check this one by hand");
    } else {
      console.log(`· ${place.name}: no match, left as approximate`);
    }
  } catch (error) {
    console.log(`· ${place.name}: lookup failed (${error.message}), left as approximate`);
  }
  await sleep(1100);
}

await writeFile(FILE, JSON.stringify(raw, null, 2) + "\n");
console.log(`\nDone. ${changed} place(s) updated in data/places.json.`);

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
