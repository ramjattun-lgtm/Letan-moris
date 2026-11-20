// Letan Moris logo — "Pieter Both" (option B): the mountain with its balancing rock, rain, wind,
// a setting sun and a pirogue on the sea.

export function LogoMark({ size = 40, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  const fg = dark ? "#FFFFFF" : "#0B2A3C";
  const bg = dark ? "#071C28" : "#FFFFFF";
  const teal = dark ? "#3CCFCF" : "#0FA3A3";
  const rain = dark ? "#5AA2FF" : "#2F7DE1";
  const wind = dark ? "#E7EEF2" : "#7FB2F0";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className}>
      {[
        [22, 22],
        [34, 16],
        [46, 24],
      ].map(([x, y]) => (
        <line key={x} x1={x} y1={y} x2={x - 5} y2={y + 11} stroke={rain} strokeWidth={5} strokeLinecap="round" />
      ))}
      {/* setting sun on the right */}
      <path d="M90 96 a15 15 0 0 1 30 0z" fill="#F2A541" />
      {/* Pieter Both */}
      <path d="M8 96 L40 52 L54 68 L72 34 L112 96Z" fill={teal} />
      <circle cx="72" cy="27" r="7" fill={fg} />
      {/* sea */}
      <path d="M10 106 q8 -7 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke={fg} strokeWidth={5} strokeLinecap="round" />
      {/* wind over the mountain */}
      <path d="M86 44 c-10 -2 -14 6 -6 8 c6 1 6 -6 0 -6" fill="none" stroke={wind} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M80 52 h22 M84 60 h16" stroke={wind} strokeWidth={3.5} strokeLinecap="round" />
      {/* pirogue */}
      <path d="M44 101 q13 5 28 0 l-4 5 h-20 z" fill={fg} stroke={bg} strokeWidth={1.5} />
      <path d="M57 100 L57 78 L70 98 Z" fill="#FFFFFF" stroke={fg} strokeWidth={2.5} strokeLinejoin="round" />
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
/** Second line of the tagline (T3). */
export const POWERED = "Powered by 30 years of local weather history from Open-Meteo (ECMWF ERA5)";
export const TAGLINE_SHORT = "Konn letan, planifie to zournee.";
