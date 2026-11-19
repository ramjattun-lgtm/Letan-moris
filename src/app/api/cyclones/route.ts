import { NextResponse } from "next/server";
import { getActiveSystems } from "@/lib/weather/providers/gdacs.provider";
import { ok } from "@/lib/api";

export async function GET() {
  const status = await getActiveSystems();
  // Never cache a failed check, so "could not check" is not shown for long.
  if (!status.ok) return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  return ok(status, 1800);
}
