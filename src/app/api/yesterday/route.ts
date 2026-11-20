import { type NextRequest, NextResponse } from "next/server";
import { fail, ok, validId } from "@/lib/api";
import { getLocality } from "@/data/localities";
import { ISLAND_PTS, RESERVOIRS, RODRIGUES_POINT } from "@/data/reservoirs";
import { getModelRain } from "@/lib/weather/providers/catchment.provider";
import { rainShare } from "@/lib/weather/intelligence/reservoir.service";
import { addDays, todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";

const AREA_NAMES = ["North", "East", "South", "West", "Central Plateau", "Port Louis"];

/** Yesterday's rain: your place, the island, the wettest area, and (Mauritius) the share on the reservoir catchments. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : null;
  if (!loc) return NextResponse.json({ error: "not_found", message: "Unknown place" }, { status: 404 });
  const y = addDays(todayMU(), -1);
  try {
    if (loc.island === "rodrigues") {
      const [here, isl] = await getModelRain([{ lat: loc.lat, lon: loc.lon }, RODRIGUES_POINT]);
      return ok({ date: y, island: "rodrigues", place: loc.name, placeMm: here?.[y] ?? null, islandMm: isl?.[y] ?? null, areas: [], share: null }, 3 * 3600);
    }
    const pts = [{ lat: loc.lat, lon: loc.lon }, ...ISLAND_PTS, ...RESERVOIRS.map((r) => ({ lat: r.lat, lon: r.lon }))];
    const maps = await getModelRain(pts);
    const placeMm = maps[0]?.[y] ?? null;
    const areaVals = ISLAND_PTS.map((_, i) => maps[1 + i]?.[y] ?? null);
    const catchVals = RESERVOIRS.map((_, i) => maps[1 + ISLAND_PTS.length + i]?.[y] ?? null);
    const known = areaVals.filter((v): v is number => v !== null);
    const islandMm = known.length === areaVals.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
    const share = islandMm !== null && catchVals.every((v) => v !== null) ? rainShare(RESERVOIRS.map((r, i) => ({ mm: catchVals[i] as number, km2: r.catchmentKm2 })), islandMm) : null;
    const areas = AREA_NAMES.map((name, i) => ({ name, mm: areaVals[i] === null ? null : Math.round((areaVals[i] as number) * 10) / 10 }));
    return ok({ date: y, island: "mauritius", place: loc.name, placeMm, islandMm: islandMm === null ? null : Math.round(islandMm * 10) / 10, areas, share }, 3 * 3600);
  } catch (e) {
    return fail(e);
  }
}
