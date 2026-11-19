import { describe, expect, it } from "vitest";
import { cooldownLeft, parseReports, summariseByPlace, upwindAlert } from "@/lib/community/lapli";
import { getLocality } from "@/data/localities";

// TEST DATA ONLY — shaped like ntfy.sh's newline-delimited JSON poll response.
const NOW = 1_800_000_000;
const ev = (loc: string, kind: string, minsAgo: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ id: `${loc}-${minsAgo}`, time: NOW - minsAgo * 60, event: "message", topic: "t", message: JSON.stringify({ v: 1, loc, kind }), ...extra });

describe("Lapli isi! reports", () => {
  it("keeps only valid, recent reports", () => {
    const nd = [
      ev("curepipe", "heavy", 10),
      ev("curepipe", "light", 200), // too old
      ev("atlantis", "light", 5), // unknown place
      ev("curepipe", "tsunami", 5), // invalid kind
      JSON.stringify({ event: "open", time: NOW }),
      "not json",
      ev("flacq-typo", "light", 5),
    ].join("\n");
    const r = parseReports(nd, NOW);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ loc: "curepipe", kind: "heavy" });
  });
  it("groups by place, takes the most serious recent kind, and 'stopped' cancels", () => {
    const r = parseReports([ev("curepipe", "light", 20), ev("curepipe", "heavy", 12), ev("moka", "heavy", 40), ev("moka", "stopped", 5)].join("\n"), NOW);
    const s = summariseByPlace(r, NOW);
    const cure = s.find((x) => x.loc.id === "curepipe")!;
    expect(cure.kind).toBe("heavy");
    expect(cure.count).toBe(2);
    expect(cure.minutesAgo).toBe(12);
    expect(s.find((x) => x.loc.id === "moka")!.kind).toBe("stopped");
  });
  it("upwind alert: rain reported south-east with a south-east trade wind reaches the plateau", () => {
    const places = summariseByPlace(parseReports([ev("rose-belle", "heavy", 5)].join("\n"), NOW), NOW);
    const you = getLocality("curepipe")!;
    const a = upwindAlert(you, places, 115, 20)!;
    expect(a).not.toBeNull();
    expect(a.place).toBe("Rose-Belle");
    expect(a.heavy).toBe(true);
    expect(a.etaMin[0]).toBeLessThan(a.etaMin[1]);
  });
  it("no alert when the rain is downwind or the wind is calm", () => {
    const places = summariseByPlace(parseReports([ev("flic-en-flac", "heavy", 5)].join("\n"), NOW), NOW);
    const you = getLocality("curepipe")!;
    expect(upwindAlert(you, places, 115, 20)).toBeNull(); // Flic en Flac is west = downwind
    expect(upwindAlert(you, places, 270, 2)).toBeNull(); // calm
  });
  it("device cooldown", () => {
    expect(cooldownLeft(0, 10 * 60_000)).toBe(0);
    expect(cooldownLeft(60_000, 4 * 60_000)).toBe(7);
  });
});
