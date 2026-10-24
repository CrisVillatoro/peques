"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { distanceKm, rankPlaces, weatherSentence, whySentence } from "../lib/rules";
import { countBySource, mergePlaces } from "../lib/merge";
import { expand, KINDS, labelFor } from "../lib/places";
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
import { detectLang, LANGS, translator } from "../lib/i18n";
import Art from "./Art";
import ResultsMap from "./ResultsMap";

const BERLIN = { lat: 52.5234, lon: 13.4113, label: "Berlin (centre)" };
const KIDS_KEY = "peques.kids.v1";
const PLACE_KEY = "peques.origin.v1";
const LANG_KEY = "peques.lang.v1";

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
  const [lang, setLang] = useState("de");
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
  const [kindFilter, setKindFilter] = useState(null); // null = every category
  const [shown, setShown] = useState(12);
  const [openId, setOpenId] = useState(null);

  const t = useMemo(() => translator(lang), [lang]);

  // language: what the browser prefers, unless this browser chose before
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      setLang(saved || detectLang());
    } catch (e) { setLang(detectLang()); }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const days = useMemo(() => dayOptions(new Date(), lang), [lang]);
  const slots = useMemo(() => slotsFor(dateIso, new Date()), [dateIso]);
  const when = useMemo(() => resolveWhen(dateIso, slotKey, new Date()), [dateIso, slotKey]);
  const whenLabel = describeWhen(when, dateIso, slotKey, new Date(), t, lang);
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
        const list = (Array.isArray(d.places) ? d.places : []).map(expand);
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
          ? t("weather.tooFar", { days: FORECAST_DAYS })
          : t("weather.noTime")
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
      if (!found.length) setSearchError(t("where.nothing"));
    } catch (err) {
      setSearchError(t("where.unavailable"));
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
    () =>
      rankPlaces({
        places,
        origin,
        kids: withAges,
        choice,
        weather,
        now: when,
        maxKm,
        limit: 12,
        kinds: kindFilter ? [kindFilter] : null,
      }),
    [places, origin, withAges, choice, weather, when, maxKm, kindFilter]
  );
  const unfiltered = useMemo(
    () => rankPlaces({ places, origin, kids: withAges, choice, weather, now: when, maxKm, limit: 1, browseLimit: 1 }),
    [places, origin, withAges, choice, weather, when, maxKm]
  );
  const allKinds = unfiltered.byKind;

  const picks = useMemo(() => ranking.results.slice(0, 3), [ranking]);
  const runnersUp = useMemo(() => ranking.results.slice(3), [ranking]);
  const rest = useMemo(() => {
    const taken = new Set(picks.map((r) => r.place.id));
    return (ranking.browse || []).filter((r) => !taken.has(r.place.id));
  }, [ranking, picks]);

  const find = () => {
    setPhase("searching");
    setOpenId(null);
    setShown(12);
    setTimeout(() => setPhase("results"), 600);
  };

  const wx = weather
    ? {
        cls: weather.rainMm >= 0.2 || weather.rainy ? "rain" : weather.tempC >= 28 ? "hot" : weather.tempC <= 3 ? "cold" : "sun",
        icon: weather.rainMm >= 0.2 || weather.rainy ? "🌧" : weather.tempC >= 28 ? "🥵" : weather.tempC <= 3 ? "❄️" : "☀️",
        text: `${Math.round(weather.tempC)}° · ${weather.condition}`,
      }
    : { cls: "", icon: "·", text: weatherError || t("weather.checking") };

  return (
    <div className="shell">
      <header className="masthead">
        <span className="wordmark"><i aria-hidden="true" />Peques</span>
        <span className="tagline">{t("tagline")}</span>
        <div className="langs" role="group" aria-label="Sprache / Language">
          {LANGS.map((l) => (
            <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <section className="panel">
        <h1 className="hello">{t(greetingKey())}<br /><em>{t("greeting.question")}</em></h1>

        <div className="ctx">
          <button className="tag" type="button" onClick={() => setShowWhere((v) => !v)} aria-expanded={showWhere}>
            📍 {locating ? t("where.locating") : localLabel(origin, t)} <span className="change">{t("where.change")}</span>
          </button>
          <span className={`tag ${wx.cls}`}>{wx.icon} {wx.text}</span>
        </div>

        {showWhere && (
          <div className="where">
            <form onSubmit={runSearch} className="searchrow">
              <input
                id="place-search"
                type="search"
                placeholder={t("where.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={searching || query.trim().length < 3}>
                {searching ? "…" : t("where.searchButton")}
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
              <button type="button" className="chip" onClick={locate}>{t("where.useLocation")}</button>
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

        <p className="label">{t("far.label")}</p>
        <div className="chips" role="group" aria-label="Search radius">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="chip small"
              aria-pressed={maxKm === r.km}
              onClick={() => setMaxKm(r.km)}
            >
              {r.km ? r.label : t("far.all")}
            </button>
          ))}
        </div>

        <p className="label">{t("when.label")}</p>
        <div className="chips" role="group" aria-label="Which day">
          {days.map((d) => (
            <button key={d.key} type="button" className="chip" aria-pressed={dateIso === d.date} onClick={() => setDateIso(d.date)}>
              {d.label || t(`when.${d.key}`)}
            </button>
          ))}
          <label className="chip date" htmlFor="pick-date">
            <span aria-hidden="true">📅</span>
            <input
              id="pick-date"
              type="date"
              aria-label={t("when.pickDate")}
              value={dateIso}
              min={isoDate(new Date())}
              onChange={(e) => e.target.value && setDateIso(e.target.value)}
            />
          </label>
        </div>
        <div className="chips" role="group" aria-label="Time of day">
          {slots.map((s) => (
            <button key={s.key} type="button" className="chip small" aria-pressed={slotKey === s.key} onClick={() => setSlotKey(s.key)}>
              {t(`when.${s.key}`)}
            </button>
          ))}
        </div>
        {tooFarForWeather && (
          <p className="hint">{t("when.noForecast", { days: FORECAST_DAYS })}</p>
        )}

        <p className="label">{t("kids.label")}</p>
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
              {k.name === "Little one" ? t("kids.little") : k.name === "Friend" ? t("kids.friend") : k.name}
            </button>
          ))}
          <button
            type="button"
            className="kid add"
            onClick={() => {
              const birth = window.prompt(t("kids.promptBirth"), isoMonthsAgo(12));
              if (!birth || !/^\d{4}-\d{2}$/.test(birth)) return;
              const name = window.prompt(t("kids.promptName"), t("kids.defaultName")) || t("kids.defaultName");
              setKids((all) => [
                ...all,
                { id: `k${Date.now()}`, name, birth, coming: true, colour: ["#9ED98B", "#B9A6F5", "#F2668B"][all.length % 3] },
              ]);
            }}
          >
            <span className="face">+</span>
            {t("kids.add")}
          </button>
        </div>

        <p className="label">{t("setting.label")}</p>
        <div className="seg" role="radiogroup" aria-label={t("setting.label")}>
          {["indoor", "auto", "outdoor"].map((value) => (
            <button key={value} type="button" role="radio" data-mode={value} aria-checked={choice === value} onClick={() => setChoice(value)}>
              {t(`setting.${value}`)}
            </button>
          ))}
        </div>
        <p className="hint" aria-live="polite">
          {choice === "auto"
            ? weatherSentence(weather, ranking.mode, t)
            : choice === "indoor"
            ? t("setting.onlyIndoor")
            : weather && (weather.rainMm >= 0.2 || weather.rainy)
            ? t("setting.outdoorRain")
            : t("setting.outdoorFirst")}
        </p>

        <button className="find" type="button" onClick={find} disabled={phase === "searching"}>
          <span>
            {t("find.button")}
            <small>
              {library === "loading"
                ? t("find.loading")
                : t(ranking.total === 1 ? "find.subOne" : "find.sub", { count: ranking.total, when: whenLabel })}
            </small>
          </span>
          <span className="go" aria-hidden="true">→</span>
        </button>
      </section>

      <section className="results" aria-live="polite">
        {phase === "home" && (
          <div className="placeholder">
            <div className="placeholder-art"><Art kind="park" /></div>
            <p>{t("results.placeholder", { button: t("find.button") })}</p>
          </div>
        )}

        {phase === "searching" && <div className="spinner" role="status" aria-label="Searching" />}

        {phase === "results" && (
          <>
            <div className="rhead">
              <p className="rlabel">
                {t(picks.length ? "results.pick" : "results.none", { when: whenLabel })}
                <span>
                  {t("results.from", {
                    place: localLabel(origin, t),
                    radius: maxKm ? t("results.radius", { km: maxKm }) : t("results.allBerlin"),
                  })}
                </span>
              </p>
              {picks.length > 0 && (
                <div className="viewtoggle" role="group" aria-label={`${t("results.list")} / ${t("results.map")}`}>
                  <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>{t("results.list")}</button>
                  <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>{t("results.map")}</button>
                </div>
              )}
            </div>

            <div className="kinds" role="group" aria-label={t("filter.label")}>
              <button type="button" className="chip small" aria-pressed={!kindFilter} onClick={() => { setKindFilter(null); setShown(12); }}>
                {t("filter.all")}
              </button>
              {allKinds.map(([kind, count]) => (
                <button
                  key={kind}
                  type="button"
                  className="chip small"
                  aria-pressed={kindFilter === kind}
                  onClick={() => { setKindFilter(kindFilter === kind ? null : kind); setShown(12); }}
                >
                  {KINDS[kind]?.label || kind} <span className="count">{count}</span>
                </button>
              ))}
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
                t={t}
              />
            ))}

            {view === "list" && rest.length > 0 && (
              <>
                <p className="label browse-label">
                  {t("browse.title", { count: ranking.total })}
                  <span>{t("browse.showing", { shown: Math.min(shown, rest.length) + picks.length, total: ranking.total })}</span>
                </p>
                <ul className="browse">
                  {rest.slice(0, shown).map((r) => {
                    const isOpen = openId === r.place.id;
                    return (
                      <li key={r.place.id} className={isOpen ? "open" : undefined}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenId(isOpen ? null : r.place.id)}
                        >
                          <span className="b-name">{r.place.name}</span>
                          <span className="b-meta">
                            {labelFor(r.place)} · {r.place.where} · {r.travel.minutes} {t(r.travel.mode === "walk" ? "card.walk" : "card.transit")} · {r.km.toFixed(1)} km
                          </span>
                          <span className="b-caret" aria-hidden="true">{isOpen ? "–" : "+"}</span>
                        </button>
                        {isOpen && (
                          <PlaceCard
                            r={r}
                            rank={1}
                            mode={ranking.mode}
                            weather={weather}
                            food={food}
                            open
                            onToggle={() => setOpenId(null)}
                            t={t}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
                {shown < rest.length && (
                  <button type="button" className="morebtn" onClick={() => setShown((n) => n + 24)}>
                    {t("browse.more", { count: Math.min(24, rest.length - shown) })}
                  </button>
                )}
              </>
            )}

            {!picks.length && (
              <p className="notice">
                {t("results.empty", { when: whenLabel, radius: maxKm ? `${maxKm} km` : "Berlin" })}
              </p>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        {library === "ready" && (
          <>{t("footer.searching", {
            total: counts.total.toLocaleString(lang === "de" ? "de-DE" : "en-GB"),
            curated: counts.curated,
            osm: counts.osm.toLocaleString(lang === "de" ? "de-DE" : "en-GB"),
          })} · </>
        )}
        {library === "seed-only" && (
          <>{t("footer.seedOnly", { curated: counts.curated, command: "npm run import-places" })} · </>
        )}
        {t("footer.about", { weather: "Open-Meteo (DWD ICON)", osm: "OpenStreetMap" })}{" "}
        <a href="https://open-meteo.com/">Open-Meteo</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
      </footer>
    </div>
  );
}

function PlaceCard({ r, rank, mode, weather, food, open, onToggle, t }) {
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
        {rank === 0 && <span className="rank">{t("results.top")}</span>}
      </div>
      <div className="cbody">
        <div className="cname">{p.name}</div>
        <div className="cwhere">{p.where} · {p.priceHint}</div>
        <div className="meta">
          {labelFor(p) && <span className="m kind">{labelFor(p)}</span>}
          <span className={`m ${p.setting}`}>{t(`card.${p.setting}`)}</span>
          <span className="m">{r.travel.minutes} {t(r.travel.mode === "walk" ? "card.walk" : "card.transit")}</span>
          <span className="m">{r.km.toFixed(1)} km</span>
          <span className="m fit">{t(r.fit >= 4.5 ? "card.fitGreat" : r.fit >= 3.5 ? "card.fitGood" : "card.fitOk")}</span>
          <span className="m">{t("card.typical")} {p.typicalOpen}–{p.typicalClose}</span>
        </div>
        <p className="why"><b>{t("card.why")}</b> {whySentence(r, mode, weather, t)}</p>

        {open && (
          <>
            {p.note && <p className="note-text">{p.note}</p>}
            <div className="facts">
              <Fact label={t("card.changing")} value={p.facilities.changing} t={t} />
              <Fact label={t("card.stroller")} value={p.facilities.stroller} t={t} />
              <Fact label={t("card.highchair")} value={p.facilities.highchair} t={t} />
              <Fact label={t("card.playArea")} value={p.facilities.playArea} t={t} />
            </div>
            {nearbyFood.length > 0 && (
              <>
                <p className="label">{t("card.thenWhat")}</p>
                {nearbyFood.map(({ f, km }) => (
                  <p key={f.id} className="food">
                    <b>{f.name}</b> · {Math.round(km * 13)} {t("card.minWalk")}
                    {f.facilities?.highchair === "yes" ? t("card.withHighchair") : ""}
                    {f.facilities?.changing === "yes" ? t("card.withChanging") : ""}
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
                {t("card.directions")}
              </a>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer">{t("card.hours")}</a>}
            </div>
          </>
        )}
        {rank > 0 && (
          <div className="actions">
            <button type="button" onClick={onToggle}>{t(open ? "card.less" : "card.more")}</button>
          </div>
        )}
      </div>
    </article>
  );
}

function Fact({ label, value, t }) {
  const known = value === "yes" ? "yes" : value === "no" ? "no" : "unknown";
  return (
    <div className="fact">
      <b className={known === "unknown" ? "unknown" : undefined}>{t(`card.${known}`)}</b>
      {label}
    </div>
  );
}

function greetingKey() {
  const h = new Date().getHours();
  if (h < 11) return "greeting.morning";
  if (h < 18) return "greeting.afternoon";
  return "greeting.evening";
}

/** The two built-in place labels are translated; a searched address is not. */
function localLabel(origin, t) {
  if (origin.label === "Where I am") return t("where.near");
  if (origin.label === "Berlin (centre)") return t("where.berlin");
  return origin.label;
}
