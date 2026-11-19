import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { findRainPeriods, intensityOf, rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
import { confidenceForDry, confidenceForRain, decayWithLeadTime } from "@/lib/weather/intelligence/confidence.service";
import { fakeOpenMeteo } from "./fixtures";

const D = "2026-11-20";

describe("rainfall intelligence", () => {
  it("classifies intensity by mm per hour", () => {
    expect(intensityOf(null)).toBeNull();
    expect(intensityOf(0)).toBe("none");
    expect(intensityOf(1)).toBe("light");
    expect(intensityOf(5)).toBe("moderate");
    expect(intensityOf(10)).toBe("heavy");
  });

  it("groups consecutive wet hours into one period with correct start/end", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 14: [60, 1], 15: [80, 4], 16: [55, 0.6] }));
    const p = findRainPeriods(f.hourly);
    expect(p).toHaveLength(1);
    expect(p[0].start).toBe(`${D}T14:00`);
    expect(p[0].end).toBe(`${D}T17:00`);
    expect(p[0].totalMm).toBe(5.6);
    expect(p[0].peakIntensity).toBe("moderate");
    expect(p[0].maxProbability).toBe(80);
  });

  it("handles a period running past midnight", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 23: [70, 2] }));
    const p = findRainPeriods(f.hourly);
    expect(p[0].end).toBe("2026-11-21T00:00");
  });

  it("says when rain is likely to start (to the hour, not the minute)", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 14: [75, 2], 15: [75, 2] }));
    const o = rainOutlook(f.hourly, `${D}T10:20`);
    expect(o.headline).toBe("Rain likely from about 14:00 until about 16:00");
    expect(o.resolutionNote).toContain("hourly");
    expect(o.confidence).toBe("high");
  });

  it("says rain is happening now when the current hour is wet", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 10: [90, 3], 11: [60, 1] }));
    expect(rainOutlook(f.hourly, `${D}T10:40`).headline).toBe("Rain likely now, easing around 12:00");
  });

  it("reports a dry outlook with probability-based confidence", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D));
    const o = rainOutlook(f.hourly, `${D}T10:00`);
    expect(o.headline).toContain("No significant rain");
    expect(o.confidence).toBe("high");
  });

  it("does not invent a forecast when data is missing", () => {
    const o = rainOutlook([], `${D}T10:00`);
    expect(o.headline).toBe("Rain forecast not available");
  });

  it("confidence rules", () => {
    expect(confidenceForRain(80)).toBe("high");
    expect(confidenceForRain(55)).toBe("medium");
    expect(confidenceForDry(40)).toBe("low");
    expect(decayWithLeadTime("high", 5)).toBe("low");
    expect(decayWithLeadTime("high", 2)).toBe("medium");
  });
});
