"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { MonthlyChart, TrendChart } from "@/components/ClimateCharts";
import { HistoryCheck, RainTiming } from "@/components/ClimateEvidence";
import { AccuracyCard } from "@/components/AccuracyCard";
import { bestMonths, CLIMATE, climateKeyFor, climateReady, monthName, normalFor, region } from "@/lib/weather/intelligence/climate.service";
import { todayMU } from "@/lib/time";
import { tr } from "@/lib/i18n";

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
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Climate — 30 years of weather")}</h1>
        <div className="card">
          {tr("The 30-year climate data is being prepared. It appears here once the \"Climate history\" job has run on GitHub (about 10 minutes).")}
        </div>
        <ReservoirLink />
        <div className="grid gap-4 lg:grid-cols-2">
          <RainTiming regionKey={climateKeyFor(location)} regionLabel={location.name} island={location.island} />
          <div id="accuracy" className="scroll-mt-20">
            <AccuracyCard full />
          </div>
        </div>
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
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Climate — 30 years of weather")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("Normal temperatures and rain levels, what has changed, and the best times to plan —")} {tr(CLIMATE.period)}.</p>
      <ReservoirLink />
      <div role="group" aria-label={tr("Region")} className="scroll-x mb-4">
        {CLIMATE.regions.map((x) => (
          <button key={x.key} type="button" aria-pressed={x.key === r.key} onClick={() => setKey(x.key)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${x.key === r.key ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "bg-white text-muted ring-1 ring-navy/10 dark:bg-night-card dark:text-slate-300"}`}>
            {tr(x.label)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="label">{tr("Normal temperatures and rain for today ·")} {tr(r.label)} ({tr(r.place)})</h2>
          {n ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">{tr("Day high")}</div><div className="text-2xl font-extrabold">{tr((n.tmax?.toFixed(0)) ?? "")}°</div></div>
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">{tr("Night low")}</div><div className="text-2xl font-extrabold">{tr((n.tmin?.toFixed(0)) ?? "")}°</div></div>
              <div className="rounded-2xl bg-mist p-2 dark:bg-white/5"><div className="text-xs text-muted">{tr("Rainy day chance")}</div><div className="text-2xl font-extrabold text-rain">{n.rainChance}%</div></div>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted dark:text-slate-400">{tr("Average for this date (±7 days) over 30 years. A \"rainy day\" has at least 1 mm.")}</p>
        </section>

        <section className="card">
          <h2 className="label">{tr("Best times to plan ·")} {tr(r.label)}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>{tr("Driest month:")} <strong>{tr(monthName(b.driest.month))}</strong> {tr("(about")} {b.driest.rainyDays} {tr("rainy days)")}</li>
            <li>{tr("Wettest month:")} <strong>{tr(monthName(b.wettest.month))}</strong> {tr("(about")} {b.wettest.rainyDays} {tr("rainy days)")}</li>
            {b.sunniest?.sunHours !== null && b.sunniest && <li>{tr("Sunniest month:")} <strong>{tr(monthName(b.sunniest.month))}</strong> {tr("(about")} {b.sunniest.sunHours} {tr("hours of sun a day)")}</li>}
            <li>{tr("Coolest month:")} <strong>{tr(monthName(b.coolest.month))}</strong> {tr("(highs about")} {b.coolest.tmax}°C)</li>
            <li>{tr("Hottest month:")} <strong>{tr(monthName(b.hottest.month))}</strong> {tr("(highs about")} {b.hottest.tmax}°C)</li>
            <li>{tr("Rain in a typical year:")} <strong>{tr("about")} {tr(yearRain.toLocaleString())} {tr("mm")}</strong></li>
          </ul>
        </section>

        <RainTiming regionKey={r.key} regionLabel={r.label} island={r.key === "rodrigues" ? "rodrigues" : "mauritius"} />

        <section className="card lg:col-span-2">
          <h2 className="label">{tr("Month by month ·")} {tr(r.label)}</h2>
          <MonthlyChart r={r} />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs [&_td]:pr-3 [&_th]:pr-3">
              <thead>
                <tr className="text-left text-muted dark:text-slate-400">
                  <th className="py-1">{tr("Month")}</th><th>{tr("High")}</th><th>{tr("Low")}</th><th>{tr("Rain")}</th><th>{tr("Rainy days")}</th><th>{tr("Heavy")}</th>
                </tr>
              </thead>
              <tbody>
                {r.monthly.map((m) => (
                  <tr key={m.month} className="border-t border-navy/5 dark:border-white/5">
                    <td className="py-1.5 font-semibold">{tr(monthName(m.month))}</td>
                    <td>{m.tmax}°</td><td>{m.tmin}°</td><td>{m.rainMm} {tr("mm")}</td><td>{m.rainyDays}</td><td>{m.heavyDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Heavy = days with 25 mm of rain or more.")}</p>
        </section>

        <section className="card">
          <h2 className="label">{tr("How it has changed ·")} {tr(r.label)}</h2>
          <TrendChart r={r} />
          <ul className="mt-2 space-y-1 text-sm">
            <li>{tr("Days:")} <strong>{tr(signed(r.trend.tmaxPerDecade, "°C"))}</strong> {tr("per decade")}</li>
            <li>{tr("Nights:")} <strong>{tr(signed(r.trend.tminPerDecade, "°C"))}</strong> {tr("per decade")}</li>
            <li>{tr("Yearly rain:")} <strong>{tr(signed(r.trend.rainPctPerDecade, "%"))}</strong> {tr("per decade")}</li>
          </ul>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Straight-line trend over")} {tr(CLIMATE.period)}{tr("; rainfall varies a lot from year to year, so its trend is less certain.")}</p>
        </section>

        <section className="card">
          <h2 className="label">{tr("El Niño summers ·")} {tr(r.label)}</h2>
          <p className="mt-2 text-sm">
            {tr("In past El Niño summers (")}{tr(r.elNino.summers.map((y) => `${y - 1}–${String(y).slice(2)}`).join(", "))}{tr("), December–February rain was")} <strong>{tr(signed(r.elNino.rainVsNormalPct, "%"))}</strong> {tr("compared with the normal rain level of a summer, and days were")}{" "}
            <strong>{tr(signed(r.elNino.tmaxVsNormal, "°C"))}</strong>.
          </p>
          <p className="mt-2 text-sm">{tr("A strong El Niño is expected this summer (2026–27). Past summers give a hint, not a forecast.")}</p>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr(CLIMATE.elNinoSource)}.</p>
        </section>

        <section className="card">
          <h2 className="label">{tr("Records since")} {r.annual[0]?.year} · {tr(r.label)}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {r.records.hottestDay && <li>{tr("Hottest day:")} <strong>{r.records.hottestDay.value}°C</strong> ({tr(fmtDate(r.records.hottestDay.date))})</li>}
            {r.records.coolestNight && <li>{tr("Coolest night:")} <strong>{r.records.coolestNight.value}°C</strong> ({tr(fmtDate(r.records.coolestNight.date))})</li>}
            {r.records.wettestDay && <li>{tr("Wettest day:")} <strong>{r.records.wettestDay.value} {tr("mm")}</strong> ({tr(fmtDate(r.records.wettestDay.date))})</li>}
            {r.records.strongestGust && <li>{tr("Strongest gust:")} <strong>{r.records.strongestGust.value} {tr("km/h")}</strong> ({tr(fmtDate(r.records.strongestGust.date))})</li>}
          </ul>
          <p className="mt-1 text-[11px] text-muted dark:text-slate-400">{tr("Estimated values for the area — real station records (especially gusts in cyclones) can be much higher.")}</p>
        </section>

        <section className="card">
          <h2 className="label">{tr("Regions compared (typical year)")}</h2>
          <table className="mt-2 w-full text-sm [&_td]:pr-2 [&_th]:pr-2">
            <thead>
              <tr className="text-left text-xs text-muted dark:text-slate-400"><th className="py-1">{tr("Region")}</th><th>{tr("Rain")}</th><th>{tr("Rainy days")}</th><th>{tr("Jan high")}</th><th>{tr("Jul low")}</th></tr>
            </thead>
            <tbody>
              {CLIMATE.regions.map((x) => (
                <tr key={x.key} className="border-t border-navy/5 dark:border-white/5">
                  <td className="py-1.5 font-semibold leading-tight">{tr(x.label)}</td>
                  <td>{tr(Math.round(x.monthly.reduce((a, m) => a + (m.rainMm ?? 0), 0)).toLocaleString())} {tr("mm")}</td>
                  <td>{Math.round(x.monthly.reduce((a, m) => a + (m.rainyDays ?? 0), 0))}</td>
                  <td>{x.monthly[0].tmax}°</td>
                  <td>{x.monthly[6].tmin}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <HistoryCheck v={r.validation} regionLabel={r.label} />

        <div id="accuracy" className="scroll-mt-20 lg:col-span-2">
          <AccuracyCard full />
        </div>

        <section className="card text-xs text-muted lg:col-span-2 dark:text-slate-400">
          <p>
            <strong>{tr("About this data:")}</strong> {tr(CLIMATE.note)} {tr("Source:")}{" "}
            <a className="underline" href={CLIMATE.sourceUrl} target="_blank" rel="noreferrer">{tr(CLIMATE.source)}</a>{tr(". For official climate statistics see Mauritius Meteorological Services.")}
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
        <span className="block font-bold">{tr("💧 Reservoirs — rain over the catchments")}</span>
        <span className="text-sm text-muted dark:text-slate-400">{tr("Last 7 days to 6 months vs past years, and the outlook up to 6 months.")}</span>
      </span>
      <span aria-hidden>›</span>
    </Link>
  );
}
