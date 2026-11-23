"use client";

import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { SeasonSystem } from "@/lib/weather/providers/gdacs.provider";
import { tr } from "@/lib/i18n";

interface Season {
  start: string;
  ok: boolean;
  systems: SeasonSystem[];
  nearSoFar: { mauritius: number; rodrigues: number };
  normals: { mauritius: Normal | null; rodrigues: Normal | null } | null;
}
interface Normal {
  perSeason: number;
  byNow: number;
  seasons: number;
  from: number;
  km: number;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Indian/Mauritius" }) : "—");

/** Season so far: systems tracked in the South-West Indian Ocean and how many came close, vs typical. */
export function SeasonScorecard() {
  const { island } = useAppState();
  const api = useApi<Season>("/api/season");
  const d = api.data;
  if (!d) return null;
  const n = d.normals?.[island] ?? null;
  const near = d.nearSoFar[island];
  const name = island === "rodrigues" ? "Rodrigues" : "Mauritius";
  return (
    <section className="card mb-4" aria-labelledby="score">
      <h2 id="score" className="text-lg font-bold">{tr("Season so far · scorecard")}</h2>
      {!d.ok ? (
        <p className="mt-2 text-sm text-muted">{tr("Season data from GDACS is unavailable right now.")}</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-mist p-3 dark:bg-white/5">
              <div className="text-3xl font-extrabold">{d.systems.length}</div>
              <div className="text-xs text-muted">{tr("systems tracked in the South-West Indian Ocean since")} {tr(fmtDate(`${d.start}T00:00:00+04:00`))}</div>
            </div>
            <div className="rounded-2xl bg-mist p-3 dark:bg-white/5">
              <div className="text-3xl font-extrabold">{near}</div>
              <div className="text-xs text-muted">{tr("came within 500 km of")} {tr(name)}{tr(n ? ` (typical by now: ${n.byNow})` : "")}</div>
            </div>
          </div>
          {n && (
            <p className="mt-2 text-sm">
              {tr("In a typical season since")} {n.from}{tr(", about")} {n.perSeason} {tr("storms pass within")} {n.km} {tr("km of")} {tr(name)} {tr("— most of them between January and March.")}
            </p>
          )}
          {d.systems.length > 0 && (
            <ul className="mt-2 divide-y divide-navy/5 text-sm dark:divide-white/10">
              {d.systems.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>
                    <strong>{tr(s.name)}</strong> <span className="text-xs text-muted">{tr(fmtDate(s.fromDate))}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {tr(s.closestKm[island] !== null ? `closest ~${Math.round((s.closestKm[island] as number) / 10) * 10} km` : "")}
                    {tr(s.maxWindKmh ? ` · up to ${s.maxWindKmh} km/h` : "")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr("This season: GDACS (systems it has tracked, including weaker ones; distances from its track). Typical: NOAA IBTrACS since 1980. For the official count of named storms, see RSMC La Réunion and MMS.")}
      </p>
    </section>
  );
}
