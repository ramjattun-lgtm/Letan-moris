"use client";

import Link from "next/link";
import { useAppState } from "./AppState";
import { useApi } from "@/lib/client/useApi";
import { useLapli } from "@/lib/client/useLapli";
import { upwindAlert } from "@/lib/community/lapli";
import type { Forecast, MarineForecast } from "@/lib/weather/types";
import type { CycloneStatus } from "@/lib/weather/providers/gdacs.provider";
import type { HeavyRainAssessment } from "@/lib/weather/intelligence/heavy-rain.service";
import type { RiverAssessment } from "@/lib/weather/intelligence/river.service";
import { heatDay, windowText, type MosquitoLevel } from "@/lib/weather/intelligence/wellbeing.service";
import { getLocality } from "@/data/localities";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { addHours, hhmm, hourStart, nowMU, todayMU } from "@/lib/time";
import { OFFICIAL_LINKS } from "@/data/official-status";

type Severity = "red" | "amber" | "info";
interface Alert {
  id: string;
  severity: Severity;
  icon: string;
  title: string;
  text: string;
  href?: string;
}
type RiverItem = RiverAssessment & { id: string; name: string; downstream: string[]; downstreamText: string };

const TONE: Record<Severity, string> = {
  red: "border-l-[#D9480F] bg-[#FFF0EA] dark:bg-[#3A1A10]",
  amber: "border-l-coral bg-[#FFF7EA] dark:bg-[#2E2412]",
  info: "border-l-rain bg-[#EEF5FE] dark:bg-[#10233A]",
};
const RANK: Record<Severity, number> = { red: 0, amber: 1, info: 2 };

/** All relevant independent alerts for the chosen place, from the latest data. Shown at the top of Today. */
export function AlertsPanel({ f }: { f: Forecast }) {
  const { location, island, ready } = useAppState();
  const cyc = useApi<CycloneStatus>(ready ? "/api/cyclones" : null);
  const hr = useApi<HeavyRainAssessment>(ready ? `/api/heavyrain?loc=${location.id}` : null);
  const riv = useApi<{ island: string; rivers: RiverItem[] }>(ready ? `/api/rivers?island=${island}` : null);
  const mos = useApi<{ level: MosquitoLevel | null }>(ready ? `/api/mosquito?loc=${location.id}` : null);
  const sea = useApi<MarineForecast>(ready && location.kind === "beach" ? `/api/marine?loc=${location.id}` : null);
  const lapli = useLapli();

  const alerts: Alert[] = [];
  const now = hourStart(nowMU());
  const today = todayMU();
  const where = island === "rodrigues" ? "Rodrigues" : "Mauritius";

  // Tropical systems nearby (GDACS).
  for (const s of cyc.data?.systems ?? []) {
    const km = s.distanceKm[island];
    if (km > 1200) continue;
    alerts.push({
      id: `cyc-${s.id}`,
      severity: km <= 600 ? "red" : "amber",
      icon: "🌀",
      title: `${s.name}: about ${Math.round(km / 10) * 10} km from ${where}`,
      text: `${s.maxWindKmh ? `Winds up to about ${s.maxWindKmh} km/h. ` : ""}Follow MMS bulletins and get your cyclone kit ready.`,
      href: "/cyclone",
    });
  }

  // Heavy rain and flash flood risk.
  if (hr.data?.level === "high" || hr.data?.level === "moderate")
    alerts.push({ id: "heavy", severity: hr.data.level === "high" ? "red" : "amber", icon: "🌧️", title: `${hr.data.level === "high" ? "High" : "Moderate"} heavy-rain risk · next 24 h`, text: hr.data.summary, href: "/map" });

  // Rain upstream of this place.
  const here = getLocality(location.id);
  const mineRivers = (riv.data?.rivers ?? []).filter(
    (r) => (r.level === "high" || r.level === "moderate") && (r.downstream.includes(location.id) || r.downstream.some((d) => { const l = getLocality(d); return l && here ? distanceKm(l, here) <= 6 : false; })),
  );
  for (const r of mineRivers)
    alerts.push({ id: `river-${r.id}`, severity: r.level === "high" ? "red" : "amber", icon: "🏞️", title: `Rain upstream · ${r.name}`, text: r.message, href: "/rivers" });
  const otherHigh = (riv.data?.rivers ?? []).filter((r) => r.level === "high" && !mineRivers.includes(r));
  if (otherHigh.length)
    alerts.push({ id: "river-other", severity: "info", icon: "🏞️", title: "Heavy rain upstream elsewhere", text: `${otherHigh.map((r) => r.name).join(", ")}: rivers may rise quickly. Avoid river outings and crossings there.`, href: "/rivers" });

  // Thunderstorms in the next 12 hours.
  const storm = f.hourly.find((h) => h.time >= now && h.time < addHours(now, 12) && (h.weatherCode ?? 0) >= 95);
  if (storm) alerts.push({ id: "thunder", severity: "amber", icon: "⛈️", title: `Thunderstorms possible around ${hhmm(storm.time)}`, text: "If you hear thunder, go indoors and wait 30 minutes after the last rumble. Stay off beaches and open ground.", href: "/rain" });

  // Strong winds today.
  const day = f.daily.find((d) => d.date === today);
  const gust = day?.windGustsMax ?? null;
  if (gust !== null && gust >= 60)
    alerts.push({ id: "wind", severity: gust >= 90 ? "red" : "amber", icon: "💨", title: `Strong gusts up to about ${Math.round(gust)} km/h today`, text: "Secure loose objects, take care on exposed roads and at sea.", href: "/day" });

  // Heat stress.
  const heat = heatDay(f.hourly, today);
  if (heat.peak && (heat.peak.level === "high" || heat.peak.level === "danger")) {
    const w = heat.windows.find((x) => x.level === heat.peak!.level) ?? heat.windows[0];
    alerts.push({ id: "heat", severity: heat.peak.level === "danger" ? "red" : "amber", icon: "🥵", title: `Heat stress ${heat.peak.level === "danger" ? "danger" : "high"} · feels like ${heat.peak.feels}°C`, text: `${w ? `Take care ${windowText(w)}. ` : ""}Drink water often and rest in the shade.` });
  }
  if (heat.uvMax !== null && heat.uvMax >= 11)
    alerts.push({ id: "uv", severity: "info", icon: "☀️", title: `Extreme UV (${heat.uvMax}) around midday`, text: "Sunburn in about 15 minutes: hat, cover-up and sunscreen." });

  // Rough sea (beach places only; open-sea model values).
  const waves = (sea.data?.hourly ?? []).filter((h) => h.time >= now && h.time < addHours(now, 24) && h.waveHeight !== null).map((h) => h.waveHeight as number);
  if (waves.length && Math.max(...waves) >= 2.5)
    alerts.push({ id: "sea", severity: Math.max(...waves) >= 3.5 ? "red" : "amber", icon: "🌊", title: `Rough sea · waves up to ${Math.max(...waves).toFixed(1)} m offshore`, text: "Not a day for small boats or swimming outside the lagoon. Follow lifeguard flags and MMS sea advice.", href: "/marine" });

  // People reporting rain upwind.
  const up = lapli.places ? upwindAlert(location, lapli.places, f.current.windDirection, f.current.windSpeed) : null;
  if (up?.heavy)
    alerts.push({ id: "lapli", severity: "amber", icon: "💧", title: `Heavy rain reported ${up.km} km ${up.direction} (${up.place})`, text: `Reported ${up.minutesAgo} min ago by ${up.reports} ${up.reports === 1 ? "person" : "people"}. It may reach you in about ${up.etaMin[0]}–${up.etaMin[1]} minutes.` });

  // Mosquito weather.
  if (mos.data?.level === "very-favourable")
    alerts.push({ id: "mos", severity: "info", icon: "🦟", title: "Mosquito weather", text: "Warm, wet weather favours breeding: empty standing water this week." });

  alerts.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const loading = cyc.loading || hr.loading || riv.loading;

  return (
    <section className="mb-4" aria-labelledby="alerts-title">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="alerts-title" className="font-[family-name:var(--font-display)] text-lg font-extrabold">
          {alerts.length ? `⚠️ Alerts for ${location.name}` : `Alerts for ${location.name}`}
        </h2>
        <a className="shrink-0 text-xs font-semibold text-teal-ink underline dark:text-teal-soft" href={OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer">
          Official MMS warnings ↗
        </a>
      </div>
      {alerts.length === 0 ? (
        <div className="rounded-2xl border-l-4 border-l-teal bg-teal/10 px-4 py-3 text-sm">
          {loading ? "Checking the latest data…" : "✅ No weather alerts for your area from the latest data."}
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const body = (
              <>
                <span aria-hidden="true" className="text-xl">{a.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block text-sm">{a.text}</span>
                </span>
                {a.href && <span aria-hidden="true" className="self-center text-lg text-muted">›</span>}
              </>
            );
            const cls = `flex gap-3 rounded-2xl border-l-4 px-4 py-3 ${TONE[a.severity]}`;
            return <li key={a.id}>{a.href ? <Link href={a.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
          })}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-muted dark:text-slate-400">
        Independent alerts from the latest forecasts, storm tracks and community reports — not official warnings. For cyclone, heavy rain and sea warnings, always follow MMS.
      </p>
    </section>
  );
}
