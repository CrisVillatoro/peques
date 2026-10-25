/**
 * Gives a name to every place that only says "Spielplatz".
 *
 *   npm run name-places
 *
 * No network: it works from what is already in the file, in this order.
 *   1. the street, when OpenStreetMap recorded one   → "Spielplatz Lauterstraße"
 *   2. the nearest named landmark within 400 m       → "Spielplatz am Volkspark Wilmersdorf"
 *   3. the Ortsteil                                  → "Spielplatz in Friedenau"
 *   4. nothing to go on: leave it, but number the duplicates so they differ
 */
import { readFile, writeFile } from "node:fs/promises";

const STREETS = new URL("../data/streets.json", import.meta.url);

const FILE = new URL("../public/places-osm.json", import.meta.url);
const GENERIC = /^(spielplatz|playground|park|grünanlage|garten|wasserspielplatz)$/i;
const NEAR_M = 400;

const data = JSON.parse(await readFile(FILE, "utf8"));
const places = data.places || [];
const get = (p, short, long) => p[short] ?? p[long];

// street points, if they have been downloaded
let streets = [];
try {
  streets = JSON.parse(await readFile(STREETS, "utf8")).streets || [];
  console.log(`${streets.length} street points available.`);
} catch {
  console.log("No data/streets.json yet — run npm run import-streets for better names.");
}

// running this twice should not produce "Spielplatz am X (2) (2)"
for (const p of places) {
  if (p.g) { if ("n" in p) p.n = p.g; else p.name = p.g; }
}

// landmarks worth being "next to": anything with a name of its own
const landmarks = places
  .filter((p) => {
    const n = get(p, "n", "name");
    return n && !GENERIC.test(n) && n.length > 4;
  })
  .map((p) => ({ name: get(p, "n", "name"), lat: get(p, "la", "lat"), lon: get(p, "lo", "lon") }));

let byStreet = 0, byLandmark = 0, byArea = 0, numbered = 0;
const used = new Map();

for (const p of places) {
  const name = get(p, "n", "name");
  if (!name || !GENERIC.test(name)) continue;
  const lat = get(p, "la", "lat");
  const lon = get(p, "lo", "lon");
  const area = get(p, "w", "where");
  const street = get(p, "a", "address");

  let full = null;
  const onStreet = nearestStreet(lat, lon);
  if (street) {
    full = `${name} ${String(street).replace(/\s+\d+[a-z]?$/i, "")}`; // street, without the house number
    byStreet++;
  } else if (onStreet && onStreet.m <= 150) {
    full = `${name} ${onStreet.name}`;
    byStreet++;
  } else {
    const near = nearest(landmarks, lat, lon);
    if (near && near.m <= NEAR_M) {
      // "Spielplatz am Spielplatz an der Volksbühne" — if the landmark is
      // itself a playground, take its name rather than stacking the word
      full = /spielplatz|playground/i.test(near.name) ? near.name : `${name} am ${near.name}`;
      byLandmark++;
    } else if (area && area !== "Berlin") {
      full = `${name} in ${area}`;
      byArea++;
    }
  }
  if (!full) continue;

  // two playgrounds on the same street still need to differ
  const seen = used.get(full) || 0;
  used.set(full, seen + 1);
  if (seen > 0) { full = `${full} (${seen + 1})`; numbered++; }

  p.g = name; // keep the original, so this script can run again cleanly
  if ("n" in p) p.n = full; else p.name = full;
}

await writeFile(FILE, JSON.stringify(data, null, 0) + "\n");
console.log(`named by street: ${byStreet}`);
console.log(`named by nearby landmark: ${byLandmark}`);
console.log(`named by Ortsteil: ${byArea}`);
console.log(`numbered to keep apart: ${numbered}`);
const left = places.filter((p) => GENERIC.test(get(p, "n", "name") || "")).length;
console.log(`still just "Spielplatz": ${left}`);

function nearestStreet(lat, lon) {
  let best = null;
  for (const [name, slat, slon] of streets) {
    if (Math.abs(slat - lat) > 0.0025 || Math.abs(slon - lon) > 0.0038) continue;
    const m = metres(lat, lon, slat, slon);
    if (!best || m < best.m) best = { name, m };
  }
  return best;
}

function nearest(list, lat, lon) {
  let best = null;
  for (const l of list) {
    if (Math.abs(l.lat - lat) > 0.006 || Math.abs(l.lon - lon) > 0.009) continue; // quick reject
    const m = metres(lat, lon, l.lat, l.lon);
    if (m > 0 && (!best || m < best.m)) best = { name: l.name, m };
  }
  return best;
}

function metres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
