import { describe, expect, it } from "vitest";
import { buildFacts, factsFor, postable, type Fact } from "@/lib/weather/intelligence/facts.service";
import type { HistStorm } from "@/lib/weather/intelligence/cyclone-climate.service";

describe("did you know", () => {
  it("makes on-this-day cyclone facts and puts them first", () => {
    const storms: HistStorm[] = [];
    for (let y = 1981; y <= 2020; y++)
      storms.push({ sid: `s${y}`, name: y === 2007 ? "GAMEDE" : "X", season: y, maxWindKmh: 160, closest: { mauritius: { km: y === 2007 ? 150 : 900, time: `${y}-02-20T08:00` }, rodrigues: null }, points: [] });
    const all = buildFacts({ today: "2027-02-20", storms });
    const otd = all.filter((f) => f.category === "on-this-day");
    expect(otd).toHaveLength(1);
    expect(otd[0].text).toMatch(/On this day in 2007, GAMEDE passed about 150 km from Mauritius/);
    const list = factsFor(all, { today: "2027-02-20", region: "plateau", island: "mauritius" });
    expect(list[0].category).toBe("on-this-day");
  });
  it("filters by island and rotates daily", () => {
    const all: Fact[] = [
      { id: "a", category: "local", text: "A", source: "s", region: "plateau", island: "mauritius" },
      { id: "b", category: "local", text: "B", source: "s", region: "north", island: "mauritius" },
      { id: "r", category: "local", text: "R", source: "s", region: "rodrigues", island: "rodrigues" },
      { id: "c", category: "how", text: "C", source: "s" },
    ];
    const mu = factsFor(all, { today: "2026-11-20", region: "plateau", island: "mauritius" });
    expect(mu.map((f) => f.id)).not.toContain("r");
    const d1 = factsFor(all, { today: "2026-11-20", region: "north", island: "mauritius" }).map((f) => f.id).join();
    const d2 = factsFor(all, { today: "2026-11-21", region: "north", island: "mauritius" }).map((f) => f.id).join();
    expect(d1).not.toBe(d2);
  });
  it("keeps banned words out of posts", () => {
    expect(postable({ id: "x", category: "how", text: "Follow the official warning", source: "" })).toBe(false);
    expect(postable({ id: "y", category: "how", text: "Trade winds bring rain", source: "" })).toBe(true);
  });
});
