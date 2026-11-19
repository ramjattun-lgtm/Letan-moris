"use client";

import Link from "next/link";
import { useApi } from "@/lib/client/useApi";
import { useAppState } from "./AppState";
import type { CycloneStatus } from "@/lib/weather/providers/gdacs.provider";
import { cycloneMode } from "@/lib/weather/intelligence/cyclone-mode.service";

/** App-wide banner shown only in cyclone mode. */
export function CycloneModeBanner() {
  const { island, ready } = useAppState();
  const tc = useApi<CycloneStatus>(ready ? "/api/cyclones" : null);
  const m = cycloneMode(island, tc.data);
  if (!m.active) return null;
  return (
    <div role="alert" className="bg-[#D9480F] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <strong className="uppercase tracking-wide">{m.official ? "Official MMS warning" : "Cyclone mode"}</strong>
        <span className="flex-1">{m.headline}</span>
        <Link href="/cyclone" className="rounded-full bg-white px-3 py-1 font-semibold text-[#D9480F]">Cyclone page</Link>
        <a href="/lite" className="underline">Light version</a>
      </div>
    </div>
  );
}
