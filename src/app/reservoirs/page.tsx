"use client";

import Link from "next/link";
import { ErrorBanner, Skeleton } from "@/components/Status";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "@/components/AppState";
import { RECORDS_START, RESERVOIR_SOURCE, type Reservoir } from "@/data/reservoirs";
import { TREND_TEXT, type Comparison, type OutlookPeriod, type Trend } from "@/lib/weather/intelligence/reservoir.service";
import { ago, formatUtcAsMU } from "@/lib/time";
import { ReservoirInsights, type Insights } from "@/components/ReservoirInsights";
import { RainSharePie } from "@/components/RainSharePie";
import type { RainShare } from "@/lib/weather/intelligence/reservoir.service";
import { tr } from "@/lib/i18n";

type Win = "d7" | "m1" | "m6";
interface Data {
  island?: "mauritius" | "rodrigues";
  today: string;
  historyReady: boolean;
  history: { start: number; end: number | null };
  filledDays: number;
  reanalysisOk: boolean;
  overall: { past: Record<Win, Comparison>; next7: Comparison | null };
  reservoirs: (Reservoir & { compareFrom: number; past: Record<Win, Comparison>; next7: Comparison | null })[];
  outlook: { weeks: OutlookPeriod | null; months: { months: OutlookPeriod[]; total: OutlookPeriod } | null };
  insights?: Insights | null;
  share?: Record<"d7" | "m1" | "m6", RainShare | null> | null;
  retrievedAt: string;
}

const TONE: Record<Trend, string> = {
  "much-drier": "bg-[#B5541B] text-white",
  drier: "bg-coral text-navy",
  normal: "bg-mist text-navy dark:bg-white/10 dark:text-slate-200",
  wetter: "bg-rain/20 text-navy dark:text-slate-100",
  "much-wetter": "bg-rain text-white",
};

function Pct({ pct, trend }: { pct: number | null; trend: Trend | null }) {
  if (pct === null || trend === null) return <span className="chip bg-mist text-muted dark:bg-white/10">—</span>;
  return (
    <span className={`chip shrink-0 ${TONE[trend]}`} title={TREND_TEXT[trend]}>
      {pct}{tr("% of normal rain level")}
    </span>
  );
}

function Row({ label, c, future }: { label: string; c: Comparison | null; future?: boolean }) {
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{tr(label)}</span>
        <Pct pct={c?.pctNormal ?? null} trend={c?.trend ?? null} />
      </div>
      <p className="text-sm text-muted dark:text-slate-400">
        {tr(c === null || c.mm === null
          ? tr("Not enough data.")
          : `${future ? "About " : ""}${Math.round(c.mm)} mm${future ? " expected" : ""}${c.normalMm !== null ? ` · normal rain level ${Math.round(c.normalMm)} mm` : ""}${c.trend ? ` · ${TREND_TEXT[c.trend]}` : ""}`)}
        {tr(c?.rank ? ` · ${c.rank}` : "")}
      </p>
      {c && c.drierYears !== null && c.years > 0 && (
        <p className="text-[11px] text-muted dark:text-slate-400">
          {Math.round((c.drierYears / c.years) * 100)}{tr("% of the")} {c.years} {tr("years since")} {c.fromYear} {tr("were drier.")}
        </p>
      )}
    </li>
  );
}

function Outlook({ o, title }: { o: OutlookPeriod | null; title: string }) {
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{tr(title)}</span>
        <Pct pct={o?.pctNormal ?? null} trend={o?.trend ?? null} />
      </div>
      <p className="text-sm text-muted dark:text-slate-400">
        {tr(o?.trend ? TREND_TEXT[o.trend] : tr("Outlook not available right now."))}
        {tr(o?.wetterChance != null ? ` · ${o.wetterChance}% chance of a week above normal rain level, on average` : "")}
      </p>
    </li>
  );
}

export default function ReservoirsPage() {
  const { island, ready } = useAppState();
  const api = useApi<Data>(ready ? `/api/reservoirs?island=${island}` : null);
  const d = api.data && (api.data.island ?? "mauritius") === island ? api.data : null;
  const rod = island === "rodrigues";

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr(rod ? tr("Rodrigues — rain and water") : tr("Reservoirs — rain over the catchments"))}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">
        {tr(rod ? tr("Is it raining enough to refill tanks, rivers and groundwater?") : tr("Is nature refilling our reservoirs faster or slower than usual?"))}
      </p>

      <NotLevels rod={rod} />

      <section className="card mb-3 text-sm" aria-labelledby="what">
        <h2 id="what" className="label">{tr("What this shows")}</h2>
        {rod ? (
          <>
            <p className="mt-1">
              {tr("Rodrigues has no large reservoirs like Mauritius. Its water comes from a few rivers, rainwater collected in tanks, boreholes and desalination. So rain over the whole island is what matters: it fills household tanks and rivers and slowly recharges groundwater.")}
            </p>
            <p className="mt-2">
              {tr("This page shows")} <strong>{tr("how much rain fell, and is expected, over Rodrigues")}</strong>{tr(", compared with the same time of year in past years. For water supply, follow the Rodrigues Regional Assembly's water services.")}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1">
              <strong>{tr("A catchment area")}</strong> {tr("is the land around and above a reservoir where rainwater drains into it — through streams and feeder rivers. Rain over the catchment is what refills the reservoir.")}
            </p>
            <p className="mt-2">
              {tr("This page shows")} <strong>{tr("how much rain fell, and is expected, over each catchment")}</strong>{tr(", compared with the same time of year in past years. It does")} <strong>{tr("not")}</strong> {tr("show how full the reservoirs are: levels also depend on how much water is used, leaks and feeder canals. For actual levels and water supply hours, follow the")}{" "}
              <a className="underline" href="https://cwa.govmu.org/" target="_blank" rel="noreferrer">{tr("Central Water Authority (CWA)")}</a>.
            </p>
          </>
        )}
        <p className="mt-2">{tr("\"% of normal rain level\": 100% = the usual amount of rain for this time of year (the middle value of past years). 50% = half the usual rain.")}</p>
      </section>

      <ErrorBanner error={api.error} hasData={!!d} savedAt={api.savedAt} />
      {!d ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          {!d.historyReady && (
            <div className="card mb-3 text-sm">{tr("Comparison with past years appears once the \"Reservoir rain history\" job has run on GitHub (about 15 minutes). Rain totals are shown meanwhile.")}</div>
          )}

          <section className="card mb-3" aria-labelledby="all">
            <h2 id="all" className="label">{tr(rod ? tr("Rodrigues · whole island") : tr("All 7 catchments · average"))}</h2>
            <p className="text-[11px] text-muted dark:text-slate-400">{tr("Compared with every year since")} {RECORDS_START}{tr(", when our rain records start.")}</p>
            <h3 className="mt-2 text-sm font-bold">{tr("Rain so far")}</h3>
            <ul className="divide-y divide-navy/5 dark:divide-white/10">
              <Row label={tr("Last 7 days")} c={d.overall.past.d7} />
              <Row label={tr("Last month")} c={d.overall.past.m1} />
              <Row label={tr("Last 6 months")} c={d.overall.past.m6} />
            </ul>
            <h3 className="mt-3 text-sm font-bold">{tr("Outlook")}</h3>
            <ul className="divide-y divide-navy/5 dark:divide-white/10">
              <Row label={tr("Next 7 days")} c={d.overall.next7} future />
              <Outlook title={tr("Next month (4 weeks)")} o={d.outlook.weeks} />
              <Outlook title={`Next 6 months${d.outlook.months ? ` (${d.outlook.months.total.label})` : ""}`} o={d.outlook.months?.total ?? null} />
            </ul>
            {d.outlook.months && <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Month by month, % of normal rain level:")}</p>}
            {d.outlook.months && (
              <div className="mt-1 grid grid-cols-6 gap-1 text-center text-[11px]">
                {d.outlook.months.months.map((m) => (
                  <div key={m.label} className={`rounded-lg px-0.5 py-1 ${m.trend ? TONE[m.trend] : "bg-mist"}`}>
                    <div className="font-bold">{tr(m.label)}</div>
                    <div>{tr(m.pctNormal === null ? "—" : `${m.pctNormal}%`)}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
              {tr("The month and 6-month outlooks are long-range ECMWF forecasts for the whole island (36 km grid squares). They only indicate a tendency and are often wrong in detail; check again every week.")}
            </p>
          </section>

          {!rod && d.share && (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <RainSharePie share={d.share} />
            </div>
          )}

          {d.insights && (
            <>
              <h2 className="mb-2 mt-4 text-lg font-bold">{tr(rod ? tr("Rain insights") : tr("Rain insights · all catchments"))}</h2>
              <NotLevels rod={rod} compact />
              <ReservoirInsights i={d.insights} rod={rod} />
            </>
          )}

          {!rod && (
            <>
              <h2 className="mb-2 mt-4 text-lg font-bold">{tr("Each reservoir")}</h2>
              <NotLevels rod={rod} compact />
            </>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {d.reservoirs.map((r) => (
              <details key={r.id} className="card group" open={r.id === "mare-aux-vacoas"}>
                <summary className="cursor-pointer list-none">
                  <span className="block font-bold">{tr(r.name)}</span>
                  <span className="block text-[11px] text-muted dark:text-slate-400">
                    {tr("Built")} {tr(r.builtNote)} · {r.capacityMm3} {tr("million m³ · catchment")} {r.catchmentKm2} {tr("km²")}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-sm">
                    <span>{tr("Last 6 months")}</span>
                    <Pct pct={r.past.m6.pctNormal} trend={r.past.m6.trend} />
                  </span>
                </summary>
                {r.note && <p className="mt-2 text-sm">{tr(r.note)}</p>}
                <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
                  {tr(r.built >= RECORDS_START
                    ? `Compared with ${r.compareFrom} onwards — the years since it was built${r.compareFrom >= 2015 ? " (a short record, so treat comparisons with care)" : ""}.`
                    : `Built in ${r.built}, before our rain records start: compared with ${r.compareFrom} onwards.`)}
                </p>
                <ul className="mt-1 divide-y divide-navy/5 dark:divide-white/10">
                  <Row label={tr("Last 7 days")} c={r.past.d7} />
                  <Row label={tr("Last month")} c={r.past.m1} />
                  <Row label={tr("Last 6 months")} c={r.past.m6} />
                  <Row label={tr("Next 7 days")} c={r.next7} future />
                </ul>
              </details>
            ))}
          </div>

          <section className="card mt-3 text-[11px] text-muted dark:text-slate-400">
            <h2 className="label">{tr("How it works")}</h2>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>{tr("Rain comes from the ERA5 reanalysis on a 25 km grid, so nearby catchments can share a grid square and show similar figures.")}{tr(rod ? tr(" For Rodrigues, treat it as island-wide rain.") : "")}</li>
              <li>
                {tr("Rain is estimated")} {tr(rod ? tr("for the island") : tr("for the centre of each catchment"))} {tr("from weather models, not measured by rain gauges. Models under-estimate the total rain on high ground, so the % of normal rain level is more reliable than the mm figures.")}
              </li>
              <li>{tr("Past rain: ERA5 reanalysis (from")} {RECORDS_START}).{tr(d.filledDays > 0 ? ` The last ${d.filledDays} days are not in the reanalysis yet and come from the forecast model.` : "")}</li>
              <li>{tr("\"Normal rain level\" is the middle value of rain over the same dates in past years. Each reservoir is compared only with years after it was built.")}</li>
              {!rod && <li>{tr("La Nicolière gets most of its water by canal from the Midlands area, so also watch the Midlands Dam row.")}</li>}
              <li>{tr(RESERVOIR_SOURCE)}</li>
              <li>
                {tr("Data updated")} {tr(formatUtcAsMU(d.retrievedAt))} ({tr(ago(d.retrievedAt))}{tr("). See also the")} <Link className="underline" href="/climate">{tr("Climate page")}</Link>.
              </li>
            </ul>
          </section>
        </>
      )}
    </>
  );
}

/** Big red reminder: rain over catchments, never reservoir levels. */
function NotLevels({ rod, compact }: { rod: boolean; compact?: boolean }) {
  return (
    <div role="note" className={`mb-3 rounded-2xl border-2 border-[#C92A2A] bg-[#FFF0F0] text-[#A61E1E] dark:bg-[#3A1212] dark:text-[#FFB4B4] ${compact ? "p-2 text-xs" : "p-3 text-sm"}`}>
      <strong className="block uppercase tracking-wide">{tr("⚠ Rain, not reservoir levels")}</strong>
      {tr(rod
        ? tr("Everything here is about how much RAIN falls over Rodrigues. It does not show how much water is stored in tanks or reservoirs.")
        : tr("Everything here is about how much RAIN falls over the catchment areas of the reservoirs. It does NOT show how full the reservoirs are. For reservoir levels, see the Central Water Authority (CWA)."))}
    </div>
  );
}
