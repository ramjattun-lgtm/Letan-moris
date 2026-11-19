import { describe, expect, it } from "vitest";
import { parseMetar, summariseAccuracy } from "@/lib/weather/intelligence/accuracy.service";
import { addMinutes, bestDeparture, departureOptions, tripMinutes, waypoints } from "@/lib/weather/intelligence/drive.service";
import { getLocality } from "@/data/localities";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { fakeOpenMeteo } from "./fixtures";

// TEST DATA ONLY.
describe("forecast accuracy check", () => {
  it("rain matched and temperature error", () => {
    const s = summariseAccuracy([
      { time: "a", forecastMm: 1, actualMm: 2, forecastTemp: 25, actualTemp: 24 },
      { time: "b", forecastMm: 0, actualMm: 0, forecastTemp: 26, actualTemp: 26.5 },
      { time: "c", forecastMm: 0.5, actualMm: 0, forecastTemp: 26, actualTemp: 27 },
    ])!;
    expect(s.rainMatchPct).toBe(67);
    expect(s.tempErrAvg).toBe(0.8);
    expect(s.verdict).toBe("Rain was forecast, and it rained.");
  });
  it("missed rain", () => {
    const s = summariseAccuracy([{ time: "a", forecastMm: 0, actualMm: 3, forecastTemp: null, actualTemp: null }])!;
    expect(s.verdict).toBe("It rained, but the forecast expected dry weather.");
    expect(s.rainMatchPct).toBe(0);
  });
  it("no data → null", () => {
    expect(summariseAccuracy([{ time: "a", forecastMm: null, actualMm: null, forecastTemp: null, actualTemp: null }])).toBeNull();
  });
  it("parses airport reports and detects rain", () => {
    const obs = parseMetar([
      { obsTime: 1800000000, temp: 26, wxString: "-SHRA", rawOb: "FIMP 191000Z 12015KT 9999 -SHRA FEW018 26/22 Q1016" },
      { obsTime: 1800001800, temp: 27, wxString: "", rawOb: "FIMP 191030Z 12014KT 9999 FEW020 27/21 Q1016" },
    ]);
    expect(obs).toHaveLength(2);
    expect(obs[0].rain).toBe(true);
    expect(obs[1].rain).toBe(false);
  });
});

describe("drive planner", () => {
  it("routes through places on the way and estimates time", () => {
    const a = getLocality("port-louis")!;
    const b = getLocality("mahebourg")!;
    const r = waypoints(a, b);
    expect(r[0].id).toBe("port-louis");
    expect(r.at(-1)!.id).toBe("mahebourg");
    expect(r.length).toBeGreaterThan(2);
    expect(tripMinutes(a, b)).toBeGreaterThan(40);
  });
  it("recommends the driest departure", () => {
    const a = getLocality("port-louis")!;
    const b = getLocality("curepipe")!;
    const route = waypoints(a, b);
    const D = "2026-11-20";
    const fcs = Object.fromEntries(route.map((p) => [p.id, normaliseForecast(p.id, fakeOpenMeteo(D, { 10: [90, 4], 11: [80, 3] }))]));
    const opts = departureOptions(route, fcs, `${D}T09:10`, 4);
    expect(opts[0].depart).toBe(`${D}T09:30`);
    const best = bestDeparture(opts)!;
    expect(best.maxRainProb).toBeLessThan(30);
    expect(opts.find((o) => o.depart === `${D}T10:00`)!.maxRainProb).toBe(90);
    expect(addMinutes("2026-11-20T23:50", 20)).toBe("2026-11-21T00:10");
  });
});
