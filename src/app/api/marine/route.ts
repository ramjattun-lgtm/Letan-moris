import { type NextRequest, NextResponse } from "next/server";
import { getMarineFor } from "@/lib/weather/services/forecast.service";
import { fail, ok, validId } from "@/lib/api";

export async function GET(req: NextRequest) {
  const loc = req.nextUrl.searchParams.get("loc");
  if (!validId(loc)) return NextResponse.json({ error: "bad_request", message: "Missing or invalid ?loc=" }, { status: 400 });
  try {
    return ok(await getMarineFor(loc), 3600);
  } catch (e) {
    return fail(e);
  }
}
