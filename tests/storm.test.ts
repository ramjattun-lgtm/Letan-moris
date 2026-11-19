import { describe, expect, it } from "vitest";
import { closestApproach, MAURITIUS, parseTrack, RODRIGUES } from "@/lib/weather/providers/gdacs.provider";
import { stormImpact } from "@/lib/weather/intelligence/storm-impact.service";
import type { HourlyPoint } from "@/lib/weather/types";

// TEST DATA ONLY — a made-up storm moving south-west towards the Mascarenes.
const pt = (lon: number, lat: number, time: string, actual: boolean) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { Class: actual ? "Point_Centroid" : "Point_Forecast", trackdate: time, actual: actual ? "True" : "False", wind_speed: 140 },
});
const geo = {
  type: "FeatureCollection",
  features: [
    pt(64, -14, "2026-02-01T00:00:00", true),
    pt(62, -15.5, "2026-02-01T12:00:00", true),
    pt(60, -17, "2026-02-02T00:00:00", false),
    pt(58, -19, "2026-02-02T12:00:00", false),
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[57, -20], [61, -16], [62, -17], [58, -21], [57, -20]]] }, properties: { Class: "Poly_Cones" } },
    { type: "Feature", geometry: { type: "Polygon", coordinates: [[[59, -18], [61, -16], [61, -18], [59, -18]]] }, properties: { Class: "Poly_Red" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[64, -14], [58, -19]] }, properties: { Class: "Line_Line_0" } },
  ],
};

describe("storm track", () => {
  it("separates observed and forecast positions, cone and wind areas", () => {
    const t = parseTrack(geo);
    expect(t.points).toHaveLength(4);
    expect(t.points.filter((p) => p.observed)).toHaveLength(2);
    expect(t.points[0].time).toBe("2026-02-01T00:00:00.000Z");
    expect(t.cone).toHaveLength(1);
    expect(t.windBands).toHaveLength(1);
    expect(t.lines).toHaveLength(1);
  });

  it("finds the closest approach with interpolation in time", () => {
    const t = parseTrack(geo);
    const c = closestApproach(t.points, MAURITIUS, new Date("2026-02-01T00:00:00Z"))!;
    expect(c.km).toBeGreaterThan(130);
    expect(c.km).toBeLessThan(160);
    expect(c.time).toBe("2026-02-02T12:00:00.000Z");
    const r = closestApproach(t.points, RODRIGUES, new Date("2026-02-01T00:00:00Z"))!;
    expect(r.km).toBeGreaterThan(200);
  });

  it("handles empty or unknown geometry safely", () => {
    expect(parseTrack({}).points).toEqual([]);
    expect(closestApproach([], MAURITIUS)).toBeNull();
  });
});

describe("what it means for my place", () => {
  const hours: HourlyPoint[] = Array.from({ length: 72 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 1, 1, i));
    const time = d.toISOString().slice(0, 16);
    return { time, temperature: 26, feelsLike: 28, humidity: 85, rainProbability: 80, precipitation: 2, weatherCode: 63, cloudCover: 100, windSpeed: 40, windDirection: 90, windGusts: i < 30 ? 40 : i === 40 ? 110 : 70, uvIndex: 1 };
  });
  it("gives the peak gust, total rain and a preparation time 12 hours before strong gusts", () => {
    const m = stormImpact(hours, undefined, "2026-02-01T00:00");
    expect(m.peakGust).toEqual({ kmh: 110, time: "2026-02-02T16:00" });
    expect(m.firstStrongGust).toBe("2026-02-02T06:00");
    expect(m.prepareBy).toBe("2026-02-01T18:00");
    expect(m.totalRainMm).toBe(144);
  });
});
