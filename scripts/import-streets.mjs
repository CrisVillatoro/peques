/**
 * Downloads the centre point and name of every street in Berlin, so nameless
 * playgrounds can be called after the street they are on.
 *
 *   npm run import-streets
 *
 * Writes data/streets.json (a few MB). This file never reaches the browser —
 * it is only used by npm run name-places.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { overpass, sleep } from "./lib/overpass.mjs";

const OUT = new URL("../data/streets.json", import.meta.url);
const KINDS = "residential|living_street|pedestrian|unclassified|tertiary|secondary|primary|footway|path";

// Berlin in four pieces: one query for the whole city times out.
const QUADRANTS = [
  ["south-west", "52.3383,13.0884,52.5100,13.4300"],
  ["south-east", "52.3383,13.4300,52.5100,13.7612"],
  ["north-west", "52.5100,13.0884,52.6755,13.4300"],
  ["north-east", "52.5100,13.4300,52.6755,13.7612"],
];

const streets = new Map(); // name + rounded position, so one street keeps a few points

for (const [label, bbox] of QUADRANTS) {
  process.stdout.write(`${label}… `);
  try {
    const elements = await overpass(
      `[out:json][timeout:180];way["highway"~"^(${KINDS})$"]["name"](${bbox});out center tags qt;`,
      { onRetry: (n, secs, why) => process.stdout.write(`[${why}, retry ${n} in ${secs}s] `) }
    );
    let added = 0;
    for (const el of elements) {
      const name = el.tags?.name;
      const lat = el.center?.lat;
      const lon = el.center?.lon;
      if (!name || !lat || !lon) continue;
      const key = `${name}|${lat.toFixed(3)},${lon.toFixed(3)}`;
      if (streets.has(key)) continue;
      streets.set(key, [name, Number(lat.toFixed(5)), Number(lon.toFixed(5))]);
      added++;
    }
    console.log(added);
  } catch (error) {
    console.log(`failed (${error.message})`);
  }
  await sleep(4000);
}

if (!streets.size) {
  console.log("\nNothing came back — data/streets.json was left as it was.");
  process.exit(1);
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ count: streets.size, streets: [...streets.values()] }, null, 0) + "\n");
console.log(`\n${streets.size} street points saved to data/streets.json.`);
console.log("Now run:  npm run name-places");
