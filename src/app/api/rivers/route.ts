import { type NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { getRiverWatch } from "@/lib/weather/intelligence/river-watch.server";

export const dynamic = "force-dynamic";

/** River watch: rain over each river's upper catchment, last 3 h and next 3–6 h. */
export async function GET(req: NextRequest) {
  const island = req.nextUrl.searchParams.get("island") ?? "mauritius";
  if (island !== "mauritius" && island !== "rodrigues") return NextResponse.json({ error: "bad_request", message: "island must be mauritius or rodrigues" }, { status: 400 });
  try {
    return ok({ island, rivers: await getRiverWatch(island), retrievedAt: new Date().toISOString() }, 900);
  } catch (e) {
    return fail(e);
  }
}
