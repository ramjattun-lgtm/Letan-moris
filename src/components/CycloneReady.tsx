"use client";

import Link from "next/link";
import { useAppState } from "./AppState";
import { useApi } from "@/lib/client/useApi";
import type { Forecast } from "@/lib/weather/types";
import type { CycloneStatus } from "@/lib/weather/providers/gdacs.provider";
import { cycloneMode, readyLines } from "@/lib/weather/intelligence/cyclone-mode.service";
import { stormImpact, utcToMU } from "@/lib/weather/intelligence/storm-impact.service";
import { addHours, dayLabel, hhmm } from "@/lib/time";
import { OFFICIAL_LINKS } from "@/data/official-status";
import { EMERGENCY_NUMBERS } from "@/data/emergency";
import { Checklist } from "./CycloneChecklist";
import { tr } from "@/lib/i18n";

const fmt = (l: string) => `${dayLabel(l.slice(0, 10))} ${hhmm(l)}`;

/** Shown at the top of Today only in cyclone mode: when, how strong here, checklist, numbers. */
export function CycloneReady({ f }: { f: Forecast }) {
  const { island, ready, t } = useAppState();
  const tc = useApi<CycloneStatus>(ready ? "/api/cyclones" : null);
  const m = cycloneMode(island, tc.data);
  if (!m.active) return null;
  const sys = (tc.data?.systems ?? []).find((s) => s.name === m.systemName) ?? tc.data?.systems?.[0];
  const c = sys?.closest?.[island] ?? null;
  const closest = c?.time ? { km: c.km, timeLocal: utcToMU(c.time), bearing: c.bearing } : null;
  const impact = stormImpact(f.hourly, closest ? addHours(closest.timeLocal, 24) : undefined);
  const lines = readyLines(m, closest, impact, fmt);
  return (
    <section className="card border-2 border-[#D9480F]" aria-labelledby="cyc-ready">
      <h2 id="cyc-ready" className="text-lg font-extrabold text-[#D9480F]">
        🌀 {t("cyclone.title")}
      </h2>
      <p className="mt-1 font-semibold">{tr(m.headline)}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {lines.map((l) => (
          <li key={l}>{tr(l)}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer" className="min-h-11 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
          {tr("MMS warnings ↗")}
        </a>
        <Link href="/cyclone" className="min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 ring-navy/20 dark:ring-white/20">
          {tr("Track & map")}
        </Link>
        <a href="/lite" className="min-h-11 px-2 py-2.5 text-sm underline">
          {tr("Light version")}
        </a>
      </div>
      <h3 className="label mt-4">{tr("Get ready")}</h3>
      <Checklist />
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {EMERGENCY_NUMBERS.slice(0, 4).map((n) => (
          <li key={n.label}>
            <a href={`tel:${n.number.split(" ")[0]}`} className="block rounded-2xl bg-mist p-2 dark:bg-white/5">
              <span className="block text-xs text-muted dark:text-slate-400">{tr(n.label)}</span>
              <span className="font-extrabold">{tr(n.number)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
