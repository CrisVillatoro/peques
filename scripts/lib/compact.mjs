/**
 * The imported library is fetched by every visitor, so it is stored small:
 * no nulls, no "unknown" facilities, no fields the app can work out itself
 * (the category label and the icon tags both follow from `kind`).
 *
 * lib/places.js expands a record back into the full shape when the app loads.
 */
export function toCompact(p) {
  const out = {
    i: p.id,
    n: p.name,
    w: p.where,
    la: p.lat,
    lo: p.lon,
    k: p.kind,
    f: [p.fit.b, p.fit.t, p.fit.p, p.fit.s],
  };
  if (p.address) out.a = p.address;
  if (p.url) out.u = p.url;
  if (p.openingHours) out.oh = p.openingHours;
  if (p.free === false) out.p = p.priceHint || "€";
  if (p.source && p.source !== "osm") out.s = p.source;
  if (p.note) out.d = p.note;

  // only the facilities somebody actually recorded
  const facts = {};
  for (const [key, short] of [["changing", "c"], ["stroller", "s"], ["highchair", "h"], ["playArea", "p"], ["toilets", "t"], ["water", "w"]]) {
    const v = p.facilities?.[key];
    if (v === "yes") facts[short] = 1;
    else if (v === "no") facts[short] = 0;
  }
  if (Object.keys(facts).length) out.x = facts;
  return out;
}
