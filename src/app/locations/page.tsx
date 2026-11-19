"use client";

import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { LocationPicker } from "@/components/LocationPicker";
import { getLocality } from "@/data/localities";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { describeCode, fmt } from "@/lib/weather/weather-codes";
import { rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { WeatherIcon } from "@/components/WeatherIcon";

function Row({ id }: { id: string }) {
  const { setLocation, toggleFavourite } = useAppState();
  const loc = getLocality(id)!;
  const api = useApi<Forecast>(`/api/forecast?loc=${id}`);
  const f = api.data;
  const o = f ? rainOutlook(f.hourly) : null;
  const d = describeCode(f?.current.weatherCode ?? null);
  return (
    <li className="card flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">
        <WeatherIcon kind={d.icon} size={48} />
        <div>
          <p className="font-bold">
            {loc.name} <span className="text-xs font-normal text-muted dark:text-slate-400">{loc.island === "rodrigues" ? "Rodrigues" : loc.district}</span>
          </p>
          <p className="text-sm">{f ? `${fmt(f.current.temperature, "°C")} · ${d.label} · wind ${fmt(f.current.windSpeed, " km/h")}` : api.error ? "Forecast unavailable" : "Loading…"}</p>
          {o && <p className="text-sm text-rain dark:text-rain-soft">{o.headline}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/" onClick={() => setLocation(id)} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
          Open
        </Link>
        <button type="button" onClick={() => toggleFavourite(id)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted ring-1 ring-navy/15 dark:text-slate-300 dark:ring-white/15">
          Remove
        </button>
      </div>
    </li>
  );
}

export default function LocationsPage() {
  const { favourites, ready } = useAppState();
  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">My places</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">Save places with the star to compare them side by side. Saved on this device only.</p>
      <LocationPicker />
      {ready && favourites.length === 0 ? (
        <div className="card text-sm">No saved places yet. Choose a place above and tap the star.</div>
      ) : (
        <ul className="grid gap-3">
          {favourites.map((id) => (
            <Row key={id} id={id} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted dark:text-slate-400">Nearby places often share the same model grid area, so small differences between them are not meaningful.</p>
    </>
  );
}
