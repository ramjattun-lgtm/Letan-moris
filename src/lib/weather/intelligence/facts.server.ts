// Server-side access to "Did you know?" facts (loads the larger history files).
import rainHours from "@/data/rain-hours.json";
import cycloneHistory from "@/data/cyclone-history.json";
import { buildFacts, factsFor, postable, type Fact } from "./facts.service";
import type { HistStorm } from "./cyclone-climate.service";

export function allFacts(today: string): Fact[] {
  return buildFacts({
    today,
    rainHours: rainHours as unknown as Parameters<typeof buildFacts>[0]["rainHours"],
    storms: ((cycloneHistory as { storms?: HistStorm[] }).storms ?? []) as HistStorm[],
  });
}

/** One island-wide fact for the weekly Facebook post (Sunday morning), or null. */
export function weeklyPostFact(today: string): string | null {
  const list = factsFor(allFacts(today), { today, region: "plateau", island: "mauritius" }).filter(postable);
  return list[0]?.text ?? null;
}
