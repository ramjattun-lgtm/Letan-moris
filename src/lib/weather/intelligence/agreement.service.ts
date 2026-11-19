import type { Maybe } from "../types";

// "Do the models agree?" — compares independent global models for the next days.
// Rain: models agree when all expect a wet day (≥2 mm) or all expect a dry-ish day.
// Temperature: agree when the spread of daily maximums is 2°C or less.

export interface ModelDay {
  date: string;
  byModel: Record<string, { rainMm: Maybe<number>; tmax: Maybe<number> }>;
}
export interface DayAgreement {
  date: string;
  models: number;
  wetModels: number;
  rainAgree: boolean | null;
  tempSpread: Maybe<number>;
  label: string;
}

export const WET_DAY_MM = 2;

export function agreeDay(d: ModelDay): DayAgreement {
  const vals = Object.values(d.byModel);
  const rain = vals.map((v) => v.rainMm).filter((x): x is number => x !== null);
  const temps = vals.map((v) => v.tmax).filter((x): x is number => x !== null);
  const wet = rain.filter((x) => x >= WET_DAY_MM).length;
  const rainAgree = rain.length < 2 ? null : wet === 0 || wet === rain.length;
  const spread = temps.length < 2 ? null : Math.round((Math.max(...temps) - Math.min(...temps)) * 10) / 10;
  let label: string;
  if (rainAgree === null) label = "Model comparison not available";
  else if (rainAgree && wet === rain.length) label = "Models agree: a wet day";
  else if (rainAgree) label = "Models agree: mostly dry";
  else label = `Models disagree about rain (${wet} of ${rain.length} expect a wet day)`;
  return { date: d.date, models: rain.length, wetModels: wet, rainAgree, tempSpread: spread, label };
}

/** Parse an Open-Meteo multi-model daily response (variables suffixed with the model name). */
export function parseMultiModel(raw: Record<string, unknown>, models: string[]): ModelDay[] {
  const daily = (raw.daily ?? {}) as Record<string, unknown[]>;
  const times = (daily.time ?? []) as string[];
  return times.map((date, i) => {
    const byModel: ModelDay["byModel"] = {};
    for (const m of models) {
      const r = daily[`precipitation_sum_${m}`]?.[i];
      const t = daily[`temperature_2m_max_${m}`]?.[i];
      if (r === undefined && t === undefined) continue;
      byModel[m] = { rainMm: typeof r === "number" ? r : null, tmax: typeof t === "number" ? t : null };
    }
    return { date, byModel };
  });
}
