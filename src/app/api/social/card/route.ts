import { type NextRequest, NextResponse } from "next/server";
import { isSlot, prepare, validPlan } from "@/lib/social/social.service";
import { renderCard } from "@/lib/social/content/card-renderer";

// Public share-card preview (the same image that is uploaded to Facebook).
export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get("slot");
  const plan = req.nextUrl.searchParams.get("plan");
  if (!isSlot(slot)) return NextResponse.json({ error: "bad_request", message: "slot must be morning, midday, evening or weekend" }, { status: 400 });
  try {
    const { snapshot } = await prepare(slot, validPlan(plan) ? plan : undefined);
    const img = await renderCard(snapshot);
    img.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return img;
  } catch (e) {
    console.error("[card]", e);
    return NextResponse.json({ error: "unavailable", message: "Card could not be made: forecast data unavailable." }, { status: 502 });
  }
}
