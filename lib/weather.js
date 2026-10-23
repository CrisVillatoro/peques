// Weather straight from the browser — no server, no API key, so this works on
// plain webspace like your IONOS hosting.
//
// Open-Meteo is free for non-commercial use and allows browser requests.
// For Germany it serves the DWD ICON model. Forecasts reach about 7 days out;
// past that we simply have no weather and the app says so.
// Docs: https://open-meteo.com/en/docs/dwd-api

const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

export const FORECAST_DAYS = 7;

/**
 * @param {{lat:number, lon:number}} point
 * @param {{at?: Date, hours?: number}} options  at = the moment you plan to go out
 */
export async function fetchWeather({ lat, lon }, { at = new Date(), hours = 4 } = {}) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    "&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m" +
    `&timezone=Europe%2FBerlin&forecast_days=${FORECAST_DAYS}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather service answered ${res.status}`);
  const data = await res.json();

  const times = data.hourly?.time || [];
  // Open-Meteo returns local times like "2026-10-24T14:00"
  const wanted = localHourKey(at);
  let start = times.findIndex((t) => t >= wanted);
  if (start < 0) throw new Error("that day is beyond the forecast");
  const slice = (arr) => (arr || []).slice(start, start + hours);

  const temps = slice(data.hourly.temperature_2m);
  const rain = slice(data.hourly.precipitation);
  const prob = slice(data.hourly.precipitation_probability);
  const codes = slice(data.hourly.weather_code);
  const wind = slice(data.hourly.wind_speed_10m);
  if (!temps.length) throw new Error("no forecast hours for that time");

  const num = (v) => (typeof v === "number" ? v : 0);
  const chance = Math.max(...prob.map(num));
  return {
    tempC: temps.reduce((a, b) => a + num(b), 0) / temps.length,
    maxTempC: Math.max(...temps.map(num)),
    rainMm: Math.max(...rain.map(num)),
    rainChance: chance,
    rainy: codes.some((c) => RAIN_CODES.includes(c)) || chance >= 60,
    windKmh: Math.max(...wind.map(num)),
    condition: describe(codes[0], chance),
    forDate: wanted.slice(0, 10),
    source: "Open-Meteo (DWD ICON)",
    checkedAt: new Date().toISOString(),
  };
}

function localHourKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

function describe(code, chance) {
  if (code === undefined || code === null) return "no data";
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (RAIN_CODES.includes(code)) return code >= 71 && code <= 77 ? "snow" : "rain";
  return chance >= 60 ? "rain likely" : "dry";
}
