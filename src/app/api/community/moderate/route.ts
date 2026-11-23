import { type NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { dbEnabled, flagged, moderate } from "@/lib/community/db.server";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Owner-only: checks the key against the MODERATION_KEY setting in Vercel. */
function allowed(req: NextRequest): boolean {
  const want = process.env.MODERATION_KEY ?? "";
  const got = req.headers.get("x-moderation-key") ?? "";
  if (want.length < 12 || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: NextRequest) {
  if (!dbEnabled()) return json({ error: "disabled", message: "Database not connected" }, 503);
  if (!allowed(req)) return json({ error: "forbidden", message: "Wrong key" }, 403);
  return json({ reports: await flagged() });
}

export async function POST(req: NextRequest) {
  if (!dbEnabled()) return json({ error: "disabled", message: "Database not connected" }, 503);
  if (!allowed(req)) return json({ error: "forbidden", message: "Wrong key" }, 403);
  const b = (await req.json().catch(() => null)) as { id?: string; decision?: string } | null;
  if (!b || typeof b.id !== "string" || !/^\d{1,18}$/.test(b.id) || (b.decision !== "keep" && b.decision !== "remove")) return json({ error: "bad_request" }, 400);
  await moderate(b.id, b.decision);
  revalidateTag("community", { expire: 0 });
  return json({ ok: true });
}
