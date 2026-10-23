/**
 * A polite Overpass client.
 *
 * Overpass is run by volunteers and hands out "slots": ask too fast, or ask
 * without saying who you are, and you get 429 Too Many Requests. This module
 * identifies the script, checks for a free slot before asking, waits when the
 * server says to wait, and backs off properly instead of retrying in a loop.
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const STATUS = "https://overpass-api.de/api/status";

// Overpass asks every client to identify itself and give a contact.
const UA =
  process.env.OVERPASS_UA ||
  "peques/0.1 (personal family-activity app; contact: villatorocrista@gmail.com)";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ask the main server how many slots are free, and when the next one frees up. */
export async function waitForSlot({ quiet = false } = {}) {
  try {
    const res = await fetch(STATUS, { headers: { "User-Agent": UA } });
    if (!res.ok) return;
    const text = await res.text();
    const free = /(\d+) slots available now/.exec(text);
    if (free && Number(free[1]) > 0) return;
    const waits = [...text.matchAll(/in (\d+) seconds/g)].map((m) => Number(m[1]));
    if (waits.length) {
      const wait = Math.min(...waits) + 2;
      if (!quiet) process.stdout.write(`(waiting ${wait}s for a free slot) `);
      await sleep(wait * 1000);
    }
  } catch {
    /* status is a nicety, not a requirement */
  }
}

/**
 * Run one Overpass query. Returns the elements array.
 * Retries with growing pauses, and moves to a mirror when one is busy.
 */
export async function overpass(query, { retries = 4, onRetry } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    if (endpoint === ENDPOINTS[0]) await waitForSlot({ quiet: attempt > 0 });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
      });
      if (res.status === 429 || res.status === 504 || res.status === 503) {
        throw new Error(`server busy (${res.status})`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.elements || [];
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const pause = [20, 45, 90, 150][Math.min(attempt, 3)] * 1000;
      onRetry?.(attempt + 1, Math.round(pause / 1000), error.message);
      await sleep(pause);
    }
  }
  throw lastError;
}

export { UA, ENDPOINTS };
