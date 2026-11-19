import { type NextRequest, NextResponse } from "next/server";
import { approvalUrl, authorised, cardUrl, isSlot, prepare, publish } from "@/lib/social/social.service";
import { SOCIAL } from "@/data/social-settings";
import { facebookConfig } from "@/lib/social/publishers/facebook.publisher";

// Called by the GitHub Actions schedule. Requires: Authorization: Bearer <CRON_SECRET>.
export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const slot = req.nextUrl.searchParams.get("slot");
  if (!isSlot(slot)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (SOCIAL.mode === "off" || !SOCIAL.slots[slot]) return NextResponse.json({ status: "off" });
  try {
    if (SOCIAL.mode === "auto") {
      const out = await publish(slot);
      return NextResponse.json(out, { status: out.status === "published" || out.status === "duplicate" ? 200 : 409 });
    }
    // review mode: prepare + check, return links for the owner
    const { snapshot, check } = await prepare(slot);
    return NextResponse.json({
      status: "review",
      configured: !!facebookConfig(),
      title: snapshot.title,
      text: snapshot.text,
      check,
      cardUrl: cardUrl(slot, snapshot.issuedAtMU),
      approveUrl: check.ok ? approvalUrl(slot, snapshot.issuedAtMU) : null,
    });
  } catch (e) {
    console.error("[social/run]", e);
    return NextResponse.json({ status: "error", message: (e as Error).message }, { status: 502 });
  }
}
