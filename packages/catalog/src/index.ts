import { Catalog, type Market, type Recipe } from "@weeko/engine";
import { toRecipe } from "./dsl";
import { ingredients } from "./ingredients";
import { breakfasts } from "./recipes/breakfast";
import { snacks } from "./recipes/snacks";
import { asianMains } from "./recipes/mains-asian";
import { bowlMains } from "./recipes/mains-bowls";
import { panMains } from "./recipes/mains-pan";
import { classicMains } from "./recipes/mains-classics";

export { ingredients };

export const recipes: Recipe[] = [
  ...breakfasts,
  ...snacks,
  ...asianMains,
  ...bowlMains,
  ...panMains,
  ...classicMains,
].map(toRecipe);

const cache = new Map<Market, Catalog>();

/** Shared, lazily built catalog (recipes enriched with nutrition and cost). */
export function getCatalog(market: Market = "FR"): Catalog {
  let c = cache.get(market);
  if (!c) {
    c = new Catalog(ingredients, recipes, market);
    cache.set(market, c);
  }
  return c;
}
