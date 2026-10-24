/**
 * Gives every imported place its real Berlin Ortsteil (Friedenau, Wedding,
 * Prenzlauer Berg…), so a nameless playground becomes "Spielplatz in
 * Friedenau" instead of "Spielplatz · Berlin".
 *
 *   npm run ortsteile
 *
 * Boundaries: Geoportal Berlin, ALKIS Ortsteile (dl-de/by-2-0). Fetched once
 * here and used only at import time — nothing extra ships to the browser.
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../public/places-osm.json", import.meta.url);
const WFS =
  "https://gdi.berlin.de/services/wfs/alkis_ortsteile?service=WFS&version=2.0.0&request=GetFeature" +
  "&typeNames=alkis_ortsteile:ortsteile&outputFormat=application/json&srsName=EPSG:4326";

console.log("Fetching Berlin's Ortsteil boundaries…");
const res = await fetch(WFS, { headers: { Accept: "application/json", "User-Agent": "peques/0.1" } });
if (!res.ok) {
  console.error(`The city's service answered HTTP ${res.status}. Try again later.`);
  process.exit(1);
}
const geo = await res.json();
const areas = (geo.features || [])
  .map((f) => ({
    name: nameOf(f.properties),
    rings: ringsOf(f.geometry),
    bbox: null,
  }))
  .filter((a) => a.name && a.rings.length);
for (const a of areas) a.bbox = bboxOf(a.rings);
console.log(`${areas.length} Ortsteile.`);
if (!areas.length) {
  console.error("No usable boundaries came back; nothing was changed.");
  process.exit(1);
}

const data = JSON.parse(await readFile(FILE, "utf8"));
let changed = 0;
for (const p of data.places || []) {
  const lat = p.la ?? p.lat;
  const lon = p.lo ?? p.lon;
  if (typeof lat !== "number" || typeof lon !== "number") continue;
  const area = areas.find((a) => inBbox(a.bbox, lon, lat) && a.rings.some((r) => inRing(r, lon, lat)));
  if (!area) continue;
  const before = p.w ?? p.where;
  if (before !== area.name) {
    if ("w" in p) p.w = area.name; else p.where = area.name;
    changed++;
  }
}

await writeFile(FILE, JSON.stringify(data, null, 0) + "\n");
console.log(`${changed} of ${data.places.length} places now carry their Ortsteil.`);

/* ---------------- helpers ---------------- */

function nameOf(props = {}) {
  for (const k of ["nam", "name", "ortsteil", "ortsteilname", "bezeichnung", "OTEIL", "oteil"]) {
    const hit = Object.keys(props).find((x) => x.toLowerCase() === k.toLowerCase());
    if (hit && props[hit]) return String(props[hit]).trim();
  }
  return null;
}

function ringsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates[0]];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((poly) => poly[0]);
  return [];
}

function bboxOf(rings) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

const inBbox = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

/** Ray casting: is the point inside this ring? */
function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
