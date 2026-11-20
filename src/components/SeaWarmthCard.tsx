"use client";

import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { CoralStation } from "@/lib/weather/providers/coral.provider";

const ALERT_TONE = (a: number) => (a >= 3 ? "bg-[#D9480F] text-white" : a >= 1 ? "bg-coral text-navy" : "bg-teal/15 text-teal-ink");
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(1)}`;

/** Lagoon warmth and coral heat stress (NOAA Coral Reef Watch). */
export function SeaWarmthCard() {
  const { island, ready } = useAppState();
  const api = useApi<{ island: string; stations: CoralStation[]; rodriguesSst: number | null }>(ready ? `/api/sea-warmth?island=${island}` : null);
  const d = api.data && api.data.island === island ? api.data : null;
  if (!d) return null;
  if (island === "rodrigues") {
    if (d.rodriguesSst === null) return null;
    return (
      <section className="card mb-4" aria-labelledby="sea-warm">
        <h2 id="sea-warm" className="label">Sea temperature · Rodrigues</h2>
        <p className="mt-2 text-base font-semibold">About {d.rodriguesSst}°C offshore today.</p>
        <p className="mt-1 text-[11px] text-muted dark:text-slate-400">Open-Meteo marine model. NOAA Coral Reef Watch has no monitoring station for Rodrigues, so coral heat stress is not shown here.</p>
      </section>
    );
  }
  if (!d.stations.length) return null;
  const worst = [...d.stations].sort((a, b) => b.alert - a.alert)[0];
  return (
    <section className="card mb-4" aria-labelledby="sea-warm">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sea-warm" className="label">Lagoon warmth &amp; coral stress</h2>
        <span className={`chip ${ALERT_TONE(worst.alert)}`}>{worst.alertText}</span>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {d.stations.map((s) => (
          <li key={s.id} className="rounded-2xl bg-mist p-3 dark:bg-white/5">
            <div className="flex items-center justify-between gap-2">
              <strong>{s.name}</strong>
              <span className={`chip ${ALERT_TONE(s.alert)}`}>{s.alertText}</span>
            </div>
            <p className="mt-1">
              Sea surface about <strong>{s.sstMax.toFixed(1)}°C</strong> — {signed(s.anomaly)}°C vs normal for the date
              {s.trend7 !== null && Math.abs(s.trend7) >= 0.3 ? `, ${s.trend7 > 0 ? "warming" : "cooling"} ${Math.abs(s.trend7).toFixed(1)}°C in a week` : ""}.
            </p>
            <p className="text-[12px] text-muted dark:text-slate-400">
              Heat stress so far: {s.dhw} °C-weeks{s.dhw >= 4 ? " — enough for significant coral bleaching" : s.dhw > 0 ? " — building up" : ""}. Satellite data of {s.date}.
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">
        {worst.alert >= 3
          ? "Corals are under heat stress: bleaching is likely. Avoid touching or standing on coral, use reef-safe sunscreen, and report bleaching you see."
          : worst.alert >= 1
            ? "The sea is warmer than corals like. Watch for pale or white corals, and avoid touching them."
            : "No marine heatwave: lagoon temperatures are within the normal range for corals."}
      </p>
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        Source: NOAA Coral Reef Watch, 5 km satellite Regional Virtual Stations (public domain). Degree Heating Weeks measure accumulated heat stress over 12 weeks; 4+ °C-weeks usually means significant bleaching, 8+ severe bleaching. Satellite values are for the open lagoon and reef area, not a particular beach.
      </p>
    </section>
  );
}
