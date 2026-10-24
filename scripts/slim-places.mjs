/**
 * Shrinks an already-imported public/places-osm.json in place, without
 * asking OpenStreetMap again.
 *
 *   npm run slim-places
 */
import { readFile, writeFile } from "node:fs/promises";
import { toCompact } from "./lib/compact.mjs";

const FILE = new URL("../public/places-osm.json", import.meta.url);
const before = await readFile(FILE, "utf8");
const data = JSON.parse(before);
const places = (data.places || []).map((p) => (p.i ? p : toCompact(p)));

await writeFile(
  FILE,
  JSON.stringify({ ...data, format: "compact-1", count: places.length, places }, null, 0) + "\n"
);

const after = (await readFile(FILE, "utf8")).length;
console.log(`${places.length} places`);
console.log(`${(before.length / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB`);
