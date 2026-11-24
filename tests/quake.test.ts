import { describe, expect, it } from "vitest";
import { notableQuakes, type UsgsFeature } from "@/lib/weather/intelligence/quake.service";
import { quakeAlert } from "@/lib/community/area-alerts";
import { tr } from "@/lib/i18n";

// TEST DATA ONLY.
const NOW = Date.parse("2026-11-24T12:00:00Z");
const f = (id: string, mag: number, lon: number, lat: number, depth: number, hoursAgo: number): UsgsFeature => ({
  id,
  properties: { mag, place: `test ${id}`, time: NOW - hoursAgo * 3600e3, url: "https://example.org", tsunami: 0 },
  geometry: { coordinates: [lon, lat, depth] },
});

describe("strong Indian Ocean earthquakes", () => {
  it("keeps strong, shallow, recent quakes in the Indian Ocean only", () => {
    const q = notableQuakes(
      [
        f("sumatra", 7.8, 95.9, 3.3, 30, 1), // ✓
        f("small", 6.0, 95.9, 3.3, 30, 1), // too weak
        f("deep", 7.0, 120, -7, 550, 1), // too deep
        f("pacific", 8.0, 142, 38, 20, 1), // not Indian Ocean
        f("old", 7.5, 60, -30, 10, 20), // older than 12 h
      ],
      NOW,
    );
    expect(q.map((x) => x.id)).toEqual(["sumatra"]);
    expect(q[0].kmFromMauritius).toBeGreaterThan(4000);
  });

  it("the phone alert says check MMS, never that a tsunami is coming", () => {
    const [q] = notableQuakes([f("sumatra", 7.8, 95.9, 3.3, 30, 1)], NOW);
    const a = quakeAlert(q, "plateau");
    expect(a.priority).toBe(5);
    expect(a.body).toContain("only from MMS");
    expect(`${a.title} ${a.body}`).not.toMatch(/tsunami (is )?coming|wave height|will arrive/i);
  });

  it("is translated", () => {
    expect(tr("Strong earthquake: magnitude 7.8, off Sumatra, at 14:05, 24 Nov", {}, "fr")).toBe("Fort séisme : magnitude 7.8, off Sumatra, à 14:05, 24 Nov");
    expect(tr("Tsunami warnings come only from MMS — check MMS, radio and TV now.", {}, "mfe")).toContain("MMS");
  });
});
