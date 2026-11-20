import { describe, expect, it } from "vitest";
import { FLOOD_SITES, floodSitesNear, siteRisks } from "@/data/flood-sites";
import { getLocality } from "@/data/localities";
import type { MapPoint } from "@/lib/weather/types";

const pt = (id: string, rainRisk: MapPoint["rainRisk"]): MapPoint => ({ locationId: id, rainProbNext3h: null, rainNext3h: null, temperature: null, windSpeed: null, windDirection: null, cloudCover: null, rainRisk });

describe("LDMP flood-prone sites", () => {
  it("lists every modelled sector once", () => {
    expect(FLOOD_SITES).toHaveLength(17);
    expect(new Set(FLOOD_SITES.map((s) => s.id)).size).toBe(17);
    for (const s of FLOOD_SITES) {
      expect(s.lat).toBeLessThan(-19.9);
      expect(s.lat).toBeGreaterThan(-20.55);
    }
  });

  it("finds sites near a place", () => {
    const flic = getLocality("flic-en-flac")!;
    expect(floodSitesNear(flic).map((s) => s.id)).toContain("S65");
    const curepipe = getLocality("curepipe")!;
    expect(floodSitesNear(curepipe).map((s) => s.id)).toContain("S86");
  });

  it("takes risk from the nearest forecast point and sorts high first", () => {
    const r = siteRisks([pt("flic-en-flac", "high"), pt("grand-baie", "low"), pt("port-louis", "moderate")]);
    expect(r[0].id).toBe("S65");
    expect(r.find((s) => s.id === "S73")?.risk).toBe("moderate");
    expect(r.find((s) => s.id === "S5-6")?.risk).toBe("low");
    // Bel Ombre is >12 km from every given point → unknown, not "low"
    expect(r.find((s) => s.id === "S32")?.risk).toBeNull();
  });
});
