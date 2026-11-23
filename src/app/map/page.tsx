"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { MapPoint } from "@/lib/weather/types";
import type { Layer } from "@/components/WeatherMap";
import { getLocality } from "@/data/localities";
import { ago, formatUtcAsMU } from "@/lib/time";
import { useLapli } from "@/lib/client/useLapli";
import { KINDS } from "@/lib/community/lapli";
import { FLOOD_SITES_SOURCE, siteRisks } from "@/data/flood-sites";
import type { ExtraMarker } from "@/components/WeatherMap";
import type { RiverAssessment } from "@/lib/weather/intelligence/river.service";

const WeatherMap = dynamic(() => import("@/components/WeatherMap").then((m) => m.WeatherMap), { ssr: false, loading: () => <Skeleton className="h-[60vh]" /> });

const LAYERS: { id: Layer; label: string; legend: string }[] = [
  { id: "rain", label: "Rain", legend: "Highest chance of rain in the next 3 hours. Darker blue = more likely." },
  {
    id: "reports",
    label: "Rain reports",
    legend:
      "Lapli isi! — rain, rising rivers, fallen trees and rough sea reported by people in the last 3 hours (minutes ago, and number of reports). Unverified community observations; tap Lapli isi! to add yours.",
  },
  {
    id: "heavy",
    label: "Heavy-rain risk",
    legend:
      "Independent heavy-rain risk for the next 24 hours: Low, Moderate (amber) or High (red). Based on rain intensity per hour, 3- and 24-hour totals and how wet the ground already is. High = flash flooding possible in low-lying and flood-prone areas. Diamonds ◆ mark the flood-prone areas studied in the Land Drainage Master Plan, coloured by today's risk nearby. Not an MMS warning — always follow MMS heavy rain and torrential rain warnings. Models can miss sudden local downpours.",
  },
  {
    id: "rivers",
    label: "Rivers",
    legend: "Rain over each river's upper catchment in the last 3 hours and next 3 hours: Low, Moderate (amber) or High (red). Rivers can rise quickly downstream even when it is dry there. Estimate, not river levels — see River watch for details.",
  },
  { id: "temperature", label: "Temperature", legend: "Current model temperature (°C). Cooler blues on high ground, warmer oranges on the coast." },
  { id: "wind", label: "Wind", legend: "Current wind speed (km/h) and the direction it blows from. Orange = 40 km/h or more." },
  { id: "cloud", label: "Cloud", legend: "Current cloud cover (%). Darker = cloudier." },
];

export default function MapPage() {
  const { island, setLocation, ready } = useAppState();
  const [layer, setLayer] = useState<Layer>("rain");
  const [picked, setPicked] = useState<string | null>(null);
  const api = useApi<{ points: MapPoint[]; retrievedAt: string }>(ready ? `/api/map?island=${island}` : null);
  const onSelect = useCallback((id: string) => setPicked(id), []);
  const lapli = useLapli();
  const reportPoints: MapPoint[] = (lapli.places ?? [])
    .filter((p) => p.loc.island === island)
    .map((p) => ({ locationId: p.loc.id, rainProbNext3h: null, rainNext3h: null, temperature: null, windSpeed: null, windDirection: null, cloudCover: null, report: { kind: p.kind, minutesAgo: p.minutesAgo, count: p.count } }));
  const hazardMarkers: ExtraMarker[] = lapli.hazards
    .filter((h) => h.loc.island === island)
    .map((h) => {
      const k = KINDS.find((x) => x.id === h.kind)!;
      return { lat: h.loc.lat, lon: h.loc.lon, text: `${k.english} · ${h.minutesAgo} min`, color: "#F2A541", dark: false, title: `${k.english} reported in ${h.loc.name}, ${h.minutesAgo} min ago${h.corroborated ? ` — ${h.reporters} people agree` : " — 1 report, unconfirmed"}` };
    });
  const pickedLoc = getLocality(picked);
  const riv = useApi<{ island: string; rivers: (RiverAssessment & { id: string; name: string; upstream: { lat: number; lon: number }[] })[] }>(ready && layer === "rivers" ? `/api/rivers?island=${island}` : null);
  const riverMarkers: ExtraMarker[] = useMemo(() =>
    layer === "rivers" && riv.data && riv.data.island === island
      ? riv.data.rivers.map((r) => ({
          lat: r.upstream[0].lat,
          lon: r.upstream[0].lon,
          text: `${r.name.replace("Rivière ", "R. ").replace("Grand River ", "GR ").replace("Grande Rivière ", "GR ")} · ${r.level === "high" ? "High" : r.level === "moderate" ? "Mod." : r.level === "low" ? "Low" : "—"}`,
          color: r.level === "high" ? "#D9480F" : r.level === "moderate" ? "#F2A541" : "#CFEDE6",
          dark: r.level === "high",
          title: `${r.name}: ${r.message}`,
        }))
      : [], [layer, riv.data, island]);

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">Weather map — {island === "rodrigues" ? "Rodrigues" : "Mauritius"}</h1>
      <div role="group" aria-label="Map layer" className="scroll-x mb-3">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" aria-pressed={layer === l.id} onClick={() => setLayer(l.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${layer === l.id ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {l.label}
          </button>
        ))}
      </div>
      {layer !== "reports" && <ErrorBanner error={api.error} hasData={!!api.data} savedAt={api.savedAt} />}
      {layer === "rivers" ? (
        <>
          <WeatherMap island={island} points={[]} layer={layer} onSelect={onSelect} extra={riverMarkers} />
          <p className="mt-2 text-sm">
            Details and safety advice: <Link href="/rivers" className="font-semibold underline">River watch</Link>
          </p>
        </>
      ) : layer === "reports" ? (
        <>
          <WeatherMap island={island} points={reportPoints} layer={layer} onSelect={onSelect} extra={hazardMarkers} />
          {lapli.places && reportPoints.length === 0 && hazardMarkers.length === 0 && <p className="mt-2 text-sm text-muted">No community reports in the last 3 hours on this island.</p>}
          {lapli.error && <p className="mt-2 text-sm text-muted">Community reports are unavailable right now.</p>}
        </>
      ) : api.data ? (
        <WeatherMap island={island} points={api.data.points} layer={layer} onSelect={onSelect} />
      ) : (
        <Skeleton className="h-[60vh]" />
      )}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card text-sm">
          <h2 className="label">Legend</h2>
          <p className="mt-1">{LAYERS.find((l) => l.id === layer)?.legend}</p>
          {api.data && (
            <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
              Model data updated {formatUtcAsMU(api.data.retrievedAt)} ({ago(api.data.retrievedAt)}). Values are for each place shown, not a radar picture. Official warnings are on the{" "}
              <Link href="/cyclone" className="underline">Cyclone page</Link>. Sea conditions are on the <Link href="/marine" className="underline">Marine page</Link>.
            </p>
          )}
        </div>
        {layer === "heavy" && island === "mauritius" && api.data && <FloodSitesList points={api.data.points} />}
        {pickedLoc && (
          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{pickedLoc.name}</p>
              <p className="text-sm text-muted dark:text-slate-400">{pickedLoc.district}</p>
            </div>
            <Link href="/" onClick={() => setLocation(pickedLoc.id)} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
              Open forecast
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

const RISK_TEXT = { high: "High", moderate: "Moderate", low: "Low" } as const;

function FloodSitesList({ points }: { points: MapPoint[] }) {
  const sites = siteRisks(points);
  const raised = sites.filter((s) => s.risk === "high" || s.risk === "moderate");
  return (
    <div className="card text-sm">
      <h2 className="label">Known flood-prone areas · today</h2>
      <p className="mt-1">
        {raised.length === 0
          ? "No raised heavy-rain risk near any known flood-prone area in the next 24 hours."
          : `${raised.length} of ${sites.length} known flood-prone areas have a raised heavy-rain risk in the next 24 hours.`}
      </p>
      <ul className="mt-2 divide-y divide-navy/5 dark:divide-white/10">
        {sites.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0">
              <span className="font-semibold">{s.name}</span>
              {s.detail && <span className="block text-[11px] text-muted dark:text-slate-400">{s.detail}</span>}
            </span>
            <span
              className={`chip shrink-0 ${s.risk === "high" ? "bg-[#D9480F] text-white" : s.risk === "moderate" ? "bg-coral text-navy" : "bg-mist text-muted dark:bg-white/10 dark:text-slate-300"}`}
            >
              {s.risk ? RISK_TEXT[s.risk] : "—"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{FLOOD_SITES_SOURCE} Risk is our independent forecast, not an MMS warning.</p>
    </div>
  );
}
