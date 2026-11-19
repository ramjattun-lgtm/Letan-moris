// Letan Moris logo — option 6 "Pieter Both": the mountain with its balancing rock, rain and sea.

export function LogoMark({ size = 40, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  const fg = dark ? "#FFFFFF" : "#0B2A3C";
  const teal = dark ? "#3CCFCF" : "#0FA3A3";
  const rain = dark ? "#5AA2FF" : "#2F7DE1";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className}>
      {[
        [22, 22],
        [34, 16],
        [46, 24],
      ].map(([x, y]) => (
        <line key={x} x1={x} y1={y} x2={x - 5} y2={y + 11} stroke={rain} strokeWidth={5} strokeLinecap="round" />
      ))}
      <path d="M8 96 L40 52 L54 68 L72 34 L112 96Z" fill={teal} />
      <circle cx="72" cy="27" r="7" fill={fg} />
      <path d="M10 106 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke={fg} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-[family-name:var(--font-display)] font-extrabold tracking-tight ${className}`}>
      Letan <span className="text-teal-ink dark:text-teal-soft">Moris</span>
    </span>
  );
}

export const TAGLINE = "Konn letan Moris ek Rodrig, planifie to zournee.";
export const TAGLINE_SHORT = "Konn letan, planifie to zournee.";
