/**
 * Fills public/places-osm.json with every place in Berlin worth taking a small
 * child to, straight from OpenStreetMap (Overpass API).
 *
 *   npm run import-places
 *
 * This is the coverage layer: no AI, no guessing, no invented facts. A place
 * only appears because somebody mapped it, and a facility only says "yes"
 * because somebody tagged it. Everything unknown stays unknown.
 *
 * Data © OpenStreetMap contributors, ODbL. Keep the credit in the app footer.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { overpass, sleep } from "./lib/overpass.mjs";
import { toCompact } from "./lib/compact.mjs";

const OUT = new URL("../public/places-osm.json", import.meta.url);
// Berlin's bounding box. An area lookup (area["name"="Berlin"]) only works on
// mirrors that build an area index, which is why some of them quietly return
// nothing; a bbox works everywhere.
const BBOX = "52.3383,13.0884,52.6755,13.7612";
const AREA = "";
/**
 * Each group: what to ask Overpass for, and what we know about that kind of
 * place without reading anything else. `fit` is per age band (1 = no, 5 = great)
 * and is a starting point you can correct in the app later.
 */
const GROUPS = [
  {
    id: "playground",
    label: "Spielplatz",
    query: `nwr["leisure"="playground"](${BBOX});`,
    setting: "outdoor", covered: 0,
    fit: { b: 2, t: 5, p: 5, s: 4 },
    free: true, price: "Free",
    open: ["08:00", "20:00"], tags: ["playground", "outdoor"],
  },
  {
    id: "indoor-play",
    label: "Indoor-Spielplatz",
    query: `nwr["leisure"="indoor_play"](${BBOX});
            nwr["leisure"="playground"]["indoor"="yes"](${BBOX});
            nwr["amenity"="indoor_play"](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 2, t: 5, p: 5, s: 4 },
    free: false, price: "€€",
    open: ["10:00", "19:00"], tags: ["indoor play", "indoor"],
  },
  {
    id: "farm",
    label: "Kinderbauernhof",
    query: `nwr["name"~"Kinderbauernhof|Jugendfarm|Kinderfarm|Tierhof|Streichelzoo",i](${BBOX});
            nwr["tourism"="farm"]["name"](${BBOX});`,
    setting: "outdoor", covered: 0.2,
    fit: { b: 3, t: 5, p: 5, s: 4 },
    free: true, price: "Free",
    open: ["10:00", "18:00"], tags: ["animals", "farm"],
  },
  {
    id: "zoo",
    label: "Zoo / Tierpark",
    query: `nwr["tourism"="zoo"](${BBOX});
            nwr["tourism"="aquarium"](${BBOX});`,
    setting: "mixed", covered: 0.4,
    fit: { b: 3, t: 5, p: 5, s: 5 },
    free: false, price: "€€",
    open: ["09:00", "18:00"], tags: ["animals"],
  },
  {
    id: "library",
    label: "Bibliothek",
    query: `nwr["amenity"="library"](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 4, t: 4, p: 5, s: 5 },
    free: true, price: "Free",
    open: ["10:00", "19:00"], closedDay: 0, tags: ["library", "quiet"],
  },
  {
    id: "museum",
    label: "Museum",
    query: `nwr["tourism"="museum"](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 1, t: 2, p: 4, s: 5 },
    free: false, price: "€€",
    open: ["10:00", "18:00"], closedDay: 1, tags: ["museum", "indoor"],
  },
  {
    id: "pool",
    label: "Schwimmbad",
    query: `nwr["leisure"="water_park"](${BBOX});
            nwr["amenity"="public_bath"](${BBOX});
            nwr["leisure"="swimming_pool"]["access"!="private"](${BBOX});
            nwr["leisure"="sports_centre"]["sport"="swimming"](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 4, t: 5, p: 5, s: 5 },
    free: false, price: "€",
    open: ["07:00", "20:00"], tags: ["swimming", "water"],
  },
  {
    id: "lake",
    label: "See / Strandbad",
    query: `nwr["leisure"="beach_resort"](${BBOX});
            nwr["natural"="beach"](${BBOX});`,
    setting: "outdoor", covered: 0,
    fit: { b: 3, t: 5, p: 5, s: 5 },
    free: true, price: "Free",
    open: ["09:00", "20:00"], season: [5, 9], hot: true, tags: ["lake", "water"],
  },
  {
    id: "park",
    label: "Park / Garten",
    query: `nwr["leisure"="park"]["name"](${BBOX});
            nwr["leisure"="garden"]["garden:type"="botanical"](${BBOX});`,
    setting: "outdoor", covered: 0,
    fit: { b: 3, t: 4, p: 4, s: 4 },
    free: true, price: "Free",
    open: ["07:00", "21:00"], tags: ["park", "outdoor"],
  },
  {
    id: "theatre",
    label: "Kindertheater",
    query: `nwr["amenity"="theatre"]["theatre:genre"~"children|puppet",i](${BBOX});
            nwr["amenity"="theatre"]["name"~"Kinder|Puppen|Figuren",i](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 1, t: 3, p: 5, s: 5 },
    free: false, price: "€",
    open: ["10:00", "18:00"], tags: ["theatre", "indoor"],
  },
  {
    id: "family-centre",
    label: "Familienzentrum",
    query: `nwr["amenity"="community_centre"]["name"~"Familienzentrum|Kinder|Eltern|Nachbarschaftshaus",i](${BBOX});
            nwr["social_facility"="outreach"]["name"~"Familien|Kinder",i](${BBOX});`,
    setting: "indoor", covered: 1,
    fit: { b: 5, t: 5, p: 4, s: 3 },
    free: true, price: "Free",
    open: ["09:00", "17:00"], closedDay: 0, tags: ["family centre", "indoor"],
  },
];

const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];

const all = [];
const summary = [];

let failures = 0;

for (const group of GROUPS) {
  if (only && group.id !== only) continue;
  process.stdout.write(`${group.label}… `);
  try {
    const elements = await overpass(`[out:json][timeout:180];(${group.query});out center tags qt;`, {
      onRetry: (n, secs, why) => process.stdout.write(`[${why}, retry ${n} in ${secs}s] `),
    });
    const mapped = elements.map((el) => toPlace(el, group)).filter(Boolean);
    all.push(...mapped);
    summary.push([group.label, mapped.length]);
    console.log(mapped.length === 0 ? "0  ← nothing came back, worth re-running" : `${mapped.length}`);
  } catch (error) {
    failures++;
    console.log(`failed (${error.message})`);
    summary.push([group.label, "failed"]);
  }
  await sleep(4000); // between categories: Overpass is a free shared service
}

if (!all.length) {
  console.log("\nNothing was imported, so public/places-osm.json was left untouched.");
  console.log("Overpass was busy or unreachable. Wait a few minutes and run it again,");
  console.log("or try one category first:  npm run import-places -- --only=playground");
  process.exit(1);
}

if (failures) {
  const existing = await readExisting();
  if (existing.length) {
    const fresh = new Set(all.map((p) => p.id));
    const kept = existing.filter((p) => !fresh.has(p.id));
    console.log(`\n${failures} categor${failures === 1 ? "y" : "ies"} failed — keeping ${kept.length} places from the last run.`);
    all.push(...kept);
  }
}

const places = dedupe(all);
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      _note:
        "Imported from OpenStreetMap by scripts/import-osm.mjs. Facilities come from OSM tags: 'unknown' means nobody has tagged it, not 'no'. Opening hours are category defaults unless openingHours holds the real OSM value.",
      importedAt: new Date().toISOString().slice(0, 10),
      format: "compact-1",
      count: places.length,
      source: "OpenStreetMap contributors (ODbL)",
      places: places.map((p) => (p.i ? p : toCompact(p))),
    },
    null,
    0
  ) + "\n"
);

console.log("\n" + summary.map(([l, n]) => `  ${l}: ${n}`).join("\n"));
console.log(`\n${all.length} found, ${places.length} after removing duplicates.`);
console.log(`Written to public/places-osm.json (${(JSON.stringify(places).length / 1024 / 1024).toFixed(2)} MB).`);

/* ---------------- helpers ---------------- */

async function readExisting() {
  try {
    const raw = JSON.parse(await readFile(OUT, "utf8"));
    return Array.isArray(raw.places) ? raw.places : [];
  } catch {
    return [];
  }
}

function toPlace(el, group) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon) return null;

  // a playground without a name is still useful; a museum without one is noise
  const unnamedOk = group.id === "playground";
  const name = t.name || (unnamedOk ? "Spielplatz" : null);
  if (!name) return null;

  const kids = /kinder|kids|family|familien|baby|krabbel/i.test(`${t.name || ""} ${t.description || ""}`);
  const fit = { ...group.fit };
  if (group.id === "museum" && kids) Object.assign(fit, { b: 2, t: 4, p: 5, s: 5 });

  // OSM sometimes states the ages a playground is built for
  const minAge = numeric(t.min_age);
  const maxAge = numeric(t.max_age);
  if (minAge !== null && minAge >= 6) Object.assign(fit, { b: 1, t: 1, p: 2, s: 5 });
  if (maxAge !== null && maxAge <= 6) Object.assign(fit, { s: 2 });

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    where: t["addr:suburb"] || t["addr:city"] || "Berlin",
    address: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") || null,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    kind: group.id,
    kindLabel: group.label,
    setting: group.setting,
    covered: group.covered,
    free: t.fee === "yes" ? false : group.free,
    priceHint: t.fee === "yes" ? "€" : group.price,
    typicalOpen: group.open[0],
    typicalClose: group.open[1],
    closedDay: group.closedDay ?? null,
    season: group.season ?? null,
    hotWeatherFavourite: group.hot ?? false,
    fit,
    facilities: {
      changing: yesNo(t.changing_table ?? t.diaper),
      stroller: t.wheelchair === "yes" ? "yes" : t.wheelchair === "no" ? "no" : "unknown",
      highchair: yesNo(t.highchair),
      playArea: group.id === "playground" || group.id === "indoor-play" ? "yes" : yesNo(t.kids_area),
      toilets: yesNo(t.toilets ?? t["toilets:access"]),
      water: yesNo(t.drinking_water),
    },
    minAge,
    maxAge,
    openingHours: t.opening_hours || null,
    url: t.website || t["contact:website"] || null,
    tags: group.tags,
    source: "osm",
    osmType: el.type,
    osmId: el.id,
  };
}

function yesNo(v) {
  if (v === undefined || v === null || v === "") return "unknown";
  if (["yes", "designated", "separate", "room", "limited"].includes(v)) return "yes";
  if (v === "no") return "no";
  return "unknown";
}

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Same name within 60 m, or the same spot twice: keep the richer record. */
function dedupe(list) {
  const kept = [];
  const grid = new Map();
  const key = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

  for (const p of list) {
    const cell = key(p);
    const neighbours = [];
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const [a, b] = cell.split(",").map(Number);
        const near = grid.get(`${(a + dx * 0.001).toFixed(3)},${(b + dy * 0.001).toFixed(3)}`);
        if (near) neighbours.push(...near);
      }
    }
    const twin = neighbours.find(
      (q) => q.name.toLowerCase() === p.name.toLowerCase() && metres(p, q) < 60
    );
    if (twin) {
      if (richness(p) > richness(twin)) Object.assign(twin, p);
      continue;
    }
    kept.push(p);
    if (!grid.has(cell)) grid.set(cell, []);
    grid.get(cell).push(p);
  }
  return kept;
}

function richness(p) {
  return (
    Object.values(p.facilities).filter((v) => v !== "unknown").length +
    (p.url ? 2 : 0) + (p.openingHours ? 2 : 0) + (p.address ? 1 : 0)
  );
}

function metres(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
