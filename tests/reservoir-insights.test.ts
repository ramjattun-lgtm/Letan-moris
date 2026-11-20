import { describe, expect, it } from "vitest";
import { analogues, catchUp, netWater, rainDays, seasonProgress, seasonStart, stormDays, stormShare, summerTrend, type DayRain } from "@/lib/weather/intelligence/reservoir-insights.service";

const today = "2026-11-20";
// 3 mm every day, except year 2026 which is dry (1 mm), and every 10th day of a year rains 25 mm.
const base: DayRain = (d) => {
  if (d >= today) return null;
  const day = Number(d.slice(8, 10));
  if (d.startsWith("2026")) return day === 10 ? 25 : 1;
  return day % 10 === 0 ? 25 : 3;
};

describe("reservoir insights", () => {
  it("season starts on 1 July", () => {
    expect(seasonStart("2026-11-20")).toBe("2026-07-01");
    expect(seasonStart("2027-03-01")).toBe("2026-07-01");
  });

  it("works out how much rain is needed to catch up", () => {
    const c = catchUp(base, today, 1950, { mm: 300, normalMm: 600, pctNormal: 50 })!;
    expect(c.shortMm).toBe(300);
    expect(c.weeks).toBeGreaterThan(5);
    expect(catchUp(base, today, 1950, { mm: 600, normalMm: 600, pctNormal: 100 })).toBeNull();
  });

  it("tracks the wet season against normal", () => {
    const s = seasonProgress(base, today, 1950, 2026)!;
    expect(s.season).toBe("2026–27");
    expect(s.pctSoFar).toBeLessThan(80);
    expect(s.points.length).toBeGreaterThan(50);
    expect(s.points.at(-1)!.now).toBeNull();
    expect(s.stillToComePct).toBeGreaterThan(50);
  });

  it("finds similar past years", () => {
    const a = analogues(base, today, 1950, 100)!;
    expect(a.n).toBe(10);
    expect(a.normalOrWetter).toBe(9); // 2025: its next 3 months run into the dry 2026
  });

  it("counts soaking-rain days and dry spells", () => {
    const r = rainDays(base, today, 1950)!;
    expect(r.soakingDays).toBe(6);
    expect(r.normalSoakingDays).toBeGreaterThan(r.soakingDays);
    expect(r.daysSinceSoaking).toBe(10);
    expect(r.longestDrySpell).toBe(0);
  });

  it("subtracts evaporation", () => {
    const n = netWater(base, () => 2, today, 1950);
    expect(n.m1!.evaporation).toBe(60);
    expect(n.m1!.normalNet).toBeGreaterThan(n.m1!.net);
  });

  it("gives a summer trend and storm share", () => {
    const t = summerTrend(base, 1950, 2026)!;
    expect(t.slopePctPerDecade).toBe(0);
    const days = stormDays([{ name: "X", points: [[-20.3, 57.6, "2000-01-15T00:00", 150]] }], { lat: -20.25, lon: 57.55 });
    expect([...days]).toEqual(["2000-01-15"]);
    const s = stormShare(base, days, 1980, 2026, today)!;
    expect(s.calmSeasons).toBe(s.seasons - 1);
    expect(s.typicalSharePct).toBe(0);
  });
});
