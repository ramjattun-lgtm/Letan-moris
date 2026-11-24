import { NextResponse } from "next/server";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { notableQuakes, type UsgsFeature } from "@/lib/weather/intelligence/quake.service";

export const dynamic = "force-dynamic";
const FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";

/** Strong Indian Ocean earthquakes (USGS, public domain). A prompt to check MMS — not a tsunami warning. */
export async function GET() {
  try {
    const j = (await getJson(FEED, 120)) as { features?: UsgsFeature[] };
    return NextResponse.json(
      { ok: true, checkedAt: new Date().toISOString(), source: "USGS Earthquake Hazards Program", quakes: notableQuakes(j.features ?? []) },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ ok: false, quakes: [] }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
