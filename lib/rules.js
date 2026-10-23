// Scout v0.1 — all the rules in one place. Plain code, no AI.
// Change the numbers here to tune the app to your family.

export const WEATHER_RULES = {
  rainMm: 0.2,          // mm in the next hours that counts as "it will rain"
  hotC: 28,             // from here: water, shade, or cool indoors
  coldC: 3,             // from here: indoors, or a short trip
  pleasantMinC: 12,     // comfortable outdoor range
  pleasantMaxC: 27,
  windyKmh: 35,
};

export const SCORE_WEIGHTS = {
  ageFit: 2.6,          // how well it suits the kids who are coming
  travel: 1.0,          // minus points per 15 minutes of travel
  weatherBonus: 1.4,    // matches what the weather calls for
  freeBonus: 0.3,
  noveltyBonus: 0.4,    // not seen in the last suggestions
};

export const AGE_BANDS = [
  { key: "b", label: "0–1", maxMonths: 23 },
  { key: "t", label: "2–3", maxMonths: 47 },
  { key: "p", label: "4–6", maxMonths: 83 },
  { key: "s", label: "7–10", maxMonths: 131 },
];

export function bandForMonths(months) {
  for (const b of AGE_BANDS) if (months <= b.maxMonths) return b.key;
  return "s";
}

// What does the weather ask for? "indoor" | "outdoor" | "water" | "short-outdoor"
export function weatherMode(w) {
  if (!w) return "outdoor";
  if (w.rainMm >= WEATHER_RULES.rainMm || w.rainy) return "indoor";
  if (w.tempC >= WEATHER_RULES.hotC) return "water";
  if (w.tempC <= WEATHER_RULES.coldC || w.windKmh >= WEATHER_RULES.windyKmh) return "indoor";
  if (w.tempC < WEATHER_RULES.pleasantMinC) return "short-outdoor";
  return "outdoor";
}

export function weatherSentence(w, mode) {
  if (!w) return "No weather data right now, so I am showing a mix.";
  const t = `${Math.round(w.tempC)}°`;
  if (mode === "indoor" && (w.rainMm >= WEATHER_RULES.rainMm || w.rainy)) return `Indoor today: rain is likely (${t}).`;
  if (mode === "indoor") return `Indoor today: ${t} and uncomfortable outside.`;
  if (mode === "water") return `Hot today (${t}): water and shade first.`;
  if (mode === "short-outdoor") return `Dry but cool (${t}): outdoors, keep it short, café nearby.`;
  return `Dry and ${t}: outdoors first.`;
}

// Distance in km between two coordinates.
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough travel time. Replaced by real BVG times in a later phase.
export function travelEstimate(km) {
  if (km <= 1.2) return { minutes: Math.max(4, Math.round(km * 13)), mode: "walk" };
  return { minutes: Math.round(8 + km * 3.2), mode: "transit" };
}

export function groupFit(place, kids) {
  const active = kids.filter((k) => k.coming);
  if (!active.length) return place.fit.t;
  let sum = 0;
  let weight = 0;
  for (const k of active) {
    const band = bandForMonths(k.months);
    const w = band === "b" || band === "t" ? 2 : 1; // the youngest decides most
    sum += (place.fit[band] ?? 3) * w;
    weight += w;
  }
  return sum / weight;
}

function openNow(place, now) {
  if (place.closedDay !== null && place.closedDay !== undefined && place.closedDay === now.getDay()) return false;
  if (place.season) {
    const m = now.getMonth() + 1;
    if (m < place.season[0] || m > place.season[1]) return false;
  }
  const [oh, om] = (place.typicalOpen || "00:00").split(":").map(Number);
  const [ch, cm] = (place.typicalClose || "23:59").split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm - 30; // leave 30 min to be worth going
}

/**
 * Rank places. Everything here is plain arithmetic, so it is easy to test
 * and easy to explain — the AI steps come in a later phase.
 */
export function rankPlaces({ places, origin, kids, choice, weather, now = new Date(), limit = 3 }) {
  const mode = choice === "auto" ? weatherMode(weather) : choice;
  const wantsIndoor = mode === "indoor";
  const wantsWater = mode === "water";

  const scored = places
    .filter((p) => {
      if (choice === "indoor") return p.setting === "indoor";
      if (choice === "outdoor") return p.setting !== "indoor";
      if (wantsIndoor) return p.setting === "indoor" || (p.setting === "mixed" && p.covered >= 0.3);
      return true;
    })
    .filter((p) => openNow(p, now))
    .filter((p) => !(p.hotWeatherFavourite && p.setting === "outdoor" && mode !== "water"))
    .map((p) => {
      const km = origin ? distanceKm(origin, p) : 4;
      const travel = travelEstimate(km);
      const fit = groupFit(p, kids);
      let score = fit * SCORE_WEIGHTS.ageFit - (travel.minutes / 15) * SCORE_WEIGHTS.travel;
      if (wantsWater && p.hotWeatherFavourite) score += SCORE_WEIGHTS.weatherBonus;
      if (wantsWater && p.setting === "indoor") score += SCORE_WEIGHTS.weatherBonus * 0.5;
      if (wantsIndoor && p.setting === "indoor") score += SCORE_WEIGHTS.weatherBonus;
      if (!wantsIndoor && !wantsWater && p.setting === "outdoor") score += SCORE_WEIGHTS.weatherBonus;
      if (mode === "short-outdoor" && travel.minutes > 25) score -= 1;
      if (p.free) score += SCORE_WEIGHTS.freeBonus;
      return { place: p, score, travel, fit, km };
    })
    .sort((a, b) => b.score - a.score);

  return { mode, results: scored.slice(0, limit), total: scored.length };
}

export function whySentence(r, mode, weather) {
  const p = r.place;
  const parts = [];
  if (mode === "indoor") parts.push(p.setting === "indoor" ? "Fully indoors" : "Mostly under cover");
  else if (mode === "water") parts.push(p.hotWeatherFavourite ? "Water and shade" : "Cool inside");
  else parts.push(p.setting === "outdoor" ? "Outdoors" : "Outdoors with shelter nearby");
  parts.push(`${r.travel.minutes} min ${r.travel.mode === "walk" ? "on foot" : "by public transport"}`);
  if (r.fit >= 4.5) parts.push("a good match for everyone coming");
  else if (r.fit >= 3.5) parts.push("suits your group");
  if (p.free) parts.push("free");
  return parts.join(" · ") + ".";
}
