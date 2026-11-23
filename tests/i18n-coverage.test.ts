import { describe, expect, it } from "vitest";
import { tr } from "@/lib/i18n";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { assessDay } from "@/lib/weather/intelligence/decision-engine.service";
import { rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { assessHeavyRain } from "@/lib/weather/intelligence/heavy-rain.service";
import { assessRiver, RIVER_SAFETY } from "@/lib/weather/intelligence/river.service";
import { recentInsights, splitRecent } from "@/lib/weather/intelligence/recent.service";
import { buildFacts } from "@/lib/weather/intelligence/facts.service";
import { fakeOpenMeteo, hoursOf } from "./fixtures";

// TEST DATA ONLY. Every sentence the rules produce must have a French version.
const DATE = "2026-11-20";
const SAME = new Set(["Agriculture", "Total", "Position", "District", "UV", "Excellent"]); // identical in French
const untranslated = (xs: string[]) => [...new Set(xs.filter(Boolean))].filter((s) => !SAME.has(s) && tr(s, {}, "fr") === s && /[a-z]{3}/.test(s));

describe("French covers the sentences the rules write", () => {
  const scenarios = [{}, { 13: [80, 3], 14: [85, 4], 15: [70, 2] }, { 7: [90, 25], 8: [90, 22], 9: [70, 8] }, { 6: [60, 0.6], 18: [40, 0.3] }] as Record<number, [number, number]>[];
  it("decision engine, rain outlook and heavy rain", () => {
    const out: string[] = [];
    for (const sc of scenarios) {
      const f = normaliseForecast("x", fakeOpenMeteo(DATE, sc));
      for (const a of assessDay(f.hourly, f.daily, DATE, 0)) out.push(a.title, a.summary, a.period, ...a.reasons);
      const o = rainOutlook(f.hourly, `${DATE}T05:00`);
      out.push(o.headline, o.detail);
      const h = assessHeavyRain(f.hourly.map((x) => ({ time: x.time, mm: x.precipitation })), `${DATE}T05:00`);
      out.push(h.summary, ...h.reasons);
      const { last, next } = splitRecent(f.hourly, `${DATE}T12:00`);
      out.push(...recentInsights(last, next, `${DATE}T18:20`, `${DATE}T12:00`));
    }
    expect(untranslated(out)).toEqual([]);
  });

  it("river messages and safety advice", () => {
    const hours = (mm: number) => hoursOf(DATE, 24).map((t, i) => ({ time: t, mm: i >= 9 && i <= 14 ? mm : 0 }));
    const out = [5, 12].map((mm) => assessRiver(hours(mm), "the hills above Port Louis", "Port Louis", `${DATE}T12:00`).message);
    out.push(...RIVER_SAFETY);
    expect(untranslated(out)).toEqual([]);
  });

  it("Did you know? facts", () => {
    const facts = buildFacts({ today: DATE });
    expect(untranslated(facts.map((f) => f.text))).toEqual([]);
  });
});
