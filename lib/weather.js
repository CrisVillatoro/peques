// Weather straight from the browser — no server, no API key, so this works on
// plain webspace like your IONOS hosting.
//
// Open-Meteo is free for non-commercial use and allows browser requests.
// For Germany it serves the DWD ICON model.
// Docs: https://open-meteo.com/en/docs/dwd-api

const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

export async function fetchWeather({ lat, lon }, hours = 5) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    "&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m" +
    "&timezone=Europe%2FBerlin&forecast_days=2";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather service answered ${res.status}`);
  const data = await res.json();

  const times = data.hourly?.time || [];
  const nowIso = new Date().toISOString().slice(0, 13); // yyyy-mm-ddThh
  let start = times.findIndex((t) => t.slice(0, 13) >= nowIso);
  if (start < 0) start = 0;
  const slice = (arr) => (arr || []).slice(start, start + hours);

  const temps = slice(data.hourly.temperature_2m);
  const rain = slice(data.hourly.precipitation);
  const prob = slice(data.hourly.precipitation_probability);
  const codes = slice(data.hourly.weather_code);
  const wind = slice(data.hourly.wind_speed_10m);
  if (!temps.length) throw new Error("no forecast hours returned");

  const num = (v) => (typeof v === "number" ? v : 0);
  return {
    tempC: temps.reduce((a, b) => a + num(b), 0) / temps.length,
    maxTempC: Math.max(...temps.map(num)),
    rainMm: Math.max(...rain.map(num)),
    rainChance: Math.max(...prob.map(num)),
    rainy: codes.some((c) => RAIN_CODES.includes(c)) || Math.max(...prob.map(num)) >= 60,
    windKmh: Math.max(...wind.map(num)),
    condition: describe(codes[0], Math.max(...prob.map(num))),
    source: "Open-Meteo (DWD ICON)",
    checkedAt: new Date().toISOString(),
  };
}

function describe(code, chance) {
  if (code === undefined || code === null) return "now";
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (RAIN_CODES.includes(code)) return code >= 71 && code <= 77 ? "snow" : "rain";
  return chance >= 60 ? "rain likely" : "dry";
}
