"use client";

import Link from "next/link";
import type { Forecast } from "@/lib/weather/types";
import { useAppState } from "./AppState";
import { useLapli } from "@/lib/client/useLapli";
import { KINDS, upwindAlert } from "@/lib/community/lapli";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";

const kindLabel = (k: string) => KINDS.find((x) => x.id === k);

/** Community rain reports near you, with the upwind early alert. */
export function CommunityCard({ f }: { f: Forecast }) {
  const { location } = useAppState();
  const { places, error } = useLapli();
  if (error && !places) return null;
  const near = (places ?? []).filter((p) => p.loc.island === location.island && distanceKm(location, p.loc) <= 15);
  const alert = places ? upwindAlert(location, places, f.current.windDirection, f.current.windSpeed) : null;
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
      ) : near.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {near.slice(0, 5).map((p) => (
            <li key={p.loc.id}>
              <strong>{p.loc.name}</strong>: {kindLabel(p.kind)?.kreol} ({kindLabel(p.kind)?.english.toLowerCase()}) · {p.minutesAgo} min ago
              {p.count > 1 ? ` · ${p.count} reports` : ""}
            </li>
          ))}
        </ul>
      ) : (
        !alert && <p className="mt-2 text-sm text-muted dark:text-slate-400">No reports within 15 km in the last 2 hours. Is it raining where you are? Tap <strong>Lapli isi!</strong></p>
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        Unverified reports from people using Letan Moris. <Link href="/map" className="underline">See all on the map</Link>.
      </p>
    </section>
  );
}
