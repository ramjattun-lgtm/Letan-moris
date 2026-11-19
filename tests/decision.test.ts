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
