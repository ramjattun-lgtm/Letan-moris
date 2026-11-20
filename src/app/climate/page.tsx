"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { MonthlyChart, TrendChart } from "@/components/ClimateCharts";
import { bestMonths, CLIMATE, climateKeyFor, climateReady, monthName, normalFor, region } from "@/lib/weather/intelligence/climate.service";
import { todayMU } from "@/lib/time";

const fmtDate = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return `${dd} ${monthName(m)} ${y}`;
};
const signed = (x: number | null, unit: string) => (x === null ? "—" : `${x > 0 ? "+" : ""}${x}${unit}`);

export default function ClimatePage() {
  const { location, ready } = useAppState();
  const [key, setKey] = useState<string>("plateau");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (ready) setKey(climateKeyFor(location)); }, [ready, location]);

  if (!climateReady()) {
    return (
      <>
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">Climate — 30 years of weather</h1>
        <div className="card">
          The 30-year climate data is being prepared. It appears here once the &quot;Climate history&quot; job has run on GitHub (about 10 minutes).
        </div>
        <ReservoirLink />
      </>
    );
  }

  const r = region(key) ?? CLIMATE.regions[0];
  const today = todayMU();
  const n = normalFor(r.key, today);
  const b = bestMonths(r);
  const yearRain = Math.round(r.monthly.reduce((a, m) => a + (m.rainMm ?? 0), 0));

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">Climate — 30 years of weather</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">What is normal, what has changed, and the best times to plan — {CLIMATE.period}.</p>
      <ReservoirLink />
      <div role="group" aria-label="Region" className="scroll-x mb-4">
        {CLIMATE.regions.map((x) => (
          <button key={x.key} type="button" aria-pressed={x.key === r.key} onClick={() => setKey(x.key)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${x.key === r.key ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="label">Normal for today · {r.label} ({r.place})</h2>
          {n ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">Day high</div><div className="text-2xl font-extrabold">{n.tmax?.toFixed(0)}°</div></div>
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">Night low</div><div className="text-2xl font-extrabold">{n.tmin?.toFixed(0)}°</div></div>
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">Rainy day chance</div><div className="text-2xl font-extrabold text-rain">{n.rainChance}%</div></div>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted dark:text-slate-400">Average for this date (±7 days) over 30 years. A &quot;rainy day&quot; has at least 1 mm.</p>
        </section>

        <section className="card">
          <h2 className="label">Best times to plan · {r.label}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Driest month: <strong>{monthName(b.driest.month)}</strong> (about {b.driest.rainyDays} rainy days)</li>
            <li>Wettest month: <strong>{monthName(b.wettest.month)}</strong> (about {b.wettest.rainyDays} rainy days)</li>
            {b.sunniest?.sunHours !== null && b.sunniest && <li>Sunniest month: <strong>{monthName(b.sunniest.month)}</strong> (about {b.sunniest.sunHours} hours of sun a day)</li>}
            <li>Coolest month: <strong>{monthName(b.coolest.month)}</strong> (highs about {b.coolest.tmax}°C)</li>
            <li>Hottest month: <strong>{monthName(b.hottest.month)}</strong> (highs about {b.hottest.tmax}°C)</li>
            <li>Rain in a typical year: <strong>about {yearRain.toLocaleString()} mm</strong></li>
          </ul>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="label">Month by month · {r.label}</h2>
          <MonthlyChart r={r} />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs [&_td]:pr-3 [&_th]:pr-3">
              <thead>
                <tr className="text-left text-muted dark:text-slate-400">
                  <th className="py-1">Month</th><th>High</th><th>Low</th><th>Rain</th><th>Rainy days</th><th>Heavy</th>
                </tr>
              </thead>
              <tbody>
                {r.monthly.map((m) => (
                  <tr key={m.month} className="border-t border-navy/5 dark:border-white/5">
                    <td className="py-1.5 font-semibold">{monthName(m.month)}</td>
                    <td>{m.tmax}°</td><td>{m.tmin}°</td><td>{m.rainMm} mm</td><td>{m.rainyDays}</td><td>{m.heavyDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">Heavy = days with 25 mm of rain or more.</p>
        </section>

        <section className="card">
          <h2 className="label">How it has changed · {r.label}</h2>
          <TrendChart r={r} />
          <ul className="mt-2 space-y-1 text-sm">
            <li>Days: <strong>{signed(r.trend.tmaxPerDecade, "°C")}</strong> per decade</li>
            <li>Nights: <strong>{signed(r.trend.tminPerDecade, "°C")}</strong> per decade</li>
            <li>Yearly rain: <strong>{signed(r.trend.rainPctPerDecade, "%")}</strong> per decade</li>
          </ul>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">Straight-line trend over {CLIMATE.period}; rainfall varies a lot from year to year, so its trend is less certain.</p>
        </section>

        <section className="card">
          <h2 className="label">El Niño summers · {r.label}</h2>
          <p className="mt-2 text-sm">
            In past El Niño summers ({r.elNino.summers.map((y) => `${y - 1}–${String(y).slice(2)}`).join(", ")}), December–February rain was <strong>{signed(r.elNino.rainVsNormalPct, "%")}</strong> compared with a normal summer, and days were{" "}
            <strong>{signed(r.elNino.tmaxVsNormal, "°C")}</strong>.
          </p>
          <p className="mt-2 text-sm">A strong El Niño is expected this summer (2026–27). Past summers give a hint, not a forecast.</p>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{CLIMATE.elNinoSource}.</p>
        </section>

        <section className="card">
          <h2 className="label">Records since {r.annual[0]?.year} · {r.label}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {r.records.hottestDay && <li>Hottest day: <strong>{r.records.hottestDay.value}°C</strong> ({fmtDate(r.records.hottestDay.date)})</li>}
            {r.records.coolestNight && <li>Coolest night: <strong>{r.records.coolestNight.value}°C</strong> ({fmtDate(r.records.coolestNight.date)})</li>}
            {r.records.wettestDay && <li>Wettest day: <strong>{r.records.wettestDay.value} mm</strong> ({fmtDate(r.records.wettestDay.date)})</li>}
            {r.records.strongestGust && <li>Strongest gust: <strong>{r.records.strongestGust.value} km/h</strong> ({fmtDate(r.records.strongestGust.date)})</li>}
          </ul>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">Estimated values for the area — real station records (especially gusts in cyclones) can be much higher.</p>
        </section>

        <section className="card">
          <h2 className="label">Regions compared (typical year)</h2>
          <table className="mt-2 w-full text-sm [&_td]:pr-2 [&_th]:pr-2">
            <thead>
              <tr className="text-left text-xs text-muted dark:text-slate-400"><th className="py-1">Region</th><th>Rain</th><th>Rainy days</th><th>Jan high</th><th>Jul low</th></tr>
            </thead>
            <tbody>
              {CLIMATE.regions.map((x) => (
                <tr key={x.key} className="border-t border-navy/5 dark:border-white/5">
                  <td className="py-1.5 font-semibold leading-tight">{x.label}</td>
                  <td>{Math.round(x.monthly.reduce((a, m) => a + (m.rainMm ?? 0), 0)).toLocaleString()} mm</td>
                  <td>{Math.round(x.monthly.reduce((a, m) => a + (m.rainyDays ?? 0), 0))}</td>
                  <td>{x.monthly[0].tmax}°</td>
                  <td>{x.monthly[6].tmin}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card text-xs text-muted lg:col-span-2 dark:text-slate-400">
          <p>
            <strong>About this data:</strong> {CLIMATE.note} Source:{" "}
            <a className="underline" href={CLIMATE.sourceUrl} target="_blank" rel="noreferrer">{CLIMATE.source}</a>. For official climate statistics see Mauritius Meteorological Services.
          </p>
        </section>
      </div>
    </>
  );
}

function ReservoirLink() {
  return (
    <Link href="/reservoirs" className="card mb-4 mt-3 flex items-center justify-between gap-3 ring-1 ring-teal/30 hover:ring-teal">
      <span>
        <span className="block font-bold">💧 Reservoirs — rain over the catchments</span>
        <span className="text-sm text-muted dark:text-slate-400">Last 7 days to 6 months vs past years, and the outlook up to 6 months.</span>
      </span>
      <span aria-hidden>›</span>
    </Link>
  );
}
