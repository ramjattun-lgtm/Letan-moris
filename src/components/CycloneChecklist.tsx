"use client";

import { useEffect, useState } from "react";
import { readLS, writeLS } from "@/lib/client/storage";

export const CHECKLIST = [
  "Keep a battery radio, torch, spare batteries and charged power banks.",
  "Store drinking water and non-perishable food for several days.",
  "Keep medicines, important documents and some cash in a waterproof bag.",
  "Secure or bring inside loose objects (pots, roof sheets, furniture).",
  "Know your nearest refugee centre and how to get there.",
  "Charge phones and follow official bulletins on radio, TV and the MMS website.",
  "Stay away from beaches, rivers and flood-prone areas during bad weather.",
  "Do not go outside during the eye of a cyclone — winds return suddenly.",
];

export function Checklist() {
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(readLS<number[]>("letan.cyclone.checklist", []));
  }, [setDone]);
  const toggle = (i: number) =>
    setDone((d) => {
      const n = d.includes(i) ? d.filter((x) => x !== i) : [...d, i];
      writeLS("letan.cyclone.checklist", n);
      return n;
    });
  return (
    <>
      <p className="mt-1 text-xs text-muted dark:text-slate-400">
        {done.length} of {CHECKLIST.length} done — ticks are saved on this phone.
      </p>
      <ul className="mt-2 space-y-1">
        {CHECKLIST.map((c, i) => (
          <li key={c}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-sm hover:bg-mist dark:hover:bg-white/5">
              <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="mt-0.5 h-5 w-5 accent-[#0FA3A3]" />
              <span className={done.includes(i) ? "text-muted line-through" : ""}>{c}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

