import { type NextRequest, NextResponse } from "next/server";
import { getLocality } from "@/data/localities";
import { getRecentHours } from "@/lib/weather/providers/open-meteo.provider";
import { recentInsights, splitRecent } from "@/lib/weather/intelligence/recent.service";
import { fail, ok, validId } from "@/lib/api";

// Last 3 hours (model estimate) and next 3 hours, with insights about what is changing.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : undefined;
  if (!loc) return NextResponse.json({ error: "bad_request", message: "Missing or invalid ?loc=" }, { status: 400 });
  try {
    const r = await getRecentHours({ id: loc.id, lat: loc.lat, lon: loc.lon });
    const { last, next } = splitRecent(r.hourly);
    return ok({ locationId: loc.id, last: last.hours, next: next.hours, insights: recentInsights(last, next, r.sunset), retrievedAt: r.fetchedAt }, 600);
  } catch (e) {
    return fail(e);
  }
}
