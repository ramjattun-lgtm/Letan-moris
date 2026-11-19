import type { Maybe } from "../types";

// Confidence — Phase 1 method (documented, deliberately simple):
// It is derived from the forecast rain probability itself. Probabilities near 0% or 100%
// mean the model is fairly sure; probabilities near 50% mean it is unsure.
// Phase 2 will replace this with ensemble spread and multi-model agreement, plus
// calibration against real observations.

export type Confidence = "high" | "medium" | "low";

export const CONFIDENCE_METHOD =
  "Confidence is based on how close the rain probability is to 0% or 100%. It will be upgraded to use several weather models once forecast verification is running.";

export function confidenceForRain(maxProbability: Maybe<number>): Confidence {
  if (maxProbability === null) return "low";
  if (maxProbability >= 75) return "high";
  if (maxProbability >= 55) return "medium";
  return "low";
}

export function confidenceForDry(maxProbability: Maybe<number>): Confidence {
  if (maxProbability === null) return "low";
  if (maxProbability <= 15) return "high";
  if (maxProbability <= 35) return "medium";
  return "low";
}

/** Forecasts further ahead are less certain; never upgrade, only downgrade. */
export function decayWithLeadTime(c: Confidence, daysAhead: number): Confidence {
  if (daysAhead >= 4) return "low";
  if (daysAhead >= 2 && c === "high") return "medium";
  return c;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};
