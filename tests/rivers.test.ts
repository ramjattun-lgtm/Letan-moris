import { describe, expect, it } from "vitest";
import { assessRiver } from "@/lib/weather/intelligence/river.service";
import { RIVERS } from "@/data/rivers";
import { getLocality } from "@/data/localities";
import { FLOOD_SITES } from "@/data/flood-sites";

const hours = (past: number[], next: number[]) => {
  const out: { time: string; mm: number | null }[] = [];
  past.forEach((mm, i) => out.push({ time: `2026-12-10T${String(9 + i).padStart(2, "0")}:00`, mm }));
  next.forEach((mm, i) => out.push({ time: `2026-12-10T${String(12 + i).padStart(2, "0")}:00`, mm }));
  return out;
};

describe("river watch", () => {
  it("rates rain upstream", () => {
    expect(assessRiver(hours([0, 0, 1], [0, 1, 0, 0, 0, 0]), "up", "down", "2026-12-10T12:20").level).toBe("low");
    expect(assessRiver(hours([4, 5, 4], [2, 1, 0, 0, 0, 0]), "up", "down", "2026-12-10T12:20").level).toBe("moderate");
    const hi = assessRiver(hours([10, 15, 12], [5, 2, 0, 0, 0, 0]), "the hills", "Port Louis", "2026-12-10T12:20");
    expect(hi.level).toBe("high");
    expect(hi.past3h).toBe(37);
    expect(hi.message).toMatch(/even if it is dry there/);
  });
  it("has valid downstream places and flood sites", () => {
    for (const r of RIVERS) {
      for (const d of r.downstream) expect(getLocality(d), `${r.id} → ${d}`).toBeTruthy();
      for (const f of r.floodSites ?? []) expect(FLOOD_SITES.some((s) => s.id === f), `${r.id} → ${f}`).toBe(true);
    }
  });
});
