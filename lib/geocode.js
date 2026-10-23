// Turning a typed place name into coordinates, in the browser.
//
// Quick picks cover the common case (you know which Kiez you'll be in) with no
// network call at all. The search box falls back to OpenStreetMap's Nominatim,
// which is free and allows browser requests, but asks for light use: one search
// per typed query, never per keystroke.

export const QUICK_PLACES = [
  { name: "Mitte", lat: 52.5208, lon: 13.4049 },
  { name: "Prenzlauer Berg", lat: 52.5390, lon: 13.4240 },
  { name: "Friedrichshain", lat: 52.5155, lon: 13.4540 },
  { name: "Kreuzberg", lat: 52.4985, lon: 13.4030 },
  { name: "Neukölln", lat: 52.4810, lon: 13.4350 },
  { name: "Charlottenburg", lat: 52.5160, lon: 13.3040 },
  { name: "Wedding", lat: 52.5500, lon: 13.3600 },
  { name: "Pankow", lat: 52.5690, lon: 13.4020 },
  { name: "Schöneberg", lat: 52.4830, lon: 13.3550 },
  { name: "Lichtenberg", lat: 52.5160, lon: 13.4980 },
  { name: "Treptow", lat: 52.4930, lon: 13.4600 },
  { name: "Tempelhof", lat: 52.4700, lon: 13.3850 },
  { name: "Steglitz", lat: 52.4560, lon: 13.3230 },
  { name: "Spandau", lat: 52.5350, lon: 13.1990 },
];

export const RADIUS_OPTIONS = [
  { km: 2, label: "2 km" },
  { km: 5, label: "5 km" },
  { km: 10, label: "10 km" },
  { km: null, label: "All Berlin" },
];

/** Search Berlin addresses, streets and places. Returns up to 5 matches. */
export async function searchPlaces(query) {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=de" +
    "&viewbox=13.05,52.70,13.80,52.33&bounded=1" +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`search answered ${res.status}`);
  const hits = await res.json();
  return hits.map((h) => ({
    name: shortName(h.display_name),
    full: h.display_name,
    lat: Number(h.lat),
    lon: Number(h.lon),
  }));
}

function shortName(displayName) {
  const parts = displayName.split(",").map((s) => s.trim());
  return parts.slice(0, 2).join(", ");
}
