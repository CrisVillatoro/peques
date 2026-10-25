/**
 * Enough of OpenStreetMap's opening_hours syntax to be useful and honest.
 *
 * Real examples it handles:
 *   "24/7"
 *   "Mo-Fr 14:30-18:00"
 *   "Tu-Su 10:00-18:00; PH off"
 *   "Mo-Fr 09:00-18:00; Sa,Su 10:00-16:00"
 *   "Mo-Su 08:00-20:00; We off"
 *
 * Anything it cannot read returns null, and the caller falls back to the
 * category's typical hours — a guess clearly labelled as one. It never claims
 * a place is open when it cannot tell.
 */

const DAYS = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };
const DAY_RE = /^(mo|tu|we|th|fr|sa|su)(-(mo|tu|we|th|fr|sa|su))?$/;

/** @returns {Array<{day:number, from:number, to:number}>|null} minutes since midnight */
export function parseHours(spec) {
  if (!spec || typeof spec !== "string") return null;
  const text = spec.toLowerCase().trim();
  if (text === "24/7") return allWeek(0, 24 * 60);

  const windows = [];
  for (const rule of text.split(";")) {
    const part = rule.trim();
    if (!part || part.startsWith("ph") || part.startsWith("sh")) continue; // holidays: skip
    if (/\b(easter|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(part)) return null; // seasonal: too complex

    const m = part.match(/^([a-z,\-\s]*)\s*(off|closed|(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(\s*,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})*))$/);
    if (!m) return null;

    const days = parseDays(m[1]);
    if (!days) return null;
    if (m[2] === "off" || m[2] === "closed") {
      for (const d of days) for (let i = windows.length - 1; i >= 0; i--) if (windows[i].day === d) windows.splice(i, 1);
      continue;
    }
    for (const range of m[2].split(",")) {
      const [a, b] = range.split("-").map((s) => toMinutes(s.trim()));
      if (a === null || b === null) return null;
      for (const d of days) windows.push({ day: d, from: a, to: b <= a ? 24 * 60 : b });
    }
  }
  return windows.length ? windows : null;
}

export function isOpenByHours(spec, when) {
  const windows = parseHours(spec);
  if (!windows) return null; // unknown — the caller decides
  const day = when.getDay();
  const mins = when.getHours() * 60 + when.getMinutes();
  return windows.some((w) => w.day === day && mins >= w.from && mins < w.to - 30);
}

function parseDays(text) {
  const clean = text.replace(/\s/g, "");
  if (!clean) return [0, 1, 2, 3, 4, 5, 6]; // no days given means every day
  const out = new Set();
  for (const chunk of clean.split(",")) {
    const m = chunk.match(DAY_RE);
    if (!m) return null;
    const from = DAYS[m[1]];
    const to = m[3] ? DAYS[m[3]] : from;
    for (let d = from; ; d = (d + 1) % 7) {
      out.add(d);
      if (d === to) break;
    }
  }
  return [...out];
}

function toMinutes(hhmm) {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function allWeek(from, to) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, from, to }));
}
