"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// A clean, modern basemap: vector tiles from OpenFreeMap (OpenStreetMap data,
// OpenMapTiles schema). No API key, no usage limits, attribution added by
// MapLibre itself. "positron" is the quiet grey one, so our pins stand out.
const STYLE = "https://tiles.openfreemap.org/styles/positron";

export default function ResultsMap({ origin, maxKm, results, others = [], onPick }) {
  const holder = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const ready = useRef(false);
  const onPickRef = useRef(onPick);

  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (cancelled || !holder.current || map.current) return;

      map.current = new maplibre.Map({
        container: holder.current,
        style: STYLE,
        center: [origin.lon, origin.lat],
        zoom: 11.5,
        attributionControl: { compact: true },
        cooperativeGestures: true, // two fingers to pan, so the page still scrolls
      });
      map.current.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.current.on("load", () => {
        if (cancelled) return;
        ready.current = true;
        map.current.addSource("radius", { type: "geojson", data: emptyFc() });
        map.current.addSource("others", {
          type: "geojson",
          data: emptyFc(),
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 15,
        });
        map.current.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#0e6b5c", "fill-opacity": 0.06 },
        });
        map.current.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: { "line-color": "#0e6b5c", "line-width": 1.5, "line-opacity": 0.45, "line-dasharray": [3, 2] },
        });
        // the crowd: clustered bubbles that open up as you zoom in
        map.current.addLayer({
          id: "others-cluster",
          type: "circle",
          source: "others",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#15202a",
            "circle-opacity": 0.82,
            "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 50, 24, 200, 30],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.current.addLayer({
          id: "others-count",
          type: "symbol",
          source: "others",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
          paint: { "text-color": "#ffffff" },
        });
        map.current.addLayer({
          id: "others-point",
          type: "circle",
          source: "others",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["match", ["get", "kind"],
              "playground", "#9ED98B",
              "park", "#9ED98B",
              "library", "#F2668B",
              "museum", "#B9A6F5",
              "pool", "#8FD0F5",
              "lake", "#8FD0F5",
              "farm", "#FFC845",
              "zoo", "#FFC845",
              "#ffffff"],
            "circle-radius": 7,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#15202a",
          },
        });

        map.current.on("click", "others-cluster", async (e) => {
          const f = map.current.queryRenderedFeatures(e.point, { layers: ["others-cluster"] })[0];
          if (!f) return;
          const zoom = await map.current.getSource("others").getClusterExpansionZoom(f.properties.cluster_id);
          map.current.easeTo({ center: f.geometry.coordinates, zoom });
        });
        map.current.on("click", "others-point", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          new maplibre.Popup({ offset: 14, closeButton: false })
            .setLngLat(f.geometry.coordinates)
            .setHTML(`<b>${f.properties.name}</b><br><span class="pop-where">${f.properties.sub}</span>`)
            .addTo(map.current);
          onPickRef.current?.(f.properties.id);
        });
        for (const layer of ["others-cluster", "others-point"]) {
          map.current.on("mouseenter", layer, () => { map.current.getCanvas().style.cursor = "pointer"; });
          map.current.on("mouseleave", layer, () => { map.current.getCanvas().style.cursor = ""; });
        }

        draw();
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw whenever the picks, the starting point or the radius change
  useEffect(() => {
    if (ready.current) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, maxKm, results, others]);

  useEffect(() => () => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    if (map.current) { map.current.remove(); map.current = null; }
    ready.current = false;
  }, []);

  async function draw() {
    const maplibre = (await import("maplibre-gl")).default;
    const m = map.current;
    if (!m) return;

    markers.current.forEach((mk) => mk.remove());
    markers.current = [];

    m.getSource("radius")?.setData(maxKm ? circleAround(origin, maxKm) : emptyFc());

    markers.current.push(
      new maplibre.Marker({ element: dot("here"), anchor: "center" })
        .setLngLat([origin.lon, origin.lat])
        .addTo(m)
    );

    // every other open place, as map data rather than thousands of DOM pins
    m.getSource("others")?.setData({
      type: "FeatureCollection",
      features: others.map((o) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [o.place.lon, o.place.lat] },
        properties: {
          id: o.place.id,
          name: o.place.name,
          kind: o.place.kind || "other",
          sub: `${o.place.where} · ${o.travel.minutes} min · ${o.km.toFixed(1)} km`,
        },
      })),
    });


    results.forEach((r, i) => {
      const el = pin(i + 1, i === 0);
      el.addEventListener("click", () => onPick?.(r.place.id));
      markers.current.push(
        new maplibre.Marker({ element: el, anchor: "bottom" })
          .setLngLat([r.place.lon, r.place.lat])
          .setPopup(
            new maplibre.Popup({ offset: 34, closeButton: false }).setHTML(
              `<b>${esc(r.place.name)}</b><br><span class="pop-where">${esc(r.place.where)}</span><br>` +
                `${r.travel.minutes} min ${r.travel.mode === "walk" ? "walk" : "by transit"} · ${r.km.toFixed(1)} km<br>` +
                `<a href="https://www.google.com/maps/dir/?api=1&destination=${r.place.lat},${r.place.lon}&travelmode=transit" target="_blank" rel="noreferrer">Directions ↗</a>`
            )
          )
          .addTo(m)
      );
    });

    const points = [[origin.lon, origin.lat], ...results.map((r) => [r.place.lon, r.place.lat])];
    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => [
          [Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])],
          [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])],
        ],
        [[points[0][0], points[0][1]], [points[0][0], points[0][1]]]
      );
      m.fitBounds(bounds, { padding: 56, maxZoom: 14.5, duration: 600 });
    } else {
      m.easeTo({ center: [origin.lon, origin.lat], zoom: 13 });
    }
    setTimeout(() => m.resize(), 50);
  }

  return <div className="map" ref={holder} role="application" aria-label="Map of the suggestions" />;
}

/* ---------- little DOM helpers ---------- */

function pin(number, isTop) {
  const el = document.createElement("div");
  el.className = "pin-wrap";
  el.innerHTML = `<span class="pin ${isTop ? "top" : "alt"}"><b>${number}</b></span>`;
  return el;
}

function dot(kind) {
  const el = document.createElement("div");
  el.className = `dot ${kind}`;
  return el;
}

function emptyFc() {
  return { type: "FeatureCollection", features: [] };
}

/** A circle drawn as a 64-sided polygon, in degrees. */
function circleAround(centre, km, steps = 64) {
  const coords = [];
  const latR = km / 110.574;
  const lonR = km / (111.32 * Math.cos((centre.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([centre.lon + lonR * Math.cos(a), centre.lat + latR * Math.sin(a)]);
  }
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }],
  };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
