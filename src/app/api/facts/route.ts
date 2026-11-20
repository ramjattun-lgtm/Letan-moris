import { type NextRequest, NextResponse } from "next/server";
import { ok, validId } from "@/lib/api";
import { getLocality } from "@/data/localities";
import { climateKeyFor } from "@/lib/weather/intelligence/climate.service";
import { factsFor } from "@/lib/weather/intelligence/facts.service";
import { allFacts } from "@/lib/weather/intelligence/facts.server";
import { todayMU } from "@/lib/time";

export const dynamic = "force-dynamic";

/** "Did you know?" facts for a place: today's fact first, then a few more. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("loc");
  const loc = validId(id) ? getLocality(id) : null;
  if (!loc) return NextResponse.json({ error: "not_found", message: "Unknown place" }, { status: 404 });
  const today = todayMU();
  const facts = factsFor(allFacts(today), { today, region: climateKeyFor(loc), island: loc.island }).slice(0, 12);
  return ok({ today, facts }, 3600);
}
