import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { buildSnapshot, POST_REGIONS } from "@/lib/social/content/post-builder";
import { activeOfficial, checkReelPlan, forecastReelPlan, mmsCaption, mmsReelPlan, reelAlertLines, reelSlot } from "@/lib/social/content/reel";
import { riverAlerts } from "@/lib/community/area-alerts";
import type { Forecast } from "@/lib/weather/types";
import { fakeOpenMeteo, hoursOf } from "./fixtures";
import fs from "node:fs";

// TEST DATA ONLY.
function forecasts(date: string, rain: Record<string, Record<number, [number, number]>> = {}) {
  const out: Record<string, Forecast> = {};
  for (const r of POST_REGIONS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = fakeOpenMeteo(date, rain[r.locId] ?? {}) as Record<string, any>;
    const time = hoursOf(date, 168);
    for (const k of Object.keys(raw.hourly)) if (k !== "time") raw.hourly[k] = time.map((_: string, j: number) => raw.hourly[k][j % 24]);
    raw.hourly.time = time;
    raw.__fetchedAt = "2026-11-20T01:30:00Z";
    out[r.locId] = normaliseForecast(r.locId, raw);
  }
  return out;
}

const NOW = "2026-11-20T05:45";
const snap = () => buildSnapshot("morning", forecasts("2026-11-20", { curepipe: { 14: [80, 3], 15: [70, 2] }, "centre-de-flacq": { 10: [40, 0.3] } }), NOW);
const none = { mauritius: { status: "not-entered" as const, headline: "", sourceUrl: "", issuedAtMU: "", enteredAtMU: "" }, rodrigues: { status: "not-entered" as const, headline: "", sourceUrl: "", issuedAtMU: "", enteredAtMU: "" } };

describe("Facebook reels", () => {
  it("makes reels for the three daily slots only", () => {
    expect(["morning", "midday", "evening"].every((s) => reelSlot(s as never))).toBe(true);
    expect(reelSlot("weekend")).toBe(false);
  });

  it("shows all six areas with the same numbers as the caption and the calibrated symbols", () => {
    const s = snap();
    const p = forecastReelPlan(s, NOW);
    expect(p.rows).toHaveLength(6);
    expect(p.title).toEqual(["Today", "Aujourd'hui", "Zordi"]);
    const plateau = p.rows.find((r) => r.key === "plateau")!;
    expect(plateau.sym).toBe("likely");
    expect(plateau.window).toBe("14:00–16:00");
    expect(p.rows.find((r) => r.key === "east")!.sym).toBe("possible");
    expect(p.rows.find((r) => r.key === "west")!.sym).toBe("dry");
    expect(checkReelPlan(p, [], s.text).failures).toEqual([]);
    if (process.env.REEL_SAMPLE) fs.writeFileSync(process.env.REEL_SAMPLE, JSON.stringify({ plan: { ...p, alert: ["🌧️ Heavy-rain risk, next 24 hours: high in Central Plateau. Avoid flood-prone roads.", "🏞️ River watch: rain over the hills feeding Rivière du Pouce. Rivers can rise fast downstream. Keep away from fords and river banks."] }, title: s.title, text: s.text, snapshot: s }));
  });

  it("alerts never use the words warning or official, and include River watch and quakes", () => {
    const s = snap();
    const regions = s.sections[0].regions.map((r) => (r.key === "plateau" ? { ...r, heavyRisk: "high" as const } : r));
    const lines = reelAlertLines(regions, { rivers: [{ name: "Rivière du Pouce", level: "high" }, { name: "GRSE", level: "low" }], quakes: [{ mag: 6.4, place: "Mid-Indian Ridge" }] });
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toContain("River watch: rain over the hills feeding Rivière du Pouce");
    expect(lines.join(" ")).not.toMatch(/\bwarning\b|\bofficial\b/i);
    expect(reelAlertLines(s.sections[0].regions, { rivers: [{ name: "X", level: "low" }] })).toEqual([]);
  });

  it("pauses forecast reels while an MMS warning is in force, and checks the MMS wording is unchanged", () => {
    const s = snap();
    const official = activeOfficial({ ...none, mauritius: { status: "warning", headline: "Cyclone warning Class II in force in Mauritius", sourceUrl: "https://metservice.intnet.mu", issuedAtMU: "2026-11-20 05:10", enteredAtMU: "2026-11-20 05:20" } });
    expect(official).toHaveLength(1);
    expect(checkReelPlan(forecastReelPlan(s, NOW), official, s.text).ok).toBe(false);
    const m = mmsReelPlan("morning", NOW, NOW, official);
    const cap = mmsCaption(official);
    expect(cap.text).toContain('"Cyclone warning Class II in force in Mauritius"');
    expect(cap.title).toBe("MMS warning in force · Mauritius 2026-11-20 05:10");
    expect(checkReelPlan(m, official, cap.text).ok).toBe(true);
    const changed = activeOfficial({ ...none, mauritius: { status: "warning", headline: "Cyclone warning Class III in force in Mauritius", sourceUrl: "x", issuedAtMU: "2026-11-20 10:10", enteredAtMU: "" } });
    expect(checkReelPlan(m, changed, cap.text).failures).toContain("The MMS warning has changed since this reel was made.");
    expect(checkReelPlan(m, [], cap.text).ok).toBe(false);
    expect(activeOfficial(none)).toEqual([]);
  });

  it("River watch HIGH sends a phone alert to the areas downstream", () => {
    const a = riverAlerts([{ id: "pouce", name: "Rivière du Pouce", level: "high", message: "Heavy rain over the Moka range.", downstream: ["port-louis"] }, { id: "x", name: "X", level: "moderate", message: "", downstream: ["port-louis"] }], NOW);
    expect(Object.keys(a)).toEqual(["portlouis"]);
    expect(a.portlouis[0].title).toBe("River watch: Rivière du Pouce could rise fast");
    expect(a.portlouis[0].body).toContain("not a river-level measurement");
  });
});
