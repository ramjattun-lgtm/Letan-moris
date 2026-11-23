"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analogues, SeasonProgress } from "@/lib/weather/intelligence/reservoir-insights.service";
import { useApi } from "@/lib/client/useApi";
import { tr } from "@/lib/i18n";

const AX = { fontSize: 11, fill: "#7A8B96" };

export interface Insights {
  catchUp: { shortMm: number; weeks: number | null; month: string } | null;
  season: SeasonProgress | null;
  analogues: Analogues | null;
  rainDays: { soakingDays: number; normalSoakingDays: number | null; daysSinceSoaking: number | null; longestDrySpell: number; normalLongestDrySpell: number | null } | null;
  net: { m1: Net | null; m6: Net | null } | null;
  ranking: { id: string; name: string; pct6: number; pct1: number | null }[];
  trend: { from: string; to: string; meanMm: number; slopePctPerDecade: number; decades: { decade: string; pctOfMean: number }[] } | null;
  storms: { from: string; seasons: number; typicalSharePct: number; calmSeasons: number; calmMedianPct: number | null; thisSummerSharePct: number | null } | null;
}
interface Net {
  net: number;
  rain: number | null;
  evaporation: number | null;
  normalNet: number | null;
}

const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x)}`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card text-sm">
      <h3 className="label">{tr(title)}</h3>
      <div className="mt-1 space-y-1">{children}</div>
    </section>
  );
}

function SeasonChart({ s }: { s: SeasonProgress }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`Rain so far this season compared with the normal rain level, the driest (${s.driest.season}) and the wettest (${s.wettest.season}) seasons`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={s.points} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,91,102,0.18)" vertical={false} />
          <XAxis dataKey="label" tick={AX} interval={7} />
          <YAxis tick={AX} width={40} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
          <Tooltip formatter={(v, n) => [`${v} mm`, n]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="wettest" name={`Wettest (${s.wettest.season})`} stroke="#2F7DE1" strokeWidth={1.5} dot={false} />
          <Line dataKey="normal" name={tr("Normal rain level")} stroke="#7A8B96" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          <Line dataKey="driest" name={`Driest (${s.driest.season})`} stroke="#B5541B" strokeWidth={1.5} dot={false} />
          <Line dataKey="now" name={`This season (${s.season})`} stroke="#0FA3A3" strokeWidth={3} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReservoirInsights({ i, rod }: { i: Insights; rod: boolean }) {
  const where = rod ? "Rodrigues" : "the catchments";
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {i.catchUp && (
        <Card title={tr("Rain needed to catch up")}>
          <p className="text-base font-semibold">
            {tr(rod ? tr("Rodrigues is") : tr("The catchments are"))} {tr("about")} {i.catchUp.shortMm} {tr("mm short of the normal rain level over the last 6 months.")}
          </p>
          {i.catchUp.weeks !== null && (
            <p>
              {tr("That is about")} <strong>{tr(i.catchUp.weeks < 1.5 ? tr("1 week") : `${Math.round(i.catchUp.weeks)} weeks`)}</strong> {tr("of typical")} {tr(i.catchUp.month)} {tr("rain, on top of the usual rain.")}
            </p>
          )}
        </Card>
      )}

      {i.season && (
        <section className="card text-sm lg:col-span-2">
          <h3 className="label">{tr("This wet season so far · rain over")} {tr(where)}</h3>
          <p className="mt-1 text-base font-semibold">
            {tr(i.season.soFar !== null ? `${i.season.soFar} mm since 1 July` : tr("Rain so far not available"))}
            {tr(i.season.pctSoFar !== null ? ` — ${i.season.pctSoFar}% of normal rain level for the date.` : ".")}
          </p>
          <p>
            {tr("Normally")} {i.season.stillToComePct}{tr("% of a season's rain is still to come after today — the summer months bring most of it. A season at normal rain level gives about")} {i.season.normalFull} {tr("mm.")}
          </p>
          <SeasonChart s={i.season} />
          <p className="text-[11px] text-muted dark:text-slate-400">
            {tr("Cumulative rain from 1 July. Driest and wettest of the")} {i.season.seasons} {tr("seasons since 1950.")}
          </p>
        </section>
      )}

      {i.analogues && (
        <Card title={tr("What happened next in similar years")}>
          <p className="text-base font-semibold">
            {tr("In")} {i.analogues.normalOrWetter} {tr("of the")} {i.analogues.n} {tr("past years with the most similar last 6 months, the next 3 months brought rain near or above the normal rain level.")}
          </p>
          {i.analogues.medianNextPct !== null && <p>{tr("Typical outcome:")} {i.analogues.medianNextPct}{tr("% of normal rain level over the next 3 months.")}</p>}
          <div className="flex flex-wrap gap-1 pt-1">
            {i.analogues.years.map((y) => (
              <span key={y.year} className="chip bg-mist text-[11px] dark:bg-white/10" title={`Last 6 months ${y.pastPct}%, next 3 months ${y.nextPct}%`}>
                {y.year}: {y.pastPct}% → {y.nextPct}%
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted dark:text-slate-400">{tr("Based on past rain only, not a forecast. Each chip: last 6 months → next 3 months, % of normal rain level.")}</p>
          <AnalogueTest />
        </Card>
      )}

      {i.rainDays && (
        <Card title={tr("Soaking rain and dry spells · last 6 months")}>
          <p>
            <strong>{tr("Soaking-rain days")}</strong> {tr("(20 mm or more in a day):")} <strong>{i.rainDays.soakingDays}</strong>
            {tr(i.rainDays.normalSoakingDays !== null ? ` (normally ${Math.round(i.rainDays.normalSoakingDays)})` : "")}{tr(". These are the days that really refill reservoirs and tanks.")}
          </p>
          <p>
            {tr("Last soaking rain:")}{" "}
            <strong>{tr(i.rainDays.daysSinceSoaking === null ? tr("more than a year ago") : i.rainDays.daysSinceSoaking === 1 ? "yesterday" : `${i.rainDays.daysSinceSoaking} days ago`)}</strong>.
          </p>
          <p>
            {tr("Longest dry spell (under 1 mm a day):")} <strong>{i.rainDays.longestDrySpell} {tr("days")}</strong>
            {tr(i.rainDays.normalLongestDrySpell !== null ? ` (normally ${Math.round(i.rainDays.normalLongestDrySpell)} days)` : "")}.
          </p>
        </Card>
      )}

      {i.net && (i.net.m1 || i.net.m6) && (
        <Card title={tr("Rain minus evaporation")}>
          {([["Last month", i.net.m1], ["Last 6 months", i.net.m6]] as const).map(([label, n]) =>
            n ? (
              <p key={label}>
                <strong>{tr(label)}:</strong> {n.rain ?? "—"} {tr("mm rain −")} {n.evaporation ?? "—"} {tr("mm evaporation =")} <strong>{tr(signed(n.net))} {tr("mm")}</strong>
                {tr(n.normalNet !== null ? ` (normally ${signed(n.normalNet)} mm)` : "")}
              </p>
            ) : null,
          )}
          <p className="text-[11px] text-muted dark:text-slate-400">
            {tr("Evaporation here is the \"reference\" amount the sun, heat and wind could dry out (")}{tr(rod ? "island" : tr("central plateau"))} {tr("estimate). A negative number means the land is drying out.")}
          </p>
        </Card>
      )}

      {!rod && i.ranking.length > 0 && (
        <Card title={tr("Which catchment is worst off · last 6 months")}>
          <ul className="space-y-1">
            {i.ranking.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-2">
                  <span>{tr(r.name)}</span>
                  <span className="font-semibold">{r.pct6}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-mist dark:bg-white/10">
                  <div className={`h-1.5 rounded-full ${r.pct6 < 85 ? "bg-coral" : "bg-teal"}`} style={{ width: `${Math.min(100, r.pct6 / 1.5)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted dark:text-slate-400">{tr("% of normal rain level over each catchment. Lowest first.")}</p>
        </Card>
      )}

      {i.trend && (
        <Card title={`Long-term change in summer rain (Nov–Apr) · ${i.trend.from} to ${i.trend.to}`}>
          <p className="text-base font-semibold">
            {tr(Math.abs(i.trend.slopePctPerDecade) < 2
              ? tr("No clear long-term change in summer rain.")
              : `Summer rain over ${where} has ${i.trend.slopePctPerDecade < 0 ? "fallen" : "risen"} by about ${Math.abs(i.trend.slopePctPerDecade)}% per decade.`)}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {i.trend.decades.map((d) => (
              <span key={d.decade} className={`chip text-[11px] ${d.pctOfMean < 95 ? "bg-coral/30" : d.pctOfMean > 105 ? "bg-rain/20" : "bg-mist dark:bg-white/10"}`}>
                {tr(d.decade)}: {d.pctOfMean}%
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted dark:text-slate-400">{tr("Each decade's average summer rain as a % of the long-term average. From reanalysis models, so treat as a rough guide.")}</p>
        </Card>
      )}

      {i.storms && (
        <Card title={tr("How much summer rain comes with cyclones")}>
          <p className="text-base font-semibold">
            {tr("Typically")} {i.storms.typicalSharePct}{tr("% of summer rain (Nov–Apr) over")} {tr(where)} {tr("falls on days when a tropical storm is within 500 km.")}
          </p>
          {i.storms.calmMedianPct !== null && (
            <p>
              {tr("In the")} {i.storms.calmSeasons} {tr("summers since")} {tr(i.storms.from)} {tr("with no storm nearby, rain was about")} {i.storms.calmMedianPct}{tr("% of normal rain level.")}
            </p>
          )}
          {i.storms.thisSummerSharePct !== null && <p>{tr("This summer so far:")} {i.storms.thisSummerSharePct}{tr("% of the rain came with a storm nearby.")}</p>}
          <p className="text-[11px] text-muted dark:text-slate-400">{tr("Storm tracks: NOAA IBTrACS since 1980.")}</p>
        </Card>
      )}
    </div>
  );
}

function AnalogueTest() {
  const api = useApi<{ analogues: { analogueErrorPct: number; assumeNormalErrorPct: number; beatsNormalPct: number; cases: number } | null }>("/api/validation");
  const a = api.data?.analogues;
  if (!a) return null;
  const helpful = a.analogueErrorPct < a.assumeNormalErrorPct - 1;
  return (
    <p className="rounded-xl bg-mist p-2 text-[12px] dark:bg-white/5">
      <strong>{tr("Tested on the past:")}</strong>{" "}
      {tr(helpful
        ? `similar years beat "assume normal rain" in ${a.beatsNormalPct}% of ${a.cases.toLocaleString()} tests.`
        : `similar years were no better than assuming normal rain (${a.cases.toLocaleString()} tests) — treat this as context only.`)}{" "}
      <a className="underline" href="/climate#hist-check">{tr("How we test")}</a>
    </p>
  );
}
