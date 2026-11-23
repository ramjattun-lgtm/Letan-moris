/**
 * Letan Moris's discreet Dodo (option D1, line style). Decorative only — it never appears
 * on alerts, warnings or forecasts. Uses the current text colour so it works in dark mode.
 */
export function Dodo({ size = 24, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 12c-6 0-10 4-10 10 0 3 1 5 2 7" />
        <path d="M36 12c4 0 7 2 8 5l11 3c3 1 4 5 1 7-2 1-4 0-5-1-3 1-7 1-10-1" />
        <path d="M41 25c6 5 8 12 5 19-3 7-10 11-18 11-9 0-15-6-15-14 0-6 4-10 8-12" />
        <path d="M13 38c-4-2-8-1-9 1M13 41c-4 0-7 2-7 4M14 44c-3 1-5 3-5 6" />
        <path d="M24 40c3 3 8 3 11 0" />
        <path d="M25 55v5M34 55v5M23 60h4M32 60h4" />
      </g>
      <circle cx="39" cy="17" r="1.9" fill="currentColor" />
    </svg>
  );
}
