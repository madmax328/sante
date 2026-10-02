// Core domain types shared by the engine, the catalog and the apps.

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** French is always present; other locales fall back to it. */
export type Localized = { fr: string } & Partial<Record<Locale, string>>;

export function t(text: Localized, locale: Locale): string {
  return text[locale] ?? text.fr;
}

export const MARKETS = ["FR"] as const;
export type Market = (typeof MARKETS)[number];

export const MARKET_CURRENCY: Record<Market, string> = { FR: "EUR" };

// ---------------------------------------------------------------- Ingredients

export type BaseUnit = "g" | "ml" | "pc";

export type Aisle =
  | "produce" // fruits & légumes
  | "meat" // boucherie / volaille
  | "fish" // poissonnerie
  | "dairy" // crèmerie, œufs
  | "bakery" // pain
  | "grocery" // épicerie salée (féculents, conserves)
  | "sweet" // épicerie sucrée
  | "frozen"
  | "spices" // condiments, épices, huiles
  | "drinks"
  | "plant"; // produits végétaux (tofu, boissons végétales)

/** Things a person can need to avoid. Allergens follow the EU 14 list where relevant. */
export type FoodTag =
  | "meat"
  | "poultry"
  | "pork"
  | "beef"
  | "lamb"
  | "fish"
  | "seafood" // crustacés + mollusques
  | "dairy" // lait et dérivés (lactose)
  | "egg"
  | "gluten"
  | "nuts"
  | "peanut"
  | "soy"
  | "sesame"
  | "celery"
  | "mustard"
  | "sulphites"
  | "lupin"
  | "alcohol"
  | "honey"
  | "pregnancy_avoid"; // ex : fromage au lait cru, poisson cru, foie

export const ALLERGENS = [
  "gluten",
  "seafood",
  "egg",
  "fish",
  "peanut",
  "soy",
  "dairy",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
] as const satisfies readonly FoodTag[];
export type Allergen = (typeof ALLERGENS)[number];

/** Per 100 g of edible portion. */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  sugars: number;
  fat: number;
  satFat: number;
  fiber: number;
  salt: number;
}

export const ZERO_NUTRIENTS: Nutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  sugars: 0,
  fat: 0,
  satFat: 0,
  fiber: 0,
  salt: 0,
};

export interface Ingredient {
  id: string;
  name: Localized;
  /** Plural or display label for pieces, e.g. "œufs". */
  plural?: Localized;
  aisle: Aisle;
  unit: BaseUnit;
  /** Weight in grams of one piece (unit "pc") */
  pieceWeight?: number;
  /** g per ml (unit "ml"), defaults to 1 */
  density?: number;
  nutrition: Nutrients;
  tags: FoodTag[];
  /** Price per kg (g), per litre (ml) or per piece (pc), per market. */
  price: Partial<Record<Market, number>>;
  /** Pack sizes sold in shops, in base unit. */
  packs: number[];
  /** Days it keeps once opened / bought. Drives anti-waste priority. */
  shelfLifeDays: number;
  /** Salt, pepper, oil, spices: assumed in the kitchen, not costed per week. */
  staple?: boolean;
  /** Months (1-12) when the product is in season, for fresh produce. */
  season?: number[];
  /** Short English search keywords for photo search and food search. */
  keywords?: string[];
  /** Reference to the source food composition table entry. */
  source?: string;
}

// ---------------------------------------------------------------- Recipes

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type Equipment = "oven" | "microwave" | "blender" | "airfryer" | "slowcooker";

export type RecipeTag =
  | "quick"
  | "batch"
  | "one-pot"
  | "no-cook"
  | "kid-friendly"
  | "comfort"
  | "light"
  | "high-protein"
  | "budget"
  | "lunchbox"
  | "weekend";

export interface RecipeIngredient {
  id: string;
  /** Quantity for the whole recipe (recipe.servings), in the ingredient base unit. */
  qty: number;
  note?: Localized;
}

export interface Recipe {
  id: string;
  name: Localized;
  description?: Localized;
  meals: MealType[];
  servings: number;
  ingredients: RecipeIngredient[];
  steps: Localized[];
  prepMin: number;
  cookMin: number;
  difficulty: 1 | 2 | 3;
  tags: RecipeTag[];
  equipment: Equipment[];
  cuisine: string;
  /** Days the dish keeps in the fridge: enables leftovers / batch cooking. */
  keepsDays: number;
  /** English query used to find a matching photo. */
  imageQuery: string;
  /** Recipes sharing a family are variations of one dish (avoid them twice a week). */
  family?: string;
}

/** Recipe enriched by the engine with derived data. */
export interface RecipeInfo extends Recipe {
  /** Per serving */
  nutrition: Nutrients;
  /** Per serving, in market currency (excluding staples) */
  cost: number;
  totalMin: number;
  tagsAvoid: FoodTag[];
  diets: Diet[];
}

// ---------------------------------------------------------------- People

export type Sex = "female" | "male";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type Goal =
  | "lose_weight"
  | "maintain"
  | "gain_muscle"
  | "eat_better"
  | "save_money"
  | "family_meals";

export type Diet = "omnivore" | "pescatarian" | "vegetarian" | "vegan";

export type PregnancyStatus = "none" | "pregnant_t1" | "pregnant_t2" | "pregnant_t3" | "breastfeeding";

export type MedicalFlag =
  | "diabetes"
  | "kidney_disease"
  | "heart_disease"
  | "eating_disorder_history"
  | "bariatric_surgery"
  | "other";

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  /** Age in years */
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Target weekly change in kg (negative to lose). Only used for weight goals. */
  weeklyChangeKg?: number;
  targetWeightKg?: number;
  pregnancy?: PregnancyStatus;
  medical?: MedicalFlag[];
  /** Hide numbers (calories, weight) – used for safety paths. */
  numbersHidden?: boolean;
}

export interface Household {
  members: HouseholdMember[];
}

export interface HouseholdMember extends Person {
  /** Is this the account owner */
  self: boolean;
  /** Meals eaten at home, by default every meal. */
  eatsAtHome?: Partial<Record<MealType, boolean>>;
  allergies?: Allergen[];
}

export interface FoodPreferences {
  diet: Diet;
  /** Additional tags to avoid (pork, alcohol, ...). Allergies of members are added automatically. */
  avoid: FoodTag[];
  dislikedIngredients: string[];
  likedRecipes: string[];
  dislikedRecipes: string[];
  /** Max active minutes per meal on weekdays / weekends */
  maxMinutesWeekday: number;
  maxMinutesWeekend: number;
  equipment: Equipment[];
  /** Plan dinners that also cover the next day's lunch */
  leftovers: boolean;
  snacks: boolean;
  cuisines?: string[];
}

// ---------------------------------------------------------------- Targets

export interface NutritionTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  bmr: number;
  tdee: number;
}
