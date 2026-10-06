import type { Aisle, BaseUnit, FoodTag, Ingredient, Nutrients } from "@weeko/engine";

/**
 * Ingredient reference table.
 *
 * Nutrition: per 100 g of raw edible part, values aligned on the ANSES CIQUAL
 * table (rounded). Run `pnpm --filter @weeko/catalog ciqual <file.csv>` to
 * refresh them from the official export.
 * Prices: average French supermarket prices (2026), per kg / L / piece.
 * Packs: common retail sizes, used to compute the shopping list and leftovers.
 */

type N = [kcal: number, protein: number, carbs: number, sugars: number, fat: number, satFat: number, fiber: number, salt: number];

interface Def {
  id: string;
  fr: string;
  en: string;
  frPl?: string;
  enPl?: string;
  aisle: Aisle;
  unit?: BaseUnit;
  pw?: number;
  density?: number;
  n: N;
  price: number;
  packs: number[];
  shelf: number;
  tags?: FoodTag[];
  staple?: boolean;
  season?: number[];
  kw?: string[];
  ciqual?: string;
}

/**
 * Seasonings and garnishes: removed from the recipe rather than excluding it,
 * unless the recipe is named after them (words below, FR and EN).
 */
const OMITTABLE: Record<string, string[]> = {
  garlic: ["ail", "aïoli", "garlic"],
  ginger: ["gingembre", "ginger"],
  shallot: ["échalote", "shallot"],
  spring_onion: ["oignon nouveau", "spring onion"],
  parsley: ["persil", "parsley", "gremolata", "taboulé", "tabbouleh"],
  basil: ["basilic", "basil", "pesto"],
  coriander: ["coriandre", "coriander", "cilantro"],
  chives: ["ciboulette", "chives"],
  mint: ["menthe", "mint"],
  sesame: ["sésame", "sesame"],
  chili_flakes: ["piment", "chili", "pimenté", "spicy", "épicé"],
  chili_powder: ["piment", "chili", "pimenté", "spicy", "épicé"],
  cumin: ["cumin"],
  curry: ["curry"],
  garam_masala: ["masala"],
  turmeric: ["curcuma", "turmeric"],
  cinnamon: ["cannelle", "cinnamon"],
  nutmeg: ["muscade", "nutmeg"],
  ras_el_hanout: ["ras el hanout"],
  five_spice: ["cinq-épices", "five-spice", "five spice"],
  paprika: ["paprika"],
  smoked_paprika: ["paprika"],
  herbes_provence: ["herbes"],
  oregano: ["origan", "oregano"],
  thyme: ["thym", "thyme"],
  bay_leaf: ["laurier", "bay"],
};

/** Vegetables (fruits, herbs and spices excluded), fresh, frozen or canned. */
const VEGETABLES = new Set([
  "carrot", "onion", "red_onion", "shallot", "zucchini", "eggplant", "bell_pepper", "tomato", "cherry_tomato",
  "cucumber", "lettuce", "salad_mix", "arugula", "spinach", "broccoli", "cauliflower", "green_beans", "leek",
  "mushroom", "cabbage", "red_cabbage", "butternut", "celery", "fennel", "beetroot", "radish", "spring_onion",
  "corn", "canned_tomato", "passata", "frozen_spinach", "frozen_green_beans", "frozen_peas", "frozen_veg_mix",
  "frozen_broccoli", "sweet_potato",
]);

function nutrients(n: N): Nutrients {
  const [kcal, protein, carbs, sugars, fat, satFat, fiber, salt] = n;
  return { kcal, protein, carbs, sugars, fat, satFat, fiber, salt };
}

function make(d: Def): Ingredient {
  return {
    id: d.id,
    name: { fr: d.fr, en: d.en },
    plural: d.frPl ? { fr: d.frPl, en: d.enPl ?? d.en } : undefined,
    aisle: d.aisle,
    unit: d.unit ?? "g",
    pieceWeight: d.pw,
    density: d.density,
    nutrition: nutrients(d.n),
    tags: d.tags ?? [],
    price: { FR: d.price },
    packs: d.packs,
    shelfLifeDays: d.shelf,
    staple: d.staple,
    omittable: OMITTABLE[d.id],
    vegetable: VEGETABLES.has(d.id) || undefined,
    season: d.season,
    keywords: d.kw ?? [d.en.toLowerCase()],
    source: d.ciqual ? `CIQUAL ${d.ciqual}` : "CIQUAL (approx.)",
  };
}

const range = (from: number, to: number) => {
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to) break;
  }
  return out;
};

const STAPLE = { staple: true, price: 0, packs: [] as number[], shelf: 365, aisle: "spices" as Aisle };

const defs: Def[] = [
  // ------------------------------------------------------------ Légumes
  { id: "carrot", fr: "Carotte", en: "Carrot", frPl: "Carottes", aisle: "produce", n: [36, 0.8, 7.6, 6, 0.3, 0.1, 2.6, 0.08], price: 1.6, packs: [125, 1000], shelf: 21 },
  { id: "onion", fr: "Oignon", en: "Onion", frPl: "Oignons", aisle: "produce", n: [40, 1.2, 7.5, 5, 0.2, 0, 1.7, 0.01], price: 2, packs: [150, 1000], shelf: 30 },
  { id: "red_onion", fr: "Oignon rouge", en: "Red onion", aisle: "produce", n: [42, 1.1, 8, 5.5, 0.1, 0, 1.7, 0.01], price: 3.5, packs: [100, 500], shelf: 30 },
  { id: "shallot", fr: "Échalote", en: "Shallot", frPl: "Échalotes", aisle: "produce", n: [72, 2.5, 14.6, 7.9, 0.1, 0, 3.2, 0.03], price: 6, packs: [50, 250], shelf: 30 },
  { id: "garlic", fr: "Gousse d'ail", en: "Garlic clove", frPl: "Gousses d'ail", enPl: "Garlic cloves", aisle: "produce", unit: "pc", pw: 5, n: [131, 6.4, 24, 1, 0.5, 0.1, 4, 0.04], price: 0.06, packs: [10, 30], shelf: 60, kw: ["garlic"] },
  { id: "potato", fr: "Pomme de terre", en: "Potato", frPl: "Pommes de terre", aisle: "produce", n: [80, 2, 16.5, 0.8, 0.1, 0, 1.8, 0.01], price: 1.5, packs: [250, 1000, 2500], shelf: 30 },
  { id: "sweet_potato", fr: "Patate douce", en: "Sweet potato", frPl: "Patates douces", aisle: "produce", n: [86, 1.6, 17.5, 4.2, 0.1, 0, 3, 0.14], price: 3, packs: [300, 1000], shelf: 21 },
  { id: "zucchini", fr: "Courgette", en: "Zucchini", frPl: "Courgettes", aisle: "produce", n: [17, 1.2, 2.2, 2, 0.3, 0.1, 1.1, 0.01], price: 2.5, packs: [250], shelf: 7, season: range(6, 9) },
  { id: "eggplant", fr: "Aubergine", en: "Eggplant", frPl: "Aubergines", aisle: "produce", n: [23, 1, 3.3, 2.8, 0.2, 0, 2.6, 0.01], price: 3, packs: [300], shelf: 7, season: range(7, 9) },
  { id: "bell_pepper", fr: "Poivron", en: "Bell pepper", frPl: "Poivrons", aisle: "produce", n: [31, 1, 5.4, 4.2, 0.3, 0, 1.9, 0.01], price: 4.5, packs: [200], shelf: 10, season: range(7, 9) },
  { id: "tomato", fr: "Tomate", en: "Tomato", frPl: "Tomates", aisle: "produce", n: [19, 0.8, 2.5, 2.6, 0.3, 0.1, 1.2, 0.01], price: 3, packs: [120, 500, 1000], shelf: 7, season: range(6, 9) },
  { id: "cherry_tomato", fr: "Tomates cerises", en: "Cherry tomatoes", aisle: "produce", n: [23, 1, 3.3, 3, 0.3, 0.1, 1.3, 0.01], price: 6, packs: [250, 500], shelf: 7, season: range(6, 9) },
  { id: "cucumber", fr: "Concombre", en: "Cucumber", frPl: "Concombres", aisle: "produce", n: [13, 0.6, 1.9, 1.7, 0.1, 0, 0.7, 0.01], price: 2.9, packs: [350], shelf: 7, season: range(5, 9) },
  { id: "lettuce", fr: "Laitue", en: "Lettuce", aisle: "produce", n: [15, 1.3, 1.5, 1, 0.2, 0, 1.3, 0.02], price: 3.3, packs: [300], shelf: 5 },
  { id: "salad_mix", fr: "Mesclun", en: "Mixed salad leaves", aisle: "produce", n: [18, 1.5, 1.7, 1, 0.3, 0, 1.6, 0.05], price: 10, packs: [125, 250], shelf: 4, kw: ["salad"] },
  { id: "arugula", fr: "Roquette", en: "Arugula", aisle: "produce", n: [25, 2.6, 2.1, 2, 0.7, 0.1, 1.6, 0.07], price: 14, packs: [125], shelf: 4 },
  { id: "spinach", fr: "Pousses d'épinard", en: "Baby spinach", aisle: "produce", n: [23, 2.9, 1.4, 0.4, 0.4, 0.1, 2.2, 0.2], price: 10, packs: [125, 250], shelf: 4, kw: ["spinach"] },
  { id: "broccoli", fr: "Brocoli", en: "Broccoli", aisle: "produce", n: [34, 2.8, 4, 1.7, 0.4, 0, 2.6, 0.03], price: 3.5, packs: [500], shelf: 7 },
  { id: "cauliflower", fr: "Chou-fleur", en: "Cauliflower", aisle: "produce", n: [25, 1.9, 3, 2.4, 0.3, 0.1, 2, 0.03], price: 3, packs: [800], shelf: 7 },
  { id: "green_beans", fr: "Haricots verts", en: "Green beans", aisle: "produce", n: [31, 1.8, 4.7, 2, 0.2, 0, 3.4, 0], price: 6, packs: [500], shelf: 5, season: range(6, 9) },
  { id: "leek", fr: "Poireau", en: "Leek", frPl: "Poireaux", aisle: "produce", n: [31, 1.5, 4.3, 2.3, 0.3, 0, 3.5, 0.03], price: 2.8, packs: [200, 600], shelf: 10, season: range(9, 4) },
  { id: "mushroom", fr: "Champignons de Paris", en: "Button mushrooms", aisle: "produce", n: [22, 3, 0.5, 0.2, 0.3, 0, 2.5, 0.02], price: 5.5, packs: [250, 500], shelf: 5, kw: ["mushrooms"] },
  { id: "cabbage", fr: "Chou vert", en: "Green cabbage", aisle: "produce", n: [26, 1.6, 3.4, 3, 0.2, 0, 2.5, 0.03], price: 2, packs: [500, 1000], shelf: 14, season: range(10, 3) },
  { id: "red_cabbage", fr: "Chou rouge", en: "Red cabbage", aisle: "produce", n: [30, 1.4, 5, 4, 0.2, 0, 2.4, 0.03], price: 2, packs: [400, 800], shelf: 14 },
  { id: "butternut", fr: "Courge butternut", en: "Butternut squash", aisle: "produce", n: [45, 1, 9.7, 2.2, 0.1, 0, 2, 0], price: 2.5, packs: [600, 1200], shelf: 30, season: range(9, 2) },
  { id: "celery", fr: "Céleri branche", en: "Celery", aisle: "produce", n: [15, 0.7, 2, 1.3, 0.2, 0, 1.6, 0.2], price: 3, packs: [200, 400], shelf: 10, tags: ["celery"] },
  { id: "fennel", fr: "Fenouil", en: "Fennel", aisle: "produce", n: [21, 1.2, 3, 2.9, 0.2, 0, 2.2, 0.1], price: 4, packs: [300], shelf: 7, season: range(6, 10) },
  { id: "beetroot", fr: "Betterave cuite", en: "Cooked beetroot", aisle: "produce", n: [45, 1.7, 8.5, 7, 0.1, 0, 2, 0.2], price: 3, packs: [500], shelf: 7 },
  { id: "radish", fr: "Radis", en: "Radish", aisle: "produce", n: [16, 0.7, 2, 1.9, 0.1, 0, 1.6, 0.04], price: 4, packs: [250], shelf: 5, season: range(4, 7) },
  { id: "avocado", fr: "Avocat", en: "Avocado", frPl: "Avocats", enPl: "Avocados", aisle: "produce", unit: "pc", pw: 140, n: [160, 2, 1.8, 0.7, 14.7, 2.1, 6.7, 0.01], price: 1, packs: [1, 2], shelf: 5 },
  { id: "parsley", fr: "Persil", en: "Parsley", aisle: "produce", n: [36, 3, 6, 0.9, 0.8, 0.1, 3.3, 0.1], price: 25, packs: [30], shelf: 5 },
  { id: "basil", fr: "Basilic", en: "Basil", aisle: "produce", n: [23, 3.2, 2.7, 0.3, 0.6, 0, 1.6, 0], price: 35, packs: [30], shelf: 5 },
  { id: "coriander", fr: "Coriandre", en: "Coriander", aisle: "produce", n: [23, 2.1, 3.7, 0.9, 0.5, 0, 2.8, 0.1], price: 30, packs: [30], shelf: 5 },
  { id: "chives", fr: "Ciboulette", en: "Chives", aisle: "produce", n: [30, 3.3, 4.4, 1.9, 0.7, 0, 2.5, 0], price: 35, packs: [25], shelf: 5 },
  { id: "mint", fr: "Menthe", en: "Mint", aisle: "produce", n: [50, 3.3, 4.5, 0, 0.7, 0, 6.8, 0.08], price: 35, packs: [30], shelf: 5 },
  { id: "ginger", fr: "Gingembre frais", en: "Fresh ginger", aisle: "produce", n: [80, 1.8, 17.8, 1.7, 0.8, 0.2, 2, 0.03], price: 8, packs: [100], shelf: 21, kw: ["ginger"] },
  { id: "lemon", fr: "Citron", en: "Lemon", frPl: "Citrons", enPl: "Lemons", aisle: "produce", unit: "pc", pw: 100, n: [29, 1.1, 9.3, 2.5, 0.3, 0, 2.8, 0], price: 0.5, packs: [1, 4], shelf: 21 },
  { id: "lime", fr: "Citron vert", en: "Lime", frPl: "Citrons verts", enPl: "Limes", aisle: "produce", unit: "pc", pw: 60, n: [30, 0.7, 10.5, 1.7, 0.2, 0, 2.8, 0], price: 0.5, packs: [1, 3], shelf: 21 },
  { id: "spring_onion", fr: "Oignon nouveau", en: "Spring onion", aisle: "produce", n: [32, 1.8, 5.7, 2.3, 0.2, 0, 2.6, 0.02], price: 8, packs: [150], shelf: 7 },
  { id: "corn", fr: "Maïs doux en conserve", en: "Sweet corn", aisle: "grocery", n: [92, 2.9, 15, 4, 1.2, 0.2, 3.1, 0.5], price: 4.5, packs: [140, 285], shelf: 365, kw: ["corn"] },
  { id: "canned_tomato", fr: "Tomates concassées", en: "Chopped tomatoes", aisle: "grocery", n: [21, 1.1, 3.3, 2.8, 0.2, 0, 1.2, 0.05], price: 2.5, packs: [400, 800], shelf: 365 },
  { id: "passata", fr: "Coulis de tomate", en: "Tomato passata", aisle: "grocery", n: [33, 1.6, 5.3, 4.5, 0.2, 0, 1.5, 0.3], price: 2.4, packs: [500, 700], shelf: 365 },
  { id: "tomato_paste", fr: "Concentré de tomate", en: "Tomato paste", aisle: "grocery", n: [82, 4.3, 15, 12, 0.5, 0.1, 4, 0.3], price: 8, packs: [70, 140], shelf: 365 },
  { id: "frozen_spinach", fr: "Épinards hachés surgelés", en: "Frozen spinach", aisle: "frozen", n: [26, 3, 1, 0.4, 0.5, 0.1, 2.3, 0.25], price: 3, packs: [750], shelf: 180 },
  { id: "frozen_green_beans", fr: "Haricots verts surgelés", en: "Frozen green beans", aisle: "frozen", n: [28, 1.8, 4, 1.8, 0.2, 0, 3, 0.01], price: 2.8, packs: [1000], shelf: 180 },
  { id: "frozen_peas", fr: "Petits pois surgelés", en: "Frozen peas", aisle: "frozen", n: [70, 5.4, 9, 4, 0.4, 0.1, 5.5, 0.01], price: 3, packs: [1000], shelf: 180 },
  { id: "frozen_veg_mix", fr: "Poêlée de légumes surgelée", en: "Frozen vegetable mix", aisle: "frozen", n: [50, 2, 6, 3, 1.5, 0.2, 3, 0.3], price: 3.5, packs: [600, 1000], shelf: 180 },
  { id: "frozen_broccoli", fr: "Brocolis surgelés", en: "Frozen broccoli", aisle: "frozen", n: [30, 2.8, 3, 1.5, 0.4, 0, 2.6, 0.03], price: 3, packs: [1000], shelf: 180 },
  { id: "olives", fr: "Olives noires", en: "Black olives", aisle: "grocery", n: [200, 1.6, 1, 0, 20, 3, 4, 3], price: 12, packs: [150], shelf: 30 },

  // ------------------------------------------------------------ Fruits
  { id: "apple", fr: "Pomme", en: "Apple", frPl: "Pommes", aisle: "produce", n: [53, 0.3, 11.6, 9.4, 0.2, 0, 1.4, 0], price: 2.5, packs: [150, 1000], shelf: 21 },
  { id: "banana", fr: "Banane", en: "Banana", frPl: "Bananes", aisle: "produce", n: [90, 1.1, 20, 15, 0.3, 0.1, 2, 0], price: 2, packs: [120, 1000], shelf: 6 },
  { id: "orange", fr: "Orange", en: "Orange", frPl: "Oranges", aisle: "produce", n: [46, 0.9, 9, 8.5, 0.1, 0, 2, 0], price: 2.5, packs: [200, 1000, 2000], shelf: 14, season: range(11, 4) },
  { id: "pear", fr: "Poire", en: "Pear", frPl: "Poires", aisle: "produce", n: [55, 0.4, 11.5, 9.5, 0.2, 0, 3, 0], price: 3, packs: [180, 1000], shelf: 7, season: range(8, 2) },
  { id: "kiwi", fr: "Kiwi", en: "Kiwi", frPl: "Kiwis", aisle: "produce", n: [58, 1, 11, 9, 0.5, 0, 2.5, 0], price: 4.5, packs: [80, 500], shelf: 14, season: range(11, 4) },
  { id: "strawberry", fr: "Fraises", en: "Strawberries", aisle: "produce", n: [33, 0.7, 6, 6, 0.3, 0, 1.8, 0], price: 9, packs: [250, 500], shelf: 3, season: range(4, 7) },
  { id: "mango", fr: "Mangue", en: "Mango", aisle: "produce", n: [65, 0.6, 13.5, 13, 0.4, 0.1, 1.7, 0], price: 5, packs: [400], shelf: 7 },
  { id: "frozen_berries", fr: "Fruits rouges surgelés", en: "Frozen mixed berries", aisle: "frozen", n: [45, 0.9, 7, 6, 0.3, 0, 4, 0], price: 8, packs: [500], shelf: 180, kw: ["berries"] },
  { id: "raisins", fr: "Raisins secs", en: "Raisins", aisle: "sweet", n: [300, 3, 68, 64, 0.5, 0, 4.5, 0.03], price: 8, packs: [250, 500], shelf: 180 },
  { id: "dried_apricot", fr: "Abricots secs", en: "Dried apricots", aisle: "sweet", n: [240, 3.4, 54, 47, 0.3, 0, 6.6, 0.03], price: 12, packs: [250], shelf: 180 },
  { id: "applesauce", fr: "Compote de pomme sans sucre ajouté", en: "Unsweetened applesauce", aisle: "sweet", n: [54, 0.3, 12, 11, 0.2, 0, 1.5, 0], price: 3.5, packs: [400, 800], shelf: 30, kw: ["applesauce"] },

  // ------------------------------------------------------------ Viandes
  { id: "chicken_breast", fr: "Blanc de poulet", en: "Chicken breast", aisle: "meat", n: [110, 23.5, 0, 0, 1.6, 0.4, 0, 0.17], price: 13, packs: [300, 600, 1000], shelf: 3, tags: ["meat", "poultry"] },
  { id: "chicken_thigh", fr: "Haut de cuisse de poulet désossé", en: "Boneless chicken thigh", aisle: "meat", n: [160, 18, 0, 0, 9.5, 2.8, 0, 0.2], price: 10, packs: [500, 1000], shelf: 3, tags: ["meat", "poultry"] },
  { id: "chicken_drumstick", fr: "Pilons de poulet", en: "Chicken drumsticks", aisle: "meat", n: [160, 18, 0, 0, 9.6, 2.7, 0, 0.2], price: 6.5, packs: [600, 1000], shelf: 3, tags: ["meat", "poultry"] },
  { id: "turkey", fr: "Escalope de dinde", en: "Turkey cutlet", aisle: "meat", n: [108, 24, 0, 0, 1.5, 0.5, 0, 0.15], price: 13, packs: [300, 500], shelf: 3, tags: ["meat", "poultry"] },
  { id: "ground_beef", fr: "Bœuf haché 5 %", en: "Lean ground beef", aisle: "meat", n: [125, 21, 0, 0, 4.5, 2, 0, 0.2], price: 13, packs: [250, 500], shelf: 2, tags: ["meat", "beef"] },
  { id: "ground_beef_15", fr: "Bœuf haché 15 %", en: "Ground beef", aisle: "meat", n: [215, 18, 0, 0, 15, 6.5, 0, 0.2], price: 10, packs: [500, 1000], shelf: 2, tags: ["meat", "beef"] },
  { id: "beef_steak", fr: "Bavette de bœuf", en: "Beef flank steak", aisle: "meat", n: [150, 21, 0, 0, 7, 3, 0, 0.15], price: 22, packs: [250, 500], shelf: 3, tags: ["meat", "beef"] },
  { id: "beef_stew", fr: "Bœuf à mijoter", en: "Stewing beef", aisle: "meat", n: [180, 20, 0, 0, 11, 4.5, 0, 0.15], price: 15, packs: [500, 1000], shelf: 3, tags: ["meat", "beef"] },
  { id: "pork_tenderloin", fr: "Filet mignon de porc", en: "Pork tenderloin", aisle: "meat", n: [125, 21.5, 0, 0, 4.2, 1.4, 0, 0.15], price: 16, packs: [500], shelf: 3, tags: ["meat", "pork"] },
  { id: "pork_chop", fr: "Côte de porc", en: "Pork chop", aisle: "meat", n: [200, 19, 0, 0, 13.5, 5, 0, 0.16], price: 11, packs: [500], shelf: 3, tags: ["meat", "pork"] },
  { id: "ham", fr: "Jambon blanc", en: "Cooked ham", aisle: "meat", n: [115, 20, 0.8, 0.8, 3.5, 1.2, 0, 1.9], price: 14, packs: [160, 240], shelf: 5, tags: ["meat", "pork"] },
  { id: "bacon", fr: "Lardons", en: "Bacon lardons", aisle: "meat", n: [220, 16, 0.5, 0.5, 17, 6.5, 0, 2.4], price: 12, packs: [150, 200], shelf: 7, tags: ["meat", "pork"] },
  { id: "chorizo", fr: "Chorizo", en: "Chorizo", aisle: "meat", n: [450, 24, 2, 1, 38, 14, 0, 3.8], price: 18, packs: [100, 250], shelf: 30, tags: ["meat", "pork"] },
  { id: "sausage", fr: "Saucisse de Toulouse", en: "Toulouse sausage", aisle: "meat", n: [280, 15, 1, 0.5, 24, 9, 0, 2], price: 11, packs: [400, 600], shelf: 4, tags: ["meat", "pork"] },
  { id: "merguez", fr: "Merguez", en: "Merguez sausage", aisle: "meat", n: [290, 15, 1, 0.5, 25, 10, 0, 2.2], price: 12, packs: [400], shelf: 4, tags: ["meat", "beef", "lamb"] },
  { id: "lamb", fr: "Épaule d'agneau", en: "Lamb shoulder", aisle: "meat", n: [190, 19, 0, 0, 12.5, 6, 0, 0.2], price: 20, packs: [500, 1000], shelf: 3, tags: ["meat", "lamb"] },
  { id: "chicken_whole_legs", fr: "Cuisses de poulet", en: "Chicken legs", aisle: "meat", n: [170, 18, 0, 0, 10.5, 3, 0, 0.2], price: 7, packs: [800, 1200], shelf: 3, tags: ["meat", "poultry"] },

  // ------------------------------------------------------------ Poissons
  { id: "salmon", fr: "Pavé de saumon", en: "Salmon fillet", aisle: "fish", n: [200, 20, 0, 0, 13, 2.8, 0, 0.1], price: 28, packs: [250, 500], shelf: 2, tags: ["fish"] },
  { id: "cod", fr: "Dos de cabillaud", en: "Cod fillet", aisle: "fish", n: [82, 18.5, 0, 0, 0.8, 0.2, 0, 0.2], price: 25, packs: [300, 500], shelf: 2, tags: ["fish"] },
  { id: "white_fish", fr: "Filets de colin surgelés", en: "Frozen pollock fillets", aisle: "frozen", n: [80, 17.5, 0, 0, 1, 0.2, 0, 0.25], price: 11, packs: [400, 1000], shelf: 180, tags: ["fish"], kw: ["white fish"] },
  { id: "frozen_salmon", fr: "Pavés de saumon surgelés", en: "Frozen salmon fillets", aisle: "frozen", n: [200, 20, 0, 0, 13, 2.8, 0, 0.1], price: 20, packs: [500], shelf: 180, tags: ["fish"], kw: ["salmon"] },
  { id: "tuna_can", fr: "Thon au naturel", en: "Canned tuna", aisle: "grocery", n: [116, 26, 0, 0, 1, 0.3, 0, 0.8], price: 14, packs: [140, 280], shelf: 365, tags: ["fish"], kw: ["tuna"] },
  { id: "sardines_can", fr: "Sardines à l'huile", en: "Canned sardines", aisle: "grocery", n: [220, 24, 0, 0, 13.5, 3, 0, 0.9], price: 12, packs: [115], shelf: 365, tags: ["fish"], kw: ["sardines"] },
  { id: "mackerel_can", fr: "Maquereaux au naturel", en: "Canned mackerel", aisle: "grocery", n: [190, 21, 0, 0, 12, 3, 0, 0.9], price: 11, packs: [125], shelf: 365, tags: ["fish"], kw: ["mackerel"] },
  { id: "smoked_salmon", fr: "Saumon fumé", en: "Smoked salmon", aisle: "fish", n: [180, 22, 0, 0, 10, 2, 0, 3], price: 40, packs: [100, 200], shelf: 10, tags: ["fish", "pregnancy_avoid"] },
  { id: "shrimp", fr: "Crevettes crues décortiquées surgelées", en: "Frozen raw shrimp", aisle: "frozen", n: [80, 18, 0, 0, 1, 0.2, 0, 0.7], price: 18, packs: [400], shelf: 180, tags: ["seafood"], kw: ["shrimp"] },
  { id: "mussels", fr: "Moules", en: "Mussels", aisle: "fish", n: [86, 12, 3.5, 0, 2.2, 0.4, 0, 0.6], price: 6, packs: [500, 1000, 2000], shelf: 2, tags: ["seafood"] },
  { id: "surimi", fr: "Surimi", en: "Surimi sticks", aisle: "fish", n: [110, 7.5, 15, 5, 2, 0.3, 0, 1.6], price: 9, packs: [250], shelf: 10, tags: ["fish", "egg", "gluten"] },

  // ------------------------------------------------------------ Crèmerie, œufs
  { id: "egg", fr: "Œuf", en: "Egg", frPl: "Œufs", enPl: "Eggs", aisle: "dairy", unit: "pc", pw: 55, n: [140, 12.7, 0.3, 0.3, 9.8, 2.7, 0, 0.31], price: 0.3, packs: [6, 12], shelf: 21, tags: ["egg"] },
  { id: "milk", fr: "Lait demi-écrémé", en: "Semi-skimmed milk", aisle: "dairy", unit: "ml", density: 1.03, n: [46, 3.3, 4.8, 4.8, 1.6, 1, 0, 0.1], price: 1.1, packs: [1000], shelf: 7, tags: ["dairy"], kw: ["milk"] },
  { id: "butter", fr: "Beurre doux", en: "Butter", aisle: "dairy", n: [745, 0.7, 0.6, 0.6, 82, 55, 0, 0.03], price: 10, packs: [125, 250], shelf: 30, tags: ["dairy"] },
  { id: "cream", fr: "Crème fraîche épaisse", en: "Crème fraîche", aisle: "dairy", n: [300, 2.3, 2.8, 2.8, 30, 20, 0, 0.07], price: 6, packs: [200, 400], shelf: 10, tags: ["dairy"] },
  { id: "light_cream", fr: "Crème légère 15 %", en: "Light cream", aisle: "dairy", n: [160, 2.8, 4, 3.5, 15, 10, 0, 0.08], price: 5, packs: [200], shelf: 10, tags: ["dairy"] },
  { id: "yogurt", fr: "Yaourt nature", en: "Plain yogurt", frPl: "Yaourts nature", aisle: "dairy", n: [55, 4.2, 5.5, 5.5, 1.6, 1, 0, 0.15], price: 2.4, packs: [500, 1000], shelf: 21, tags: ["dairy"] },
  { id: "greek_yogurt", fr: "Yaourt à la grecque", en: "Greek yogurt", aisle: "dairy", n: [120, 4.5, 4, 4, 10, 6.5, 0, 0.1], price: 4.5, packs: [500], shelf: 21, tags: ["dairy"] },
  { id: "skyr", fr: "Skyr nature", en: "Skyr", aisle: "dairy", n: [62, 11, 4, 4, 0.2, 0.1, 0, 0.1], price: 5.5, packs: [450, 900], shelf: 21, tags: ["dairy"] },
  { id: "fromage_blanc", fr: "Fromage blanc 3 %", en: "Fromage blanc", aisle: "dairy", n: [75, 7, 4, 4, 3, 2, 0, 0.1], price: 3, packs: [500, 1000], shelf: 14, tags: ["dairy"] },
  { id: "emmental", fr: "Emmental râpé", en: "Grated emmental", aisle: "dairy", n: [380, 28, 0, 0, 29.5, 19, 0, 0.7], price: 11, packs: [200, 400], shelf: 30, tags: ["dairy"], kw: ["grated cheese"] },
  { id: "mozzarella", fr: "Mozzarella", en: "Mozzarella", aisle: "dairy", n: [250, 18, 1, 1, 19, 13, 0, 0.5], price: 10, packs: [125], shelf: 7, tags: ["dairy"] },
  { id: "parmesan", fr: "Parmesan", en: "Parmesan", aisle: "dairy", n: [400, 33, 0, 0, 29, 19, 0, 1.6], price: 22, packs: [100, 200], shelf: 60, tags: ["dairy"] },
  { id: "feta", fr: "Feta", en: "Feta", aisle: "dairy", n: [270, 15, 1, 1, 23, 16, 0, 2.7], price: 12, packs: [200], shelf: 14, tags: ["dairy"] },
  { id: "goat_cheese", fr: "Bûche de chèvre", en: "Goat cheese log", aisle: "dairy", n: [300, 18, 1, 1, 25, 17, 0, 1.4], price: 12, packs: [180], shelf: 14, tags: ["dairy"] },
  { id: "comte", fr: "Comté", en: "Comté cheese", aisle: "dairy", n: [410, 28, 0, 0, 33, 21, 0, 0.8], price: 20, packs: [200], shelf: 30, tags: ["dairy"], kw: ["cheese"] },
  { id: "ricotta", fr: "Ricotta", en: "Ricotta", aisle: "dairy", n: [150, 9, 3, 3, 11, 7, 0, 0.2], price: 9, packs: [250], shelf: 7, tags: ["dairy"] },
  { id: "cream_cheese", fr: "Fromage frais à tartiner", en: "Cream cheese", aisle: "dairy", n: [230, 6, 4, 4, 21, 14, 0, 0.8], price: 9, packs: [150], shelf: 14, tags: ["dairy"] },
  { id: "raclette", fr: "Fromage à raclette", en: "Raclette cheese", aisle: "dairy", n: [350, 23, 0, 0, 28, 18, 0, 1.8], price: 16, packs: [400], shelf: 21, tags: ["dairy"] },
  { id: "pizza_dough", fr: "Pâte à pizza", en: "Pizza dough", aisle: "dairy", n: [280, 7.5, 47, 2, 7, 1.5, 2, 1.3], price: 10, packs: [260], shelf: 14, tags: ["gluten"] },
  { id: "puff_pastry", fr: "Pâte feuilletée", en: "Puff pastry", aisle: "dairy", n: [400, 6, 38, 1.5, 25, 12, 1.7, 1], price: 8, packs: [230], shelf: 14, tags: ["gluten"] },
  { id: "shortcrust", fr: "Pâte brisée", en: "Shortcrust pastry", aisle: "dairy", n: [400, 5.5, 42, 1.5, 23, 10, 2, 1], price: 7, packs: [230], shelf: 14, tags: ["gluten"] },
  { id: "gnocchi", fr: "Gnocchis", en: "Gnocchi", aisle: "dairy", n: [160, 4, 34, 1, 0.6, 0.1, 2, 1], price: 4, packs: [500], shelf: 30, tags: ["gluten"] },
  { id: "fresh_pasta", fr: "Tagliatelles fraîches", en: "Fresh tagliatelle", aisle: "dairy", n: [280, 11, 52, 1.5, 3, 0.8, 2.5, 0.05], price: 6, packs: [250, 500], shelf: 14, tags: ["gluten", "egg"] },
  { id: "hummus", fr: "Houmous", en: "Hummus", aisle: "dairy", n: [300, 7, 12, 1, 25, 2.5, 5, 1.2], price: 10, packs: [200], shelf: 10, tags: ["sesame"] },

  // ------------------------------------------------------------ Végétal
  { id: "tofu", fr: "Tofu ferme", en: "Firm tofu", aisle: "plant", n: [120, 12.5, 2, 0.6, 7, 1.2, 1.5, 0.02], price: 9, packs: [200, 400], shelf: 10, tags: ["soy"], kw: ["tofu"] },
  { id: "smoked_tofu", fr: "Tofu fumé", en: "Smoked tofu", aisle: "plant", n: [150, 15, 2, 1, 9, 1.5, 1.5, 0.6], price: 11, packs: [175], shelf: 14, tags: ["soy"], kw: ["tofu"] },
  { id: "soy_drink", fr: "Boisson au soja", en: "Soy drink", aisle: "plant", unit: "ml", n: [39, 3.3, 0.7, 0.3, 1.8, 0.3, 0.6, 0.1], price: 1.8, packs: [1000], shelf: 7, tags: ["soy"], kw: ["soy milk"] },
  { id: "oat_drink", fr: "Boisson à l'avoine", en: "Oat drink", aisle: "plant", unit: "ml", n: [45, 0.7, 7, 4, 1.5, 0.2, 0.8, 0.1], price: 2, packs: [1000], shelf: 7, tags: ["gluten"], kw: ["oat milk"] },
  { id: "soy_yogurt", fr: "Dessert au soja nature", en: "Plain soy yogurt", aisle: "plant", n: [50, 4, 2.5, 1, 2.2, 0.4, 0.6, 0.1], price: 4, packs: [400, 500], shelf: 14, tags: ["soy"], kw: ["yogurt"] },
  { id: "soy_mince", fr: "Protéines de soja texturées", en: "Textured soy protein", aisle: "grocery", n: [340, 50, 20, 10, 1, 0.1, 15, 0.02], price: 14, packs: [250], shelf: 365, tags: ["soy"] },
  { id: "coconut_milk", fr: "Lait de coco", en: "Coconut milk", aisle: "grocery", unit: "ml", n: [180, 1.6, 3, 2.5, 18, 16, 0, 0.03], price: 5, packs: [400], shelf: 365 },

  // ------------------------------------------------------------ Boulangerie
  { id: "baguette", fr: "Baguette", en: "Baguette", aisle: "bakery", n: [270, 9, 55, 3, 1.4, 0.3, 3, 1.4], price: 4, packs: [250], shelf: 2, tags: ["gluten"] },
  { id: "wholemeal_bread", fr: "Pain complet", en: "Wholemeal bread", aisle: "bakery", n: [245, 9, 43, 3, 3, 0.6, 7, 1.1], price: 6, packs: [500], shelf: 5, tags: ["gluten"], kw: ["bread"] },
  { id: "sandwich_bread", fr: "Pain de mie complet", en: "Wholemeal sandwich bread", aisle: "bakery", n: [250, 9, 44, 5, 4, 0.6, 6, 1.1], price: 4.5, packs: [500], shelf: 10, tags: ["gluten"], kw: ["toast"] },
  { id: "tortilla", fr: "Tortilla de blé", en: "Wheat tortilla", frPl: "Tortillas de blé", enPl: "Wheat tortillas", aisle: "grocery", unit: "pc", pw: 62, n: [300, 8, 50, 3, 7, 2.5, 3, 1.2], price: 0.35, packs: [6, 8], shelf: 14, tags: ["gluten"] },
  { id: "pita", fr: "Pain pita", en: "Pita bread", frPl: "Pains pita", enPl: "Pita breads", aisle: "bakery", unit: "pc", pw: 60, n: [270, 9, 55, 2, 1.5, 0.3, 2, 1.1], price: 0.3, packs: [6], shelf: 7, tags: ["gluten"] },
  { id: "burger_bun", fr: "Pain à burger", en: "Burger bun", frPl: "Pains à burger", enPl: "Burger buns", aisle: "bakery", unit: "pc", pw: 60, n: [280, 9, 50, 7, 5, 1, 2.5, 1.1], price: 0.35, packs: [4, 6], shelf: 7, tags: ["gluten"] },
  { id: "rice_cakes", fr: "Galettes de riz", en: "Rice cakes", aisle: "grocery", n: [380, 8, 80, 0.5, 3, 0.6, 4, 0.1], price: 12, packs: [130], shelf: 180 },

  // ------------------------------------------------------------ Épicerie
  { id: "pasta", fr: "Pâtes", en: "Pasta", aisle: "grocery", n: [355, 12.5, 71, 3, 1.5, 0.3, 3, 0.01], price: 2, packs: [500, 1000], shelf: 365, tags: ["gluten"] },
  { id: "spaghetti", fr: "Spaghettis", en: "Spaghetti", aisle: "grocery", n: [355, 12.5, 71, 3, 1.5, 0.3, 3, 0.01], price: 2, packs: [500, 1000], shelf: 365, tags: ["gluten"] },
  { id: "wholewheat_pasta", fr: "Pâtes complètes", en: "Wholewheat pasta", aisle: "grocery", n: [350, 13, 64, 3, 2.5, 0.5, 8, 0.01], price: 3, packs: [500], shelf: 365, tags: ["gluten"], kw: ["pasta"] },
  { id: "lasagna_sheets", fr: "Feuilles de lasagnes", en: "Lasagna sheets", aisle: "grocery", n: [355, 12.5, 71, 3, 1.5, 0.3, 3, 0.01], price: 4, packs: [500], shelf: 365, tags: ["gluten"] },
  { id: "rice", fr: "Riz long", en: "Long grain rice", aisle: "grocery", n: [350, 7, 78, 0.3, 0.6, 0.2, 1.3, 0], price: 2.2, packs: [500, 1000], shelf: 365, kw: ["rice"] },
  { id: "basmati", fr: "Riz basmati", en: "Basmati rice", aisle: "grocery", n: [350, 8, 77, 0.3, 0.8, 0.2, 1.5, 0], price: 3.5, packs: [500, 1000], shelf: 365, kw: ["rice"] },
  { id: "brown_rice", fr: "Riz complet", en: "Brown rice", aisle: "grocery", n: [355, 7.5, 74, 0.7, 2.5, 0.5, 3.5, 0], price: 3.5, packs: [500, 1000], shelf: 365, kw: ["rice"] },
  { id: "risotto_rice", fr: "Riz arborio", en: "Arborio rice", aisle: "grocery", n: [350, 7, 78, 0.3, 0.6, 0.2, 1.3, 0], price: 5, packs: [500, 1000], shelf: 365, kw: ["risotto"] },
  { id: "quinoa", fr: "Quinoa", en: "Quinoa", aisle: "grocery", n: [370, 14, 61, 3, 6, 0.7, 7, 0.01], price: 8, packs: [500], shelf: 365 },
  { id: "bulgur", fr: "Boulgour", en: "Bulgur", aisle: "grocery", n: [345, 12, 64, 0.5, 1.5, 0.3, 9, 0.01], price: 3.5, packs: [500, 1000], shelf: 365, tags: ["gluten"] },
  { id: "couscous", fr: "Semoule de couscous", en: "Couscous", aisle: "grocery", n: [360, 12, 72, 1, 1.5, 0.3, 4, 0.02], price: 2.2, packs: [500, 1000], shelf: 365, tags: ["gluten"] },
  { id: "oats", fr: "Flocons d'avoine", en: "Rolled oats", aisle: "grocery", n: [370, 13, 59, 1, 7, 1.3, 10, 0.02], price: 2.5, packs: [500, 1000], shelf: 365, tags: ["gluten"], kw: ["oatmeal"] },
  { id: "green_lentils", fr: "Lentilles vertes", en: "Green lentils", aisle: "grocery", n: [330, 24, 49, 2, 1.5, 0.2, 11, 0.02], price: 3.5, packs: [500, 1000], shelf: 365, kw: ["lentils"] },
  { id: "red_lentils", fr: "Lentilles corail", en: "Red lentils", aisle: "grocery", n: [340, 24, 52, 2, 1.5, 0.2, 8, 0.02], price: 4.5, packs: [500], shelf: 365, kw: ["lentils"] },
  { id: "chickpeas", fr: "Pois chiches en conserve", en: "Canned chickpeas", aisle: "grocery", n: [140, 7.5, 17, 0.5, 2.5, 0.3, 6, 0.6], price: 4, packs: [265, 530], shelf: 365, kw: ["chickpeas"] },
  { id: "kidney_beans", fr: "Haricots rouges en conserve", en: "Canned kidney beans", aisle: "grocery", n: [110, 8, 14, 0.5, 0.5, 0.1, 6.5, 0.6], price: 4, packs: [250, 500], shelf: 365, kw: ["kidney beans"] },
  { id: "white_beans", fr: "Haricots blancs en conserve", en: "Canned white beans", aisle: "grocery", n: [100, 7, 13, 0.5, 0.5, 0.1, 7, 0.6], price: 4, packs: [265, 530], shelf: 365, kw: ["white beans"] },
  { id: "flour", fr: "Farine de blé", en: "Wheat flour", aisle: "grocery", n: [345, 10, 72, 1, 1.2, 0.2, 3, 0], price: 1.2, packs: [1000], shelf: 365, tags: ["gluten"] },
  { id: "rice_noodles", fr: "Nouilles de riz", en: "Rice noodles", aisle: "grocery", n: [360, 6, 81, 0, 0.6, 0.2, 1.5, 0.1], price: 8, packs: [250, 400], shelf: 365 },
  { id: "egg_noodles", fr: "Nouilles aux œufs", en: "Egg noodles", aisle: "grocery", n: [380, 12.5, 70, 2, 4, 1, 3, 0.3], price: 8, packs: [250], shelf: 365, tags: ["gluten", "egg"] },
  { id: "polenta", fr: "Polenta", en: "Polenta", aisle: "grocery", n: [360, 8, 78, 1, 1.5, 0.3, 4, 0], price: 3.5, packs: [500], shelf: 365 },
  { id: "breadcrumbs", fr: "Chapelure", en: "Breadcrumbs", aisle: "grocery", n: [380, 13, 72, 4, 4, 0.8, 4, 1.5], price: 6, packs: [250], shelf: 365, tags: ["gluten"] },
  { id: "muesli", fr: "Muesli sans sucre ajouté", en: "No added sugar muesli", aisle: "sweet", n: [370, 10, 62, 15, 7, 1.5, 8, 0.05], price: 6, packs: [500, 750], shelf: 180, tags: ["gluten", "nuts"], kw: ["muesli"] },
  { id: "peanut_butter", fr: "Beurre de cacahuète", en: "Peanut butter", aisle: "sweet", n: [600, 25, 15, 7, 49, 9, 7, 0.6], price: 10, packs: [350], shelf: 180, tags: ["peanut"] },
  { id: "almonds", fr: "Amandes", en: "Almonds", aisle: "sweet", n: [600, 25, 7, 4, 53, 4, 12.5, 0], price: 18, packs: [125, 200], shelf: 180, tags: ["nuts"] },
  { id: "walnuts", fr: "Cerneaux de noix", en: "Walnuts", aisle: "sweet", n: [700, 15, 7, 3, 65, 6, 6.7, 0], price: 20, packs: [125, 200], shelf: 180, tags: ["nuts"] },
  { id: "cashews", fr: "Noix de cajou", en: "Cashews", aisle: "sweet", n: [590, 18, 27, 6, 46, 8, 3.3, 0.03], price: 20, packs: [125, 200], shelf: 180, tags: ["nuts"] },
  { id: "sesame", fr: "Graines de sésame", en: "Sesame seeds", aisle: "spices", n: [600, 20, 10, 0.5, 52, 7, 12, 0], price: 12, packs: [100], shelf: 365, tags: ["sesame"] },
  { id: "chia", fr: "Graines de chia", en: "Chia seeds", aisle: "sweet", n: [480, 17, 8, 1, 31, 3, 34, 0.04], price: 14, packs: [200], shelf: 365 },
  { id: "dark_chocolate", fr: "Chocolat noir 70 %", en: "Dark chocolate 70%", aisle: "sweet", n: [570, 8, 33, 28, 42, 25, 10, 0.02], price: 18, packs: [100], shelf: 365, tags: ["dairy"], kw: ["dark chocolate"] },
  { id: "honey", fr: "Miel", en: "Honey", aisle: "sweet", n: [320, 0.3, 80, 80, 0, 0, 0, 0.01], price: 12, packs: [250, 500], shelf: 365, tags: ["honey"] },
  { id: "jam", fr: "Confiture", en: "Jam", aisle: "sweet", n: [240, 0.5, 60, 58, 0.1, 0, 1, 0.02], price: 5, packs: [370], shelf: 60 },
  { id: "cocoa", fr: "Cacao en poudre non sucré", en: "Unsweetened cocoa powder", aisle: "sweet", n: [380, 20, 15, 1, 21, 13, 30, 0.1], price: 15, packs: [250], shelf: 365, kw: ["cocoa"] },
  { id: "pesto", fr: "Pesto au basilic", en: "Basil pesto", aisle: "grocery", n: [450, 5, 6, 4, 45, 7, 2, 2.5], price: 12, packs: [190], shelf: 21, tags: ["dairy", "nuts"] },
  { id: "tahini", fr: "Purée de sésame (tahin)", en: "Tahini", aisle: "grocery", n: [600, 18, 10, 0.5, 54, 7.5, 9, 0.1], price: 12, packs: [250], shelf: 180, tags: ["sesame"] },
  { id: "dates", fr: "Dattes", en: "Dates", aisle: "sweet", n: [290, 2.5, 67, 64, 0.4, 0, 7, 0.02], price: 9, packs: [250, 500], shelf: 180 },
  { id: "maple_syrup", fr: "Sirop d'érable", en: "Maple syrup", aisle: "sweet", unit: "ml", density: 1.32, n: [260, 0, 67, 60, 0.1, 0, 0, 0.02], price: 30, packs: [250], shelf: 365 },

  // ------------------------------------------------------------ Placard (supposés présents)
  { id: "olive_oil", fr: "Huile d'olive", en: "Olive oil", unit: "ml", density: 0.92, n: [900, 0, 0, 0, 100, 14, 0, 0], ...STAPLE },
  { id: "neutral_oil", fr: "Huile de colza", en: "Rapeseed oil", unit: "ml", density: 0.92, n: [900, 0, 0, 0, 100, 7, 0, 0], ...STAPLE },
  { id: "sesame_oil", fr: "Huile de sésame", en: "Sesame oil", unit: "ml", density: 0.92, n: [900, 0, 0, 0, 100, 14, 0, 0], ...STAPLE, tags: ["sesame"] },
  { id: "salt", fr: "Sel", en: "Salt", n: [0, 0, 0, 0, 0, 0, 0, 100], ...STAPLE },
  { id: "pepper", fr: "Poivre", en: "Black pepper", n: [250, 10, 40, 0.6, 3, 1.4, 25, 0.05], ...STAPLE },
  { id: "sugar", fr: "Sucre", en: "Sugar", n: [400, 0, 100, 100, 0, 0, 0, 0], ...STAPLE },
  { id: "brown_sugar", fr: "Sucre roux", en: "Brown sugar", n: [390, 0, 98, 97, 0, 0, 0, 0.1], ...STAPLE },
  { id: "vinegar", fr: "Vinaigre de vin", en: "Wine vinegar", unit: "ml", n: [20, 0, 0.3, 0, 0, 0, 0, 0], ...STAPLE, tags: ["sulphites"] },
  { id: "balsamic", fr: "Vinaigre balsamique", en: "Balsamic vinegar", unit: "ml", n: [90, 0.5, 22, 15, 0, 0, 0, 0.05], ...STAPLE, tags: ["sulphites"] },
  { id: "mustard", fr: "Moutarde", en: "Mustard", n: [150, 7, 4, 2, 11, 0.6, 3, 5.5], ...STAPLE, tags: ["mustard"] },
  { id: "soy_sauce", fr: "Sauce soja", en: "Soy sauce", unit: "ml", density: 1.1, n: [60, 8, 6, 1, 0, 0, 0.8, 14], ...STAPLE, tags: ["soy", "gluten"] },
  { id: "stock_cube", fr: "Bouillon de légumes (cube)", en: "Vegetable stock cube", unit: "pc", pw: 10, n: [250, 7, 25, 3, 13, 6, 1, 50], ...STAPLE, tags: ["celery"] },
  { id: "mayonnaise", fr: "Mayonnaise", en: "Mayonnaise", n: [680, 1.5, 2, 1.5, 75, 6, 0, 1.2], ...STAPLE, tags: ["egg", "mustard"] },
  { id: "ketchup", fr: "Ketchup", en: "Ketchup", n: [110, 1.3, 25, 22, 0.1, 0, 0.8, 1.8], ...STAPLE },
  { id: "cornstarch", fr: "Fécule de maïs", en: "Cornstarch", n: [360, 0.3, 88, 0, 0.1, 0, 0.9, 0.02], ...STAPLE },
  { id: "baking_powder", fr: "Levure chimique", en: "Baking powder", n: [100, 0, 25, 0, 0, 0, 0, 25], ...STAPLE },
  { id: "paprika", fr: "Paprika", en: "Paprika", n: [290, 14, 20, 10, 13, 2, 35, 0.2], ...STAPLE },
  { id: "smoked_paprika", fr: "Paprika fumé", en: "Smoked paprika", n: [290, 14, 20, 10, 13, 2, 35, 0.2], ...STAPLE },
  { id: "cumin", fr: "Cumin", en: "Cumin", n: [375, 18, 34, 2, 22, 1.5, 10.5, 0.4], ...STAPLE },
  { id: "curry", fr: "Curry en poudre", en: "Curry powder", n: [325, 14, 25, 3, 14, 2, 33, 0.1], ...STAPLE },
  { id: "garam_masala", fr: "Garam masala", en: "Garam masala", n: [380, 15, 45, 3, 15, 2, 20, 0.2], ...STAPLE },
  { id: "turmeric", fr: "Curcuma", en: "Turmeric", n: [310, 10, 44, 3, 3, 1.8, 22, 0.1], ...STAPLE },
  { id: "cinnamon", fr: "Cannelle", en: "Cinnamon", n: [250, 4, 27, 2, 1.2, 0.3, 53, 0.03], ...STAPLE },
  { id: "chili_flakes", fr: "Piment en flocons", en: "Chili flakes", n: [300, 12, 25, 10, 14, 2.5, 34, 0.1], ...STAPLE },
  { id: "herbes_provence", fr: "Herbes de Provence", en: "Herbes de Provence", n: [270, 9, 30, 2, 7, 3, 37, 0.1], ...STAPLE },
  { id: "oregano", fr: "Origan", en: "Oregano", n: [265, 9, 27, 4, 4, 1.6, 42, 0.04], ...STAPLE },
  { id: "thyme", fr: "Thym", en: "Thyme", n: [275, 9, 27, 1.7, 7.4, 2.7, 37, 0.1], ...STAPLE },
  { id: "bay_leaf", fr: "Feuille de laurier", en: "Bay leaf", unit: "pc", pw: 0.2, n: [313, 7.6, 48, 0, 8.4, 2.3, 26, 0.06], ...STAPLE },
  { id: "nutmeg", fr: "Muscade", en: "Nutmeg", n: [525, 6, 28, 3, 36, 26, 21, 0.04], ...STAPLE },
  { id: "ras_el_hanout", fr: "Ras el hanout", en: "Ras el hanout", n: [300, 12, 35, 3, 12, 2, 30, 0.1], ...STAPLE },
  { id: "five_spice", fr: "Cinq-épices", en: "Five spice", n: [300, 10, 40, 3, 10, 2, 30, 0.1], ...STAPLE },
  { id: "chili_powder", fr: "Piment doux / chili", en: "Chili powder", n: [330, 13, 22, 7, 14, 2.5, 35, 2.5], ...STAPLE },
  { id: "vanilla_sugar", fr: "Sucre vanillé", en: "Vanilla sugar", n: [395, 0, 99, 99, 0, 0, 0, 0], ...STAPLE },
  { id: "dried_yeast", fr: "Levure boulangère", en: "Dried yeast", n: [325, 40, 13, 0, 7.6, 1, 27, 0.13], ...STAPLE },
  { id: "curry_paste", fr: "Pâte de curry rouge", en: "Red curry paste", n: [150, 3, 12, 6, 10, 1, 5, 6], ...STAPLE },
  { id: "worcestershire", fr: "Sauce Worcestershire", en: "Worcestershire sauce", unit: "ml", n: [80, 0, 19, 10, 0, 0, 0, 2.5], ...STAPLE, tags: ["fish"] },
];

export const ingredients: Ingredient[] = defs.map(make);
