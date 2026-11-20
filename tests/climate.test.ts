import { describe, expect, it } from "vitest";
import { analyse } from "../scripts/build-climate.mjs";
import { climateKeyFor, doyIndex, vsNormal } from "@/lib/weather/intelligence/climate.service";
import { getLocality } from "@/data/localities";
import { agreeDay, parseMultiModel } from "@/lib/weather/intelligence/agreement.service";

// TEST DATA ONLY — 30 synthetic years: warm wet summers, cool dry winters, +0.2°C per decade.
function synthDays() {
  const out = [];
  for (let y = 1995; y <= 2024; y++) {
    for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86400000) {
      const d = new Date(t);
      const m = d.getUTCMonth() + 1;
      const summer = m <= 3 || m === 12;
      const warm = (y - 1995) * 0.02;
      out.push({
        date: d.toISOString().slice(0, 10),
        tmax: (summer ? 30 : 25) + warm,
        tmin: (summer ? 23 : 18) + warm,
        rain: summer ? (d.getUTCDate() % 2 ? 6 : 0) : d.getUTCDate() % 5 === 0 ? 2 : 0,
        gust: 40,
        sun: summer ? 7 : 8,
      });
    }
  }
  return out;
}

describe("30-year climate analytics", () => {
  const a = analyse(synthDays());
  it("computes monthly normals", () => {
    expect(a.monthly[0].tmax).toBeGreaterThan(30);
    expect(a.monthly[6].tmax).toBeLessThan(26);
    expect(a.monthly[0].rainyDays).toBe(16); // odd dates in January
  });
  it("computes day-of-year normals for every day", () => {
    expect(a.daily).toHaveLength(366);
    expect(a.daily[15][2]).toBeGreaterThan(40); // mid-January rainy-day chance
  });
  it("finds the warming trend per decade", () => {
    expect(a.trend.tmaxPerDecade).toBe(0.2);
  });
  it("finds records with dates", () => {
    expect(a.records.wettestDay.value).toBe(6);
    expect(a.records.hottestDay.date.startsWith("2024")).toBe(true);
  });
  it("compares El Niño summers with normal", () => {
    expect(a.elNino.summers).toEqual([1998, 2003, 2010, 2016, 2024]);
    expect(a.elNino.rainVsNormalPct).not.toBeNull();
  });
});

describe("climate helpers", () => {
  it("maps places to climate regions", () => {
    expect(climateKeyFor(getLocality("curepipe")!)).toBe("plateau");
    expect(climateKeyFor(getLocality("port-louis")!)).toBe("portlouis");
    expect(climateKeyFor(getLocality("la-ferme")!)).toBe("rodrigues");
    expect(climateKeyFor(getLocality("chamarel")!)).toBe("plateau");
  });
  it("compares with normal", () => {
    expect(vsNormal(30, 27.5)?.label).toBe("2.5°C warmer than the normal temperature");
    expect(vsNormal(27, 27.4)?.label).toBe("Near normal temperature");
    expect(vsNormal(null, 27)).toBeNull();
    expect(doyIndex("2026-01-01")).toBe(0);
    expect(doyIndex("2026-12-31")).toBe(365);
  });
});

describe("models agree?", () => {
  const raw = {
    daily: {
      time: ["2026-11-20", "2026-11-21"],
      precipitation_sum_a: [0.2, 8],
      precipitation_sum_b: [0, 5],
      precipitation_sum_c: [0.4, 0.5],
      temperature_2m_max_a: [29, 27],
      temperature_2m_max_b: [28.5, 26],
      temperature_2m_max_c: [29.2, 30],
    },
  };
  const days = parseMultiModel(raw, ["a", "b", "c"]).map(agreeDay);
  it("agrees on a dry day", () => {
    expect(days[0].rainAgree).toBe(true);
    expect(days[0].label).toBe("Independent weather forecasting models agree: mostly dry");
  });
  it("flags disagreement and temperature spread", () => {
    expect(days[1].rainAgree).toBe(false);
    expect(days[1].label).toBe("Independent weather forecasting models disagree about rain (2 of 3 expect a wet day)");
    expect(days[1].tempSpread).toBe(4);
  });
});
