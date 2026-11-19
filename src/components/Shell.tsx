"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark, TAGLINE, Wordmark } from "./Logo";
import { useAppState } from "./AppState";
import type { Island } from "@/lib/weather/types";

const NAV = [
  { href: "/", label: "Today", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/day", label: "Plan", icon: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 8 2 2 4-4" },
  { href: "/map", label: "Map", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" },
  { href: "/marine", label: "Beach & Sea", icon: "M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M12 3v8m0-8 4 4m-4-4-4 4" },
  { href: "/cyclone", label: "Cyclone", icon: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M5 9a8 8 0 0 1 12-5M19 15a8 8 0 0 1-12 5" },
  { href: "/climate", label: "Climate", icon: "M4 19h16M7 16V9m5 7V5m5 11v-4" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function IslandSwitch() {
  const { island, setIsland } = useAppState();
  const opts: { id: Island; label: string }[] = [
    { id: "mauritius", label: "Mauritius" },
    { id: "rodrigues", label: "Rodrigues" },
  ];
  return (
    <div role="group" aria-label="Choose island" className="inline-flex rounded-full bg-white/70 p-1 ring-1 ring-navy/10 dark:bg-white/5 dark:ring-white/10">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={island === o.id}
          onClick={() => setIsland(o.id)}
          className={`min-h-9 rounded-full px-3 text-sm font-semibold transition ${island === o.id ? "bg-navy text-white dark:bg-teal-soft dark:text-navy" : "text-muted hover:text-navy dark:text-slate-300"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { theme, toggleTheme } = useAppState();
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-navy/5 bg-mist/85 backdrop-blur dark:border-white/5 dark:bg-night/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2" aria-label="Letan Moris home">
          <LogoMark size={36} dark={theme === "dark"} />
          <span className="leading-tight">
            <Wordmark className="block text-lg" />
            <span className="hidden text-[11px] text-muted sm:block dark:text-slate-400">{TAGLINE}</span>
          </span>
        </Link>
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className={`rounded-full px-3 py-2 text-sm font-semibold ${path === n.href ? "bg-white text-navy shadow-sm dark:bg-white/10 dark:text-white" : "text-muted hover:text-navy dark:text-slate-300 dark:hover:text-white"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <IslandSwitch />
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">
            <Icon d={theme === "dark" ? "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" : "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"} />
          </button>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-2 sm:hidden">
        <IslandSwitch />
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-white/10 dark:bg-night/95">
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-center text-[11px] font-semibold leading-tight ${active ? "text-teal-ink dark:text-teal-soft" : "text-muted dark:text-slate-400"}`}>
                <Icon d={n.icon} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-28 pt-10 text-xs leading-relaxed text-muted lg:pb-10 dark:text-slate-400">
      <p>
        <strong>Independent forecast — not an official warning.</strong> For official warnings see{" "}
        <a className="underline" href="http://metservice.intnet.mu/" target="_blank" rel="noreferrer">
          Mauritius Meteorological Services
        </a>
        .
      </p>
      <p className="mt-1">
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Weather data by Open-Meteo.com
        </a>{" "}
        (CC BY 4.0) · Map data © OpenStreetMap contributors · All times are Mauritius time (UTC+4).
      </p>
      <p className="mt-1">
        <Link className="underline" href="/about">
          About, data sources &amp; privacy
        </Link>{" "}
        · <Link className="underline" href="/rain">Rain details</Link> · <Link className="underline" href="/locations">My places</Link> · Free, non-commercial public service.
      </p>
    </footer>
  );
}
