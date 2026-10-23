/**
 * Fills data/food.json with kid-friendly cafés and restaurants in Berlin,
 * straight from OpenStreetMap (Overpass API). Nothing is invented: a place
 * only appears if someone tagged it with a changing table, a high chair or a
 * kids' area.
 *
 * Run on your Mac:   npm run import-food
 * Re-run it every few months to pick up new tags.
 *
 * Data © OpenStreetMap contributors, ODbL. Keep the credit in the app footer.
 */
import { writeFile } from "node:fs/promises";

const FILE = new URL("../data/food.json", import.meta.url);
const ENDPOINT = "https://overpass-api.de/api/interpreter";

const query = `
[out:json][timeout:120];
area["name"="Berlin"]["admin_level"="4"]->.berlin;
(
  nwr["amenity"~"^(cafe|restaurant|ice_cream|fast_food)$"]["changing_table"="yes"](area.berlin);
  nwr["amenity"~"^(cafe|restaurant|ice_cream|fast_food)$"]["highchair"="yes"](area.berlin);
  nwr["amenity"~"^(cafe|restaurant|ice_cream|fast_food)$"]["kids_area"](area.berlin);
);
out center tags;
`;

console.log("Asking OpenStreetMap for kid-friendly places to eat in Berlin…");
const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) {
  console.error(`Overpass answered ${res.status}. It is a free shared service — wait a minute and try again.`);
  process.exit(1);
}
const data = await res.json();

const places = (data.elements || [])
  .map((el) => {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon || !t.name) return null;
    return {
      id: `osm-${el.type}-${el.id}`,
      name: t.name,
      where: t["addr:suburb"] || t["addr:city"] || "Berlin",
      kind: t.amenity,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      facilities: {
        changing: t.changing_table === "yes" ? "yes" : "unknown",
        highchair: t.highchair === "yes" ? "yes" : "unknown",
        playArea: t.kids_area && t.kids_area !== "no" ? "yes" : "unknown",
        outdoorSeating: t.outdoor_seating === "yes" ? "yes" : "unknown",
      },
      openingHours: t.opening_hours || null,
      source: "OpenStreetMap contributors (ODbL)",
      importedAt: new Date().toISOString().slice(0, 10),
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

await writeFile(
  FILE,
  JSON.stringify(
    {
      _note: "Imported from OpenStreetMap by scripts/import-food.mjs. Facilities come from OSM tags; 'unknown' means nobody has tagged it, not 'no'.",
      _fields: "id, name, where, lat, lon, facilities, openingHours, source",
      places,
    },
    null,
    2
  ) + "\n"
);
console.log(`Saved ${places.length} places to data/food.json.`);
