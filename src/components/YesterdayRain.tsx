"use client";

import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { RainShare } from "@/lib/weather/intelligence/reservoir.service";
import { tr } from "@/lib/i18n";

interface Yesterday {
  date: string;
  island: "mauritius" | "rodrigues";
  place: string;
  placeMm: number | null;
  islandMm: number | null;
  areas: { name: string; mm: number | null }[];
  share: RainShare | null;
}

const mm = (x: number | null) => (x === null ? "—" : x < 0.1 ? "0 mm" : `${x >= 10 ? Math.round(x) : Math.round(x * 10) / 10} mm`);

/** Yesterday's rain at a glance, and how much fell on the reservoir catchments. */
export function YesterdayRain() {
  const { location, ready } = useAppState();
  const api = useApi<Yesterday>(ready ? `/api/yesterday?loc=${location.id}` : null);
  const d = api.data;
  if (!d) return null;
  const dry = (d.islandMm ?? 0) < 0.5;
  const wettest = [...d.areas].filter((a) => a.mm !== null).sort((a, b) => (b.mm as number) - (a.mm as number))[0];
  const s = d.share;
  return (
    <section className="card" aria-labelledby="yday-title">
      <h2 id="yday-title" className="label">{tr("🌧️ Rain yesterday")}</h2>
      <p className="mt-2 text-base font-semibold">
        {tr(d.place)}: {tr(mm(d.placeMm))}
        {tr(d.islandMm !== null ? ` · ${d.island === "rodrigues" ? "Rodrigues" : "Mauritius"} average: ${mm(d.islandMm)}` : "")}
      </p>
      {dry ? (
        <p className="mt-1 text-sm">{tr("A mostly dry day across the island.")}</p>
      ) : (
        wettest && wettest.mm !== null && wettest.mm >= 0.5 && <p className="mt-1 text-sm">{tr("Wettest area:")} {tr(wettest.name)} ({tr(mm(wettest.mm))}).</p>
      )}

      {s && !dry && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-mist p-3 dark:bg-white/5">
          <PieChart width={84} height={84} aria-hidden="true">
            <Pie
              data={[{ v: s.catchmentMm3 }, { v: Math.max(0, s.islandMm3 - s.catchmentMm3) }]}
              dataKey="v"
              innerRadius={24}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill="#0FA3A3" />
              <Cell fill="#9CC4F2" />
            </Pie>
          </PieChart>
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{s.pct}{tr("% of the island's rain fell on the reservoir catchments.")}</p>
            <p>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-teal align-middle" aria-hidden="true" />
              {tr("Catchments:")} {tr(mm(s.catchmentMm))} ({s.catchmentMm3} {tr("million m³)")}
            </p>
            <p>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: "#9CC4F2" }} aria-hidden="true" />
              {tr("Rest of the island:")} {tr(mm(s.outsideMm))} ({Math.round((s.islandMm3 - s.catchmentMm3) * 10) / 10} {tr("million m³)")}
            </p>
          </div>
        </div>
      )}
      {s && !dry && <p className="mt-1 text-[11px] font-semibold text-[#A61E1E] dark:text-[#FFB4B4]">{tr("⚠ Rain over the catchment areas — not reservoir levels.")}</p>}
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
        {tr("Model estimates of yesterday's rain (not rain-gauge readings).")} {d.island === "mauritius" && <Link href="/reservoirs" className="underline">{tr("More on the Reservoirs page")}</Link>}
      </p>
    </section>
  );
}
