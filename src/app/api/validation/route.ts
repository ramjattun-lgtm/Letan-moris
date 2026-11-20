import { ok } from "@/lib/api";
import history from "@/data/reservoir-rain.json";

export const dynamic = "force-static";

/** Results of the "Does history help?" test for the similar-years insight (built by the Reservoir rain history job). */
export async function GET() {
  return ok({ analogues: (history as { validation?: unknown }).validation ?? null }, 86400);
}
