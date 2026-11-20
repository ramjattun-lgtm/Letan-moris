import { type NextRequest, NextResponse } from "next/server";
import { fail, ok, validId } from "@/lib/api";
import { getLocality } from "@/data/localities";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { mosquitoLevel } from "@/lib/weather/intelligence/wellbeing.service";
import { todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Rain and temperature over the last 14 days and the next 7 → "mosquito weather". */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : null;
  if (!loc) return NextResponse.json({ error: "not_found", message: "Unknown place" }, { status: 404 });
  try {
    const q = new URLSearchParams({
      latitude: loc.lat.toFixed(4),
      longitude: loc.lon.toFixed(4),
      daily: "precipitation_sum,temperature_2m_mean",
      past_days: "14",
      forecast_days: "7",
      timezone: "Indian/Mauritius",
    });
    const raw = (await getJson(`https://api.open-meteo.com/v1/forecast?${q}`, 3 * 3600)) as { daily?: { time: string[]; precipitation_sum: (number | null)[]; temperature_2m_mean: (number | null)[] } };
    const d = raw.daily;
    const today = todayMU();
    const rows = (d?.time ?? []).map((t, i) => ({ t, mm: d!.precipitation_sum[i], temp: d!.temperature_2m_mean[i] }));
    const past = rows.filter((r) => r.t < today);
    const next = rows.filter((r) => r.t >= today);
    const sum = (xs: (number | null)[]) => (xs.some((x) => x === null) || !xs.length ? null : Math.round((xs as number[]).reduce((a, b) => a + b, 0)));
    const mean = (xs: (number | null)[]) => (xs.some((x) => x === null) || !xs.length ? null : Math.round(((xs as number[]).reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);
    const rain14 = past.length >= 12 ? sum(past.map((r) => r.mm)) : null;
    const temp14 = past.length >= 12 ? mean(past.map((r) => r.temp)) : null;
    const rainNext7 = sum(next.map((r) => r.mm));
    const tempNext7 = mean(next.map((r) => r.temp));
    return ok({ locationId: loc.id, rain14, temp14, level: mosquitoLevel(rain14, temp14), rainNext7, tempNext7 }, 3 * 3600);
  } catch (e) {
    return fail(e);
  }
}
