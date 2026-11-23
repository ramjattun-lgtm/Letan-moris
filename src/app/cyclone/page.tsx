"use client";

import { useAppState } from "@/components/AppState";
import { OFFICIAL, OFFICIAL_LINKS } from "@/data/official-status";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import { DEFAULT_LOCATION } from "@/data/localities";
import { ago, dayLabel, formatUtcAsMU } from "@/lib/time";
import type { CycloneStatus } from "@/lib/weather/providers/gdacs.provider";
import { SEASON, WARNING_CLASSES } from "@/data/cyclone-season";
import { SeasonScorecard } from "@/components/SeasonScorecard";
import dynamic from "next/dynamic";
import { NEAR_KM, stormImpact, utcToMU } from "@/lib/weather/intelligence/storm-impact.service";
import { addHours, hhmm } from "@/lib/time";
import { Skeleton } from "@/components/Status";
import { seasonLabel } from "@/lib/weather/intelligence/analogues.service";

const CycloneMap = dynamic(() => import("@/components/CycloneMap").then((m) => m.CycloneMap), { ssr: false, loading: () => <Skeleton className="h-[55vh]" /> });

function when(iso: string | null) {
  if (!iso) return "";
  const l = utcToMU(iso);
  return ` around ${dayLabel(l.slice(0, 10))} ${hhmm(l)}`;
}

import { EMERGENCY_NUMBERS, EMERGENCY_SOURCE } from "@/data/emergency";
import { cycloneMode } from "@/lib/weather/intelligence/cyclone-mode.service";
import { Checklist } from "@/components/CycloneChecklist";
import { tr } from "@/lib/i18n";

export default function CyclonePage() {
  const { island, ready, location } = useAppState();
  const o = OFFICIAL[island];
  const name = island === "rodrigues" ? "Rodrigues" : "Mauritius";
  // Independent model outlook (clearly labelled) for the main town of the island.
  const api = useApi<Forecast>(ready ? `/api/forecast?loc=${DEFAULT_LOCATION[island]}` : null);
  const f = api.data;
  const tc = useApi<CycloneStatus>(ready ? "/api/cyclones" : null);
  const systems = tc.data?.systems ?? [];
  const nearest = systems[0];
  const myClosest = nearest?.closest?.[location.island] ?? null;
  const isNear = !!nearest && (myClosest ? myClosest.km : Math.min(nearest.distanceKm.mauritius, nearest.distanceKm.rodrigues)) <= NEAR_KM;
  const mine = useApi<Forecast>(ready && isNear ? `/api/forecast?loc=${location.id}` : null);
  const impact = mine.data ? stormImpact(mine.data.hourly, myClosest?.time ? addHours(utcToMU(myClosest.time), 24) : undefined) : null;

  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Cyclone information —")} {tr(name)}</h1>

      {cycloneMode(island, tc.data).active && (
        <section className="card mb-4 border-2 border-[#D9480F]" aria-labelledby="mode">
          <h2 id="mode" className="text-lg font-bold text-[#D9480F]">{tr("Cyclone mode")}</h2>
          <p className="mt-1 text-sm">{tr(cycloneMode(island, tc.data).headline)}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.label}>
                <a href={`tel:${n.number.split(" ")[0]}`} className="block rounded-2xl bg-mist p-3 dark:bg-white/5">
                  <span className="block text-xs text-muted dark:text-slate-400">{tr(n.label)}</span>
                  <span className="text-lg font-extrabold">{tr(n.number)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">{tr("Refugee centres open when the authorities decide: listen to radio/TV or ask your District or Municipal Council. Keep phones charged; use the")} <a href="/lite" className="font-semibold underline">{tr("light version")}</a> {tr("if your connection is weak.")}</p>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Numbers:")} <a className="underline" href={EMERGENCY_SOURCE.url} target="_blank" rel="noreferrer">{tr(EMERGENCY_SOURCE.text)}</a>{tr(". Check locally.")}</p>
        </section>
      )}

      <section className="card mb-4 border-2 border-navy/10 dark:border-white/10" aria-labelledby="official">
        <p className="chip bg-navy text-white dark:bg-teal-soft dark:text-navy">{tr("OFFICIAL INFORMATION")}</p>
        <h2 id="official" className="mt-2 text-lg font-bold">{tr("Official warning status for")} {tr(name)}</h2>
        {o.status === "not-entered" ? (
          <p className="mt-2">
            {tr("Letan Moris does not receive official warnings automatically yet.")} <strong>{tr("Always check Mauritius Meteorological Services (MMS)")}</strong> {tr("for the current cyclone warning status for")} {tr(name)} {tr("— MMS issues separate warnings for Mauritius and Rodrigues.")}
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-lg font-bold">{tr(o.headline)}</p>
            <p className="text-sm text-muted dark:text-slate-400">
              {tr("Issued by MMS")} {tr(o.issuedAtMU)} {tr("· entered here")} {tr(o.enteredAtMU)} {tr("(Mauritius time). This may already be out of date —")}{" "}
              <a className="underline" href={o.sourceUrl || OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer">{tr("check MMS now")}</a>.
            </p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer" className="min-h-11 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
            {tr("Open MMS website")}
          </a>
          <a href={OFFICIAL_LINKS.rsmc.url} target="_blank" rel="noreferrer" className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-navy/15 dark:bg-night-card dark:ring-white/15">
            {tr("Regional cyclone centre (Météo-France La Réunion)")}
          </a>
        </div>
        <p className="mt-2 text-xs text-muted dark:text-slate-400">{tr("Cyclone season: roughly November to May. Warnings are also broadcast on radio and TV.")}</p>
      </section>

      <section className="card mb-4" aria-labelledby="active">
        <p className="chip bg-rain/15 text-rain dark:text-rain-soft">{tr("LIVE — INTERNATIONAL MONITORING, NOT AN MMS WARNING")}</p>
        <h2 id="active" className="mt-2 text-lg font-bold">{tr("Active tropical systems in the South-West Indian Ocean")}</h2>
        {!tc.data ? (
          <p className="mt-2 text-sm text-muted">{tr(tc.error ? tr("Could not check right now. Please check MMS.") : "Checking…")}</p>
        ) : !tc.data.ok ? (
          <p className="mt-2 text-sm">{tr("Could not check international monitoring right now (")}{tr((tc.data.message) ?? "")}{tr("). This does not mean there is no storm — please check MMS.")}</p>
        ) : systems.length === 0 ? (
          <p className="mt-2">
            <strong>{tr("No active tropical storm or cyclone")}</strong> {tr("is currently listed for the South-West Indian Ocean.")}
          </p>
        ) : (
          <>
          <div className="mt-3">
            <CycloneMap systems={systems} />
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted dark:text-slate-400">
              <span><span className="mr-1 inline-block h-0.5 w-5 bg-navy align-middle dark:bg-white" />{tr("Past track")}</span>
              <span><span className="mr-1 inline-block w-5 border-t-2 border-dashed border-[#D9480F] align-middle" />{tr("Forecast track")}</span>
              <span><span className="mr-1 inline-block h-3 w-4 rounded bg-coral/40 align-middle" />{tr("Uncertainty cone (where the centre may go)")}</span>
              <span><span className="mr-1 inline-block h-3 w-4 rounded bg-[#D9480F]/20 align-middle" />{tr("Strong-wind areas")}</span>
              <span><span className="mr-1 inline-block w-5 border-t-2 border-dotted border-[#7F94A3] align-middle" />{tr("Past storms on a similar path")}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("The cone is not the size of the storm: strong wind and heavy rain can reach far outside it. Forecast tracks change every few hours.")}</p>
          </div>
          <ul className="mt-3 space-y-2">
            {systems.map((s) => (
              <li key={s.id} className="rounded-2xl bg-mist p-3 dark:bg-white/5">
                <p className="text-lg font-bold">{tr(s.name)}</p>
                <p className="text-sm">
                  {tr("About")} <strong>{tr(s.distanceKm.mauritius.toLocaleString())} {tr("km")} {tr(s.bearingFrom.mauritius)}</strong> {tr("of Mauritius · about")}{" "}
                  <strong>{tr(s.distanceKm.rodrigues.toLocaleString())} {tr("km")} {tr(s.bearingFrom.rodrigues)}</strong> {tr("of Rodrigues")}
                </p>
                <p className="text-sm text-muted dark:text-slate-400">
                  {tr(s.maxWindKmh !== null ? `Maximum winds about ${s.maxWindKmh} km/h · ` : "")}{tr("Position")} {tr(Math.abs(s.lat).toFixed(1))}°S {tr(s.lon.toFixed(1))}°E
                  {tr(s.alertLevel ? ` · GDACS impact level: ${s.alertLevel}` : "")}
                </p>
                {s.closest && (
                  <ul className="mt-1 text-sm">
                    {(["mauritius", "rodrigues"] as const).map((isl) =>
                      s.closest?.[isl] ? (
                        <li key={isl}>
                          {tr("Closest forecast approach to")} {tr(isl === "mauritius" ? "Mauritius" : "Rodrigues")}: <strong>{tr("about")} {tr(s.closest[isl]!.km.toLocaleString())} {tr("km")} {tr(s.closest[isl]!.bearing)}</strong>
                          {tr(when(s.closest[isl]!.time))}
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
                {s.analogues && s.analogues.length > 0 && (
                  <div className="mt-2 rounded-2xl bg-white p-3 text-sm dark:bg-night-card">
                    <p className="font-bold">{tr("Past storms on a similar path")}</p>
                    <ul className="mt-1 space-y-1">
                      {s.analogues.map((a) => (
                        <li key={a.sid}>
                          <strong>
                            {tr(a.name)} ({tr(seasonLabel(a.season))})
                          </strong>
                          {tr(": passed about")} {tr(a.closest.mauritius.km.toLocaleString())} {tr("km from Mauritius")}
                          {tr(a.closest.mauritius.windKmh ? ` (winds near its centre about ${a.closest.mauritius.windKmh} km/h)` : "")} {tr("and about")} {tr(a.closest.rodrigues.km.toLocaleString())} {tr("km from Rodrigues.")}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
                      {tr("Matched on position, direction of travel and strength, using NOAA IBTrACS records since 1980. Past storms are context only: each storm follows today's weather patterns. The forecast track above comes first.")}
                    </p>
                  </div>
                )}
                {s.reportUrl && (
                  <a className="text-sm font-semibold text-teal-ink underline dark:text-teal-soft" href={s.reportUrl} target="_blank" rel="noreferrer">
                    {tr("Track and details (GDACS)")}
                  </a>
                )}
              </li>
            ))}
          </ul>
          </>
        )}
        {tc.data && (
          <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
            {tr("Source:")} <a className="underline" href={tc.data.source.url} target="_blank" rel="noreferrer">{tr(tc.data.source.text)}</a>{tr(", checked")} {tr(formatUtcAsMU(tc.data.checkedAt))} ({tr(ago(tc.data.checkedAt))}{tr("). Distances are straight-line from the latest reported position. Official tracks: RSMC La Réunion. Official warnings: MMS.")}
          </p>
        )}
      </section>

      {isNear && (
        <section className="card mb-4 ring-2 ring-coral/50" aria-labelledby="mine">
          <p className="chip bg-coral/20 text-coral-ink dark:text-coral">{tr("INDEPENDENT MODEL FORECAST — NOT A WARNING")}</p>
          <h2 id="mine" className="mt-2 text-lg font-bold">{tr("What it could mean for")} {tr(location.name)}</h2>
          {!impact ? (
            <p className="mt-2 text-sm text-muted">{tr(mine.error ? tr("Forecast for your place is unavailable.") : "Loading…")}</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                {tr("Strongest gusts in the model")}{" "}
                {impact.peakGust ? (
                  <strong>
                    {tr("about")} {impact.peakGust.kmh} {tr("km/h,")} {tr(dayLabel(impact.peakGust.time.slice(0, 10)))} {tr("around")} {tr(hhmm(impact.peakGust.time))}
                  </strong>
                ) : (
                  tr("not available")
                )}
                .
              </li>
              <li>
                {tr("Total rain")} {tr(impact.windowLabel)}: <strong>{tr(impact.totalRainMm === null ? tr("not available") : `about ${impact.totalRainMm} mm`)}</strong>.
              </li>
              {impact.firstStrongGust ? (
                <li className="rounded-2xl bg-coral/15 p-3">
                  {tr("Gusts of 60 km/h or more are possible from about")} <strong>{tr(dayLabel(impact.firstStrongGust.slice(0, 10)))} {tr(hhmm(impact.firstStrongGust))}</strong>{tr(". Aim to finish your preparations by")}{" "}
                  <strong>{tr(impact.prepareBy ? `${dayLabel(impact.prepareBy.slice(0, 10))} ${hhmm(impact.prepareBy)}` : "now")}</strong> {tr("— and follow MMS bulletins.")}
                </li>
              ) : (
                <li>{tr("No gusts of 60 km/h or more in the model for your place in this period. Keep following MMS — tracks can change.")}</li>
              )}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
            {tr("Global weather models often underestimate winds near a cyclone's centre. Change place with the selector on the Home page. Official warnings: MMS.")}
          </p>
        </section>
      )}

      <SeasonScorecard />

      <section className="card mb-4" aria-labelledby="season">
        <h2 id="season" className="text-lg font-bold">{tr("Cyclone season")} {tr(SEASON.name)}</h2>
        <p className="mt-2 text-sm">{tr(SEASON.outlook)}</p>
        <p className="mt-2 text-sm font-semibold">{tr(SEASON.reminder)}</p>
        <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
          {tr("Season runs to")} {tr(SEASON.officialEnd)}{tr(". Source:")}{" "}
          <a className="underline" href={SEASON.outlookSource.url} target="_blank" rel="noreferrer">{tr(SEASON.outlookSource.text)}</a>.
        </p>
      </section>

      <section className="card mb-4" aria-labelledby="classes">
        <h2 id="classes" className="text-lg font-bold">{tr("What the warning classes mean")}</h2>
        <ul className="mt-2 space-y-2">
          {WARNING_CLASSES.map((w) => (
            <li key={w.cls} className="rounded-2xl bg-mist p-3 text-sm dark:bg-white/5">
              <strong>{tr(w.cls)}:</strong> {tr(w.text)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted dark:text-slate-400">{tr("Simplified summary. MMS issues separate warnings for Mauritius and Rodrigues — always follow the exact MMS bulletin.")}</p>
      </section>

      <section className="card mb-4" aria-labelledby="model">
        <p className="chip bg-coral/20 text-coral-ink dark:text-coral">{tr("INDEPENDENT MODEL FORECAST — NOT A WARNING")}</p>
        <h2 id="model" className="mt-2 text-lg font-bold">{tr("Wind and rain outlook for")} {tr(name)} {tr("(7 days)")}</h2>
        {f ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {f.daily.map((d) => (
              <li key={d.date} className="flex justify-between rounded-2xl bg-mist px-3 py-2 text-sm dark:bg-white/5">
                <span className="font-semibold">{tr(dayLabel(d.date))}</span>
                <span>
                  {tr("gusts")} {d.windGustsMax === null ? "—" : Math.round(d.windGustsMax)} {tr("km/h · rain")} {d.precipitationSum ?? "—"} {tr("mm")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{tr(api.error ? tr("Model forecast unavailable right now.") : "Loading…")}</p>
        )}
        <p className="mt-2 text-xs text-muted dark:text-slate-400">
          {tr("Global models can misjudge the track and strength of tropical systems. Cyclone tracking maps will be added only when a reliable, permitted official data source is connected.")}
        </p>
      </section>

      <section className="card" aria-labelledby="prep">
        <h2 id="prep" className="text-lg font-bold">{tr("Be prepared — checklist")}</h2>
        <Checklist />
        <p className="mt-3 text-xs text-muted dark:text-slate-400">{tr("General advice only. Follow instructions from MMS and the authorities.")}</p>
      </section>
    </>
  );
}
