import { describe, expect, it } from "vitest";
import { BEACH_IDS, getLocality, LOCALITIES, nearestLocality, normaliseName, searchLocalities } from "@/data/localities";

describe("localities", () => {
  it("covers both islands", () => {
    expect(LOCALITIES.filter((l) => l.island === "rodrigues").length).toBeGreaterThanOrEqual(10);
    expect(LOCALITIES.filter((l) => l.island === "mauritius").length).toBeGreaterThanOrEqual(40);
  });
  it("has unique ids and valid coordinates", () => {
    const ids = new Set(LOCALITIES.map((l) => l.id));
    expect(ids.size).toBe(LOCALITIES.length);
    for (const l of LOCALITIES) {
      expect(/^[a-z0-9-]+$/.test(l.id)).toBe(true);
      if (l.island === "mauritius") {
        expect(l.lat).toBeGreaterThan(-20.6);
        expect(l.lat).toBeLessThan(-19.9);
        expect(l.lon).toBeGreaterThan(57.2);
        expect(l.lon).toBeLessThan(57.85);
      } else {
        expect(l.lat).toBeGreaterThan(-19.8);
        expect(l.lat).toBeLessThan(-19.6);
        expect(l.lon).toBeGreaterThan(63.3);
        expect(l.lon).toBeLessThan(63.55);
      }
    }
  });
  it("search ignores accents, hyphens and supports Kreol aliases", () => {
    expect(normaliseName("Mahébourg")).toBe("mahebourg");
    expect(searchLocalities("mahebourg")[0].id).toBe("mahebourg");
    expect(searchLocalities("kurpip")[0].id).toBe("curepipe");
    expect(searchLocalities("port mathurin")[0].id).toBe("port-mathurin");
    expect(searchLocalities("flic-en-flac")[0].id).toBe("flic-en-flac");
    expect(searchLocalities("la ferme", "mauritius")).toHaveLength(0);
  });
  it("finds the nearest place for device location", () => {
    expect(nearestLocality(-20.317, 57.525).id).toBe("curepipe");
    expect(nearestLocality(-19.684, 63.42).id).toBe("port-mathurin");
  });
  it("all beach profiles exist, including Rodrigues", () => {
    for (const id of BEACH_IDS) expect(getLocality(id)).toBeDefined();
    expect(BEACH_IDS.some((id) => getLocality(id)!.island === "rodrigues")).toBe(true);
  });
});
