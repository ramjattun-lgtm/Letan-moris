"use client";

import { useEffect, useRef } from "react";
import { setupMaplibre } from "@/lib/client/maplibre";
import type * as ML from "maplibre-gl";
const maplibregl = setupMaplibre();
import "maplibre-gl/dist/maplibre-gl.css";
import { getLocality, ISLAND_VIEW } from "@/data/localities";
import type { Island, MapPoint } from "@/lib/weather/types";
import { compass } from "@/lib/weather/weather-codes";
import { siteRisks } from "@/data/flood-sites";

export type Layer = "rain" | "heavy" | "reports" | "rivers" | "temperature" | "wind" | "cloud";
export interface ExtraMarker {
  lat: number;
  lon: number;
  text: string;
  color: string;
  dark: boolean;
  title: string;
}

// Free, keyless vector tiles from OpenFreeMap (OpenStreetMap data). Attribution is shown on the map.
const STYLE = "https://tiles.openfreemap.org/styles/positron";

function rainColor(p: number | null) {
  if (p === null) return "#9FB2BF";
  if (p >= 70) return "#1F5FB8";
  if (p >= 50) return "#2F7DE1";
  if (p >= 30) return "#7FB2F0";
  return "#CFE3F7";
}
function tempColor(t: number | null) {
  if (t === null) return "#9FB2BF";
  if (t >= 31) return "#D9480F";
  if (t >= 28) return "#F2A541";
  if (t >= 24) return "#F7D774";
  if (t >= 20) return "#8FD3C4";
  return "#4FA3C7";
}

export function labelFor(layer: Layer, p: MapPoint): { text: string; color: string; dark: boolean } {
  switch (layer) {
    case "rain":
      return { text: p.rainProbNext3h === null ? "—" : `${p.rainProbNext3h}%`, color: rainColor(p.rainProbNext3h), dark: (p.rainProbNext3h ?? 0) >= 50 };
    case "heavy": {
      const lvl = p.rainRisk ?? null;
      const color = lvl === "high" ? "#D9480F" : lvl === "moderate" ? "#F2A541" : lvl === "low" ? "#CFEDE6" : "#9FB2BF";
      return { text: lvl === "high" ? "High" : lvl === "moderate" ? "Moderate" : lvl === "low" ? "Low" : "—", color, dark: lvl === "high" };
    }
    case "reports": {
      const r = p.report;
      if (!r) return { text: "—", color: "#9FB2BF", dark: false };
      const name = r.kind === "flooding" ? "Water on road" : r.kind === "heavy" ? "Heavy rain" : r.kind === "stopped" ? "Stopped" : "Light rain";
      const color = r.kind === "flooding" ? "#D9480F" : r.kind === "heavy" ? "#1F5FB8" : r.kind === "stopped" ? "#CFEDE6" : "#7FB2F0";
      return { text: `${name} · ${r.minutesAgo}′${r.count > 1 ? ` ×${r.count}` : ""}`, color, dark: r.kind === "heavy" || r.kind === "flooding" };
    }
    case "temperature":
      return { text: p.temperature === null ? "—" : `${Math.round(p.temperature)}°`, color: tempColor(p.temperature), dark: (p.temperature ?? 0) >= 31 };
    case "wind":
      return { text: p.windSpeed === null ? "—" : `${Math.round(p.windSpeed)} ${compass(p.windDirection)}`, color: (p.windSpeed ?? 0) >= 40 ? "#F2A541" : "#E7EEF2", dark: false };
    case "rivers":
      return { text: "", color: "#fff", dark: false };
    case "cloud":
      return { text: p.cloudCover === null ? "—" : `${p.cloudCover}%`, color: `rgba(90,110,125,${0.15 + ((p.cloudCover ?? 0) / 100) * 0.7})`, dark: (p.cloudCover ?? 0) >= 60 };
  }
}

export function WeatherMap({ island, points, layer, onSelect, extra = [] }: { island: Island; points: MapPoint[]; layer: Layer; onSelect: (id: string) => void; extra?: ExtraMarker[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<ML.Map | null>(null);
  const markers = useRef<ML.Marker[]>([]);

  useEffect(() => {
    if (!box.current || map.current) return;
    const v = ISLAND_VIEW[island];
    map.current = new maplibregl.Map({ container: box.current, style: STYLE, center: v.center, zoom: v.zoom, attributionControl: { compact: true } });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = ISLAND_VIEW[island];
    map.current?.jumpTo({ center: v.center, zoom: v.zoom });
  }, [island]);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((m) => m.remove());
    markers.current = points.map((p) => {
      const loc = getLocality(p.locationId);
      const l = labelFor(layer, p);
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${loc?.name ?? p.locationId}: ${l.text}`);
      el.style.cssText = `background:${l.color};color:${l.dark ? "#fff" : "#0B2A3C"};border:2px solid #fff;border-radius:999px;padding:3px 8px;font:700 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 2px 6px rgba(11,42,60,.25);cursor:pointer;white-space:nowrap`;
      el.textContent = l.text;
      el.title = loc?.name ?? "";
      el.addEventListener("click", () => onSelect(p.locationId));
      return new maplibregl.Marker({ element: el }).setLngLat([loc?.lon ?? 0, loc?.lat ?? 0]).addTo(map.current!);
    });
    for (const x of extra) {
      const el = document.createElement("div");
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", x.title);
      el.title = x.title;
      el.style.cssText = `background:${x.color};color:${x.dark ? "#fff" : "#0B2A3C"};border:2px solid #fff;border-radius:10px;padding:2px 7px;font:700 11px/1.2 Inter,system-ui,sans-serif;box-shadow:0 2px 6px rgba(11,42,60,.25);white-space:nowrap`;
      el.textContent = x.text;
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([x.lon, x.lat]).addTo(map.current!));
    }
    // Heavy-rain layer: also mark the flood-prone sectors from the Land Drainage Master Plan,
    // coloured by today's risk at the nearest forecast point.
    if (layer === "heavy" && island === "mauritius") {
      for (const s of siteRisks(points)) {
        const color = s.risk === "high" ? "#D9480F" : s.risk === "moderate" ? "#F2A541" : "#5B7083";
        const el = document.createElement("div");
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", `Flood-prone area (Land Drainage Master Plan): ${s.name}`);
        el.title = `Flood-prone area: ${s.name}`;
        // MapLibre sets `transform` on the marker element itself, so rotate an inner child instead.
        const d = document.createElement("div");
        d.style.cssText = `width:14px;height:14px;background:${color};border:2px solid #fff;transform:rotate(45deg);box-shadow:0 1px 4px rgba(11,42,60,.4)`;
        el.appendChild(d);
        markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map.current!));
      }
    }
  }, [points, layer, onSelect, island, extra]);

  return <div ref={box} className="h-[60vh] min-h-80 w-full overflow-hidden rounded-3xl" />;
}
