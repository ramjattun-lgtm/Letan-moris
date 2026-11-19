"use client";

import { useEffect, useRef } from "react";
import { setupMaplibre } from "@/lib/client/maplibre";
const maplibregl = setupMaplibre();
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature } from "geojson";
import type { ActiveSystem } from "@/lib/weather/providers/gdacs.provider";
import { MAURITIUS, RODRIGUES } from "@/lib/weather/providers/gdacs.provider";

const STYLE = "https://tiles.openfreemap.org/styles/positron";

function fc(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

/** Past track (solid), forecast track (dashed), forecast cone and wind areas for each active system. */
export function CycloneMap({ systems }: { systems: ActiveSystem[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({ container: box.current, style: STYLE, center: [60, -18], zoom: 3.6, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const cone: Feature[] = [];
      const wind: Feature[] = [];
      const lines: Feature[] = [];
      const past: Feature[] = [];
      const fut: Feature[] = [];
      const pts: Feature[] = [];
      const bounds = new maplibregl.LngLatBounds([MAURITIUS.lon, MAURITIUS.lat], [RODRIGUES.lon, RODRIGUES.lat]);

      for (const s of systems) {
        const t = s.track;
        cone.push(...(t?.cone ?? []));
        wind.push(...(t?.windBands ?? []));
        const points = t?.points.length ? t.points : [{ lat: s.lat, lon: s.lon, time: null, observed: true, windKmh: s.maxWindKmh }];
        const obs = points.filter((p) => p.observed);
        const fcst = points.filter((p) => !p.observed);
        if (obs.length > 1) past.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: obs.map((p) => [p.lon, p.lat]) } });
        const futLine = [...obs.slice(-1), ...fcst];
        if (futLine.length > 1) fut.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: futLine.map((p) => [p.lon, p.lat]) } });
        if (!obs.length && !fcst.length) lines.push(...(t?.lines ?? []));
        points.forEach((p) => {
          pts.push({ type: "Feature", properties: { observed: p.observed ? 1 : 0 }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
          bounds.extend([p.lon, p.lat]);
        });
        new maplibregl.Marker({ color: "#D9480F" }).setLngLat([s.lon, s.lat]).setPopup(new maplibregl.Popup().setText(`${s.name} — latest position`)).addTo(map);
      }

      map.addSource("cone", { type: "geojson", data: fc(cone) });
      map.addLayer({ id: "cone", type: "fill", source: "cone", paint: { "fill-color": "#F2A541", "fill-opacity": 0.22 } });
      map.addSource("wind", { type: "geojson", data: fc(wind) });
      map.addLayer({ id: "wind", type: "fill", source: "wind", paint: { "fill-color": "#D9480F", "fill-opacity": 0.1 } });
      map.addSource("lines", { type: "geojson", data: fc(lines) });
      map.addLayer({ id: "lines", type: "line", source: "lines", paint: { "line-color": "#0B2A3C", "line-width": 2 } });
      map.addSource("past", { type: "geojson", data: fc(past) });
      map.addLayer({ id: "past", type: "line", source: "past", paint: { "line-color": "#0B2A3C", "line-width": 3 } });
      map.addSource("fut", { type: "geojson", data: fc(fut) });
      map.addLayer({ id: "fut", type: "line", source: "fut", paint: { "line-color": "#D9480F", "line-width": 3, "line-dasharray": [2, 1.5] } });
      map.addSource("pts", { type: "geojson", data: fc(pts) });
      map.addLayer({ id: "pts", type: "circle", source: "pts", paint: { "circle-radius": 4, "circle-color": ["case", ["==", ["get", "observed"], 1], "#0B2A3C", "#D9480F"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });

      for (const [name, c] of [["Mauritius", MAURITIUS], ["Rodrigues", RODRIGUES]] as const) {
        const el = document.createElement("div");
        el.textContent = name;
        el.style.cssText = "background:#0FA3A3;color:#fff;font:700 12px Inter,system-ui;padding:3px 8px;border-radius:999px;border:2px solid #fff";
        new maplibregl.Marker({ element: el }).setLngLat([c.lon, c.lat]).addTo(map);
      }
      map.fitBounds(bounds, { padding: 50, maxZoom: 6, duration: 0 });
    });
    return () => map.remove();
  }, [systems]);

  return <div ref={box} className="h-[55vh] min-h-80 w-full overflow-hidden rounded-3xl" role="img" aria-label="Map of the storm's past track, forecast track and uncertainty cone" />;
}
