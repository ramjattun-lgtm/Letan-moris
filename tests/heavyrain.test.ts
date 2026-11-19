import { describe, expect, it } from "vitest";
import { assessHeavyRain, type RainHour } from "@/lib/weather/intelligence/heavy-rain.service";
import { addHours } from "@/lib/time";

// TEST DATA ONLY.
const NOW = "2026-01-20T10:20";
function hours(past: number[], next: number[]): RainHour[] {
  const out: RainHour[] = [];
  past.forEach((mm, i) => out.push({ time: addHours("2026-01-20T10:00", -past.length + i), mm }));
  next.forEach((mm, i) => out.push({ time: addHours("2026-01-20T10:00", i), mm }));
  return out;
}
const zeros = (n: number) => Array(n).fill(0);

describe("heavy-rain risk", () => {
  it("low on a dry day", () => {
    const a = assessHeavyRain(hours(zeros(48), zeros(24)), NOW);
    expect(a.level).toBe("low");
    expect(a.summary).toContain("Sudden local downpours");
  });
  it("high when one hour brings 25 mm, with the time", () => {
    const next = zeros(24);
    next[5] = 25;
    const a = assessHeavyRain(hours(zeros(48), next), NOW);
    expect(a.level).toBe("high");
    expect(a.max1h).toEqual({ mm: 25, time: "2026-01-20T15:00" });
    expect(a.summary).toContain("heaviest around 15:00");
  });
  it("moderate from a steady 3-hour soak", () => {
    const next = zeros(24);
    next[2] = next[3] = next[4] = 7;
    expect(assessHeavyRain(hours(zeros(48), next), NOW).level).toBe("moderate");
  });
  it("wet ground raises the risk", () => {
    const next = Array(24).fill(1.8); // 43 mm in 24 h, gentle
    expect(assessHeavyRain(hours(zeros(48), next), NOW).level).toBe("moderate");
    expect(assessHeavyRain(hours(Array(48).fill(1.2), next), NOW).level).toBe("high");
  });
  it("returns no level when data is missing (never guesses)", () => {
    const a = assessHeavyRain(hours([], Array(24).fill(null)), NOW);
    expect(a.level).toBeNull();
  });
});
