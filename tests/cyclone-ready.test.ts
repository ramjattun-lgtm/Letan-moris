import { describe, expect, it } from "vitest";
import { readyLines } from "@/lib/weather/intelligence/cyclone-mode.service";

// TEST DATA ONLY.
const fmt = (l: string) => l.replace("T", " ");
describe("Cyclone-ready card", () => {
  it("nothing when cyclone mode is off", () => {
    expect(readyLines({ active: false, official: false, headline: "" }, null, null, fmt)).toEqual([]);
  });
  it("gives closest approach, be-ready time, gusts and rain, and always defers to MMS", () => {
    const lines = readyLines(
      { active: true, official: false, headline: "X", systemName: "TEST" },
      { km: 220, timeLocal: "2026-02-10T14:00", bearing: "north-east" },
      { peakGust: { kmh: 95, time: "2026-02-10T15:00" }, totalRainMm: 140, prepareBy: "2026-02-10T01:00" },
      fmt,
    );
    expect(lines[0]).toContain("220 km to the north-east");
    expect(lines[1]).toContain("Be ready by 2026-02-10 01:00");
    expect(lines.join(" ")).toContain("95 km/h");
    expect(lines.at(-1)).toContain("MMS");
  });
});
