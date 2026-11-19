import { type NextRequest, NextResponse } from "next/server";
import { authorised } from "@/lib/social/social.service";
import { facebookConfig, tokenHealth } from "@/lib/social/publishers/facebook.publisher";
import { SOCIAL } from "@/data/social-settings";

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const cfg = facebookConfig();
  return NextResponse.json({ mode: SOCIAL.mode, configured: !!cfg, facebook: cfg ? await tokenHealth(cfg) : null }, { headers: { "Cache-Control": "no-store" } });
}
