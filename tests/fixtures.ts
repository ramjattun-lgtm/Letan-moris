// TEST DATA ONLY — synthetic responses shaped like Open-Meteo's API, used to test
// parsing and rules offline. Never shown to users.

export function hoursOf(date: string, n = 48): string[] {
  const out: string[] = [];
  const [y, m, d] = date.split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const t = new Date(Date.UTC(y, m - 1, d, i));
    out.push(t.toISOString().slice(0, 16));
  }
  return out;
}

/** Build a fake forecast response. `rainAt` maps "HH" (day 1) to [probability, mm]. */
export function fakeOpenMeteo(date: string, rainAt: Record<number, [number, number]> = {}, overrides: Record<string, unknown> = {}) {
  const time = hoursOf(date, 48);
  const prob = time.map((t, i) => (i < 24 && rainAt[i] ? rainAt[i][0] : 5));
  const mm = time.map((t, i) => (i < 24 && rainAt[i] ? rainAt[i][1] : 0));
  return {
    latitude: -20.16,
    longitude: 57.5,
    elevation: 12,
    utc_offset_seconds: 14400,
    timezone: "Indian/Mauritius",
    current: { time: `${date}T10:00`, temperature_2m: 27.4, relative_humidity_2m: 70, apparent_temperature: 29.1, precipitation: 0, weather_code: 2, cloud_cover: 40, wind_speed_10m: 18, wind_direction_10m: 120, wind_gusts_10m: 32, is_day: 1 },
    hourly: {
      time,
      temperature_2m: time.map(() => 26),
      apparent_temperature: time.map(() => 28),
      relative_humidity_2m: time.map(() => 70),
      precipitation_probability: prob,
      precipitation: mm,
      weather_code: time.map(() => 2),
      cloud_cover: time.map(() => 40),
      wind_speed_10m: time.map(() => 15),
      wind_direction_10m: time.map(() => 120),
      wind_gusts_10m: time.map(() => 30),
      uv_index: time.map(() => 5),
      shortwave_radiation: time.map((t) => { const h = Number(t.slice(11, 13)); return h >= 6 && h <= 18 ? Math.round(800 * Math.sin(((h - 6) / 12) * Math.PI)) : 0; }),
      cloud_cover_low: time.map(() => 20),
      visibility: time.map(() => 24000),
    },
    daily: {
      time: [date],
      weather_code: [61],
      temperature_2m_max: [29],
      temperature_2m_min: [22],
      precipitation_sum: [mm.slice(0, 24).reduce((a, b) => a + b, 0)],
      precipitation_probability_max: [Math.max(...prob.slice(0, 24))],
      precipitation_hours: [Object.keys(rainAt).length],
      sunrise: [`${date}T06:05`],
      sunset: [`${date}T18:55`],
      uv_index_max: [9.5],
      wind_speed_10m_max: [22],
      wind_gusts_10m_max: [40],
      wind_direction_10m_dominant: [120],
    },
    ...overrides,
  };
}
