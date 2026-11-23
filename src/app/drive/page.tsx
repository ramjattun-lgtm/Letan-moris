"use client";

import { useState } from "react";
import { useAppState } from "@/components/AppState";
import { LOCALITIES } from "@/data/localities";
import { useApi } from "@/lib/client/useApi";
import { hhmm } from "@/lib/time";
import { Skeleton } from "@/components/Status";
import type { DepartureOption } from "@/lib/weather/intelligence/drive.service";
import { tr } from "@/lib/i18n";

type Plan = { route: { id: string; name: string }[]; km: number; minutes: number; options: DepartureOption[]; best: DepartureOption | null };

const risk = (p: number | null) => (p === null ? "—" : p >= 60 ? "High" : p >= 30 ? "Some" : "Low");
const riskCls = (p: number | null) => (p === null ? "" : p >= 60 ? "bg-rain/20 text-rain" : p >= 30 ? "bg-coral/20 text-coral-ink" : "bg-teal/15 text-teal-ink");

export default function DrivePage() {
  const { location, island } = useAppState();
  const places = LOCALITIES.filter((l) => l.island === island).sort((a, b) => a.name.localeCompare(b.name));
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const f = from || location.id;
  const t = to || places.find((p) => p.id !== f)?.id || "";
  const [go, setGo] = useState(false);
  const api = useApi<Plan>(go && f && t && f !== t ? `/api/drive?from=${f}&to=${t}` : null);
  const p = api.data;

  return (
    <>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">{tr("Drive planner")}</h1>
      <p className="mb-3 text-sm text-muted dark:text-slate-400">{tr("When should you leave to avoid the rain on the road?")}</p>
      <section className="card mb-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold">
            {tr("From")}
            <select value={f} onChange={(e) => { setFrom(e.target.value); setGo(false); }} className="mt-1 block min-h-11 w-full rounded-xl bg-mist px-3 dark:bg-night">
              {places.map((l) => <option key={l.id} value={l.id}>{tr(l.name)}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {tr("To")}
            <select value={t} onChange={(e) => { setTo(e.target.value); setGo(false); }} className="mt-1 block min-h-11 w-full rounded-xl bg-mist px-3 dark:bg-night">
              {places.map((l) => <option key={l.id} value={l.id}>{tr(l.name)}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setGo(true)} disabled={f === t} className="min-h-11 self-end rounded-full bg-navy px-6 font-bold text-white disabled:opacity-40 dark:bg-teal-soft dark:text-navy">
            {tr("Plan")}
          </button>
        </div>
      </section>

      {go && !p && (api.error ? <div className="card">{tr(api.error)}</div> : <Skeleton className="h-64" />)}
      {p && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="label">{tr("Recommendation")}</h2>
            {p.best ? (
              <p className="mt-2 text-lg font-bold">
                {tr("Leave at")} {tr(hhmm(p.best.depart))} {tr("→ arrive about")} {tr(hhmm(p.best.arrive))}.{" "}
                {tr((p.best.maxRainProb ?? 0) < 30 ? tr("Mostly dry on the way.") : `Rain chance up to ${p.best.maxRainProb}% on the way${p.best.wettest ? ` (wettest near ${p.best.wettest})` : ""}.`)}
              </p>
            ) : (
              <p className="mt-2">{tr("Not enough forecast data.")}</p>
            )}
            <p className="mt-2 text-sm text-muted dark:text-slate-400">
              {tr("About")} {p.km} {tr("km, roughly")} {p.minutes} {tr("min. Checked along:")} {tr(p.route.map((r) => r.name).join(" → "))}.
            </p>
          </section>
          <section className="card">
            <h2 className="label">{tr("Departure times (next 6 hours)")}</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted dark:text-slate-400"><th className="py-1">{tr("Leave")}</th><th>{tr("Arrive")}</th><th>{tr("Rain risk")}</th><th>{tr("Where")}</th></tr>
              </thead>
              <tbody>
                {p.options.map((o) => (
                  <tr key={o.depart} className={`border-t border-navy/5 dark:border-white/5 ${p.best?.depart === o.depart ? "font-bold" : ""}`}>
                    <td className="py-1.5">{tr(hhmm(o.depart))}</td>
                    <td>{tr(hhmm(o.arrive))}</td>
                    <td><span className={`chip ${riskCls(o.maxRainProb)}`}>{tr(risk(o.maxRainProb))}{tr(o.maxRainProb !== null ? ` · ${o.maxRainProb}%` : "")}</span>{tr(o.heavy ? " ⚠" : "")}</td>
                    <td className="text-xs">{tr(o.wettest ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="text-[11px] text-muted lg:col-span-2 dark:text-slate-400">
            {tr("Approximate: the route is estimated in a straight line through places on the way, with typical driving time. Forecast data is hourly. ⚠ = heavy rain possible (2.5 mm/h or more). Drive carefully and follow MMS warnings.")}
          </p>
        </div>
      )}
    </>
  );
}
