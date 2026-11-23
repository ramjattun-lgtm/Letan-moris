import { describe, expect, it } from "vitest";
import { classifyHour, nextHours, nextHoursHeadline } from "@/lib/weather/intelligence/next-hours";
import type { HourlyPoint } from "@/lib/weather/types";

// TEST DATA ONLY.
const hour = (t: string, p: number | null, mm: number | null) => ({ time: t, rainProbability: p, precipitation: mm }) as HourlyPoint;
const day = (rows: [number | null, number | null][]) => rows.map(([p, mm], i) => hour(`2026-11-23T${String(9 + i).padStart(2, "0")}:00`, p, mm));

describe("rain in the next 6 hours", () => {
  it("classifies hours", () => {
    expect(classifyHour({ rainProbability: 70, precipitation: 1.2 })).toBe("likely");
    expect(classifyHour({ rainProbability: 55, precipitation: 0.3 })).toBe("possible"); // light: not "likely"
    expect(classifyHour({ rainProbability: 70, precipitation: 0 })).toBe("possible");
    expect(classifyHour({ rainProbability: 10, precipitation: 0 })).toBe("dry");
    expect(classifyHour({ rainProbability: null, precipitation: null })).toBe("unknown");
  });

  it("starts at the current hour and keeps 6", () => {
    const h = nextHours(day([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]), "2026-11-23T10:25");
    expect(h).toHaveLength(6);
    expect(h[0].label).toBe("Now");
    expect(h[1].label).toBe("11:00");
  });

  it("headlines", () => {
    const dry = nextHours(day([[5, 0], [5, 0], [10, 0], [10, 0], [5, 0], [5, 0]]), "2026-11-23T09:00");
    expect(nextHoursHeadline(dry)).toBe("Dry for the next 6 hours.");
    const wet = nextHours(day([[10, 0], [20, 0], [60, 1.5], [70, 2.5], [10, 0], [5, 0]]), "2026-11-23T09:00");
    expect(nextHoursHeadline(wet)).toBe("Rain likely from about 11:00 (60%) — about 4 mm over 6 hours.");
    const maybe = nextHours(day([[10, 0], [35, 0.1], [20, 0], [10, 0], [5, 0], [5, 0]]), "2026-11-23T09:00");
    expect(nextHoursHeadline(maybe)).toMatch(/^A shower is possible from about 10:00 \(35%\)/);
  });
});

import { rainOutlook } from "@/lib/weather/intelligence/rainfall-intelligence.service";
describe("calibrated rain wording", () => {
  it("a short light shower is 'possible', a solid spell is 'likely'", () => {
    const light = day([[10, 0], [55, 0.3], [10, 0], [5, 0], [5, 0], [5, 0]]);
    expect(rainOutlook(light, "2026-11-23T09:00").headline).toMatch(/^Showers possible/);
    const solid = day([[10, 0], [70, 2], [80, 3], [10, 0], [5, 0], [5, 0]]);
    expect(rainOutlook(solid, "2026-11-23T09:00").headline).toMatch(/^Rain likely/);
  });
});
