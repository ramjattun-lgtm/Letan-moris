import { RIVERS } from "@/data/rivers";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { assessRiver, type RiverAssessment } from "./river.service";

type Raw = { hourly?: { time?: string[]; precipitation?: (number | null)[] } };

export interface RiverStatus extends RiverAssessment {
  id: string;
  name: string;
  downstream: string[];
  downstreamText: string;
  upstreamText: string;
  floodSites: string[];
  outings: string[];
  upstream: { lat: number; lon: number }[];
}

/** River watch for one island: rain over each river's upper catchment, last 3 h and next 3–6 h. Highest first. */
export async function getRiverWatch(island: "mauritius" | "rodrigues"): Promise<RiverStatus[]> {
  const rivers = RIVERS.filter((r) => r.island === island);
  const pts = rivers.flatMap((r) => r.upstream);
  const q = new URLSearchParams({
    latitude: pts.map((p) => p.lat.toFixed(3)).join(","),
    longitude: pts.map((p) => p.lon.toFixed(3)).join(","),
    hourly: "precipitation",
    past_days: "1",
    forecast_days: "1",
    timezone: "Indian/Mauritius",
  });
  const raw = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`, 900);
  const list = (Array.isArray(raw) ? raw : [raw]) as Raw[];
  let k = 0;
  const out: RiverStatus[] = rivers.map((r) => {
    const series = r.upstream.map(() => list[k++]?.hourly);
    const times = series[0]?.time ?? [];
    const hours = times.map((t, i) => {
      const vs = series.map((s) => s?.precipitation?.[i] ?? null);
      return { time: t, mm: vs.some((v) => v === null) ? null : (vs as number[]).reduce((a, b) => a + b, 0) / vs.length };
    });
    return { id: r.id, name: r.name, downstream: r.downstream, downstreamText: r.downstreamText, upstreamText: r.upstreamText, floodSites: r.floodSites ?? [], outings: r.outings ?? [], upstream: r.upstream, ...assessRiver(hours, r.upstreamText, r.downstreamText) };
  });
  const order = { high: 0, moderate: 1, low: 2 } as const;
  return out.sort((a, b) => (a.level === null ? 3 : order[a.level]) - (b.level === null ? 3 : order[b.level]));
}
