import { ALLERGENS } from "@weeko/engine";
import { getTranslations } from "next-intl/server";
import { loadUserContext } from "@/lib/planning";
import { MobileError, mobileRoute } from "@/lib/mobile";
import { getPhotoMap } from "@/lib/photos";
import { NoProfileError } from "@/lib/week-service";

export const dynamic = "force-dynamic";

/** One recipe adapted to the user (omitted seasonings, dislikes, allergens). */
export const GET = mobileRoute(async (req, userId) => {
  const id = decodeURIComponent(new URL(req.url).pathname.split("/").pop() ?? "");
  const uc = await loadUserContext(userId);
  if (!uc) throw new NoProfileError();
  const c = uc.ctx.catalog;
  const r = c.recipes.get(id);
  if (!r) throw new MobileError("not_found", 404);
  const e = await getTranslations("enums");
  const photo = (await getPhotoMap([id])).get(id);
  const hidden = !!uc.health.numbersHidden;
  return {
    id: r.id,
    name: r.name.fr,
    description: r.description?.fr ?? null,
    meals: r.meals,
    totalMin: r.totalMin,
    prepMin: r.prepMin,
    cookMin: r.cookMin,
    difficulty: r.difficulty,
    cost: r.cost,
    photo: photo ? { url: photo.url, photographer: photo.photographer, photographerUrl: photo.photographerUrl, sourceUrl: photo.sourceUrl, source: photo.source ?? "pexels" } : null,
    ingredients: r.ingredients.map((i) => {
      const ing = c.ingredient(i.id);
      return { id: i.id, name: ing.name.fr, plural: ing.plural?.fr ?? null, qty: i.qty / r.servings, unit: ing.unit, staple: !!ing.staple };
    }),
    steps: r.steps.map((s) => s.fr),
    nutrition: hidden ? null : r.nutrition,
    allergens: r.tagsAvoid.filter((x) => (ALLERGENS as readonly string[]).includes(x)).map((a) => e(`allergen.${a}`)),
    omitted: (r.omitted ?? []).map((x) => c.ingredient(x).name.fr.toLowerCase()),
    disliked: r.ingredients.filter((i) => uc.ctx.prefs.dislikedIngredients?.includes(i.id)).map((i) => c.ingredient(i.id).name.fr.toLowerCase()),
    rating: uc.ctx.prefs.likedRecipes.includes(id) ? "liked" : uc.ctx.prefs.dislikedRecipes.includes(id) ? "disliked" : "none",
  };
});
