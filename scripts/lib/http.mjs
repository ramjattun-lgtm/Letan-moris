// Robust fetch for the GitHub data jobs: retries on network errors (e.g. connect timeouts),
// rate limits (429) and server errors, with growing waits. Prefers IPv4, which avoids slow
// IPv6 connection attempts on some GitHub runners.
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getWithRetry(url, { asText = false, tries = 8 } = {}) {
  let last = "";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { "User-Agent": "LetanMoris-data-job/1.0 (non-commercial)" } });
      if (res.ok) return asText ? res.text() : res.json();
      last = `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`;
      // 429 = too many requests: wait at least a minute; 400 = bad request: retrying will not help.
      if (res.status === 400 || res.status === 404) break;
      await sleep(res.status === 429 ? 65_000 * (i + 1) : Math.min(180_000, 15_000 * 2 ** i));
    } catch (e) {
      last = `${e.name}: ${e.cause?.code ?? e.message}`;
      await sleep(Math.min(180_000, 15_000 * 2 ** i));
    }
    console.warn(`Retry ${i + 1}/${tries} for ${url.split("?")[0]} — ${last}`);
  }
  throw new Error(`Failed after ${tries} tries: ${url.split("?")[0]} — ${last}`);
}
