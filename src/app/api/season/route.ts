import { ok } from "@/lib/api";
import history from "@/data/cyclone-history.json";
import { getSeasonSystems } from "@/lib/weather/providers/gdacs.provider";
import { nearStormNormals, type HistStorm } from "@/lib/weather/intelligence/cyclone-climate.service";
import { todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Cyclone season scorecard: systems tracked so far this season vs what is typical. */
export async function GET() {
  const today = todayMU();
  const y = Number(today.slice(0, 4));
  const start = Number(today.slice(5, 7)) >= 7 ? `${y}-07-01` : `${y - 1}-07-01`;
  const [season, storms] = [await getSeasonSystems(start, today), ((history as { storms?: HistStorm[] }).storms ?? []) as HistStorm[]];
  const near = (k: "mauritius" | "rodrigues", km: number) => season.systems.filter((s) => s.closestKm[k] !== null && (s.closestKm[k] as number) <= km).length;
  return ok(
    {
      start,
      today,
      ok: season.ok,
      systems: season.systems,
      nearSoFar: { mauritius: near("mauritius", 500), rodrigues: near("rodrigues", 500) },
      normals: storms.length ? { mauritius: nearStormNormals(storms, "mauritius", today), rodrigues: nearStormNormals(storms, "rodrigues", today) } : null,
    },
    3 * 3600,
  );
}
