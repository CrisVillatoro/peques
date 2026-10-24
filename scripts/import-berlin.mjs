/**
 * Imports Berlin's official public playgrounds from the city's own map service
 * (WFS, Geodateninfrastruktur Berlin) into public/places-osm.json.
 *
 *   npm run import-berlin
 *
 * Use this when Overpass is busy: it is a government service meant to be
 * queried, with no rate limits and no slots to wait for. It covers public
 * playgrounds only — Overpass is still the source for museums, pools, farms
 * and the rest.
 *
 * Data: Geoportal Berlin / Grünanlagenbestand (einschl. öffentlicher
 * Spielplätze), Datenlizenz Deutschland – Namensnennung. Keep the credit.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { toCompact } from "./lib/compact.mjs";

const OUT = new URL("../public/places-osm.json", import.meta.url);
const SERVICE = "https://gdi.berlin.de/services/wfs/gruenanlagen";
const TYPE = "gruenanlagen:spielplaetze";
const PAGE = 1000;

const url = (startIndex) =>
  `${SERVICE}?service=WFS&version=2.0.0&request=GetFeature` +
  `&typeNames=${encodeURIComponent(TYPE)}&outputFormat=application/json` +
  `&srsName=EPSG:4326&count=${PAGE}&startIndex=${startIndex}`;

const features = [];
let start = 0;

while (true) {
  process.stdout.write(`Fetching playgrounds ${start + 1}–${start + PAGE}… `);
  const res = await fetch(url(start), {
    headers: { Accept: "application/json", "User-Agent": "peques/0.1 (personal family app)" },
  });
  if (!res.ok) {
    console.log(`failed (HTTP ${res.status})`);
    break;
  }
  const data = await res.json();
  const batch = data.features || [];
  console.log(`${batch.length}`);
  features.push(...batch);
  if (batch.length < PAGE) break;
  start += PAGE;
}

if (!features.length) {
  console.log("\nNothing came back — the file was left untouched.");
  process.exit(1);
}

// Show what the city actually gives us, so the mapping below can be improved.
console.log("\nFields in the first record:");
console.log(" ", Object.keys(features[0].properties || {}).join(", "));

const places = features.map(toPlace).filter(Boolean);

const existing = await readExisting();
const kept = existing.filter((p) => p.source !== "berlin");
const merged = [...kept, ...places];

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      _note:
        "Mixed import: OpenStreetMap (source 'osm') and Geoportal Berlin (source 'berlin'). Facilities are only 'yes' when the source says so; 'unknown' never means 'no'.",
      importedAt: new Date().toISOString().slice(0, 10),
      count: merged.length,
      source: "OpenStreetMap contributors (ODbL) · Geoportal Berlin (dl-de/by-2-0)",
      format: "compact-1",
      places: merged.map((p) => (p.i ? p : toCompact(p))),
    },
    null,
    0
  ) + "\n"
);

console.log(`\n${places.length} playgrounds from Berlin's own data.`);
console.log(`public/places-osm.json now holds ${merged.length} places (${kept.length} from other sources).`);

/* ---------------- helpers ---------------- */

function toPlace(f) {
  const p = f.properties || {};
  const point = centroid(f.geometry);
  if (!point) return null;

  // The service names fields in German and the exact set varies by release,
  // so try the usual spellings and fall back gracefully.
  const name = pick(p, ["nam", "name", "bezeichnung", "anlagenname", "spielplatzname", "gruenanlage"]) || "Spielplatz";
  const district = pick(p, ["bezirk", "bez_name", "ortsteil", "bezirksname"]) || "Berlin";
  const id = pick(p, ["gml_id", "id", "objektid", "spielplatznummer"]) || `${point.lat},${point.lon}`;
  const ageText = String(pick(p, ["altersgruppe", "alter", "zielgruppe"]) || "");

  const fit = { b: 2, t: 5, p: 5, s: 4 };
  if (/kleinkind|0-?6|u6|2-?5/i.test(ageText)) Object.assign(fit, { b: 3, t: 5, p: 5, s: 3 });
  if (/jugend|12|14|16/i.test(ageText)) Object.assign(fit, { b: 1, t: 2, p: 3, s: 5 });

  return {
    id: `berlin-${String(id).replace(/[^\w.-]/g, "")}`,
    name: String(name).trim(),
    where: String(district).trim(),
    address: pick(p, ["strasse", "adresse", "lage"]) || null,
    lat: point.lat,
    lon: point.lon,
    kind: "playground",
    kindLabel: "Spielplatz",
    setting: "outdoor",
    covered: 0,
    free: true,
    priceHint: "Free",
    typicalOpen: "08:00",
    typicalClose: "20:00",
    closedDay: null,
    season: null,
    hotWeatherFavourite: false,
    fit,
    facilities: {
      changing: "unknown",
      stroller: "unknown",
      highchair: "unknown",
      playArea: "yes",
      toilets: "unknown",
      water: "unknown",
    },
    minAge: null,
    maxAge: null,
    openingHours: null,
    url: null,
    tags: ["playground", "outdoor"],
    note: ageText ? `Age group as recorded by the city: ${ageText}` : null,
    source: "berlin",
    licence: "Geoportal Berlin / dl-de-by-2-0",
  };
}

function pick(obj, keys) {
  for (const k of keys) {
    const hit = Object.keys(obj).find((x) => x.toLowerCase() === k);
    if (hit && obj[hit] !== null && obj[hit] !== "") return obj[hit];
  }
  return null;
}

/** Points come as-is; areas are averaged into a single point. */
function centroid(geom) {
  if (!geom) return null;
  const round = (lat, lon) => ({ lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) });
  if (geom.type === "Point") return round(geom.coordinates[1], geom.coordinates[0]);
  const coords = flatten(geom.coordinates).filter((c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === "number");
  if (!coords.length) return null;
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return round(lat, lon);
}

function flatten(a) {
  if (!Array.isArray(a)) return [];
  if (typeof a[0] === "number") return [a];
  return a.flatMap(flatten);
}

async function readExisting() {
  try {
    const raw = JSON.parse(await readFile(OUT, "utf8"));
    return Array.isArray(raw.places) ? raw.places : [];
  } catch {
    return [];
  }
}
