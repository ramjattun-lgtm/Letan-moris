"use client";

import { useEffect, useState } from "react";
import { deviceId } from "@/lib/community/lapli";
import { readLS, writeLS } from "@/lib/client/storage";
import { todayMU } from "@/lib/time";
import { tr } from "@/lib/i18n";

interface Counts {
  enabled: boolean;
  total?: number;
  today?: number;
  month?: number;
}

/** A quiet visitor count at the very bottom of Today. Anonymous: one count per phone per day. */
export function VisitCounter() {
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => {
    const day = todayMU();
    if (readLS<string>("letan.visitDay", "") !== day) {
      fetch("/api/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device: deviceId() }) })
        .then((r) => {
          if (r.ok) writeLS("letan.visitDay", day);
        })
        .catch(() => {});
    }
    fetch("/api/visits")
      .then((r) => r.json())
      .then((j: Counts) => setC(j))
      .catch(() => {});
  }, []);
  if (!c?.enabled || !c.total) return null;
  const n = (x: number | undefined) => (x ?? 0).toLocaleString("en-GB");
  return (
    <p className="mt-6 text-center text-[10px] text-muted/70 dark:text-slate-500" title={tr("Anonymous count of phones and computers that opened Letan Moris. No names, no cookies.")}>
      <span aria-hidden="true">◦</span> {n(c.total)} {tr("visitors")} · {n(c.month)} {tr("this month")} · {n(c.today)} {tr("today")}
    </p>
  );
}
