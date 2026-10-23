"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * A small OpenStreetMap view of the results.
 *
 * Leaflet is loaded inside an effect, so nothing map-related runs while the
 * page is being built as static HTML. Markers are plain HTML (divIcon), which
 * avoids Leaflet's default marker images breaking in a bundler.
 */
export default function ResultsMap({ origin, maxKm, results, others = [], onPick }) {
  const holder = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current) return;

      if (!map.current) {
        map.current = L.map(holder.current, { scrollWheelZoom: false, attributionControl: true })
          .setView([origin.lat, origin.lon], 12);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
      }

      const m = map.current;
      layer.current.clearLayers();

      // where you are starting from
      L.marker([origin.lat, origin.lon], {
        icon: L.divIcon({ className: "pin-wrap", html: '<span class="pin here"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        title: origin.label,
        keyboard: false,
      }).addTo(layer.current);

      // how far you said you'd go
      if (ring.current) { ring.current.remove(); ring.current = null; }
      if (maxKm) {
        ring.current = L.circle([origin.lat, origin.lon], {
          radius: maxKm * 1000,
          color: "#0e6b5c",
          weight: 1.5,
          opacity: 0.5,
          fillColor: "#0e6b5c",
          fillOpacity: 0.05,
        }).addTo(m);
      }

      // everything else that was open but didn't make the top three
      for (const o of others) {
        L.circleMarker([o.place.lat, o.place.lon], {
          radius: 5,
          color: "#5f6b73",
          weight: 1,
          fillColor: "#ffffff",
          fillOpacity: 1,
        })
          .bindPopup(`<b>${escapeHtml(o.place.name)}</b><br>${o.travel.minutes} min · ${o.km.toFixed(1)} km`)
          .addTo(layer.current);
      }

      // the picks
      results.forEach((r, i) => {
        const marker = L.marker([r.place.lat, r.place.lon], {
          icon: L.divIcon({
            className: "pin-wrap",
            html: `<span class="pin ${i === 0 ? "top" : "alt"}"><b>${i + 1}</b></span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -28],
          }),
          title: r.place.name,
        }).addTo(layer.current);

        marker.bindPopup(
          `<b>${escapeHtml(r.place.name)}</b><br>${escapeHtml(r.place.where)}<br>` +
            `${r.travel.minutes} min ${r.travel.mode === "walk" ? "walk" : "by transit"} · ${r.km.toFixed(1)} km<br>` +
            `<a href="https://www.google.com/maps/dir/?api=1&destination=${r.place.lat},${r.place.lon}&travelmode=transit" target="_blank" rel="noreferrer">Directions</a>`
        );
        if (onPick) marker.on("click", () => onPick(r.place.id));
      });

      // fit everything that matters into view
      const points = [[origin.lat, origin.lon], ...results.map((r) => [r.place.lat, r.place.lon])];
      if (points.length > 1) m.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
      else m.setView([origin.lat, origin.lon], 13);

      setTimeout(() => m.invalidateSize(), 60);
    })();

    return () => { cancelled = true; };
  }, [origin, maxKm, results, others, onPick]);

  // tear the map down when the component goes away
  useEffect(() => () => {
    if (map.current) { map.current.remove(); map.current = null; layer.current = null; ring.current = null; }
  }, []);

  return <div className="map" ref={holder} role="application" aria-label="Map of the suggestions" />;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
