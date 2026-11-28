import { createHmac, timingSafeEqual } from "node:crypto";
import { getForecastFor } from "@/lib/weather/services/forecast.service";
import type { Forecast } from "@/lib/weather/types";
import { weeklyBlock } from "./content/weekly";
import { buildSnapshot, POST_REGIONS, SITE_URL, SLOTS, type PostSnapshot, type Slot } from "./content/post-builder";
import { checkPost, type CheckResult } from "./checker/post-validator.service";
import { renderCard } from "./content/card-renderer";
import { alreadyPosted, alreadyPostedReel, facebookConfig, publishPhoto, publishReel } from "./publishers/facebook.publisher";
import { activeOfficial, checkReelPlan, forecastReelPlan, mmsCaption, mmsReelPlan, type ReelPlan } from "./content/reel";
import { OFFICIAL } from "@/data/official-status";
import { getRiverWatch } from "@/lib/weather/intelligence/river-watch.server";
import { getJson } from "@/lib/weather/providers/open-meteo.provider";
import { notableQuakes, type UsgsFeature } from "@/lib/weather/intelligence/quake.service";
import { createHash } from "node:crypto";
import { SOCIAL } from "@/data/social-settings";
import { weeklyPostFact } from "@/lib/weather/intelligence/facts.server";
import { addDays, addHours, nowMU } from "@/lib/time";

export const isSlot = (s: string | null): s is Slot => !!s && (SLOTS as string[]).includes(s);

export async function prepare(slot: Slot, planFrom?: string): Promise<{ snapshot: PostSnapshot; check: CheckResult }> {
  const entries = await Promise.all(POST_REGIONS.map(async (r) => [r.locId, await getForecastFor(r.locId)] as const));
  const forecasts = Object.fromEntries(entries) as Record<string, Forecast>;
  const now = nowMU();
  const from = planFrom ?? now;
  // Weekly "Did you know?": added to the Sunday morning post.
  const isSunday = new Date(`${from.slice(0, 10)}T12:00:00Z`).getUTCDay() === 0;
  const didYouKnow = slot === "morning" && isSunday ? weeklyPostFact(from.slice(0, 10)) : null;
  // Weekly look-back and best days: added to the Sunday evening post.
  const weekly = slot === "evening" && isSunday ? weeklyBlock(forecasts, addDays(from.slice(0, 10), 1)) : undefined;
  const snapshot = buildSnapshot(slot, forecasts, now, from, { didYouKnow, weekly });
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
  if (officialNow().length) return { status: "blocked", failures: [MMS_PAUSE] };
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

// ——— Reels ———
export const MMS_PAUSE = "An MMS warning is in force: forecast posts are paused. Only the \"Follow MMS\" reel can be posted, after your approval.";
export const officialNow = () => activeOfficial(OFFICIAL);

/** What the reel file holds besides the video: everything needed to re-check it at approval time. */
export interface ReelBundle {
  plan: ReelPlan;
  title: string;
  text: string;
  snapshot: PostSnapshot | null;
}

async function reelExtras() {
  const [rivers, quakes] = await Promise.all([
    Promise.all([getRiverWatch("mauritius"), getRiverWatch("rodrigues")]).then((x) => x.flat()).catch(() => []),
    getJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", 120)
      .then((j) => notableQuakes(((j as { features?: UsgsFeature[] }).features ?? [])))
      .catch(() => []),
  ]);
  return { rivers, quakes };
}

/** Build the reel bundle for a slot: the "Follow MMS" reel while a warning is in force, otherwise the forecast reel. */
export async function prepareReel(slot: Slot): Promise<{ bundle: ReelBundle; check: CheckResult }> {
  const official = officialNow();
  if (official.length) {
    const now = nowMU();
    const plan = mmsReelPlan(slot, now, now, official);
    const cap = mmsCaption(official);
    const c = checkReelPlan(plan, official, cap.text);
    return { bundle: { plan, title: cap.title, text: cap.text, snapshot: null }, check: { ok: c.ok, failures: c.failures, warnings: ["MMS warning in force — always approved by you, never automatic."] } };
  }
  const [{ snapshot, check }, extras] = await Promise.all([prepare(slot), reelExtras()]);
  const plan = forecastReelPlan(snapshot, snapshot.issuedAtMU, extras);
  const c = checkReelPlan(plan, official, snapshot.text);
  return { bundle: { plan, title: snapshot.title, text: snapshot.text, snapshot }, check: { ok: check.ok && c.ok, failures: [...check.failures, ...c.failures], warnings: check.warnings } };
}

/** Re-check a stored bundle just before publishing (approval may come up to 3 hours later). */
export function recheckBundle(b: ReelBundle): CheckResult {
  const official = officialNow();
  const c = checkReelPlan(b.plan, official, b.text);
  const failures = [...c.failures];
  if (b.plan.kind === "forecast") {
    if (!b.snapshot) failures.push("Reel data missing.");
    else failures.push(...checkPost(b.snapshot, new Date(), { maxIssueLagMin: SOCIAL.approvalValidMinutes + 30 }).failures);
  }
  return { ok: failures.length === 0, failures, warnings: [] };
}

export const REEL_ASSET_BASE = process.env.REEL_ASSET_BASE ?? "https://github.com/ramjattun-lgtm/Letan-moris/releases/download/reels";
/** File names are fixed by slot and plan time, so nobody can point us at another file. */
export const reelAssetName = (slot: Slot, planFrom: string) => `reel-${slot}-${planFrom.replace(/[-:]/g, "").replace("T", "-")}`;
export const sha256 = (b: ArrayBuffer | string) => createHash("sha256").update(typeof b === "string" ? b : Buffer.from(b)).digest("hex");

export async function fetchReelAssets(slot: Slot, planFrom: string): Promise<{ mp4: ArrayBuffer; json: string; bundle: ReelBundle }> {
  const name = reelAssetName(slot, planFrom);
  const [v, j] = await Promise.all([
    fetch(`${REEL_ASSET_BASE}/${name}.mp4`, { cache: "no-store", signal: AbortSignal.timeout(30000) }),
    fetch(`${REEL_ASSET_BASE}/${name}.json`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
  ]);
  if (!v.ok || !j.ok) throw new Error(`Reel files not found (${v.status}/${j.status}).`);
  const mp4 = await v.arrayBuffer();
  if (mp4.byteLength > 50e6) throw new Error("Reel file too large.");
  const json = await j.text();
  return { mp4, json, bundle: JSON.parse(json) as ReelBundle };
}

export function signReel(slot: Slot, planFrom: string, exp: number, vh: string, jh: string): string {
  return createHmac("sha256", secret()).update(`reel|${slot}|${planFrom}|${exp}|${vh}|${jh}`).digest("hex").slice(0, 32);
}

export function verifyReel(slot: Slot, planFrom: string, exp: number, vh: string, jh: string, sig: string): boolean {
  if (!secret()) return false;
  const want = Buffer.from(signReel(slot, planFrom, exp, vh, jh));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) && Date.now() / 1000 < exp;
}

export function reelApprovalUrl(slot: Slot, planFrom: string, vh: string, jh: string): string {
  const exp = Math.floor(Date.now() / 1000) + SOCIAL.approvalValidMinutes * 60;
  return `${SITE_URL}/api/social/approve?reel=1&slot=${slot}&plan=${encodeURIComponent(planFrom)}&exp=${exp}&vh=${vh}&jh=${jh}&sig=${signReel(slot, planFrom, exp, vh, jh)}`;
}

/** Download the stored reel, confirm it is exactly the one checked, re-check, then publish. */
export async function publishStoredReel(slot: Slot, planFrom: string, vh: string, jh: string): Promise<PublishOutcome & { text?: string }> {
  if (SOCIAL.mode === "off") return { status: "off" };
  const cfg = facebookConfig();
  if (!cfg) return { status: "not-configured" };
  const { mp4, json, bundle } = await fetchReelAssets(slot, planFrom);
  if (sha256(mp4) !== vh || sha256(json) !== jh) return { status: "blocked", failures: ["The reel files changed after they were checked."] };
  if (bundle.plan.slot !== slot || bundle.plan.planFrom !== planFrom) return { status: "blocked", failures: ["Reel files do not match this approval."] };
  const check = recheckBundle(bundle);
  if (!check.ok) return { status: "blocked", failures: check.failures, text: bundle.text };
  if ((await alreadyPostedReel(cfg, bundle.title)) || (await alreadyPosted(cfg, bundle.title))) return { status: "duplicate", text: bundle.text };
  const r = await publishReel(cfg, mp4, bundle.text);
  return { status: "published", id: r.id, postId: r.postId, text: bundle.text };
}
