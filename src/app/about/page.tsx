import { POWERED, TAGLINE } from "@/components/Logo";
import { CONFIDENCE_METHOD } from "@/lib/weather/intelligence/confidence.service";

export const metadata = { title: "About, data sources & privacy" };

export default function About() {
  return (
    <article className="card prose-sm mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">About Letan Moris</h1>
      <p className="text-lg font-semibold">{TAGLINE}</p>
      <p className="text-sm font-semibold text-teal-ink dark:text-teal-soft">📈 {POWERED}</p>
      <p>
        Letan Moris is an independent weather service built only for the Republic of Mauritius — <strong>Moris &amp; Rodrig</strong>. It tells you when rain is likely to reach your part of the island, what that means for your plans, and how sure the forecast is.
      </p>
      <h2 className="text-lg font-bold">What makes it different</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Made for Mauritius and Rodrigues only — local place names, regions and beaches.</li>
        <li>Rain timing first — when it will rain and when it will stop.</li>
        <li>Plain-language advice for school runs, commuting, laundry, beach, gardening and farming, with the reasons shown.</li>
        <li>Honest about precision: confidence, data age and model limits are always shown.</li>
        <li>Coming soon: a public accuracy score comparing our forecasts with real observations.</li>
      </ul>
      <h2 className="text-lg font-bold">Not an official warning service</h2>
      <p>
        Official weather and cyclone warnings for Mauritius and Rodrigues come from{" "}
        <a className="underline" href="http://metservice.intnet.mu/" target="_blank" rel="noreferrer">Mauritius Meteorological Services (MMS)</a>. Always follow MMS and the authorities. Letan Moris is not affiliated with MMS.
      </p>
      <h2 className="text-lg font-bold">Data sources</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Forecasts and marine data: <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>, licensed CC BY 4.0, used under its free non-commercial terms. Open-Meteo combines forecasts from national weather services.
        </li>
        <li>Map: OpenStreetMap contributors (ODbL), tiles by OpenFreeMap.</li>
        <li>
          Known flood-prone areas: the sectors studied in the Land Drainage Master Plan prepared for the Land Drainage Authority (AdaptAction / AFD, report D5.2 Vol. 2, 2022). Map positions are approximate area centres, not official flood boundaries.
        </li>
        <li>
          Reservoirs: rain over each catchment from the ERA5 reanalysis (since 1950) and ECMWF forecasts via Open-Meteo; reservoir facts from the Water Resources Unit. We do not show reservoir levels — those come from the CWA.
        </li>
        <li>Place list: compiled for Letan Moris with reference to OpenStreetMap.</li>
      </ul>
      <h2 className="text-lg font-bold">Limits you should know</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Weather models describe areas several kilometres wide. Mountains, valleys and coasts can behave differently from the forecast, especially on the central plateau and in Rodrigues.</li>
        <li>Rain data is hourly. We do not show minute-by-minute rain because we have no radar data yet.</li>
        <li>{CONFIDENCE_METHOD}</li>
        <li>The &quot;now&quot; values are model estimates, not measurements from a weather station.</li>
        <li>Missing values are shown as &quot;—&quot;, never as zero.</li>
      </ul>
      <h2 className="text-lg font-bold">Lapli isi! community reports</h2>
      <p>
        When you tap <strong>Lapli isi!</strong>, only the village name and the kind of rain are sent — no GPS position, no name, no account. Reports go through ntfy.sh, a free public message service, are visible to anyone using Letan Moris, and are automatically deleted after about 12 hours. They are unverified observations. The &quot;upwind&quot; alert estimates when reported rain may reach you from today&apos;s wind; it is a rough guide, not radar.
      </p>
      <h2 className="text-lg font-bold">Privacy</h2>
      <p>
        No account is needed. Your saved places, last forecasts and theme are stored only on your device. If you use &quot;Use my location&quot;, your position is used on your device to pick the nearest place and is not sent to our servers. We use no advertising or tracking cookies. Written with Mauritius&apos;s Data Protection Act 2017 in mind.
      </p>
      <p className="text-xs text-muted dark:text-slate-400">Free, non-commercial public service. All times are Mauritius time (UTC+4).</p>
    </article>
  );
}
