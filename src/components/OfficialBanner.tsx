"use client";

import Link from "next/link";
import { OFFICIAL, OFFICIAL_LINKS } from "@/data/official-status";
import { useAppState } from "./AppState";
import { tr } from "@/lib/i18n";

/** Persistent banner when an official MMS warning has been entered for the selected island. */
export function OfficialBanner() {
  const { island } = useAppState();
  const o = OFFICIAL[island];
  if (o.status !== "warning") return null;
  return (
    <div role="alert" className="mb-4 rounded-2xl bg-coral px-4 py-3 text-navy">
      <p className="text-xs font-bold uppercase tracking-wider">{tr("Official — from MMS")}</p>
      <p className="font-bold">{tr(o.headline)}</p>
      <p className="text-xs">
        {tr("Issued")} {tr(o.issuedAtMU)} {tr("(Mauritius time). Always check the latest at")}{" "}
        <a className="underline" href={o.sourceUrl || OFFICIAL_LINKS.mms.url} target="_blank" rel="noreferrer">
          {tr("MMS")}
        </a>
        . <Link href="/cyclone" className="underline">{tr("Cyclone page")}</Link>
      </p>
    </div>
  );
}
