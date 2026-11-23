import { describe, expect, it } from "vitest";
import { memoryFacts, stormsNearDate, _test } from "@/lib/weather/intelligence/memory.service";

describe("Weather Memory", () => {
  it("counts days apart ignoring the year, across New Year", () => {
    expect(_test.daysApart("1990-12-30", "2026-01-02")).toBe(3);
    expect(_test.daysApart("2002-02-20", "2026-02-23")).toBe(3);
  });

  it("finds storms close to a date in the real history file", () => {
    // Search every date of the year: at least one should match a storm within 300 km.
    let found = 0;
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d += 3) found += stormsNearDate(`2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, "mauritius").length;
    expect(found).toBeGreaterThan(0);
    for (const s of stormsNearDate("2026-02-20", "mauritius")) expect(s.km).toBeLessThanOrEqual(300);
  });

  it("gives at most 4 facts and always names a source", () => {
    const f = memoryFacts("plateau", "mauritius", "2026-01-06");
    expect(f.length).toBeLessThanOrEqual(4);
    for (const x of f) expect(x.text).toMatch(/IBTrACS|normal|happened this month/);
  });
});
