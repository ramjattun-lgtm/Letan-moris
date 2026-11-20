import { describe, expect, it } from "vitest";
import {
  averagedHistory,
  catchmentReport,
  compare,
  historySum,
  monthlyOutlook,
  pastWindows,
  shiftYear,
  weeklyOutlook,
  type RainHistory,
} from "@/lib/weather/intelligence/reservoir.service";
import { compareFrom, RESERVOIRS } from "@/data/reservoirs";
import { addDays } from "@/lib/time";

const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Every day rains `mmFor(year)` mm. */
function hist(ids: string[], from: number, to: number, mmFor: (y: number) => number): RainHistory {
  const rain: RainHistory["rain"] = {};
  for (const id of ids) {
    rain[id] = {};
    for (let y = from; y <= to; y++) rain[id][String(y)] = Array(leap(y) ? 366 : 365).fill(Math.round(mmFor(y) * 10));
  }
  return { builtAt: "x", start: from, end: to, rain };
}

describe("reservoir catchment rain", () => {
  it("shifts 29 Feb safely", () => {
    expect(shiftYear("2024-02-29", -1)).toBe("2023-02-28");
    expect(shiftYear("2026-11-20", -10)).toBe("2016-11-20");
  });

  it("sums a window across a year boundary", () => {
    const h = hist(["a"], 2000, 2001, () => 2);
    expect(historySum(h, "a", "2000-12-30", "2001-01-02")).toBe(8);
    expect(historySum(h, "a", "2001-12-30", "2002-01-02")).toBeNull();
  });

  it("only compares years after the reservoir was built", () => {
    const h = hist(["a"], 1950, 2025, () => 1);
    const w = pastWindows(h, "a", "2026-05-22", "2026-11-19", 2003);
    expect(Math.min(...w.map((x) => x.year))).toBe(2003);
    expect(w).toHaveLength(23);
    expect(compareFrom(RESERVOIRS.find((r) => r.id === "midlands")!)).toBe(2003);
    expect(compareFrom(RESERVOIRS.find((r) => r.id === "mare-aux-vacoas")!)).toBe(1950);
    expect(compareFrom(RESERVOIRS.find((r) => r.id === "bagatelle")!)).toBe(2018);
  });

  it("gives % of normal, trend and 'driest since'", () => {
    const past = Array.from({ length: 20 }, (_, i) => ({ year: 2025 - i, mm: 100 }));
    past.find((p) => p.year === 2009)!.mm = 40;
    const c = compare(50, past);
    expect(c.pctNormal).toBe(50);
    expect(c.trend).toBe("much-drier");
    expect(c.rank).toBe("Driest since 2009");
    expect(c.drierYears).toBe(1);
    expect(compare(10, past).rank).toMatch(/Driest since records began/);
    expect(compare(100, past.slice(0, 3)).pctNormal).toBeNull(); // too few years
  });

  it("builds a report, filling recent days from the forecast model", () => {
    const today = "2026-11-20";
    const h = hist(["a"], 1950, 2025, () => 4);
    const rea: Record<string, number | null> = {};
    const mod: Record<string, number | null> = {};
    for (let i = -190; i < 7; i++) {
      const d = addDays(today, i);
      if (i < -5) rea[d] = 2;
      else if (i < 0) rea[d] = null;
      mod[d] = 2;
    }
    const r = catchmentReport(h, "a", 1950, rea, mod, today);
    expect(r.filledDays).toBe(5);
    expect(r.past.d7.mm).toBe(14);
    expect(r.past.d7.pctNormal).toBe(50);
    expect(r.past.m6.trend).toBe("much-drier");
    expect(r.next7?.mm).toBe(14);
  });

  it("averages catchments for the island view", () => {
    const h = { ...hist(["a"], 2000, 2001, () => 2), rain: { ...hist(["a"], 2000, 2001, () => 2).rain, ...hist(["b"], 2000, 2001, () => 4).rain } };
    expect(historySum(averagedHistory(h, ["a", "b"]), "all", "2001-01-01", "2001-01-01")).toBe(3);
  });

  it("reads the long-range outlook as % of the model's own normal", () => {
    const raw = {
      weekly: { time: ["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14"], precipitation_mean: [10, 10, 10, 10, 10], precipitation_anomaly: [-10, -10, -10, -10, 0], precipitation_anomaly_gt0: [0.2, 0.3, 0.3, 0.4, 0.5] },
      monthly: {
        time: ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01", "2027-05-01"],
        precipitation_mean: [5, 6, 8, 8, 8, 4, 3],
        precipitation_anomaly: [0, -2, 0, 0, 0, 0, 1],
      },
    };
    const w = weeklyOutlook(raw, "2026-11-20")!;
    expect(w.pctNormal).toBe(50);
    expect(w.wetterChance).toBe(30);
    const m = monthlyOutlook(raw, "2026-11-20")!;
    expect(m.months.map((x) => x.label)).toEqual(["Dec", "Jan", "Feb", "Mar", "Apr", "May"]);
    expect(m.months[0].pctNormal).toBe(75);
    expect(m.total.label).toBe("Dec–May");
    expect(weeklyOutlook({}, "2026-11-20")).toBeNull();
  });
});

import { rainShare } from "@/lib/weather/intelligence/reservoir.service";
describe("rain share", () => {
  it("computes volumes and the catchments' share", () => {
    const s = rainShare([{ mm: 100, km2: 50 }, { mm: 200, km2: 40 }], 50)!;
    expect(s.catchmentMm3).toBe(13); // (100*50 + 200*40)/1000
    expect(s.islandMm3).toBe(93.3); // 50*1865/1000
    expect(s.pct).toBe(13.9);
    expect(s.areaPct).toBe(4.8);
    expect(rainShare([{ mm: 1, km2: 1 }], 0)).toBeNull();
  });
});
