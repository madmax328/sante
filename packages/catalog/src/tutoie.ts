/**
 * Recipes and exercises are written with "vous"; the app speaks with "tu".
 * Converts imperative instructions ("Coupez", "Faites-les", "Asseyez-vous")
 * and the few "vous" phrases used in the catalog.
 */

const PHRASES: [RegExp, string][] = [
  [/\bsi vous le souhaitez\b/gi, "si tu le souhaites"],
  [/\bsi vous l'emportez\b/gi, "si tu l'emportes"],
  [/\bpour vous asseoir\b/gi, "pour t'asseoir"],
  [/\ben vous tenant\b/gi, "en te tenant"],
  [/\bsans vous aider\b/gi, "sans t'aider"],
  [/\bdevant vous\b/gi, "devant toi"],
  [/-vous\b/g, "-toi"],
];

/** Verbs that don't follow the -ez → -e rule. */
const IRREGULAR: Record<string, string> = {
  faites: "fais",
  prenez: "prends",
  reprenez: "reprends",
  mettez: "mets",
  remettez: "remets",
  servez: "sers",
  tenez: "tiens",
  maintenez: "maintiens",
  revenez: "reviens",
  venez: "viens",
  asseyez: "assieds",
  rasseyez: "rassieds",
  courez: "cours",
  suivez: "suis",
  poursuivez: "poursuis",
  battez: "bats",
  ouvrez: "ouvre",
  couvrez: "couvre",
  recouvrez: "recouvre",
  dites: "dis",
  buvez: "bois",
  jetez: "jette",
  pelez: "pèle",
  ciselez: "cisèle",
  levez: "lève",
  soulevez: "soulève",
  amenez: "amène",
  ramenez: "ramène",
  pouvez: "peux",
};

/** Words ending in "ez" that are not verbs. */
const NOT_VERBS = new Set(["merguez", "chez", "nez", "assez", "rez"]);

/** -er verbs ending in "isser" (laissez → laisse, not "lais"). */
const FIRST_GROUP_ISS = new Set(["laiss", "délaiss", "gliss", "hiss", "pliss", "viss", "baiss", "abaiss", "graiss"]);

const CONSONANTS = "bcdfghjklmnpqrstvwxzç";

function verb(word: string): string {
  const lower = word.toLowerCase();
  if (NOT_VERBS.has(lower)) return word;
  let out = IRREGULAR[lower];
  if (!out) {
    const stem = lower.slice(0, -2);
    if (stem.endsWith("iss") && !FIRST_GROUP_ISS.has(stem)) out = stem.slice(0, -1); // garnissez → garnis
    else if (stem.endsWith("end")) out = `${stem}s`; // descendez → descends
    else if (stem.endsWith("oy") || stem.endsWith("uy")) out = `${stem.slice(0, -1)}ie`; // nettoyez → nettoie
    else {
      // séchez → sèche, accélérez → accélère: last "é" before final consonants becomes "è".
      const m = new RegExp(`é([${CONSONANTS}]+)$`).exec(stem);
      out = (m ? stem.slice(0, m.index) + "è" + m[1] : stem) + "e";
    }
  }
  return word[0] === word[0]!.toUpperCase() ? out[0]!.toUpperCase() + out.slice(1) : out;
}

export function tutoie(text: string): string {
  let s = text;
  for (const [re, to] of PHRASES) s = s.replace(re, to);
  return s
    .replace(/(?<![\p{L}])(\p{L}+ez)(?![\p{L}])/gu, (w) => verb(w))
    .replace(/(?<![\p{L}])([Ff]aites|[Dd]ites)(?![\p{L}])/gu, (w) => verb(w));
}
