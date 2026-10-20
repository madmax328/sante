import { Catalog, type Market, type Recipe } from "@weeko/engine";
import { toRecipe } from "./dsl";
import { ingredients } from "./ingredients";
import { localizePrices } from "./markets";
import { breakfasts } from "./recipes/breakfast";
import { snacks } from "./recipes/snacks";
import { asianMains } from "./recipes/mains-asian";
import { bowlMains } from "./recipes/mains-bowls";
import { panMains } from "./recipes/mains-pan";
import { classicMains } from "./recipes/mains-classics";
import { europeMains } from "./recipes/world-europe";
import { orientMains } from "./recipes/world-orient";
import { asiaMains } from "./recipes/world-asia";
import { americasMains } from "./recipes/world-americas";

export { ingredients };
export { exercises } from "./exercises";

export const recipes: Recipe[] = [
  ...breakfasts,
  ...snacks,
  ...asianMains,
  ...bowlMains,
  ...panMains,
  ...classicMains,
  ...europeMains,
  ...orientMains,
  ...asiaMains,
  ...americasMains,
].map(toRecipe);

const cache = new Map<string, Catalog>();

/**
 * Shared, lazily built catalog (recipes enriched with nutrition and cost).
 * `dislikes` takes seasonings the user doesn't eat (garlic, coriander…) out
 * of the recipes; other disliked ingredients exclude recipes in the planner.
 */
export function getCatalog(market: Market = "FR", dislikes: string[] = []): Catalog {
  const base = cache.get(market) ?? new Catalog(localizePrices(ingredients, market), recipes, market);
  cache.set(market, base);
  const omit = [...new Set(dislikes.filter((id) => base.ingredients.get(id)?.omittable))].sort();
  if (omit.length === 0) return base;
  const key = `${market}:${omit.join(",")}`;
  let c = cache.get(key);
  if (!c) {
    if (cache.size > 200) cache.clear();
    c = base.withoutIngredients(omit);
    cache.set(key, c);
  }
  return c;
}

export { DISLIKE_GROUPS, type DislikeGroup } from "./dislikes";
export { motions } from "./motions";
export { drawMotion, poseAt, VIEW as MOTION_VIEW, type Motion, type Pose, type Shape, type Tone } from "./motion";
export { CUISINE_COUNTRIES, CUISINE_CODES, type CuisineCountry } from "./countries";
export { MARKET_INFO, MARKET_LIST, priceFactor, type MarketInfo } from "./markets";
