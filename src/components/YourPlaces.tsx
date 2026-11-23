"use client";

import Link from "next/link";
import { useAppState } from "./AppState";
import { getLocality } from "@/data/localities";
import { useApi } from "@/lib/client/useApi";
import { usePlaceLabels } from "@/lib/client/placeLabels";
import type { Forecast } from "@/lib/weather/types";
import { nextHours, nextHoursHeadline } from "@/lib/weather/intelligence/next-hours";
import { fmt } from "@/lib/weather/weather-codes";

function PlaceLine({ id, label }: { id: string; label?: string }) {
  const { setLocation } = useAppState();
  const loc = getLocality(id);
  const api = useApi<Forecast>(loc ? `/api/forecast?loc=${id}` : null, { refreshMin: 15 });
  if (!loc) return null;
  const f = api.data;
  return (
    <li>
      <button type="button" onClick={() => setLocation(id)} className="w-full rounded-2xl bg-mist p-3 text-left dark:bg-white/5">
        <p className="text-sm font-bold">
          {label && <span className="chip mr-1 bg-teal/15 text-teal-ink dark:text-teal-soft">{label}</span>}
          {loc.name} <span className="font-normal">{f ? `· ${fmt(f.current.temperature, "°C")}` : ""}</span>
        </p>
        <p className="text-sm text-rain dark:text-rain-soft">{f ? nextHoursHeadline(nextHours(f.hourly)) : api.error ? "Forecast unavailable" : "Loading…"}</p>
      </button>
    </li>
  );
}

/** Saved places (home, work, school…) at a glance: rain in the next 6 hours for each. */
export function YourPlaces() {
  const { favourites, location, ready } = useAppState();
  const { labels } = usePlaceLabels();
  if (!ready) return null;
  const others = favourites.filter((id) => id !== location.id).slice(0, 4);
  return (
    <section className="card" aria-labelledby="yp-title">
      <h2 id="yp-title" className="label">
        Your places · next 6 hours
      </h2>
      {others.length ? (
        <ul className="mt-2 space-y-2">
          {others.map((id) => (
            <PlaceLine key={id} id={id} label={labels[id]} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted dark:text-slate-400">Save home, work or school with the ☆ star next to the place name to see them here, and get free rain alerts for their area.</p>
      )}
      <Link href="/locations" className="mt-2 inline-block text-sm font-semibold text-teal-ink underline dark:text-teal-soft">
        Manage places & alerts
      </Link>
    </section>
  );
}
