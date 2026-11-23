import { describe, expect, it } from "vitest";
import { score } from "../scripts/lib/accuracy-score.mjs";

// TEST DATA ONLY.
describe("accuracy scoring", () => {
  it("scores clear calls and keeps 'possible' days separate", () => {
    const s = score([
      { fcMm: 5, obsWet: true }, // said likely, rained ✓
      { fcMm: 3, obsWet: false }, // said likely, dry ✗ (false alarm)
      { fcMm: 0.1, obsWet: false }, // said dry, dry ✓
      { fcMm: 0, obsWet: true }, // said dry, rained ✗ (missed)
      { fcMm: 1, obsWet: true }, // possible — not scored as right/wrong
      { fcMm: 0.8, obsWet: false }, // possible
    ])!;
    expect(s.said.likely).toEqual({ days: 2, rained: 1 });
    expect(s.said.dry).toEqual({ days: 2, stayedDry: 1 });
    expect(s.said.possible).toEqual({ days: 2, rained: 1 });
    expect(s.clearCallPct).toBe(50);
    expect(s.missed).toBe(1);
    expect(s.falseAlarms).toBe(1);
  });

  it("light drizzle forecasts no longer count as false alarms", () => {
    const s = score(Array.from({ length: 10 }, () => ({ fcMm: 0.9, obsWet: false })))!;
    expect(s.falseAlarms).toBe(0);
    expect(s.clearCallPct).toBeNull();
  });
});
