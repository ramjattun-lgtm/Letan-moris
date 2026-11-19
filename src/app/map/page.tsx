"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useAppState } from "@/components/AppState";
import { ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import type { MapPoint } from "@/lib/weather/types";
import type { Layer } from "@/components/WeatherMap";
import { getLocality } from "@/data/localities";
import { ago, formatUtcAsMU } from "@/lib/time";

const WeatherMap = dynamic(() => import("@/components/WeatherMap").then((m) => m.WeatherMap), { ssr: false, loading: () => <Skeleton className="h-[60vh]" /> });

const LAYERS: { id: Layer; label: string; legend: string }[] = [
  { id: "rain", label: "Rain", legend: "Highest chance of rain in the next 3 hours. Darker blue = more likely." },
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
  const pickedLoc = getLocality(picked);

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
      <ErrorBanner error={api.error} hasData={!!api.data} savedAt={api.savedAt} />
      {api.data ? <WeatherMap island={island} points={api.data.points} layer={layer} onSelect={onSelect} /> : <Skeleton className="h-[60vh]" />}
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
