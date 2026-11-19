import { type NextRequest, NextResponse } from "next/server";
import { getLocality } from "@/data/localities";
import { POST_REGIONS } from "@/lib/social/content/post-builder";
import { agreeDay, parseMultiModel } from "@/lib/weather/intelligence/agreement.service";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import { ok, validId } from "@/lib/api";

// Multi-model comparison for the region a place belongs to (one request per region, cached 3 h).
const MODEL_SETS = [
  ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"],
  ["ecmwf_ifs025", "icon_seamless"],
];
const REP: Record<string, string> = { north: "grand-baie", east: "centre-de-flacq", south: "mahebourg", west: "flic-en-flac", plateau: "curepipe", portlouis: "curepipe", rodrigues: "port-mathurin" };

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  if (!validId(id) || !getLocality(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const key = climateKeyFor(getLocality(id)!);
  const rep = getLocality(REP[key] ?? "curepipe")!;
  for (const models of MODEL_SETS) {
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.search = new URLSearchParams({
      latitude: rep.lat.toFixed(4),
      longitude: rep.lon.toFixed(4),
      daily: "precipitation_sum,temperature_2m_max",
      models: models.join(","),
      timezone: "Indian/Mauritius",
      forecast_days: "4",
    }).toString();
    try {
      const res = await fetch(u, { next: { revalidate: 10800 }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue; // e.g. a model name not available — try the smaller set
      const days = parseMultiModel((await res.json()) as Record<string, unknown>, models).map(agreeDay);
      return ok({ region: POST_REGIONS.find((r) => r.locId === rep.id)?.label ?? key, models, days }, 3600);
    } catch {
      /* try next set */
    }
  }
  return NextResponse.json({ error: "unavailable", message: "Model comparison unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
}
