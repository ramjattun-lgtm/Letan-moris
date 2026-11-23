import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { bestDay, planDays } from "@/lib/weather/intelligence/planner";
import { areaTopic, hazardAlerts, rainAlert } from "@/lib/community/area-alerts";
import type { Report } from "@/lib/community/lapli";
import { fakeOpenMeteo } from "./fixtures";

// TEST DATA ONLY.
const FRIDAY = "2026-11-20";

describe("Perfect Day finder", () => {
  it("ranks days for an activity and picks a best day", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const days = planDays(f, "outdoor", FRIDAY);
    expect(days.length).toBeGreaterThan(0);
    expect(days[0].date).toBe(FRIDAY);
    expect(bestDay(days)?.a.verdict).toBe("good");
  });

  it("photography looks at sunrise and sunset", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(FRIDAY));
    const [d] = planDays(f, "photo", FRIDAY);
    expect(d.a.title).toBe("Sunrise / sunset photos");
    expect(d.a.period).toMatch(/sunrise|sunset|^$/);
  });

  it("no best day when every day is poor", () => {
    expect(bestDay([{ date: FRIDAY, daysAhead: 0, a: { id: "outdoor", title: "", verdict: "poor", summary: "", period: "", reasons: [], confidence: "low" } }])).toBeNull();
  });
});

describe("area alerts", () => {
  const hours = (mmAt: Record<number, number>) =>
    Array.from({ length: 72 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 19, 0) + i * 3600e3).toISOString().slice(0, 13);
      return { time: `${d}:00`, mm: mmAt[i] ?? 0 };
    });
  const NOW = "2026-11-20T08:10"; // hour index 32

  it("no alert on a dry day", () => {
    expect(rainAlert("plateau", hours({}), NOW)).toBeNull();
  });

  it("high heavy-rain risk gives a priority-4 alert, sent once per day and level", () => {
    const a = rainAlert("plateau", hours({ 36: 25, 37: 20 }), NOW)!;
    expect(a.priority).toBe(4);
    expect(a.key).toBe("rain-plateau-2026-11-20-high");
    expect(a.title).toContain("Central Plateau");
  });

  it("only corroborated community hazards are sent", () => {
    const now = 1_800_000_000;
    const r = (id: string, dev: string, kind: Report["kind"]): Report => ({ id, loc: "curepipe", kind, time: now - 600, dev });
    expect(hazardAlerts([r("1", "a", "river")], now)).toEqual({});
    const out = hazardAlerts([r("1", "a", "river"), r("2", "b", "river")], now);
    expect(out.plateau?.[0].title).toBe("River rising reported in Curepipe");
    expect(areaTopic("plateau")).toBe("letan-moris-alerts-plateau");
  });
});
