import type { Equipment, MealType, Recipe, RecipeTag } from "@weeko/engine";

/**
 * Compact authoring format. Quantities are per serving (recipes have 1
 * reference serving; the engine scales them for each person).
 */
export type Ing = [id: string, qty: number];

export interface R {
  id: string;
  name: string;
  desc?: string;
  meals: MealType[];
  ing: Ing[];
  steps: string[];
  prep: number;
  cook: number;
  diff?: 1 | 2 | 3;
  tags?: RecipeTag[];
  eq?: Equipment[];
  cuisine: string;
  keeps: number;
  img: string;
}

export const MAIN: MealType[] = ["lunch", "dinner"];
export const BREAKFAST: MealType[] = ["breakfast"];
export const SNACK: MealType[] = ["snack"];

export function toRecipe(r: R): Recipe {
  // Merge duplicated ingredients (a template can add the same item twice).
  const merged = new Map<string, number>();
  for (const [id, q] of r.ing) merged.set(id, (merged.get(id) ?? 0) + q);
  return {
    id: r.id,
    name: { fr: r.name },
    description: r.desc ? { fr: r.desc } : undefined,
    meals: r.meals,
    servings: 1,
    ingredients: [...merged].map(([id, qty]) => ({ id, qty })),
    steps: r.steps.map((s) => ({ fr: s })),
    prepMin: r.prep,
    cookMin: r.cook,
    difficulty: r.diff ?? 1,
    tags: r.tags ?? [],
    equipment: r.eq ?? [],
    cuisine: r.cuisine,
    keepsDays: r.keeps,
    imageQuery: r.img,
    family: r.id.split("-")[0],
  };
}

export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------- Proteins

export interface Protein {
  key: string;
  ing: Ing[];
  /** bare noun: "poulet" */
  name: string;
  /** "de poulet", "d'agneau" */
  de: string;
  /** "au poulet", "à la dinde", "aux crevettes" */
  au: string;
  /** "le poulet", "les pois chiches" */
  le: string;
  prep: string;
  sear: string;
  img: string;
  kind: "meat" | "fish" | "veg";
  /** Minutes of active cooking */
  min: number;
}

export const P = {
  chicken: {
    key: "poulet",
    ing: [["chicken_breast", 130]],
    name: "poulet",
    de: "de poulet",
    au: "au poulet",
    le: "le poulet",
    prep: "Coupez le poulet en morceaux de taille égale.",
    sear: "Faites dorer le poulet 6 à 8 min à feu moyen-vif, jusqu'à ce qu'il soit bien cuit à cœur.",
    img: "chicken",
    kind: "meat",
    min: 8,
  },
  thigh: {
    key: "cuisse-poulet",
    ing: [["chicken_thigh", 140]],
    name: "cuisse de poulet",
    de: "de cuisse de poulet",
    au: "à la cuisse de poulet",
    le: "le poulet",
    prep: "Coupez les hauts de cuisse en morceaux.",
    sear: "Faites dorer le poulet 8 à 10 min à feu moyen-vif, jusqu'à ce qu'il soit bien cuit à cœur.",
    img: "chicken thigh",
    kind: "meat",
    min: 10,
  },
  turkey: {
    key: "dinde",
    ing: [["turkey", 130]],
    name: "dinde",
    de: "de dinde",
    au: "à la dinde",
    le: "la dinde",
    prep: "Coupez la dinde en lanières.",
    sear: "Faites dorer la dinde 5 à 6 min à feu moyen-vif, jusqu'à ce qu'elle soit bien cuite.",
    img: "turkey",
    kind: "meat",
    min: 6,
  },
  beef: {
    key: "boeuf",
    ing: [["beef_steak", 120]],
    name: "bœuf",
    de: "de bœuf",
    au: "au bœuf",
    le: "le bœuf",
    prep: "Coupez le bœuf en fines lanières, dans le sens contraire des fibres.",
    sear: "Saisissez le bœuf 2 à 3 min à feu vif, puis réservez-le.",
    img: "beef",
    kind: "meat",
    min: 3,
  },
  pork: {
    key: "porc",
    ing: [["pork_tenderloin", 130]],
    name: "porc",
    de: "de porc",
    au: "au porc",
    le: "le porc",
    prep: "Coupez le filet mignon en médaillons puis en lanières.",
    sear: "Faites dorer le porc 5 à 6 min à feu moyen-vif, jusqu'à ce qu'il soit bien cuit.",
    img: "pork",
    kind: "meat",
    min: 6,
  },
  shrimp: {
    key: "crevettes",
    ing: [["shrimp", 130]],
    name: "crevettes",
    de: "de crevettes",
    au: "aux crevettes",
    le: "les crevettes",
    prep: "Faites décongeler les crevettes, rincez-les et séchez-les.",
    sear: "Faites sauter les crevettes 3 à 4 min, jusqu'à ce qu'elles soient roses.",
    img: "shrimp",
    kind: "fish",
    min: 4,
  },
  salmon: {
    key: "saumon",
    ing: [["salmon", 120]],
    name: "saumon",
    de: "de saumon",
    au: "au saumon",
    le: "le saumon",
    prep: "Retirez la peau du saumon et coupez-le en cubes.",
    sear: "Faites cuire le saumon 4 à 5 min en le retournant délicatement.",
    img: "salmon",
    kind: "fish",
    min: 5,
  },
  fish: {
    key: "colin",
    ing: [["white_fish", 150]],
    name: "colin",
    de: "de colin",
    au: "au colin",
    le: "le colin",
    prep: "Faites décongeler le colin et séchez-le avec du papier absorbant.",
    sear: "Faites cuire le colin 3 min de chaque côté, jusqu'à ce que la chair s'effeuille.",
    img: "white fish",
    kind: "fish",
    min: 6,
  },
  tuna: {
    key: "thon",
    ing: [["tuna_can", 90]],
    name: "thon",
    de: "de thon",
    au: "au thon",
    le: "le thon",
    prep: "Égouttez le thon et émiettez-le.",
    sear: "Ajoutez le thon en fin de cuisson, juste pour le réchauffer.",
    img: "tuna",
    kind: "fish",
    min: 1,
  },
  tofu: {
    key: "tofu",
    ing: [["tofu", 150]],
    name: "tofu",
    de: "de tofu",
    au: "au tofu",
    le: "le tofu",
    prep: "Égouttez le tofu, épongez-le et coupez-le en dés.",
    sear: "Faites dorer le tofu 8 min en remuant, jusqu'à ce qu'il soit croustillant.",
    img: "tofu",
    kind: "veg",
    min: 8,
  },
  chickpeas: {
    key: "pois-chiches",
    ing: [["chickpeas", 140]],
    name: "pois chiches",
    de: "de pois chiches",
    au: "aux pois chiches",
    le: "les pois chiches",
    prep: "Égouttez et rincez les pois chiches.",
    sear: "Faites revenir les pois chiches 5 min pour qu'ils soient bien chauds.",
    img: "chickpeas",
    kind: "veg",
    min: 5,
  },
  egg: {
    key: "oeufs",
    ing: [["egg", 2]],
    name: "œufs",
    de: "d'œufs",
    au: "aux œufs",
    le: "les œufs",
    prep: "Battez les œufs avec une pincée de sel.",
    sear: "Versez les œufs battus et remuez 1 à 2 min, jusqu'à ce qu'ils soient pris.",
    img: "egg",
    kind: "veg",
    min: 2,
  },
} satisfies Record<string, Protein>;

// ---------------------------------------------------------------- Starches

export interface Starch {
  key: string;
  ing: Ing[];
  name: string;
  /** "de riz", "de quinoa" */
  de: string;
  cook: string;
  img: string;
  /** Cooking time in minutes */
  min: number;
}

export const S = {
  rice: {
    key: "riz",
    ing: [["rice", 75]],
    name: "riz",
    de: "de riz",
    cook: "Faites cuire le riz dans un grand volume d'eau salée environ 11 min, puis égouttez.",
    img: "rice",
    min: 12,
  },
  basmati: {
    key: "basmati",
    ing: [["basmati", 75]],
    name: "riz basmati",
    de: "de riz basmati",
    cook: "Rincez le riz basmati puis faites-le cuire 10 min dans l'eau bouillante salée.",
    img: "basmati rice",
    min: 11,
  },
  brownRice: {
    key: "riz-complet",
    ing: [["brown_rice", 75]],
    name: "riz complet",
    de: "de riz complet",
    cook: "Faites cuire le riz complet 25 min dans l'eau bouillante salée, puis égouttez.",
    img: "brown rice",
    min: 25,
  },
  quinoa: {
    key: "quinoa",
    ing: [["quinoa", 70]],
    name: "quinoa",
    de: "de quinoa",
    cook: "Rincez le quinoa et faites-le cuire 12 min dans deux fois son volume d'eau salée.",
    img: "quinoa",
    min: 12,
  },
  bulgur: {
    key: "boulgour",
    ing: [["bulgur", 70]],
    name: "boulgour",
    de: "de boulgour",
    cook: "Faites cuire le boulgour 10 min dans deux fois son volume d'eau salée, puis laissez gonfler à couvert.",
    img: "bulgur",
    min: 10,
  },
  couscous: {
    key: "semoule",
    ing: [["couscous", 70]],
    name: "semoule",
    de: "de semoule",
    cook: "Versez la même quantité d'eau bouillante salée sur la semoule, couvrez 5 min puis égrainez à la fourchette.",
    img: "couscous",
    min: 5,
  },
  pasta: {
    key: "pates",
    ing: [["pasta", 80]],
    name: "pâtes",
    de: "de pâtes",
    cook: "Faites cuire les pâtes al dente dans un grand volume d'eau salée, puis égouttez.",
    img: "pasta",
    min: 11,
  },
  wholePasta: {
    key: "pates-completes",
    ing: [["wholewheat_pasta", 80]],
    name: "pâtes complètes",
    de: "de pâtes complètes",
    cook: "Faites cuire les pâtes complètes al dente dans l'eau bouillante salée, puis égouttez.",
    img: "wholewheat pasta",
    min: 11,
  },
  potato: {
    key: "pommes-de-terre",
    ing: [["potato", 250]],
    name: "pommes de terre",
    de: "de pommes de terre",
    cook: "Coupez les pommes de terre en morceaux et faites-les cuire 15 à 20 min à l'eau salée (ou à la vapeur).",
    img: "potatoes",
    min: 20,
  },
  sweetPotato: {
    key: "patate-douce",
    ing: [["sweet_potato", 250]],
    name: "patate douce",
    de: "de patate douce",
    cook: "Épluchez la patate douce, coupez-la en cubes et faites-la cuire 12 à 15 min à la vapeur.",
    img: "sweet potato",
    min: 15,
  },
  riceNoodles: {
    key: "nouilles-riz",
    ing: [["rice_noodles", 70]],
    name: "nouilles de riz",
    de: "de nouilles de riz",
    cook: "Plongez les nouilles de riz dans l'eau bouillante hors du feu 4 à 5 min, puis égouttez et rincez à l'eau froide.",
    img: "rice noodles",
    min: 5,
  },
  eggNoodles: {
    key: "nouilles",
    ing: [["egg_noodles", 70]],
    name: "nouilles",
    de: "de nouilles",
    cook: "Faites cuire les nouilles 4 min dans l'eau bouillante, puis égouttez.",
    img: "noodles",
    min: 4,
  },
} satisfies Record<string, Starch>;

// ---------------------------------------------------------------- Fruits (breakfast & snacks)

export interface Fruit {
  key: string;
  ing: Ing[];
  name: string;
  /** "à la banane", "aux fruits rouges" */
  au: string;
  img: string;
  prep: string;
}

export const F = {
  banana: { key: "banane", ing: [["banana", 100]], name: "banane", au: "à la banane", img: "banana", prep: "Coupez la banane en rondelles." },
  apple: { key: "pomme", ing: [["apple", 130]], name: "pomme", au: "à la pomme", img: "apple", prep: "Coupez la pomme en petits dés." },
  berries: { key: "fruits-rouges", ing: [["frozen_berries", 100]], name: "fruits rouges", au: "aux fruits rouges", img: "berries", prep: "Faites décongeler les fruits rouges (ou passez-les 1 min au micro-ondes)." },
  pear: { key: "poire", ing: [["pear", 130]], name: "poire", au: "à la poire", img: "pear", prep: "Coupez la poire en dés." },
  kiwi: { key: "kiwi", ing: [["kiwi", 150]], name: "kiwi", au: "au kiwi", img: "kiwi", prep: "Épluchez les kiwis et coupez-les en rondelles." },
  mango: { key: "mangue", ing: [["mango", 120]], name: "mangue", au: "à la mangue", img: "mango", prep: "Coupez la mangue en dés." },
  strawberry: { key: "fraises", ing: [["strawberry", 150]], name: "fraises", au: "aux fraises", img: "strawberries", prep: "Lavez les fraises, équeutez-les et coupez-les en deux." },
  orange: { key: "orange", ing: [["orange", 150]], name: "orange", au: "à l'orange", img: "orange", prep: "Pelez l'orange à vif et coupez-la en morceaux." },
  applesauce: { key: "compote", ing: [["applesauce", 100]], name: "compote", au: "à la compote", img: "applesauce", prep: "Versez la compote dans un bol." },
} satisfies Record<string, Fruit>;

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
