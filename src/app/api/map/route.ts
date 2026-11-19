import { type NextRequest, NextResponse } from "next/server";
import { getMapFor } from "@/lib/weather/services/forecast.service";
import { fail, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const island = req.nextUrl.searchParams.get("island") ?? "mauritius";
  if (island !== "mauritius" && island !== "rodrigues") return NextResponse.json({ error: "bad_request", message: "island must be mauritius or rodrigues" }, { status: 400 });
  try {
    return ok(await getMapFor(island), 1800);
  } catch (e) {
    return fail(e);
  }
}
