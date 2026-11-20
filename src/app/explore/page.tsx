import Link from "next/link";

export const metadata = { title: "Explore — more tools" };

const TOOLS = [
  { href: "/drive", icon: "🚗", title: "Trip planner", text: "Best time to leave to avoid rain on your drive." },
  { href: "/event", icon: "📅", title: "Event date checker", text: "Usual weather, outlook and cyclone risk for any date in the next year." },
  { href: "/sky", icon: "✨", title: "Stargazing tonight", text: "Clear hours, the Moon and darker places to watch the sky." },
  { href: "/reservoirs", icon: "💧", title: "Rain over the reservoirs", text: "Rain over the catchment areas vs the normal rain level — not reservoir levels." },
  { href: "/marine", icon: "🪸", title: "Beach & Sea, lagoon warmth", text: "Best beaches, sea conditions and coral heat stress." },
  { href: "/cyclone", icon: "🌀", title: "Cyclone season scorecard", text: "Storms so far this season vs typical, and what the warning classes mean." },
  { href: "/climate", icon: "📈", title: "Climate", text: "30 years of normal temperatures and rain levels, records and trends." },
  { href: "/map", icon: "🗺️", title: "Weather map & flood-prone areas", text: "Rain, heavy-rain risk, rain reports and known flood-prone areas." },
  { href: "/rain", icon: "🌧️", title: "Rain details", text: "Hour by hour rain for your place." },
];

export default function ExplorePage() {
  return (
    <>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-extrabold">Explore</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="card flex h-full items-start gap-3 hover:bg-white/80">
              <span aria-hidden="true" className="text-2xl">{t.icon}</span>
              <span>
                <span className="block font-bold">{t.title}</span>
                <span className="block text-sm text-muted dark:text-slate-400">{t.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
