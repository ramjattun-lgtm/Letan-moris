import { type NextRequest, NextResponse } from "next/server";
import { cardUrl, isSlot, prepare } from "@/lib/social/social.service";
import { SOCIAL } from "@/data/social-settings";

// Public read-only preview of what would be posted now (no publishing).
export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get("slot");
  if (!isSlot(slot)) return NextResponse.json({ error: "bad_request", message: "slot must be morning, midday, evening or weekend" }, { status: 400 });
  try {
    const { snapshot, check } = await prepare(slot);
    return NextResponse.json(
      { mode: SOCIAL.mode, slot, text: snapshot.text, check, cardUrl: cardUrl(slot, snapshot.issuedAtMU), issuedAtMU: snapshot.issuedAtMU },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  } catch (e) {
    console.error("[preview]", e);
    return NextResponse.json({ error: "unavailable", message: "Forecast data unavailable — nothing would be posted." }, { status: 502 });
  }
}
