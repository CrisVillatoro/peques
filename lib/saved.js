"use client";

/**
 * Favourites and visits, with or without a backend.
 *
 * Signed out, or no Supabase configured: everything is kept in this browser.
 * As soon as Supabase is there, the first save creates an anonymous account
 * and whatever was already in the browser is moved up to it, once.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureUser, hasBackend, supabase } from "./supabase";

const FAV_KEY = "peques.favourites.v1";
const VISIT_KEY = "peques.visits.v1";

const readLocal = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
};
const writeLocal = (key, rows) => {
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* private window */ }
};

/** A place, trimmed to what a saved row needs to stay useful after a re-import. */
const snapshot = (p) => ({
  id: p.id, name: p.name, where: p.where, lat: p.lat, lon: p.lon,
  kind: p.kind || null, kindLabel: p.kindLabel || null, setting: p.setting, url: p.url || null,
});

export function useSaved() {
  const [favourites, setFavourites] = useState([]);
  const [visits, setVisits] = useState([]);
  const [synced, setSynced] = useState(false);

  // start from whatever this browser already knows
  useEffect(() => {
    setFavourites(readLocal(FAV_KEY));
    setVisits(readLocal(VISIT_KEY));
  }, []);

  // if there is an account already, that is the truth
  useEffect(() => {
    if (!hasBackend) return;
    let off = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user || off) return;
      const [{ data: favs }, { data: vis }] = await Promise.all([
        supabase.from("favourites").select("place_id, place, created_at").order("created_at", { ascending: false }),
        supabase.from("visits").select("place_id, place, rating, tags, note, went_on").order("went_on", { ascending: false }),
      ]);
      if (off) return;
      if (favs) { setFavourites(favs.map((r) => ({ placeId: r.place_id, place: r.place, at: r.created_at }))); writeLocal(FAV_KEY, []); }
      if (vis) setVisits(vis.map((r) => ({ placeId: r.place_id, place: r.place, rating: r.rating, tags: r.tags, note: r.note, at: r.went_on })));
      setSynced(true);
    })();
    return () => { off = true; };
  }, []);

  /** Make sure there is an account, and carry anything local up to it once. */
  const claim = useCallback(async () => {
    if (!hasBackend) return null;
    const user = await ensureUser();
    if (!user || synced) return user;
    const localFavs = readLocal(FAV_KEY);
    const localVisits = readLocal(VISIT_KEY);
    if (localFavs.length) {
      await supabase.from("favourites").upsert(
        localFavs.map((f) => ({ user_id: user.id, place_id: f.placeId, place: f.place })),
        { onConflict: "user_id,place_id" }
      );
      writeLocal(FAV_KEY, []);
    }
    if (localVisits.length) {
      await supabase.from("visits").insert(
        localVisits.map((v) => ({ user_id: user.id, place_id: v.placeId, place: v.place, rating: v.rating, tags: v.tags || [], note: v.note || null }))
      );
      writeLocal(VISIT_KEY, []);
    }
    setSynced(true);
    return user;
  }, [synced]);

  const isFavourite = useCallback((id) => favourites.some((f) => f.placeId === id), [favourites]);

  const toggleFavourite = useCallback(async (place) => {
    const id = place.id;
    const on = favourites.some((f) => f.placeId === id);
    const next = on ? favourites.filter((f) => f.placeId !== id) : [{ placeId: id, place: snapshot(place), at: new Date().toISOString() }, ...favourites];
    setFavourites(next);

    if (!hasBackend) { writeLocal(FAV_KEY, next); return; }
    try {
      const user = await claim();
      if (on) await supabase.from("favourites").delete().eq("place_id", id).eq("user_id", user.id);
      else await supabase.from("favourites").upsert({ user_id: user.id, place_id: id, place: snapshot(place) }, { onConflict: "user_id,place_id" });
    } catch {
      writeLocal(FAV_KEY, next); // offline or refused: keep it here instead
    }
  }, [favourites, claim]);

  const recordVisit = useCallback(async (place, rating, tags = [], note = null) => {
    const row = { placeId: place.id, place: snapshot(place), rating, tags, note, at: new Date().toISOString().slice(0, 10) };
    const next = [row, ...visits.filter((v) => !(v.placeId === place.id && v.at === row.at))];
    setVisits(next);

    if (!hasBackend) { writeLocal(VISIT_KEY, next); return; }
    try {
      const user = await claim();
      await supabase.from("visits").insert({ user_id: user.id, place_id: place.id, place: snapshot(place), rating, tags, note });
    } catch {
      writeLocal(VISIT_KEY, next);
    }
  }, [visits, claim]);

  const lastVisit = useCallback((id) => visits.find((v) => v.placeId === id) || null, [visits]);

  return useMemo(
    () => ({ favourites, visits, isFavourite, toggleFavourite, recordVisit, lastVisit, hasBackend }),
    [favourites, visits, isFavourite, toggleFavourite, recordVisit, lastVisit]
  );
}
