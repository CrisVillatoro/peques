"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { distanceKm, rankPlaces, weatherSentence, whySentence } from "../lib/rules";
import { fetchWeather } from "../lib/weather";
import Art from "./Art";

const BERLIN = { lat: 52.5234, lon: 13.4113 }; // fallback: Prenzlauer Berg-ish
const KIDS_KEY = "scout.kids.v1";

const DEFAULT_KIDS = [
  { id: "k1", name: "Little one", birth: isoMonthsAgo(28), coming: true, colour: "#FFC845" },
  { id: "k2", name: "Friend", birth: isoMonthsAgo(84), coming: false, colour: "#8FD0F5" },
];

function isoMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsSince(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

function ageLabel(months) {
  if (months < 24) return `${months}m`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}y ${m}m` : `${y}y`;
}

export default function ScoutApp({ places, food }) {
  const [kids, setKids] = useState(DEFAULT_KIDS);
  const [choice, setChoice] = useState("auto");
  const [origin, setOrigin] = useState(null);
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [phase, setPhase] = useState("home"); // home | searching | results
  const [openId, setOpenId] = useState(null);

  // remember the kids on this device only
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KIDS_KEY);
      if (raw) setKids(JSON.parse(raw));
    } catch (e) { /* private window, ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KIDS_KEY, JSON.stringify(kids)); } catch (e) { /* ignore */ }
  }, [kids]);

  const withAges = useMemo(
    () => kids.map((k) => ({ ...k, months: monthsSince(k.birth) })),
    [kids]
  );

  const loadWeather = useCallback(async (point) => {
    try {
      setWeather(await fetchWeather(point));
      setWeatherError(null);
    } catch (e) {
      setWeather(null);
      setWeatherError("No live weather right now");
    }
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setOrigin(BERLIN);
      loadWeather(BERLIN);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setOrigin(point);
        setLocating(false);
        loadWeather(point);
      },
      () => {
        setOrigin(BERLIN);
        setLocating(false);
        loadWeather(BERLIN);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, [loadWeather]);

  useEffect(() => { locate(); }, [locate]);

  const ranking = useMemo(
    () => rankPlaces({ places, origin: origin || BERLIN, kids: withAges, choice, weather }),
    [places, origin, withAges, choice, weather]
  );

  const scout = () => {
    setPhase("searching");
    setOpenId(null);
    setTimeout(() => setPhase("results"), 700);
  };

  const speak = (r) => {
    const p = r.place;
    const text = `Top pick: ${p.name}, ${p.where}. ${whySentence(r, ranking.mode, weather)} Typical opening until ${p.typicalClose}.`;
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      window.speechSynthesis?.speak(u);
    } catch (e) { /* ignore */ }
  };

  const wx = weather
    ? {
        cls: weather.rainMm >= 0.2 || weather.rainy ? "rain" : weather.tempC >= 28 ? "hot" : weather.tempC <= 3 ? "cold" : "sun",
        text: `${Math.round(weather.tempC)}° · ${weather.condition || "now"}`,
      }
    : { cls: "", text: weatherError || "checking weather…" };

  return (
    <main className="app">
      <h1 className="hello">
        {greeting()}
        <br />
        <em>What shall we do?</em>
      </h1>

      <div className="ctx">
        <button className="tag" onClick={locate} type="button">
          📍 {locating ? "finding you…" : origin && origin !== BERLIN ? "Near you" : "Berlin (approx.)"}
        </button>
        <span className={`tag ${wx.cls}`}>{wx.cls === "rain" ? "🌧" : wx.cls === "hot" ? "🥵" : wx.cls === "cold" ? "❄️" : "☀️"} {wx.text}</span>
      </div>

      <p className="label">Who&apos;s coming today?</p>
      <div className="kids">
        {withAges.map((k) => (
          <button
            key={k.id}
            type="button"
            className="kid"
            aria-pressed={k.coming}
            onClick={() => setKids((all) => all.map((x) => (x.id === k.id ? { ...x, coming: !x.coming } : x)))}
          >
            <span className="face" style={{ background: k.colour }}>{ageLabel(k.months)}</span>
            {k.name}
          </button>
        ))}
        <button
          type="button"
          className="kid add"
          onClick={() => {
            const birth = window.prompt("Birth month of the child (YYYY-MM). No names needed.", isoMonthsAgo(12));
            if (!birth || !/^\d{4}-\d{2}$/.test(birth)) return;
            const name = window.prompt("A short label for them (optional)", "Child") || "Child";
            setKids((all) => [
              ...all,
              { id: `k${Date.now()}`, name, birth, coming: true, colour: ["#9ED98B", "#B9A6F5", "#F2668B"][all.length % 3] },
            ]);
          }}
        >
          <span className="face">+</span>
          Add
        </button>
      </div>

      <p className="label">Inside or outside?</p>
      <div className="seg" role="radiogroup" aria-label="Indoor or outdoor">
        {[["indoor", "Indoor"], ["auto", "Weather decides"], ["outdoor", "Outdoor"]].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            data-mode={value}
            aria-checked={choice === value}
            onClick={() => setChoice(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="hint" aria-live="polite">
        {choice === "auto"
          ? weatherSentence(weather, ranking.mode)
          : choice === "indoor"
          ? "Only indoor places."
          : weather && (weather.rainMm >= 0.2 || weather.rainy)
          ? "Outdoor it is — I will show a covered option too."
          : "Outdoor places first."}
      </p>

      <button className="scout" type="button" onClick={scout} disabled={phase === "searching"}>
        <span>
          Scout now
          <small>{ranking.total} places open near you right now</small>
        </span>
        <span className="go" aria-hidden="true">→</span>
      </button>

      {phase === "searching" && <div className="spinner" role="status" aria-label="Searching" />}

      {phase === "results" && (
        <section>
          <p className="label" style={{ marginBottom: 0 }}>Your pick</p>
          <p className="rtitle">{ranking.results.length ? ranking.results[0].place.name : "Nothing open right now"}</p>
          <span className="why-chip">{weatherSentence(weather, ranking.mode)}</span>

          {ranking.results.map((r, i) => (
            <PlaceCard
              key={r.place.id}
              r={r}
              rank={i}
              mode={ranking.mode}
              weather={weather}
              food={food}
              open={openId === r.place.id || i === 0}
              onToggle={() => setOpenId(openId === r.place.id ? null : r.place.id)}
              onSpeak={() => speak(r)}
            />
          ))}

          {!ranking.results.length && (
            <p className="notice">
              Nothing matches right now — most places are closed or the filters are too tight. Try
              &ldquo;Weather decides&rdquo;, or add places to <code>data/places.json</code>.
            </p>
          )}
        </section>
      )}

      <p className="footer">
        Scout v0.1 · Places are a hand-written starter list: opening hours are typical values, always check the
        venue&apos;s own page. Weather from <a href="https://open-meteo.com/">Open-Meteo</a> (DWD ICON model). Place data you import
        comes from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. Your children&apos;s
        birth months stay in this browser; nothing is sent to a server.
      </p>
    </main>
  );
}

function PlaceCard({ r, rank, mode, weather, food, open, onToggle, onSpeak }) {
  const p = r.place;
  const nearbyFood = useMemo(() => {
    if (!food?.length) return [];
    return food
      .map((f) => ({ f, km: distanceKm(p, f) }))
      .filter((x) => x.km <= 0.9)
      .sort((a, b) => a.km - b.km)
      .slice(0, 2);
  }, [food, p]);

  return (
    <article className={`card ${rank > 0 ? "" : "top"}`}>
      <div className="art">
        <Art kind={p.tags?.[0] || p.setting} />
        {rank === 0 && <span className="rank">#1 today</span>}
        <button className="speak" type="button" onClick={onSpeak} aria-label="Read this pick aloud">🔊</button>
      </div>
      <div className="cbody">
        <div className="cname">{p.name}</div>
        <div className="cwhere">{p.where} · {p.priceHint}</div>
        <div className="meta">
          <span className={`m ${p.setting}`}>{p.setting === "indoor" ? "Indoor" : p.setting === "outdoor" ? "Outdoor" : "Mixed"}</span>
          <span className="m">{r.travel.minutes} min {r.travel.mode === "walk" ? "walk" : "by transit"}</span>
          <span className="m fit">{r.fit >= 4.5 ? "Great fit" : r.fit >= 3.5 ? "Good fit" : "OK fit"}</span>
          <span className="m">typical until {p.typicalClose}</span>
        </div>
        <p className="why"><b>Why:</b> {whySentence(r, mode, weather)}</p>

        {open && (
          <>
            {p.note && <p style={{ fontSize: 13.5, marginTop: 10 }}>{p.note}</p>}
            <div className="facts">
              <Fact label="Changing table" value={p.facilities.changing} />
              <Fact label="Stroller" value={p.facilities.stroller} />
              <Fact label="High chair" value={p.facilities.highchair} />
              <Fact label="Play area" value={p.facilities.playArea} />
            </div>
            {nearbyFood.length > 0 && (
              <>
                <p className="label" style={{ marginTop: 16 }}>Then what?</p>
                {nearbyFood.map(({ f, km }) => (
                  <p key={f.id} style={{ fontSize: 13.5, margin: "4px 0 0" }}>
                    <b>{f.name}</b> · {Math.round(km * 13)} min walk
                    {f.facilities?.highchair === "yes" ? " · high chair" : ""}
                    {f.facilities?.changing === "yes" ? " · changing table" : ""}
                  </p>
                ))}
              </>
            )}
            <div className="actions">
              <a
                className="primary"
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=transit`}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer">Opening hours</a>}
            </div>
          </>
        )}
        {rank > 0 && (
          <div className="actions">
            <button type="button" onClick={onToggle}>{open ? "Less" : "More"}</button>
          </div>
        )}
      </div>
    </article>
  );
}

function Fact({ label, value }) {
  const text = value === "yes" ? "yes" : value === "no" ? "no" : "unknown";
  return (
    <div className="fact">
      <b className={text === "unknown" ? "unknown" : undefined}>{text}</b>
      {label}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}
