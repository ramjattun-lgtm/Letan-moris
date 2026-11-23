"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useApi } from "@/lib/client/useApi";
import type { RainShare } from "@/lib/weather/intelligence/reservoir.service";
import { tr } from "@/lib/i18n";

type Win = "d7" | "m1" | "m6";
const WINS: { key: Win; label: string }[] = [
  { key: "d7", label: "Last 7 days" },
  { key: "m1", label: "Last month" },
  { key: "m6", label: "Last 6 months" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = (x: number) => (x >= 10 ? Math.round(x).toLocaleString() : x.toFixed(1));

interface YearData {
  year: number;
  first: number;
  last: number;
  historyReady: boolean;
  months: { month: number; share: RainShare | null; partial: boolean }[];
  total: { share: RainShare | null; partial: boolean };
}

function ShareView({ s, label, partial }: { s: RainShare; label: string; partial?: boolean }) {
  const data = [
    { name: "On the reservoir catchments", value: s.catchmentMm3, mm: s.catchmentMm, color: "#0FA3A3" },
    { name: "Elsewhere on Mauritius", value: Math.max(0, s.islandMm3 - s.catchmentMm3), mm: s.outsideMm, color: "#9CC4F2" },
  ];
  const ratio = s.outsideMm > 0 ? s.catchmentMm / s.outsideMm : null;
  return (
    <div className="mt-2 grid items-center gap-3 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-44 w-44" role="img" aria-label={`${label}: ${s.pct}% of the rain fell on the reservoir catchments`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-teal-ink dark:text-teal-soft">{s.pct}%</span>
          <span className="text-[10px] text-muted">{tr("on catchments")}</span>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold">
          {tr(label)}{tr(partial ? tr(" (so far)") : "")}: {s.pct}{tr("% of the rain on Mauritius fell on the reservoir catchments.")}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th />
              <th>{tr("Rain")}</th>
              <th>{tr("Water volume")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name} className="border-t border-navy/5 dark:border-white/10">
                <td className="py-1 pr-2">
                  <span className="mr-1.5 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: d.color }} aria-hidden="true" />
                  {tr(d.name)}
                </td>
                <td className="font-bold">{tr(d.mm.toLocaleString())} {tr("mm")}</td>
                <td>{tr(fmt(d.value))} {tr("million m³")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {tr("The catchments cover only")} <strong>{s.areaPct}%</strong> {tr("of the island")}
          {tr(ratio !== null && ratio >= 1.1
            ? `, but each km² of them got about ${Math.round(ratio * 10) / 10}× as much rain as the rest of the island — they sit on the wet central plateau.`
            : ratio !== null && ratio <= 0.9
              ? tr(", and got less rain per km² than the rest of the island this time.")
              : tr(", and got about the same rain per km² as the rest of the island."))}
        </p>
      </div>
    </div>
  );
}

/** Pie: share of the rain on Mauritius that fell on the 7 reservoir catchments vs elsewhere — recent, or by year and month. */
export function RainSharePie({ share }: { share: Record<Win, RainShare | null> }) {
  const [mode, setMode] = useState<"recent" | "calendar">("recent");
  const [w, setW] = useState<Win>("m1");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number | "all">("all");
  const api = useApi<YearData>(mode === "calendar" ? `/api/rain-share?year=${year}` : null);
  const yd = api.data && api.data.year === year ? api.data : null;
  const years = yd ? Array.from({ length: yd.last - yd.first + 1 }, (_, i) => yd.last - i) : [thisYear];

  const recent = share[w];
  const cal = yd ? (month === "all" ? yd.total : yd.months[month - 1]) : null;

  return (
    <section className="card text-sm lg:col-span-2" aria-labelledby="share-title">
      <h3 id="share-title" className="label">{tr("Where did the rain fall? · Mauritius")}</h3>
      <div role="tablist" className="mt-2 inline-flex rounded-full bg-mist p-1 dark:bg-white/10">
        {(["recent", "calendar"] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-8 rounded-full px-3 text-xs font-semibold ${mode === m ? "bg-white shadow-sm dark:bg-night-card" : "text-muted"}`}>
            {tr(m === "recent" ? "Recent" : tr("By year & month"))}
          </button>
        ))}
      </div>

      {mode === "recent" ? (
        <>
          <div role="group" aria-label={tr("Period")} className="mt-2 flex flex-wrap gap-2">
            {WINS.map((x) => (
              <button key={x.key} type="button" aria-pressed={w === x.key} onClick={() => setW(x.key)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${w === x.key ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-mist text-muted dark:bg-white/10"}`}>
                {tr(x.label)}
              </button>
            ))}
          </div>
          {recent ? <ShareView s={recent} label={WINS.find((x) => x.key === w)!.label} /> : <p className="mt-3 text-muted">{tr("Not enough data for this period right now.")}</p>}
        </>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold">
              {tr("Year")}{" "}
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="ml-1 min-h-9 rounded-xl border border-navy/15 bg-white px-2 dark:bg-night-card">
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            {yd && !yd.historyReady && <span className="text-[11px] text-muted">{tr("Earlier years appear once the \"Reservoir rain history\" job has run.")}</span>}
          </div>
          <div role="group" aria-label={tr("Month")} className="scroll-x mt-2">
            <button type="button" aria-pressed={month === "all"} onClick={() => setMonth("all")} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${month === "all" ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-mist text-muted dark:bg-white/10"}`}>
              {tr("Whole year")}
            </button>
            {MONTHS.map((m, i) => (
              <button key={m} type="button" aria-pressed={month === i + 1} onClick={() => setMonth(i + 1)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${month === i + 1 ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-mist text-muted dark:bg-white/10"}`}>
                {tr(m)}
              </button>
            ))}
          </div>
          {!yd ? (
            <p className="mt-3 text-muted">{tr(api.error ? tr("Not available right now.") : "Loading…")}</p>
          ) : cal?.share ? (
            <ShareView s={cal.share} label={month === "all" ? String(year) : `${FULL[month - 1]} ${year}`} partial={cal.partial} />
          ) : (
            <p className="mt-3 text-muted">{tr("No data for this period")}{tr(month !== "all" && year === thisYear ? tr(" yet") : "")}.</p>
          )}
          {yd && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-muted">{tr("Month by month in")} {year}{tr(": % of the island's rain that fell on the catchments, and catchment rain (mm)")}</p>
              <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-12">
                {yd.months.map((m) => (
                  <button key={m.month} type="button" onClick={() => setMonth(m.month)} className={`rounded-lg p-1 text-center text-[10px] ${month === m.month ? "ring-2 ring-navy dark:ring-teal-soft" : ""} ${m.share ? "bg-teal/15" : "bg-mist dark:bg-white/5"}`}>
                    <div className="font-bold">{tr(MONTHS[m.month - 1])}</div>
                    <div>{tr(m.share ? `${m.share.pct}%` : "—")}</div>
                    <div className="text-muted">{tr(m.share ? `${m.share.catchmentMm} mm` : "")}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-[11px] text-[#A61E1E] dark:text-[#FFB4B4]">{tr("⚠ Rain, not reservoir levels: much of this water soaks into the ground or evaporates, so it is not the amount that reached the reservoirs.")}</p>
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
        {tr("Rough estimate. \"Rain\" = average rain depth over that area. Volumes = rain × area (catchment areas from the Water Resources Unit; island 1,865 km², island rain averaged over 6 places). Weather models under-estimate rain on high ground, so catchment figures are on the low side.")}
      </p>
    </section>
  );
}
