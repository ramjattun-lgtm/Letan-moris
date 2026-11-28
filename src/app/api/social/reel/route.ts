import { type NextRequest, NextResponse } from "next/server";
import { authorised, fetchReelAssets, isSlot, publishStoredReel, recheckBundle, REEL_ASSET_BASE, reelApprovalUrl, reelAssetName, sha256 } from "@/lib/social/social.service";
import { SOCIAL } from "@/data/social-settings";
import { facebookConfig } from "@/lib/social/publishers/facebook.publisher";

export const maxDuration = 60;

// Called by the GitHub Action after it has drawn the reel and uploaded the files.
// Body: { slot, plan, vh, jh } — sha256 of the video and of the JSON it uploaded.
// auto mode + forecast reel → publish now. Otherwise → approval link for the owner.
export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { slot?: string; plan?: string; vh?: string; jh?: string };
  const slot = b.slot ?? null;
  if (!isSlot(slot) || !b.plan || !/^[0-9a-f]{64}$/.test(b.vh ?? "") || !/^[0-9a-f]{64}$/.test(b.jh ?? "")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (SOCIAL.mode === "off") return NextResponse.json({ status: "off" });
  try {
    const { mp4, json, bundle } = await fetchReelAssets(slot, b.plan);
    if (sha256(mp4) !== b.vh || sha256(json) !== b.jh) return NextResponse.json({ status: "blocked", failures: ["Uploaded reel files do not match."] }, { status: 409 });
    const check = recheckBundle(bundle);
    if (!check.ok) return NextResponse.json({ status: "blocked", failures: check.failures }, { status: 409 });
    const videoUrl = `${REEL_ASSET_BASE}/${reelAssetName(slot, b.plan)}.mp4`;
    if (SOCIAL.mode === "auto" && bundle.plan.kind === "forecast") {
      const out = await publishStoredReel(slot, b.plan, b.vh!, b.jh!);
      return NextResponse.json({ ...out, videoUrl }, { status: out.status === "published" || out.status === "duplicate" ? 200 : 409 });
    }
    return NextResponse.json({
      status: "review",
      kind: bundle.plan.kind,
      configured: !!facebookConfig(),
      title: bundle.title,
      text: bundle.text,
      videoUrl,
      approveUrl: reelApprovalUrl(slot, b.plan, b.vh!, b.jh!),
    });
  } catch (e) {
    console.error("[social/reel]", e);
    return NextResponse.json({ status: "error", message: (e as Error).message }, { status: 502 });
  }
}
