"use client";

import Link from "next/link";
import type { Forecast } from "@/lib/weather/types";
import { useAppState } from "./AppState";
import { useLapli } from "@/lib/client/useLapli";
import { KINDS, upwindAlert } from "@/lib/community/lapli";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { ReportActions } from "./ReportActions";
import { Dodo } from "./Dodo";

const kindLabel = (k: string) => KINDS.find((x) => x.id === k);
const NEAR_KM = 15;

/** Community reports near you (rain, rising rivers, fallen trees, rough sea), with the upwind early alert. */
export function CommunityCard({ f }: { f: Forecast }) {
  const { location } = useAppState();
  const { places, hazards, mode, error } = useLapli();
  if (error && !places) return null;
  const isNear = (l: { island: string; lat: number; lon: number }) => l.island === location.island && distanceKm(location, l) <= NEAR_KM;
  const near = (places ?? []).filter((p) => isNear(p.loc));
  const nearHazards = hazards.filter((h) => isNear(h.loc));
  const alert = places ? upwindAlert(location, places, f.current.windDirection, f.current.windSpeed) : null;
  const db = mode === "db";
  return (
    <section className={`card ${alert ? "ring-2 ring-rain" : ""}`} aria-labelledby="lapli-near">
      <h2 id="lapli-near" className="label">Lapli isi! · community reports</h2>
      {alert && (
        <p className="mt-2 rounded-2xl bg-rain/10 p-3 text-sm">
          <strong>
            {alert.heavy ? "Heavy rain" : "Rain"} reported {alert.km} km {alert.direction} of you (upwind) in {alert.place}, {alert.minutesAgo} min ago.
          </strong>{" "}
          With today&apos;s wind it may reach you in about {alert.etaMin[0]}–{alert.etaMin[1]} min. Based on {alert.reports} community report{alert.reports > 1 ? "s" : ""}, not radar.
        </p>
      )}
      {places === null ? (
        <p className="mt-2 text-sm text-muted">Loading reports…</p>
      ) : near.length || nearHazards.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {nearHazards.slice(0, 4).map((h) => (
            <li key={`${h.loc.id}-${h.kind}`}>
              <span className="chip mr-1 bg-coral/20">{kindLabel(h.kind)?.english}</span>
              <strong>{h.loc.name}</strong> · {h.minutesAgo} min ago ·{" "}
              {h.corroborated ? <span className="font-semibold text-teal-ink dark:text-teal-soft">{h.reporters} people agree</span> : <span className="text-muted dark:text-slate-400">1 report, unconfirmed</span>}
              {db && <ReportActions id={h.report.id} likes={h.likes} />}
            </li>
          ))}
          {near.slice(0, 5).map((p) => (
            <li key={p.loc.id}>
              <strong>{p.loc.name}</strong>: {kindLabel(p.kind)?.kreol} ({kindLabel(p.kind)?.english.toLowerCase()}) · {p.minutesAgo} min ago
              {p.count > 1 ? ` · ${p.count} reports` : ""}
              {db && <ReportActions id={p.latest.id} likes={p.latest.likes ?? 0} />}
            </li>
          ))}
        </ul>
      ) : (
        !alert && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted dark:text-slate-400">
            <Dodo size={26} className="text-navy/60 dark:text-slate-400" />
            <span>
              Nothing reported within {NEAR_KM} km in the last 3 hours. Seen rain, a rising river or a fallen tree? Tap <strong>Lapli isi!</strong>
            </span>
          </p>
        )
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        Unverified reports from people using Letan Moris — &quot;agree&quot; means different phones reported the same thing within 5 km; &quot;Useful&quot; taps are not checks. No accounts, no names. For official warnings, follow MMS. <Link href="/map" className="underline">See all on the map</Link>.
      </p>
    </section>
  );
}
