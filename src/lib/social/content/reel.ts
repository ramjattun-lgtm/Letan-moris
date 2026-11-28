// Facebook reels: the data a reel shows. The video itself is drawn in GitHub Actions
// (scripts/reel/render.mjs) from this plan, so the server decides every word and number.
import type { PostSnapshot, RegionSummary, Slot } from "./post-builder";
import { DISCLAIMER, SITE_URL } from "./post-builder";
import type { OfficialEntry } from "@/data/official-status";
import type { Quake } from "@/lib/weather/intelligence/quake.service";
import type { RiverLevel } from "@/lib/weather/intelligence/river.service";

export const REEL_SLOTS: Slot[] = ["morning", "midday", "evening"];
export const reelSlot = (s: Slot) => REEL_SLOTS.includes(s);

export type ReelSymbol = "likely" | "possible" | "dry";

export interface ReelRow {
  key: string;
  label: string;
  place: string;
  tmin: number;
  tmax: number;
  sym: ReelSymbol;
  window: string | null;
  prob: number;
}

export interface OfficialNotice {
  island: "mauritius" | "rodrigues";
  headline: string;
  issuedAtMU: string;
  sourceUrl: string;
}

export interface ReelPlan {
  version: 1;
  kind: "forecast" | "mms";
  slot: Slot;
  planFrom: string;
  issuedAtMU: string;
  title: [string, string, string];
  sub: string;
  rows: ReelRow[];
  alert: string[] | null;
  official: OfficialNotice[];
}

export const REEL_TITLES: Record<string, [string, string, string]> = {
  morning: ["Today", "Aujourd'hui", "Zordi"],
  midday: ["This afternoon", "Cet après-midi", "Apremidi"],
  evening: ["Tomorrow", "Demain", "Demin"],
  mms: ["An MMS warning is in force", "Avis MMS en vigueur", "Avertisman MMS an viger"],
};

const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function reelSymbol(r: RegionSummary): { sym: ReelSymbol; window: string | null } {
  if (r.rainWindows.length) return { sym: "likely", window: r.rainWindows[0] };
  if (r.possibleWindows.length) return { sym: "possible", window: r.possibleWindows[0] };
  if ((r.maxRainProb ?? 0) >= 30 || (r.rainMm ?? 0) >= 0.5) return { sym: "possible", window: null };
  return { sym: "dry", window: null };
}

export interface ReelExtras {
  rivers?: { name: string; level: RiverLevel | null }[];
  quakes?: Pick<Quake, "mag" | "place">[];
}

/** Our own alerts (never warnings): heavy-rain risk, River watch, strong earthquakes. At most 3 lines. */
export function reelAlertLines(regions: RegionSummary[], extras: ReelExtras = {}): string[] {
  const lines: string[] = [];
  for (const q of extras.quakes ?? []) lines.push(`🌊 Strong earthquake M${q.mag} (${q.place}). Tsunami alerts come only from MMS: check MMS, radio and TV.`);
  const high = regions.filter((r) => r.heavyRisk === "high").map((r) => r.label);
  const mod = regions.filter((r) => r.heavyRisk === "moderate").map((r) => r.label);
  if (high.length || mod.length) {
    const parts = [high.length ? `high in ${high.join(", ")}` : "", mod.length ? `moderate in ${mod.join(", ")}` : ""].filter(Boolean);
    lines.push(`🌧️ Heavy-rain risk, next 24 hours: ${parts.join("; ")}. Avoid flood-prone roads.`);
  }
  const wet = (extras.rivers ?? []).filter((r) => r.level === "high" || r.level === "moderate");
  if (wet.length) {
    const names = wet.slice(0, 2).map((r) => r.name).join(" and ");
    const more = wet.length > 2 ? ` and ${wet.length - 2} more` : "";
    lines.push(`🏞️ River watch: rain over the hills feeding ${names}${more}. Rivers can rise fast downstream. Keep away from fords and river banks.`);
  }
  return lines.slice(0, 3);
}

export function activeOfficial(entries: Record<"mauritius" | "rodrigues", OfficialEntry>): OfficialNotice[] {
  return (["mauritius", "rodrigues"] as const)
    .filter((k) => entries[k].status === "warning" && entries[k].headline.trim())
    .map((k) => ({ island: k, headline: entries[k].headline.trim(), issuedAtMU: entries[k].issuedAtMU, sourceUrl: entries[k].sourceUrl || "https://metservice.intnet.mu" }));
}

export function forecastReelPlan(s: PostSnapshot, planFrom: string, extras: ReelExtras = {}): ReelPlan {
  const sec = s.sections[0];
  const rows: ReelRow[] = sec.regions.map((r) => {
    const { sym, window } = reelSymbol(r);
    return { key: r.key, label: r.key === "plateau" ? "Plateau" : r.label, place: r.place, tmin: r.tempMin ?? NaN, tmax: r.tempMax ?? NaN, sym, window, prob: r.maxRainProb ?? NaN };
  });
  const alert = reelAlertLines(sec.regions, extras);
  return {
    version: 1,
    kind: "forecast",
    slot: s.slot,
    planFrom,
    issuedAtMU: s.issuedAtMU,
    title: REEL_TITLES[s.slot] ?? REEL_TITLES.morning,
    sub: `${dayName(sec.date)} · ${hh(sec.from)}–${hh(sec.to)}`,
    rows,
    alert: alert.length ? alert : null,
    official: [],
  };
}

export function mmsReelPlan(slot: Slot, planFrom: string, issuedAtMU: string, official: OfficialNotice[]): ReelPlan {
  return { version: 1, kind: "mms", slot, planFrom, issuedAtMU, title: REEL_TITLES.mms, sub: "", rows: [], alert: null, official };
}

const ISLAND = { mauritius: "Mauritius", rodrigues: "Rodrigues" } as const;

/** First line is unique per MMS bulletin, so the same bulletin is never posted twice. */
export function mmsCaption(official: OfficialNotice[]): { title: string; text: string } {
  const title = `MMS warning in force · ${official.map((o) => `${ISLAND[o.island]} ${o.issuedAtMU}`).join(" · ")}`;
  const blocks = official.map((o) => `${ISLAND[o.island]} — from MMS, issued ${o.issuedAtMU} (Mauritius time):\n"${o.headline}"\nSource: ${o.sourceUrl}`);
  const text = [
    title,
    ...blocks,
    "Follow MMS, radio and TV for official updates. Letan Moris forecast posts are paused while the warning is in force.",
    "Be ready: charge phones and torches · water, food and medicines for 3 days · secure loose objects · know where you would go.",
    `Cyclone checklist: ${SITE_URL}/cyclone`,
  ].join("\n\n");
  return { title, text };
}

export interface ReelCheck {
  ok: boolean;
  failures: string[];
}

/** Extra checks for the reel on top of the normal post checker. */
export function checkReelPlan(p: ReelPlan, currentOfficial: OfficialNotice[], caption: string): ReelCheck {
  const failures: string[] = [];
  if (p.kind === "forecast") {
    if (currentOfficial.length) failures.push("An MMS warning is in force: forecast reels are paused.");
    if (p.rows.length !== 6) failures.push("Reel must show all 6 areas.");
    for (const r of p.rows) {
      if (![r.tmin, r.tmax, r.prob].every(Number.isFinite)) failures.push(`${r.label}: values missing.`);
      else if (!caption.includes(`${r.tmin}–${r.tmax}°C`)) failures.push(`${r.label}: reel and caption disagree.`);
    }
    if (!caption.includes(DISCLAIMER)) failures.push("Caption is missing the disclaimer.");
    for (const l of p.alert ?? []) if (/\bwarning\b/i.test(l) || /\bofficial\b/i.test(l)) failures.push("Alert lines must not use the words warning or official.");
  } else {
    if (!p.official.length) failures.push("No MMS warning entered.");
    const same = p.official.length === currentOfficial.length && p.official.every((o, i) => o.headline === currentOfficial[i].headline && o.issuedAtMU === currentOfficial[i].issuedAtMU);
    if (!same) failures.push("The MMS warning has changed since this reel was made.");
    for (const o of p.official) if (!o.issuedAtMU || !o.sourceUrl) failures.push("MMS issue time or source link missing.");
  }
  return { ok: failures.length === 0, failures };
}
