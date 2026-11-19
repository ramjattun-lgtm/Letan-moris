import { createHmac, timingSafeEqual } from "node:crypto";
import { getForecastFor } from "@/lib/weather/services/forecast.service";
import type { Forecast } from "@/lib/weather/types";
import { buildSnapshot, POST_REGIONS, SITE_URL, SLOTS, type PostSnapshot, type Slot } from "./content/post-builder";
import { checkPost, type CheckResult } from "./checker/post-validator.service";
import { renderCard } from "./content/card-renderer";
import { alreadyPosted, facebookConfig, publishPhoto } from "./publishers/facebook.publisher";
import { SOCIAL } from "@/data/social-settings";
import { addHours, nowMU } from "@/lib/time";

export const isSlot = (s: string | null): s is Slot => !!s && (SLOTS as string[]).includes(s);

export async function prepare(slot: Slot, planFrom?: string): Promise<{ snapshot: PostSnapshot; check: CheckResult }> {
  const entries = await Promise.all(POST_REGIONS.map(async (r) => [r.locId, await getForecastFor(r.locId)] as const));
  const forecasts = Object.fromEntries(entries) as Record<string, Forecast>;
  const now = nowMU();
  const snapshot = buildSnapshot(slot, forecasts, now, planFrom ?? now);
  return { snapshot, check: checkPost(snapshot) };
}

// ——— Signed approval links (no database needed) ———
const secret = () => process.env.SOCIAL_SECRET ?? process.env.CRON_SECRET ?? "";

export function sign(slot: Slot, planFrom: string, exp: number): string {
  return createHmac("sha256", secret()).update(`${slot}|${planFrom}|${exp}`).digest("hex").slice(0, 32);
}

export function verify(slot: Slot, planFrom: string, exp: number, sig: string): boolean {
  if (!secret()) return false;
  const want = Buffer.from(sign(slot, planFrom, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) && Date.now() / 1000 < exp;
}

export function approvalUrl(slot: Slot, planFrom: string): string {
  const exp = Math.floor(Date.now() / 1000) + SOCIAL.approvalValidMinutes * 60;
  return `${SITE_URL}/api/social/approve?slot=${slot}&plan=${encodeURIComponent(planFrom)}&exp=${exp}&sig=${sign(slot, planFrom, exp)}`;
}

export function authorised(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  const h = req.headers.get("authorization") ?? "";
  const want = Buffer.from(`Bearer ${s}`);
  const got = Buffer.from(h);
  return want.length === got.length && timingSafeEqual(want, got);
}

export type PublishOutcome =
  | { status: "published"; id: string; postId?: string }
  | { status: "duplicate" }
  | { status: "blocked"; failures: string[] }
  | { status: "not-configured" }
  | { status: "off" };

/** Build fresh, check, and publish. Never publishes if the checker fails or the post already exists. */
export async function publish(slot: Slot, planFrom?: string): Promise<PublishOutcome & { text?: string }> {
  if (SOCIAL.mode === "off") return { status: "off" };
  const cfg = facebookConfig();
  if (!cfg) return { status: "not-configured" };
  const { snapshot, check } = await prepare(slot, planFrom);
  if (!check.ok) return { status: "blocked", failures: check.failures, text: snapshot.text };
  if (await alreadyPosted(cfg, snapshot.title)) return { status: "duplicate", text: snapshot.text };
  const png = await (await renderCard(snapshot)).arrayBuffer();
  const r = await publishPhoto(cfg, png, snapshot.text);
  return { status: "published", id: r.id, postId: r.postId, text: snapshot.text };
}

export const cardUrl = (slot: Slot, planFrom: string) => `${SITE_URL}/api/social/card?slot=${slot}&plan=${encodeURIComponent(planFrom)}`;

/** Plan times look like "YYYY-MM-DDTHH:mm" and must be recent. */
export function validPlan(p: string | null): p is string {
  if (!p || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p)) return false;
  const now = nowMU();
  return p <= addHours(now, 1) && p >= addHours(now, -24);
}
