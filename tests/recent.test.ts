import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { recentInsights, splitRecent } from "@/lib/weather/intelligence/recent.service";
import { fakeOpenMeteo } from "./fixtures";

// TEST DATA ONLY.
const D = "2026-11-20";
const NOW = `${D}T14:20`;

describe("last 3 hours · next 3 hours", () => {
  it("splits into the 3 completed hours and the current + next 2 hours", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D));
    const { last, next } = splitRecent(f.hourly, NOW);
    expect(last.hours.map((h) => h.time.slice(11))).toEqual(["11:00", "12:00", "13:00"]);
    expect(next.hours.map((h) => h.time.slice(11))).toEqual(["14:00", "15:00", "16:00"]);
  });
  it("rain on the way", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 15: [80, 3] }));
    const { last, next } = splitRecent(f.hourly, NOW);
    expect(recentInsights(last, next, null, NOW)[0]).toBe("Rain on the way: dry so far, showers likely from about 15:00 (up to 80%).");
  });
  it("drying up after rain", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 11: [90, 4], 12: [80, 2] }));
    const { last, next } = splitRecent(f.hourly, NOW);
    expect(recentInsights(last, next, null, NOW)[0]).toContain("Drying up: about 6 mm fell");
  });
  it("warming, wind picking up and sunset", () => {
    const raw = fakeOpenMeteo(D);
    raw.hourly.temperature_2m = raw.hourly.temperature_2m.map((_, i) => 20 + Math.max(0, i - 10));
    raw.hourly.wind_speed_10m = raw.hourly.wind_speed_10m.map((_, i) => (i >= 14 ? 30 : 12));
    const f = normaliseForecast("x", raw);
    const { last, next } = splitRecent(f.hourly, NOW);
    const ins = recentInsights(last, next, `${D}T16:40`, NOW);
    expect(ins.some((x) => x.startsWith("Warming up: from 21°C"))).toBe(true);
    expect(ins.some((x) => x.startsWith("Wind picking up: from about 12 to 30 km/h"))).toBe(true);
    expect(ins.length).toBeLessThanOrEqual(4);
  });
  it("no insights without data", () => {
    const { last, next } = splitRecent([], NOW);
    expect(recentInsights(last, next, null, NOW)).toEqual([]);
  });
});
