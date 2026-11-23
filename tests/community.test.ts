import { afterEach, describe, expect, it, vi } from "vitest";
import { independentReporters, isHazard, isValidKind, summariseByPlace, summariseHazards, type Report } from "@/lib/community/lapli";

// TEST DATA ONLY.
const NOW = 1_800_000_000;
const r = (id: string, loc: string, kind: Report["kind"], minsAgo: number, dev?: string, likes = 0): Report => ({ id, loc, kind, time: NOW - minsAgo * 60, dev, likes });

describe("community report categories", () => {
  it("accepts the new hazard kinds and rejects others", () => {
    expect(isValidKind("river")).toBe(true);
    expect(isValidKind("tree")).toBe(true);
    expect(isValidKind("sea")).toBe(true);
    expect(isValidKind("photo")).toBe(false);
    expect(isHazard("river")).toBe(true);
    expect(isHazard("heavy")).toBe(false);
  });

  it("hazards never appear in the rain summary", () => {
    const places = summariseByPlace([r("1", "curepipe", "tree", 5), r("2", "curepipe", "light", 5)], NOW);
    expect(places).toHaveLength(1);
    expect(places[0].kind).toBe("light");
  });
});

describe("corroboration", () => {
  it("counts different phones within 5 km, not the same phone twice", () => {
    const all = [r("1", "curepipe", "river", 10, "aaaa"), r("2", "curepipe", "river", 30, "aaaa"), r("3", "curepipe", "river", 20, "bbbb")];
    expect(independentReporters(all[0], all)).toBe(2);
  });

  it("a single phone is not corroborated; likes do not change that", () => {
    const all = [r("1", "curepipe", "tree", 10, "aaaa", 25)];
    const [h] = summariseHazards(all, NOW);
    expect(h.reporters).toBe(1);
    expect(h.corroborated).toBe(false);
    expect(h.likes).toBe(25);
  });

  it("different hazards do not agree, and far-away places do not count", () => {
    const all = [r("1", "curepipe", "tree", 10, "aaaa"), r("2", "curepipe", "river", 10, "bbbb"), r("3", "mahebourg", "tree", 10, "cccc")];
    expect(independentReporters(all[0], all)).toBe(1);
  });

  it("any rain report agrees with other rain, but 'stopped' does not", () => {
    const all = [r("1", "curepipe", "heavy", 5, "aaaa"), r("2", "curepipe", "light", 8, "bbbb"), r("3", "curepipe", "stopped", 2, "cccc")];
    expect(independentReporters(all[0], all)).toBe(2);
  });

  it("ntfy reports without a phone code count once each", () => {
    const all = [r("1", "curepipe", "sea", 5), r("2", "curepipe", "sea", 9)];
    expect(summariseHazards(all, NOW)[0].corroborated).toBe(true);
  });
});

describe("/api/community without a database", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("tells the app to use ntfy and refuses writes", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("POSTGRES_URL", "");
    vi.resetModules();
    const { GET, POST } = await import("@/app/api/community/route");
    expect(await (await GET()).json()).toEqual({ enabled: false });
    const res = await POST(new Request("http://x/api/community", { method: "POST", body: "{}" }) as never);
    expect(res.status).toBe(503);
  });
});
