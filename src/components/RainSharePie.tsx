"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { RainShare } from "@/lib/weather/intelligence/reservoir.service";

type Win = "d7" | "m1" | "m6";
const WINS: { key: Win; label: string }[] = [
  { key: "d7", label: "7 days" },
  { key: "m1", label: "1 month" },
  { key: "m6", label: "6 months" },
];
const fmt = (x: number) => (x >= 10 ? Math.round(x).toLocaleString() : x.toFixed(1));

/** Pie: share of the rain on Mauritius that fell on the 7 reservoir catchments vs elsewhere. */
export function RainSharePie({ share }: { share: Record<Win, RainShare | null> }) {
  const [w, setW] = useState<Win>("m1");
  const s = share[w];
  const data = s ? [
    { name: "On the reservoir catchments", value: s.catchmentMm3, color: "#0FA3A3" },
    { name: "Elsewhere on Mauritius", value: Math.max(0, s.islandMm3 - s.catchmentMm3), color: "#CFE3F7" },
  ] : [];
  const ratio = s && s.areaPct > 0 ? s.pct / s.areaPct : null;
  return (
    <section className="card text-sm lg:col-span-2" aria-labelledby="share-title">
      <h3 id="share-title" className="label">Where did the rain fall? · Mauritius</h3>
      <div role="group" aria-label="Period" className="mt-2 flex gap-2">
        {WINS.map((x) => (
          <button key={x.key} type="button" aria-pressed={w === x.key} onClick={() => setW(x.key)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${w === x.key ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-mist text-muted dark:bg-white/10"}`}>
            Last {x.label}
          </button>
        ))}
      </div>
      {!s ? (
        <p className="mt-3 text-muted">Not enough data for this period right now.</p>
      ) : (
        <div className="mt-2 grid items-center gap-3 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto h-44 w-44" role="img" aria-label={`${s.pct}% of the rain fell on the reservoir catchments`}>
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
              <span className="text-[10px] text-muted">on catchments</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold">
              {s.pct}% of the rain on Mauritius fell on the reservoir catchments — about {fmt(s.catchmentMm3)} of {fmt(s.islandMm3)} million m³.
            </p>
            <ul className="space-y-1">
              {data.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: d.color }} aria-hidden="true" />
                  {d.name}: {fmt(d.value)} million m³
                </li>
              ))}
            </ul>
            <p>
              The catchments cover only <strong>{s.areaPct}%</strong> of the island
              {ratio !== null ? `, but got ${ratio >= 1.1 ? `about ${Math.round(ratio * 10) / 10}× as much rain per km² as the island average` : ratio <= 0.9 ? "less rain per km² than the island average" : "about the island-average rain per km²"}` : ""}{ratio !== null && ratio >= 1.1 ? " — they sit on the wet central plateau." : "."}
            </p>
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-[#A61E1E] dark:text-[#FFB4B4]">⚠ Rain, not reservoir levels: much of this water soaks into the ground or evaporates, so it is not the amount that reached the reservoirs.</p>
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
        Rough estimate: rain over each catchment × its area (Water Resources Unit), against an island average from 6 places × 1,865 km². Weather models under-estimate rain on high ground, so volumes are on the low side.
      </p>
    </section>
  );
}
