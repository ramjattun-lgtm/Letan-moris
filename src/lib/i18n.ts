// Small built-in dictionary for the key screens. English is the reference; French and
// Mauritian Kreol (Kreol Morisien, beta) cover navigation, alerts, rain and community reports.
// Detailed explanations from the weather rules stay in English for now.

export type Lang = "en" | "fr" | "mfe";
export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: "en", short: "EN", name: "English" },
  { id: "fr", short: "FR", name: "Français" },
  { id: "mfe", short: "KR", name: "Kreol" },
];

const en = {
  "nav.today": "Today",
  "nav.plan": "Plan",
  "nav.map": "Map",
  "nav.sea": "Beach & Sea",
  "nav.cyclone": "Cyclone",
  "nav.climate": "Climate",
  "island.mauritius": "Mauritius",
  "island.rodrigues": "Rodrigues",
  "lang.label": "Language",
  "lang.beta": "Kreol is in beta — tell us on Facebook if a word is wrong.",
  "refresh.last": "Last refreshed {time}",
  "refresh.saved": "Showing saved data from {time}",
  "refresh.data": "forecast data from {time}",
  "refresh.button": "Refresh",
  "refresh.busy": "Refreshing",
  "refresh.getting": "Getting the latest data…",
  "alerts.for": "Alerts for {place}",
  "alerts.none": "No weather alerts for your area from the latest data.",
  "alerts.mms": "Official MMS warnings ↗",
  "alerts.checking": "Checking the latest data…",
  "alerts.note": "Independent alerts from the latest forecasts, storm tracks and community reports — not official warnings. For cyclone, heavy rain and sea warnings, always follow MMS.",
  "alerts.phone": "Get these alerts on your phone, free:",
  "alerts.button": "Alerts for {area}",
  "setup.title": "👋 First, set your place",
  "setup.text": "Alerts and forecasts below are for {place} until you choose. Your position stays on this phone — it is only used to pick the nearest place.",
  "setup.gps": "📍 Use my location",
  "setup.list": "Choose from the list",
  "setup.keep": "Keep {place}",
  "setup.blocked": "Location is blocked for this site. To allow it: tap the padlock or ⓘ next to the web address → Permissions → Location → Allow, then reload.",
  "place.change": "Change",
  "next6.title": "Rain in the next 6 hours",
  "next6.now": "Now",
  "next6.dryShort": "dry",
  "next6.dry": "Dry for the next 6 hours.",
  "next6.likely": "Rain likely {when} ({pct}%) — about {mm} mm over 6 hours.",
  "next6.possible": "A shower is possible {when} ({pct}%). Mostly dry otherwise.",
  "next6.whenNow": "now",
  "next6.whenFrom": "from about {time}",
  "next6.na": "Rain forecast not available right now.",
  "next6.note": "Forecast guidance from weather models, not radar — showers can pop up between hours. Official warnings: MMS.",
  "places.title": "Your places · next 6 hours",
  "places.manage": "Manage places & alerts",
  "places.empty": "Save home, work or school with the ☆ star next to the place name to see them here, and get free rain alerts for their area.",
  "community.title": "Lapli isi! · community reports",
  "community.nothing": "Nothing reported within {km} km in the last 3 hours. Seen rain, a rising river or a fallen tree? Tap Lapli isi!",
  "community.agree": "{n} people agree",
  "community.unconfirmed": "1 report, unconfirmed",
  "community.useful": "Useful",
  "community.problem": "Report a problem",
  "lapli.button": "Lapli isi!",
  "lapli.question": "Lapli isi? What is it like where you are?",
  "lapli.else": "Something else nearby?",
  "today.forYou": "Today, for you",
  "today.planner": "🗓️ Perfect Day finder — best day this week for…",
  "today.day": "📅 My Weather Day — plan any of the next 7 days",
  "memory.title": "Weather Memory · on this day",
  "cyclone.title": "Cyclone-ready",
} as const;

export type Key = keyof typeof en;
type Dict = Record<Key, string>;

const fr: Dict = {
  "nav.today": "Aujourd'hui",
  "nav.plan": "Prévoir",
  "nav.map": "Carte",
  "nav.sea": "Plage & mer",
  "nav.cyclone": "Cyclone",
  "nav.climate": "Climat",
  "island.mauritius": "Maurice",
  "island.rodrigues": "Rodrigues",
  "lang.label": "Langue",
  "lang.beta": "Le kreol est en version bêta — signalez-nous une erreur sur Facebook.",
  "refresh.last": "Mis à jour à {time}",
  "refresh.saved": "Données enregistrées de {time}",
  "refresh.data": "prévisions de {time}",
  "refresh.button": "Actualiser",
  "refresh.busy": "Actualisation",
  "refresh.getting": "Récupération des dernières données…",
  "alerts.for": "Alertes pour {place}",
  "alerts.none": "Aucune alerte météo pour votre zone selon les dernières données.",
  "alerts.mms": "Avis officiels MMS ↗",
  "alerts.checking": "Vérification des dernières données…",
  "alerts.note": "Alertes indépendantes tirées des prévisions, des trajectoires de tempêtes et des signalements — ce ne sont pas des avis officiels. Pour les cyclones, fortes pluies et la mer, suivez toujours le MMS.",
  "alerts.phone": "Recevez ces alertes sur votre téléphone, gratuitement :",
  "alerts.button": "Alertes {area}",
  "setup.title": "👋 D'abord, choisissez votre lieu",
  "setup.text": "Les alertes et prévisions ci-dessous concernent {place} tant que vous n'avez pas choisi. Votre position reste sur ce téléphone — elle sert seulement à trouver le lieu le plus proche.",
  "setup.gps": "📍 Utiliser ma position",
  "setup.list": "Choisir dans la liste",
  "setup.keep": "Garder {place}",
  "setup.blocked": "La localisation est bloquée pour ce site. Pour l'autoriser : touchez le cadenas ou ⓘ à côté de l'adresse → Autorisations → Position → Autoriser, puis rechargez.",
  "place.change": "Changer",
  "next6.title": "Pluie dans les 6 prochaines heures",
  "next6.now": "Maint.",
  "next6.dryShort": "sec",
  "next6.dry": "Temps sec pour les 6 prochaines heures.",
  "next6.likely": "Pluie probable {when} ({pct} %) — environ {mm} mm sur 6 heures.",
  "next6.possible": "Une averse est possible {when} ({pct} %). Plutôt sec sinon.",
  "next6.whenNow": "maintenant",
  "next6.whenFrom": "vers {time}",
  "next6.na": "Prévision de pluie indisponible pour le moment.",
  "next6.note": "Indication tirée des modèles météo, pas d'un radar — des averses peuvent éclater entre deux heures. Avis officiels : MMS.",
  "places.title": "Vos lieux · 6 prochaines heures",
  "places.manage": "Gérer lieux et alertes",
  "places.empty": "Enregistrez maison, travail ou école avec l'étoile ☆ à côté du nom du lieu pour les voir ici et recevoir des alertes pluie gratuites.",
  "community.title": "Lapli isi! · signalements",
  "community.nothing": "Rien de signalé à moins de {km} km ces 3 dernières heures. Vous voyez de la pluie, une rivière qui monte ou un arbre tombé ? Touchez Lapli isi!",
  "community.agree": "{n} personnes confirment",
  "community.unconfirmed": "1 signalement, non confirmé",
  "community.useful": "Utile",
  "community.problem": "Signaler un problème",
  "lapli.button": "Lapli isi!",
  "lapli.question": "Lapli isi ? Quel temps fait-il chez vous ?",
  "lapli.else": "Autre chose près de vous ?",
  "today.forYou": "Aujourd'hui, pour vous",
  "today.planner": "🗓️ Le jour parfait — le meilleur jour cette semaine pour…",
  "today.day": "📅 Ma journée météo — préparez un des 7 prochains jours",
  "memory.title": "Mémoire météo · ce jour-là",
  "cyclone.title": "Prêt pour le cyclone",
};

// Kreol Morisien (beta). Common spellings; feedback welcome.
const mfe: Dict = {
  "nav.today": "Zordi",
  "nav.plan": "Prevwar",
  "nav.map": "Kart",
  "nav.sea": "Laplaz & lamer",
  "nav.cyclone": "Siklonn",
  "nav.climate": "Klima",
  "island.mauritius": "Moris",
  "island.rodrigues": "Rodrig",
  "lang.label": "Lang",
  "lang.beta": "Kreol-la ankor an beta — dir nou lor Facebook si enn mo pa bon.",
  "refresh.last": "Mett azour {time}",
  "refresh.saved": "Done ki ti sove {time}",
  "refresh.data": "previzion {time}",
  "refresh.button": "Refrési",
  "refresh.busy": "Pe refrési",
  "refresh.getting": "Pe gagn bann dernie done…",
  "alerts.for": "Alert pou {place}",
  "alerts.none": "Pena okenn alert meteo pou ou landrwa dapre bann dernie done.",
  "alerts.mms": "Avertisman ofisiel MMS ↗",
  "alerts.checking": "Pe get bann dernie done…",
  "alerts.note": "Alert independan ki sorti dan previzion, trazektwar siklonn ek rapor dimounn — pa avertisman ofisiel. Pou siklonn, gro lapli ek lamer, toultan swiv MMS.",
  "alerts.phone": "Gagn sa bann alert-la lor ou portab, gratis:",
  "alerts.button": "Alert {area}",
  "setup.title": "👋 Avan tou, swazir ou landrwa",
  "setup.text": "Bann alert ek previzion anba-la pou {place} ziska ou swazir. Ou pozision res lor sa portab-la — li servi zis pou trouv landrwa pli pre.",
  "setup.gps": "📍 Servi mo pozision",
  "setup.list": "Swazir dan lalis",
  "setup.keep": "Gard {place}",
  "setup.blocked": "Lokalizasion bloke pou sa sit-la. Pou permet li: tap lor kadna ouswa ⓘ akote adres-la → Permision → Lokalizasion → Permet, apre rafresi paz-la.",
  "place.change": "Sanze",
  "next6.title": "Lapli dan 6 erdtan ki pe vini",
  "next6.now": "Aster",
  "next6.dryShort": "sek",
  "next6.dry": "Pa pou ena lapli dan 6 erdtan ki pe vini.",
  "next6.likely": "Kapav ena lapli {when} ({pct}%) — apepre {mm} mm lor 6 erdtan.",
  "next6.possible": "Kapav ena enn ti lavers {when} ({pct}%). Sinon lamajorite sek.",
  "next6.whenNow": "aster",
  "next6.whenFrom": "vers {time}",
  "next6.na": "Previzion lapli pa disponib pou lemoman.",
  "next6.note": "Indikasion ki sorti dan model meteo, pa radar — lavers kapav tom ant de erdtan. Avertisman ofisiel: MMS.",
  "places.title": "Ou bann landrwa · 6 erdtan ki pe vini",
  "places.manage": "Ou landrwa ek alert",
  "places.empty": "Sov lakaz, travay ouswa lekol avek zetwal ☆ akote nom landrwa-la pou trouv zot isi, ek gagn alert lapli gratis pou zot landrwa.",
  "community.title": "Lapli isi! · rapor dimounn",
  "community.nothing": "Personn pann rapor nanye dan {km} km dan 3 dernie erdtan. Ou trouv lapli, enn larivier pe monte ouswa enn pie dibwa tombe? Tap Lapli isi!",
  "community.agree": "{n} dimounn dakor",
  "community.unconfirmed": "1 rapor, pa ankor konfirme",
  "community.useful": "Itil",
  "community.problem": "Rapor enn problem",
  "lapli.button": "Lapli isi!",
  "lapli.question": "Lapli isi? Ki manier li ete kot ou?",
  "lapli.else": "Enn lot zafer pre kot ou?",
  "today.forYou": "Zordi, pou ou",
  "today.planner": "🗓️ Pli bon zour — pli bon zour sa semenn-la pou…",
  "today.day": "📅 Mo zour meteo — prepar enn ladan 7 prosin zour",
  "memory.title": "Memwar meteo · sa zour-la",
  "cyclone.title": "Pare pou siklonn",
};

const DICTS: Record<Lang, Dict> = { en, fr, mfe };

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  return fill(DICTS[lang]?.[key] ?? en[key], vars);
}

// ——— Whole-site translation: English text is the key ———
// Every piece of on-screen English goes through tr(). French has a full catalogue; Kreol has the
// key updates and falls back to French (most Mauritians read French), then English.
import { FR as FR_UI } from "./i18n-fr";
import { FR_RULES } from "./i18n-fr-rules";
import { FR_MORE } from "./i18n-fr-more";
const FR: Record<string, string> = { ...FR_UI, ...FR_RULES, ...FR_MORE };
import { MFE } from "./i18n-mfe";
import { PATTERNS } from "./i18n-patterns";

let CURRENT: Lang = "en";
/** Set by AppState when the language changes (the app then re-renders in the new language). */
export const setCurrentLang = (l: Lang) => {
  CURRENT = l;
};
export const currentLang = () => CURRENT;

const CATALOG: Record<Exclude<Lang, "en">, Record<string, string>> = { fr: FR, mfe: MFE };

/** Sentences the rules build with numbers and times: regex patterns, French (and Kreol) templates. */
function byPattern(lang: Exclude<Lang, "en">, text: string): string | null {
  for (const p of PATTERNS) {
    const tpl = p[lang] ?? (lang === "mfe" ? p.fr : undefined);
    if (!tpl) continue;
    const m = text.match(p.re);
    if (!m) continue;
    // [[…]] marks an optional part: it is dropped when a value inside it is missing.
    const MISSING = "\u0000";
    const filled = tpl.replace(/\$(\d)/g, (_, i) => (m[Number(i)] === undefined ? MISSING : trInner(lang, m[Number(i)])));
    return filled.replace(/\[\[([^\]]*)\]\]/g, (_, part: string) => (part.includes(MISSING) ? "" : part)).replace(new RegExp(MISSING, "g"), "");
  }
  return null;
}

function trInner(lang: Exclude<Lang, "en">, text: string): string {
  const exact = CATALOG[lang][text] ?? (lang === "mfe" ? FR[text] : undefined);
  if (exact !== undefined) return exact;
  // Long texts made of several sentences: translate each sentence.
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
  if (parts.length > 1) return parts.map((s) => trInner(lang, s)).join(" ");
  // Lists joined with "; " (e.g. dark-sky spots).
  if (text.includes("; ")) return text.split("; ").map((s) => trInner(lang, s)).join(" ; ");
  const byP = byPattern(lang, text);
  if (byP !== null) return byP;
  // Same sentence with a capital first letter (e.g. "Sheltered from…" at the start of a line).
  if (/^[A-Z][a-z]/.test(text)) {
    const lower = text[0].toLowerCase() + text.slice(1);
    const t3 = CATALOG[lang][lower] ?? (lang === "mfe" ? FR[lower] : undefined) ?? byPattern(lang, lower);
    if (t3) return t3[0].toUpperCase() + t3.slice(1);
  }
  // A sentence whose pattern has no final full stop.
  if (/[.!]$/.test(text)) {
    const core = text.slice(0, -1);
    const t2 = CATALOG[lang][core] ?? (lang === "mfe" ? FR[core] : undefined) ?? byPattern(lang, core);
    if (t2) return `${t2}${text.slice(-1)}`;
  }
  return text;
}

/** Translate English UI text into the current language. `vars` fill {name} placeholders. */
export function tr(en: string, vars: Record<string, string | number> = {}, lang: Lang = CURRENT): string {
  if (!en) return en;
  const out = lang === "en" ? en : trInner(lang, en);
  return fill(out, vars);
}

export const isLang = (x: unknown): x is Lang => x === "en" || x === "fr" || x === "mfe";
