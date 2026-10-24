/**
 * Expands a compact imported record (see scripts/lib/compact.mjs) back into
 * the shape the app works with, filling in what can be derived from the
 * category: the German label, the icon, typical opening hours and the
 * indoor/outdoor setting.
 */

export const KINDS = {
  playground:     { label: "Spielplatz",        setting: "outdoor", covered: 0,   open: ["08:00", "20:00"], tags: ["playground"] },
  "indoor-play":  { label: "Indoor-Spielplatz", setting: "indoor",  covered: 1,   open: ["10:00", "19:00"], tags: ["indoor play"] },
  farm:           { label: "Kinderbauernhof",   setting: "outdoor", covered: 0.2, open: ["10:00", "18:00"], tags: ["farm"] },
  zoo:            { label: "Zoo / Tierpark",    setting: "mixed",   covered: 0.4, open: ["09:00", "18:00"], tags: ["animals"] },
  library:        { label: "Bibliothek",        setting: "indoor",  covered: 1,   open: ["10:00", "19:00"], closedDay: 0, tags: ["library"] },
  museum:         { label: "Museum",            setting: "indoor",  covered: 1,   open: ["10:00", "18:00"], closedDay: 1, tags: ["museum"] },
  pool:           { label: "Schwimmbad",        setting: "indoor",  covered: 1,   open: ["07:00", "20:00"], tags: ["swimming"] },
  lake:           { label: "See / Strandbad",   setting: "outdoor", covered: 0,   open: ["09:00", "20:00"], season: [5, 9], hot: true, tags: ["lake"] },
  park:           { label: "Park / Garten",     setting: "outdoor", covered: 0,   open: ["07:00", "21:00"], tags: ["park"] },
  theatre:        { label: "Kindertheater",     setting: "indoor",  covered: 1,   open: ["10:00", "18:00"], tags: ["theatre"] },
  "family-centre":{ label: "Familienzentrum",   setting: "indoor",  covered: 1,   open: ["09:00", "17:00"], closedDay: 0, tags: ["family centre"] },
};

const FACILITY = { c: "changing", s: "stroller", h: "highchair", p: "playArea", t: "toilets", w: "water" };

export function expand(r) {
  if (!r.i) return r; // already a full record (your hand-written list)
  const kind = KINDS[r.k] || KINDS.park;
  const facilities = { changing: "unknown", stroller: "unknown", highchair: "unknown", playArea: "unknown", toilets: "unknown", water: "unknown" };
  for (const [short, key] of Object.entries(FACILITY)) {
    if (r.x && short in r.x) facilities[key] = r.x[short] ? "yes" : "no";
  }
  if (r.k === "playground" || r.k === "indoor-play") facilities.playArea = "yes";

  const generic = /^(spielplatz|playground|park|grünanlage|garten)$/i.test(r.n || "");
  const name = generic && r.a ? `${r.n} ${r.a}` : generic && r.w && r.w !== "Berlin" ? `${r.n} in ${r.w}` : r.n;

  return {
    id: r.i,
    name,
    where: r.w,
    address: r.a || null,
    lat: r.la,
    lon: r.lo,
    kind: r.k,
    kindLabel: kind.label,
    setting: kind.setting,
    covered: kind.covered,
    free: !r.p,
    priceHint: r.p || "Gratis",
    typicalOpen: kind.open[0],
    typicalClose: kind.open[1],
    closedDay: kind.closedDay ?? null,
    season: kind.season ?? null,
    hotWeatherFavourite: kind.hot ?? false,
    fit: { b: r.f[0], t: r.f[1], p: r.f[2], s: r.f[3] },
    facilities,
    openingHours: r.oh || null,
    url: r.u || null,
    note: r.d || null,
    tags: kind.tags,
    source: r.s || "osm",
  };
}

/** Your hand-written places describe themselves with tags, not a kind. */
const TAG_TO_KIND = {
  playground: "playground", park: "park", garden: "park", outdoor: "park",
  "indoor play": "indoor-play", "indoor halls": "indoor-play",
  animals: "farm", farm: "farm",
  library: "library", quiet: "library", books: "library",
  museum: "museum", art: "museum", "hands-on": "museum", dinosaurs: "museum", experiments: "museum",
  swimming: "pool", "warm water": "pool",
  water: "lake", lake: "lake", summer: "lake",
  theatre: "theatre", "family centre": "family-centre",
};

/** One canonical category, whether the place was imported or written by hand. */
export function kindOf(p) {
  if (p.kind) return p.kind;
  for (const tag of p.tags || []) if (TAG_TO_KIND[tag]) return TAG_TO_KIND[tag];
  return "other";
}

/** The German label to show on a card. */
export function labelFor(p) {
  if (p.kindLabel) return p.kindLabel;
  const k = kindOf(p);
  return KINDS[k]?.label || null;
}

/** How much do we actually know about this place? Used to break ties. */
export function richness(p) {
  let score = 0;
  if (p.url) score += 2;
  if (p.openingHours) score += 2;
  if (p.address) score += 1;
  if (p.note) score += 1;
  score += Object.values(p.facilities || {}).filter((v) => v !== "unknown").length;
  if (/^(spielplatz|playground|park|grünanlage)$/i.test(p.name || "")) score -= 2; // nameless, generic
  return score;
}
