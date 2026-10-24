// Your hand-written places are the ones you trust, so they always win.
// Imported OpenStreetMap places fill in everything around them.

import { distanceKm } from "./rules.js";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß ]/g, "")
    .replace(/\b(berlin|kinder|das|der|die|das)\b/g, "")
    .trim();

/** True when two entries are almost certainly the same place. */
function samePlace(a, b) {
  if (distanceKm(a, b) > 0.25) return false;
  const na = norm(a.name);
  const nb = norm(b.name);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * @param {Array} curated  data/places.json — hand-written, trusted
 * @param {Array} imported public/places-osm.json — OpenStreetMap
 */
export function mergePlaces(curated = [], imported = []) {
  const out = curated.map((p) => ({ ...p, source: p.source || "curated" }));
  for (const p of imported) {
    if (out.some((c) => samePlace(c, p))) continue;
    out.push(p);
  }
  return out;
}

export function countBySource(places) {
  let curated = 0;
  let osm = 0;
  for (const p of places) (p.source === "osm" ? osm++ : curated++);
  return { curated, osm, total: places.length };
}
