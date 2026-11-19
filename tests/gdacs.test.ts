import { describe, expect, it } from "vitest";
import { bearing, distanceKm, MAURITIUS, parseGdacs, RODRIGUES } from "@/lib/weather/providers/gdacs.provider";

// TEST DATA ONLY — shaped like the GDACS event list (GeoJSON).
const feature = (name: string, lon: number, lat: number, extra: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { eventtype: "TC", eventid: name, name, iscurrent: "true", alertlevel: "Green", severitydata: { severity: 150, severityunit: "km/h" }, url: { report: "https://www.gdacs.org/report.aspx" }, todate: new Date().toISOString(), ...extra },
});

describe("GDACS cyclone parsing", () => {
  it("keeps only current tropical systems in the South-West Indian Ocean, nearest first", () => {
    const raw = { features: [feature("FAR", 80, -12), feature("NEAR", 59, -18), feature("ATLANTIC", -40, 15), feature("OLD", 60, -20, { iscurrent: "false", todate: "2020-01-01" })] };
    const s = parseGdacs(raw);
    expect(s.map((x) => x.name)).toEqual(["NEAR", "FAR"]);
    expect(s[0].maxWindKmh).toBe(150);
    expect(s[0].bearingFrom.mauritius).toBe("NNE");
  });
  it("returns no systems for empty or malformed data", () => {
    expect(parseGdacs({})).toEqual([]);
    expect(parseGdacs(null)).toEqual([]);
  });
  it("computes the Mauritius–Rodrigues distance correctly (~600 km)", () => {
    const d = distanceKm(MAURITIUS, RODRIGUES);
    expect(d).toBeGreaterThan(560);
    expect(d).toBeLessThan(640);
    expect(bearing(MAURITIUS, RODRIGUES)).toBe("E");
  });
});
