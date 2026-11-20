import { type NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { getCoralStations } from "@/lib/weather/providers/coral.provider";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";

export const dynamic = "force-dynamic";

/** Lagoon warmth: NOAA Coral Reef Watch for Mauritius; Open-Meteo sea temperature for Rodrigues (no CRW station). */
export async function GET(req: NextRequest) {
  const island = req.nextUrl.searchParams.get("island") ?? "mauritius";
  if (island !== "mauritius" && island !== "rodrigues") return NextResponse.json({ error: "bad_request", message: "island must be mauritius or rodrigues" }, { status: 400 });
  try {
    if (island === "mauritius") {
      const stations = await getCoralStations();
      return ok({ island, stations, rodriguesSst: null }, 6 * 3600);
    }
    const q = new URLSearchParams({ latitude: "-19.75", longitude: "63.35", hourly: "sea_surface_temperature", forecast_days: "1", timezone: "Indian/Mauritius" });
    const raw = (await getJson(`https://marine-api.open-meteo.com/v1/marine?${q}`, 3 * 3600)) as { hourly?: { sea_surface_temperature?: (number | null)[] } };
    const v = (raw.hourly?.sea_surface_temperature ?? []).filter((x): x is number => x !== null);
    return ok({ island, stations: [], rodriguesSst: v.length ? Math.round(v[Math.floor(v.length / 2)] * 10) / 10 : null }, 3 * 3600);
  } catch (e) {
    return fail(e);
  }
}
