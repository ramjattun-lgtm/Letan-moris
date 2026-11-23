"use client";

import { useState } from "react";
import { areaName, areaTopic } from "@/lib/community/area-alerts";
import { useAppState } from "./AppState";
import { tr } from "@/lib/i18n";

/** Follow free ntfy alerts for an area. No account, no phone number, no email. */
export function AreaAlertsButton({ areaKey }: { areaKey: string }) {
  const { t } = useAppState();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const topic = areaTopic(areaKey);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full px-4 py-2 text-sm font-semibold text-teal-ink ring-1 ring-teal/40 dark:text-teal-soft">
        🔔 {t("alerts.button", { area: areaName(areaKey) })}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby={`al-${areaKey}`} className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl dark:bg-night-card" onClick={(e) => e.stopPropagation()}>
            <h2 id={`al-${areaKey}`} className="font-[family-name:var(--font-display)] text-xl font-extrabold">
              {tr("Free alerts for")} {tr(areaName(areaKey))}
            </h2>
            <p className="mt-1 text-sm">{tr("You'll get a notification when heavy rain is likely in this area, or when 2 or more people report a rising river, fallen tree or rough sea there.")}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              <li>{tr("Install the free")} <strong>{tr("ntfy")}</strong> {tr("app (Play Store or App Store). No account needed.")}</li>
              <li>{tr("Tap the button below — or in ntfy tap")} <strong>+</strong> {tr("and type the topic name.")}</li>
            </ol>
            <p className="mt-3 rounded-xl bg-mist p-2 text-center font-mono text-sm dark:bg-white/5">{tr(topic)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`ntfy://ntfy.sh/${topic}`} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy">
                {tr("Open in ntfy app")}
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(topic).then(() => setCopied(true), () => {});
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-navy/15 dark:ring-white/20"
              >
                {tr(copied ? tr("Copied ✓") : tr("Copy topic"))}
              </button>
              <a href={`https://ntfy.sh/${topic}`} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-navy/15 dark:ring-white/20">
                {tr("Open in browser")}
              </a>
            </div>
            <p className="mt-3 text-[11px] text-muted dark:text-slate-400">
              {tr("Independent alerts, checked every 30 minutes — not official warnings. Always follow MMS. ntfy topics are public: only trust messages that say \"Letan Moris\". To stop, unsubscribe in the ntfy app.")}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-full py-2 text-sm font-semibold ring-1 ring-navy/15 dark:ring-white/20">
              {tr("Close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
