"use client";

import { useEffect, useState } from "react";
import { readLS, writeLS } from "@/lib/client/storage";
import { LogoMark } from "./Logo";
import { tr } from "@/lib/i18n";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "letan.installDismissed";
const HIDE_DAYS = 30;

/** "Add Letan Moris to your home screen" — Android/Chrome install button, or iPhone steps. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = readLS<number>(KEY, 0);
    if (standalone || Date.now() - dismissed < HIDE_DAYS * 86400e3) return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
      // One-off read of the browser on first load (no server equivalent).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIos(true);
      setHidden(false);
    }
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    };
    const installed = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (hidden || (!evt && !ios)) return null;
  const dismiss = () => {
    writeLS(KEY, Date.now());
    setHidden(true);
  };
  return (
    <section className="card flex items-center gap-3" aria-label={tr("Install Letan Moris")}>
      <LogoMark size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{tr("Add Letan Moris to your home screen")}</p>
        {evt ? (
          <p className="text-sm text-muted dark:text-slate-400">{tr("Opens like an app, works with a weak signal, free, no account.")}</p>
        ) : (
          <p className="text-sm text-muted dark:text-slate-400">
            {tr("Tap")} <strong>{tr("Share")}</strong> <span aria-hidden="true">⬆︎</span> {tr("at the bottom of Safari, then")} <strong>{tr("Add to Home Screen")}</strong>.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {evt && (
          <button
            type="button"
            onClick={async () => {
              await evt.prompt();
              const c = await evt.userChoice;
              if (c.outcome === "accepted") setHidden(true);
              setEvt(null);
            }}
            className="min-h-10 rounded-full bg-navy px-4 text-sm font-semibold text-white dark:bg-teal-soft dark:text-navy"
          >
            {tr("Install")}
          </button>
        )}
        <button type="button" onClick={dismiss} className="text-xs text-muted underline dark:text-slate-400">
          {tr("Not now")}
        </button>
      </div>
    </section>
  );
}
