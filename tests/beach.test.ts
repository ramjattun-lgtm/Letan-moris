import { describe, expect, it } from "vitest";
import { normaliseForecast } from "@/lib/weather/providers/open-meteo.provider";
import { BEACH_FACING, beachHours, beachReason, bestWindow, blockSummary, rating, windSide } from "@/lib/weather/intelligence/beach.service";
import { BEACH_IDS } from "@/data/localities";
import { fakeOpenMeteo } from "./fixtures";

// TEST DATA ONLY.
const D = "2026-11-21";

describe("beach forecast", () => {
  it("every beach has a facing direction", () => {
    for (const id of BEACH_IDS) expect(BEACH_FACING[id]).toBeTypeOf("number");
  });
  it("onshore vs offshore wind", () => {
    expect(windSide(270, 270)).toBe("onshore"); // west wind on a west-facing beach
    expect(windSide(120, 270)).toBe("offshore"); // south-east trade wind on the west coast
    expect(windSide(180, 270)).toBe("cross-shore");
    expect(windSide(null, 270)).toBeNull();
  });
  it("west coast is sheltered from the SE trade wind; east coast gets it onshore", () => {
    const raw = fakeOpenMeteo(D);
    raw.hourly.wind_speed_10m = raw.hourly.wind_speed_10m.map(() => 26);
    raw.hourly.wind_direction_10m = raw.hourly.wind_direction_10m.map(() => 110);
    raw.hourly.apparent_temperature = raw.hourly.apparent_temperature.map(() => 29);
    const f = normaliseForecast("x", raw);
    const west = beachHours(f.hourly, [], BEACH_FACING["flic-en-flac"], D);
    const east = beachHours(f.hourly, [], BEACH_FACING["belle-mare"], D);
    expect(west[6].score!).toBeGreaterThan(east[6].score!);
    expect(beachReason(west)).toContain("sheltered");
    expect(beachReason(east)).toContain("onshore");
  });
  it("rain lowers the score and the best window avoids it", () => {
    const f = normaliseForecast("x", fakeOpenMeteo(D, { 12: [85, 4], 13: [80, 3] }));
    const hs = beachHours(f.hourly, [], 270, D);
    const at = (h: number) => hs.find((x) => x.time.endsWith(`${String(h).padStart(2, "0")}:00`))!;
    expect(at(12).score!).toBeLessThan(at(9).score!);
    const bw = bestWindow(hs)!;
    expect(bw.to <= 12 || bw.from >= 14).toBe(true);
    const blocks = blockSummary(hs);
    expect(blocks.map((b) => b.label)).toEqual(["Morning", "Midday", "Afternoon"]);
    expect(blocks[1].rainProb).toBe(85);
  });
  it("ratings", () => {
    expect(rating(8.5)).toBe("excellent");
    expect(rating(6.2)).toBe("good");
    expect(rating(4)).toBe("fair");
    expect(rating(2)).toBe("poor");
    expect(rating(null)).toBeNull();
  });
});
