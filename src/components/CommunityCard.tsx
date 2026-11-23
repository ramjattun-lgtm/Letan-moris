"use client";

import Link from "next/link";
import type { Forecast } from "@/lib/weather/types";
import { useAppState } from "./AppState";
import { useLapli } from "@/lib/client/useLapli";
import { KINDS, upwindAlert } from "@/lib/community/lapli";
import { distanceKm } from "@/lib/weather/providers/gdacs.provider";
import { ReportActions } from "./ReportActions";
import { Dodo } from "./Dodo";
import { tr } from "@/lib/i18n";

const kindLabel = (k: string) => KINDS.find((x) => x.id === k);
const NEAR_KM = 15;

/** Community reports near you (rain, rising rivers, fallen trees, rough sea), with the upwind early alert. */
export function CommunityCard({ f }: { f: Forecast }) {
  const { location, t } = useAppState();
  const { places, hazards, mode, error } = useLapli();
  if (error && !places) return null;
  const isNear = (l: { island: string; lat: number; lon: number }) => l.island === location.island && distanceKm(location, l) <= NEAR_KM;
  const near = (places ?? []).filter((p) => isNear(p.loc));
  const nearHazards = hazards.filter((h) => isNear(h.loc));
  const alert = places ? upwindAlert(location, places, f.current.windDirection, f.current.windSpeed) : null;
  const db = mode === "db";
  return (
    <section className={`card ${alert ? "ring-2 ring-rain" : ""}`} aria-labelledby="lapli-near">
      <h2 id="lapli-near" className="label">{t("community.title")}</h2>
      {alert && (
        <p className="mt-2 rounded-2xl bg-rain/10 p-3 text-sm">
          <strong>
            {tr(alert.heavy ? tr("Heavy rain") : "Rain")} {tr("reported")} {alert.km} {tr("km")} {tr(alert.direction)} {tr("of you (upwind) in")} {tr(alert.place)}, {alert.minutesAgo} {tr("min ago.")}
          </strong>{" "}
          {tr("With today's wind it may reach you in about")} {alert.etaMin[0]}–{alert.etaMin[1]} {tr("min. Based on")} {alert.reports} {tr("community report")}{tr(alert.reports > 1 ? "s" : "")}{tr(", not radar.")}
        </p>
      )}
      {places === null ? (
        <p className="mt-2 text-sm text-muted">{tr("Loading reports…")}</p>
      ) : near.length || nearHazards.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {nearHazards.slice(0, 4).map((h) => (
            <li key={`${h.loc.id}-${h.kind}`}>
              <span className="chip mr-1 bg-coral/20">{tr((kindLabel(h.kind)?.english) ?? "")}</span>
              <strong>{tr(h.loc.name)}</strong> · {h.minutesAgo} {tr("min ago ·")}{" "}
              {h.corroborated ? <span className="font-semibold text-teal-ink dark:text-teal-soft">{t("community.agree", { n: h.reporters })}</span> : <span className="text-muted dark:text-slate-400">{t("community.unconfirmed")}</span>}
              {db && <ReportActions id={h.report.id} likes={h.likes} />}
            </li>
          ))}
          {near.slice(0, 5).map((p) => (
            <li key={p.loc.id}>
              <strong>{tr(p.loc.name)}</strong>: {tr((kindLabel(p.kind)?.kreol) ?? "")} ({tr((kindLabel(p.kind)?.english.toLowerCase()) ?? "")}) · {p.minutesAgo} {tr("min ago")}
              {tr(p.count > 1 ? ` · ${p.count} reports` : "")}
              {db && <ReportActions id={p.latest.id} likes={p.latest.likes ?? 0} />}
            </li>
          ))}
        </ul>
      ) : (
        !alert && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted dark:text-slate-400">
            <Dodo size={26} className="text-navy/60 dark:text-slate-400" />
            <span>{t("community.nothing", { km: NEAR_KM })}</span>
          </p>
        )
      )}
      <p className="mt-2 text-[11px] text-muted dark:text-slate-400">
        {tr("Unverified reports from people using Letan Moris — \"agree\" means different phones reported the same thing within 5 km; \"Useful\" taps are not checks. No accounts, no names. For official warnings, follow MMS.")} <Link href="/map" className="underline">{tr("See all on the map")}</Link>.
      </p>
    </section>
  );
}
