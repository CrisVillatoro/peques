"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { distanceKm, rankPlaces, weatherSentence, whySentence } from "../lib/rules";
import { countBySource, mergePlaces } from "../lib/merge";
import { fetchWeather, FORECAST_DAYS } from "../lib/weather";
import { QUICK_PLACES, RADIUS_OPTIONS, searchPlaces } from "../lib/geocode";
import {
  dayOptions,
  daysAhead,
  defaultSlot,
  describeWhen,
  isoDate,
  resolveWhen,
  slotsFor,
} from "../lib/when";
import Art from "./Art";
import ResultsMap from "./ResultsMap";

const BERLIN = { lat: 52.5234, lon: 13.4113, label: "Berlin (centre)" };
const KIDS_KEY = "peques.kids.v1";
const PLACE_KEY = "peques.origin.v1";

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

export default function PequesApp({ places: seedPlaces, food }) {
  const [imported, setImported] = useState([]);
  const [library, setLibrary] = useState("loading"); // loading | ready | seed-only
  const [kids, setKids] = useState(DEFAULT_KIDS);
  const [choice, setChoice] = useState("auto");
  const [dateIso, setDateIso] = useState(() => isoDate(new Date()));
  const [slotKey, setSlotKey] = useState(() => defaultSlot());
  const [origin, setOrigin] = useState(BERLIN);
  const [maxKm, setMaxKm] = useState(5);
  const [showWhere, setShowWhere] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [phase, setPhase] = useState("home"); // home | searching | results
  const [view, setView] = useState("list"); // list | map
  const [openId, setOpenId] = useState(null);

  const days = useMemo(() => dayOptions(new Date()), []);
  const slots = useMemo(() => slotsFor(dateIso, new Date()), [dateIso]);
  const when = useMemo(() => resolveWhen(dateIso, slotKey, new Date()), [dateIso, slotKey]);
  const whenLabel = describeWhen(when, dateIso, slotKey, new Date());
  const tooFarForWeather = daysAhead(dateIso, new Date()) >= FORECAST_DAYS;

  useEffect(() => {
    if (!slots.some((s) => s.key === slotKey)) setSlotKey(slots[0].key);
  }, [slots, slotKey]);

  // remember kids and the last place, on this device only
  useEffect(() => {
    try {
      const k = localStorage.getItem(KIDS_KEY);
      if (k) setKids(JSON.parse(k));
      const o = localStorage.getItem(PLACE_KEY);
      if (o) {
        const saved = JSON.parse(o);
        if (saved?.origin?.lat) setOrigin(saved.origin);
        if (saved?.maxKm !== undefined) setMaxKm(saved.maxKm);
      }
    } catch (e) { /* private window, ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KIDS_KEY, JSON.stringify(kids)); } catch (e) { /* ignore */ }
  }, [kids]);
  useEffect(() => {
    try { localStorage.setItem(PLACE_KEY, JSON.stringify({ origin, maxKm })); } catch (e) { /* ignore */ }
  }, [origin, maxKm]);

  const withAges = useMemo(() => kids.map((k) => ({ ...k, months: monthsSince(k.birth) })), [kids]);

  // the imported OpenStreetMap library lives outside the app bundle, so the
  // page opens fast and the big file is fetched once and cached by the browser
  useEffect(() => {
    let cancelled = false;
    fetch("places-osm.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d.places) ? d.places : [];
        setImported(list);
        setLibrary(list.length ? "ready" : "seed-only");
      })
      .catch(() => !cancelled && setLibrary("seed-only"));
    return () => { cancelled = true; };
  }, []);

  const places = useMemo(() => mergePlaces(seedPlaces, imported), [seedPlaces, imported]);
  const counts = useMemo(() => countBySource(places), [places]);

  const loadWeather = useCallback(async (point, at) => {
    try {
      setWeather(await fetchWeather(point, { at }));
      setWeatherError(null);
    } catch (e) {
      setWeather(null);
      setWeatherError(
        daysAhead(isoDate(at)) >= FORECAST_DAYS
          ? `No forecast that far ahead (about ${FORECAST_DAYS} days)`
          : "No weather for that time"
      );
    }
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Where I am" });
        setLocating(false);
        setShowWhere(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { locate(); }, [locate]);
  useEffect(() => { loadWeather(origin, when); }, [origin, when, loadWeather]);

  const runSearch = async (e) => {
    e?.preventDefault();
    if (query.trim().length < 3) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchPlaces(query);
      setHits(found);
      if (!found.length) setSearchError("Nothing found in Berlin for that.");
    } catch (err) {
      setSearchError("Search is unavailable right now — try a district below.");
    } finally {
      setSearching(false);
    }
  };

  const pickPlace = (p) => {
    setOrigin({ lat: p.lat, lon: p.lon, label: p.name });
    setHits([]);
    setQuery("");
    setShowWhere(false);
  };

  const ranking = useMemo(
    () => rankPlaces({ places, origin, kids: withAges, choice, weather, now: when, maxKm, limit: 12 }),
    [places, origin, withAges, choice, weather, when, maxKm]
  );
  const picks = useMemo(() => ranking.results.slice(0, 3), [ranking]);
  const runnersUp = useMemo(() => ranking.results.slice(3), [ranking]);

  const find = () => {
    setPhase("searching");
    setOpenId(null);
    setTimeout(() => setPhase("results"), 600);
  };

  const wx = weather
    ? {
        cls: weather.rainMm >= 0.2 || weather.rainy ? "rain" : weather.tempC >= 28 ? "hot" : weather.tempC <= 3 ? "cold" : "sun",
        icon: weather.rainMm >= 0.2 || weather.rainy ? "🌧" : weather.tempC >= 28 ? "🥵" : weather.tempC <= 3 ? "❄️" : "☀️",
        text: `${Math.round(weather.tempC)}° · ${weather.condition}`,
      }
    : { cls: "", icon: "·", text: weatherError || "checking weather…" };

  return (
    <div className="shell">
      <header className="masthead">
        <span className="wordmark"><i aria-hidden="true" />Peques</span>
        <span className="tagline">Good things to do with the little ones, in Berlin</span>
      </header>

      <section className="panel">
        <h1 className="hello">{greeting()}<br /><em>What shall we do?</em></h1>

        <div className="ctx">
          <button className="tag" type="button" onClick={() => setShowWhere((v) => !v)} aria-expanded={showWhere}>
            📍 {locating ? "finding you…" : origin.label} <span className="change">change</span>
          </button>
          <span className={`tag ${wx.cls}`}>{wx.icon} {wx.text}</span>
        </div>

        {showWhere && (
          <div className="where">
            <form onSubmit={runSearch} className="searchrow">
              <input
                id="place-search"
                type="search"
                placeholder="Street, Kiez or place in Berlin"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={searching || query.trim().length < 3}>
                {searching ? "…" : "Search"}
              </button>
            </form>
            {searchError && <p className="hint">{searchError}</p>}
            {hits.length > 0 && (
              <ul className="hits">
                {hits.map((h) => (
                  <li key={`${h.lat},${h.lon}`}>
                    <button type="button" onClick={() => pickPlace(h)}>
                      <b>{h.name}</b>
                      <small>{h.full}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="chips">
              <button type="button" className="chip" onClick={locate}>📍 Use my location</button>
              {QUICK_PLACES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="chip small"
                  aria-pressed={origin.label === p.name}
                  onClick={() => pickPlace(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="label">How far?</p>
        <div className="chips" role="group" aria-label="Search radius">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="chip small"
              aria-pressed={maxKm === r.km}
              onClick={() => setMaxKm(r.km)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="label">When?</p>
        <div className="chips" role="group" aria-label="Which day">
          {days.map((d) => (
            <button key={d.key} type="button" className="chip" aria-pressed={dateIso === d.date} onClick={() => setDateIso(d.date)}>
              {d.label}
            </button>
          ))}
          <label className="chip date" htmlFor="pick-date">
            <span aria-hidden="true">📅</span>
            <input
              id="pick-date"
              type="date"
              aria-label="Pick another date"
              value={dateIso}
              min={isoDate(new Date())}
              onChange={(e) => e.target.value && setDateIso(e.target.value)}
            />
          </label>
        </div>
        <div className="chips" role="group" aria-label="Time of day">
          {slots.map((s) => (
            <button key={s.key} type="button" className="chip small" aria-pressed={slotKey === s.key} onClick={() => setSlotKey(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        {tooFarForWeather && (
          <p className="hint">More than {FORECAST_DAYS} days ahead, so there is no forecast yet — results ignore the weather.</p>
        )}

        <p className="label">Who&apos;s coming?</p>
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
            <button key={value} type="button" role="radio" data-mode={value} aria-checked={choice === value} onClick={() => setChoice(value)}>
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

        <button className="find" type="button" onClick={find} disabled={phase === "searching"}>
          <span>
            Find something
            <small>
              {library === "loading"
                ? "loading places…"
                : `${ranking.total} place${ranking.total === 1 ? "" : "s"} open ${whenLabel}`}
            </small>
          </span>
          <span className="go" aria-hidden="true">→</span>
        </button>
      </section>

      <section className="results" aria-live="polite">
        {phase === "home" && (
          <div className="placeholder">
            <div className="placeholder-art"><Art kind="park" /></div>
            <p>Pick where you are, when you&apos;re going, and who&apos;s coming — then tap <b>Find something</b>.</p>
          </div>
        )}

        {phase === "searching" && <div className="spinner" role="status" aria-label="Searching" />}

        {phase === "results" && (
          <>
            <div className="rhead">
              <p className="rlabel">
                {picks.length ? "Your pick for" : "Nothing open"} {whenLabel}
                <span>from {origin.label}{maxKm ? ` · within ${maxKm} km` : " · all Berlin"}</span>
              </p>
              {picks.length > 0 && (
                <div className="viewtoggle" role="group" aria-label="List or map">
                  <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
                  <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
                </div>
              )}
            </div>

            {view === "map" && picks.length > 0 && (
              <ResultsMap
                origin={origin}
                maxKm={maxKm}
                results={picks}
                others={runnersUp}
                onPick={(id) => { setOpenId(id); setView("list"); }}
              />
            )}

            {view === "list" && picks.map((r, i) => (
              <PlaceCard
                key={r.place.id}
                r={r}
                rank={i}
                mode={ranking.mode}
                weather={weather}
                food={food}
                open={openId === r.place.id || (i === 0 && !openId)}
                onToggle={() => setOpenId(openId === r.place.id ? null : r.place.id)}
              />
            ))}

            {!picks.length && (
              <p className="notice">
                Nothing matches {whenLabel} within {maxKm ? `${maxKm} km` : "Berlin"}. Try a wider radius, another time of
                day, or &ldquo;Weather decides&rdquo;.
              </p>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        {library === "ready" && (
          <>Searching {counts.total.toLocaleString("en-GB")} places: {counts.curated} written by hand,{" "}
          {counts.osm.toLocaleString("en-GB")} imported from OpenStreetMap. · </>
        )}
        {library === "seed-only" && (
          <>Only the {counts.curated} hand-written places are loaded — run <code>npm run import-places</code> to add the
          rest. · </>
        )}
        Peques v0.1 · Places are a hand-written starter list: opening hours are typical values, always check the
        venue&apos;s own page. Weather from <a href="https://open-meteo.com/">Open-Meteo</a> (DWD ICON model). Address
        search and imported places come from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap
        contributors</a>. Your children&apos;s birth months and your last location stay in this browser; nothing is sent
        to a server.
      </footer>
    </div>
  );
}

function PlaceCard({ r, rank, mode, weather, food, open, onToggle }) {
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
    <article className={`card ${rank === 0 ? "top" : "small"}`}>
      <div className="art">
        <Art kind={p.tags?.[0] || p.setting} />
        {rank === 0 && <span className="rank">Top pick</span>}
      </div>
      <div className="cbody">
        <div className="cname">{p.name}</div>
        <div className="cwhere">{p.where} · {p.priceHint}</div>
        <div className="meta">
          <span className={`m ${p.setting}`}>{p.setting === "indoor" ? "Indoor" : p.setting === "outdoor" ? "Outdoor" : "Mixed"}</span>
          <span className="m">{r.travel.minutes} min {r.travel.mode === "walk" ? "walk" : "by transit"}</span>
          <span className="m">{r.km.toFixed(1)} km</span>
          <span className="m fit">{r.fit >= 4.5 ? "Great fit" : r.fit >= 3.5 ? "Good fit" : "OK fit"}</span>
          <span className="m">typical {p.typicalOpen}–{p.typicalClose}</span>
        </div>
        <p className="why"><b>Why:</b> {whySentence(r, mode, weather)}</p>

        {open && (
          <>
            {p.note && <p className="note-text">{p.note}</p>}
            <div className="facts">
              <Fact label="Changing table" value={p.facilities.changing} />
              <Fact label="Stroller" value={p.facilities.stroller} />
              <Fact label="High chair" value={p.facilities.highchair} />
              <Fact label="Play area" value={p.facilities.playArea} />
            </div>
            {nearbyFood.length > 0 && (
              <>
                <p className="label">Then what?</p>
                {nearbyFood.map(({ f, km }) => (
                  <p key={f.id} className="food">
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
