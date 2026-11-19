import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { assessDay, windows } from "@/lib/weather/intelligence/decision-engine.service";
import { fakeOpenMeteo } from "./fixtures";

const FRIDAY = "2026-11-20";
const SATURDAY = "2026-11-21";

describe("decision engine", () => {
  it("dry day: good laundry window and outdoor activities", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const a = assessDay(f.hourly, f.daily, FRIDAY, 0);
    const laundry = a.find((x) => x.id === "laundry")!;
    expect(laundry.verdict).toBe("good");
    expect(laundry.summary).toContain("08:00–17:00");
    expect(a.find((x) => x.id === "outdoor")!.verdict).toBe("good");
  });

  it("afternoon rain: advises doing outdoor tasks earlier and flags the school run", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY, { 13: [80, 3], 14: [85, 4], 15: [70, 2], 16: [65, 1] }));
    const a = assessDay(f.hourly, f.daily, FRIDAY, 0);
    expect(a.find((x) => x.id === "general")!.summary).toContain("afternoon");
    const school = a.find((x) => x.id === "school")!;
    expect(school.verdict).toBe("poor");
    expect(school.reasons.join(" ")).toContain("85%");
  });

  it("only shows the school run on weekdays", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(SATURDAY));
    expect(assessDay(f.hourly, f.daily, SATURDAY, 0).some((x) => x.id === "school")).toBe(false);
  });

  it("beach advice always separates weather from sea safety and flags high UV", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const beach = assessDay(f.hourly, f.daily, FRIDAY, 0).find((x) => x.id === "beach")!;
    expect(beach.reasons.join(" ")).toContain("does not mean the sea is safe");
    expect(beach.summary).toContain("UV very high");
  });

  it("returns 'unknown' rather than guessing when data is missing", () => {
    const raw = fakeOpenMeteo(FRIDAY);
    raw.hourly.precipitation_probability = raw.hourly.precipitation_probability.map(() => null as unknown as number);
    const f = normaliseForecast("x", raw);
    const a = assessDay(f.hourly, f.daily, FRIDAY, 0);
    expect(a.find((x) => x.id === "laundry")!.verdict).toBe("unknown");
    expect(a.find((x) => x.id === "school")!.verdict).toBe("unknown");
  });

  it("lowers confidence for days further ahead", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    expect(assessDay(f.hourly, f.daily, FRIDAY, 5).every((x) => x.confidence === "low")).toBe(true);
  });

  it("finds the longest run of good hours", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY, { 12: [90, 5] }));
    const day = f.hourly.filter((h) => h.time.startsWith(FRIDAY) && Number(h.time.slice(11, 13)) >= 7 && Number(h.time.slice(11, 13)) < 18);
    const w = windows(day, (h) => (h.rainProbability ?? 100) < 30);
    expect(w[0]).toEqual({ from: 7, to: 12, len: 5 });
    expect(w[1]).toEqual({ from: 13, to: 18, len: 5 });
  });
});

describe("new activity cards", () => {
  it("kitesurf: too light with 15 km/h, good with steady 30 km/h", () => {
    const calm = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    expect(assessDay(calm.hourly, calm.daily, FRIDAY, 0).find((a) => a.id === "kitesurf")!.summary).toContain("Too light");
    const raw = fakeOpenMeteo(FRIDAY);
    raw.hourly.wind_speed_10m = raw.hourly.wind_speed_10m.map(() => 30);
    raw.hourly.wind_gusts_10m = raw.hourly.wind_gusts_10m.map(() => 40);
    const windy = normaliseForecast("x", raw);
    expect(assessDay(windy.hourly, windy.daily, FRIDAY, 0).find((a) => a.id === "kitesurf")!.verdict).toBe("good");
  });
  it("hiking: low cloud on the hills means no good window", () => {
    const raw = fakeOpenMeteo(FRIDAY);
    raw.hourly.cloud_cover_low = raw.hourly.cloud_cover_low.map(() => 95);
    const f = normaliseForecast("x", raw);
    expect(assessDay(f.hourly, f.daily, FRIDAY, 0).find((a) => a.id === "hiking")!.verdict).toBe("poor");
  });
  it("solar: estimates sunlight and output from radiation", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const s = assessDay(f.hourly, f.daily, FRIDAY, 0).find((a) => a.id === "solar")!;
    expect(s.summary).toMatch(/about \d+(\.\d)? kWh of sunlight per m²/);
    expect(s.verdict).not.toBe("unknown");
  });
  it("boating: calm wind gives a window and always points to the Sea page", () => {
    const raw = fakeOpenMeteo(FRIDAY);
    raw.hourly.wind_gusts_10m = raw.hourly.wind_gusts_10m.map(() => 25);
    const f = normaliseForecast("x", raw);
    const b = assessDay(f.hourly, f.daily, FRIDAY, 0).find((a) => a.id === "boating")!;
    expect(b.verdict).toBe("good");
    expect(b.summary).toContain("Sea page");
  });
});

describe("laundry drying time", () => {
  it("estimates when a load will be dry on a sunny day", async () => {
    const { dryingTime } = await import("@/lib/weather/intelligence/drying.service");
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const d = dryingTime(f.hourly, FRIDAY, 9)!;
    expect(d.dryBy).not.toBeNull();
    expect(d.hours!).toBeGreaterThanOrEqual(2);
    expect(d.hours!).toBeLessThanOrEqual(6);
    const laundry = assessDay(f.hourly, f.daily, FRIDAY, 0).find((a) => a.id === "laundry")!;
    expect(laundry.summary).toMatch(/dry by about \d\d:\d\d/);
  });
  it("rain stops drying", async () => {
    const { dryingTime } = await import("@/lib/weather/intelligence/drying.service");
    const raw = fakeOpenMeteo(FRIDAY);
    raw.hourly.relative_humidity_2m = raw.hourly.relative_humidity_2m.map(() => 95);
    raw.hourly.shortwave_radiation = raw.hourly.shortwave_radiation.map(() => 50);
    const f = normaliseForecast("x", raw);
    expect(dryingTime(f.hourly, FRIDAY, 9)!.dryBy).toBeNull();
  });
});

describe("cyclone mode", () => {
  it("turns on for a nearby system and stays off otherwise", async () => {
    const { cycloneMode } = await import("@/lib/weather/intelligence/cyclone-mode.service");
    const base = { source: { text: "", url: "" }, checkedAt: "", ok: true };
    const sys = (km: number) => ({ id: "1", name: "TEST", alertLevel: null, description: null, lat: -18, lon: 60, maxWindKmh: 120, fromDate: null, toDate: null, reportUrl: null, geometryUrl: null, distanceKm: { mauritius: km, rodrigues: km }, bearingFrom: { mauritius: "NE", rodrigues: "W" }, closest: { mauritius: { km, bearing: "NE", time: null }, rodrigues: null } });
    expect(cycloneMode("mauritius", { ...base, systems: [sys(300)] }).active).toBe(true);
    expect(cycloneMode("mauritius", { ...base, systems: [sys(1500)] }).active).toBe(false);
    expect(cycloneMode("mauritius", null).active).toBe(false);
  });
});
