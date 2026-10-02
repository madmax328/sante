import { notFound } from "next/navigation";
import { ChefHat, Clock, Flame, Snowflake, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCatalog } from "@weeko/catalog";
import { ALLERGENS } from "@weeko/engine";
import { RateRecipe } from "@/components/app-client";
import { AddRecipeToJournal, IngredientScaler, type IngredientLine } from "@/components/recipe-client";
import { PhotoCredit, RecipeImage } from "@/components/recipe-image";
import { Badge, Card, Notice } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { getPhotoMap } from "@/lib/photos";

export async function generateMetadata({ params }: PageProps<"/[locale]/app/recipes/[id]">) {
  const { id } = await params;
  const r = getCatalog().recipes.get(id);
  return { title: r?.name.fr ?? "Recette" };
}

export default async function RecipePage({ params }: PageProps<"/[locale]/app/recipes/[id]">) {
  const { id } = await params;
  const { uc } = await requireContext();
  const recipe = uc.ctx.catalog.recipes.get(id);
  if (!recipe) notFound();
  const t = await getTranslations("recipe");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const photo = (await getPhotoMap([id])).get(id);
  const hidden = !!uc.health.numbersHidden;
  const allergens = recipe.tagsAvoid.filter((x) => (ALLERGENS as readonly string[]).includes(x));
  const conflicts = [...new Set(uc.ctx.members.flatMap((m) => m.avoid))].filter((x) => recipe.tagsAvoid.includes(x));
  const rating = uc.ctx.prefs.likedRecipes.includes(id) ? "liked" : uc.ctx.prefs.dislikedRecipes.includes(id) ? "disliked" : "none";
  const lines: IngredientLine[] = recipe.ingredients.map((ri) => {
    const ing = uc.ctx.catalog.ingredient(ri.id);
    return { id: ri.id, name: ing.name.fr, plural: ing.plural?.fr, qty: ri.qty / recipe.servings, unit: ing.unit, staple: !!ing.staple };
  });
  const n = recipe.nutrition;

  return (
    <article className="grid gap-6">
      <Link href="/app/recipes" className="text-sm font-semibold text-muted hover:text-encre">← {t("back")}</Link>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-2">
          <RecipeImage photo={photo} meal={recipe.meals[0]} className="aspect-[4/3] w-full rounded-3xl" sizes="(max-width: 1024px) 100vw, 55vw" priority />
          <PhotoCredit photo={photo} label={t("photoBy")} />
        </div>
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap gap-1.5">
            {recipe.meals.map((m) => <Badge key={m} tone="neutral">{e(`meal.${m}`)}</Badge>)}
            {recipe.diets.includes("vegan") ? <Badge tone="basilic">{e("diet.vegan")}</Badge> : recipe.diets.includes("vegetarian") ? <Badge tone="basilic">{e("diet.vegetarian")}</Badge> : null}
            {recipe.tags.includes("batch") && <Badge tone="miel">{t("batch")}</Badge>}
          </div>
          <h1 className="text-3xl font-extrabold">{recipe.name.fr}</h1>
          {recipe.description && <p className="text-muted">{recipe.description.fr}</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-surface p-3"><dt className="flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" />{t("time")}</dt><dd className="font-bold num">{recipe.totalMin} min</dd></div>
            <div className="rounded-2xl bg-surface p-3"><dt className="flex items-center gap-1 text-xs text-muted"><ChefHat className="size-3.5" />{t("difficulty")}</dt><dd className="font-bold">{t(`level${recipe.difficulty}`)}</dd></div>
            <div className="rounded-2xl bg-surface p-3"><dt className="flex items-center gap-1 text-xs text-muted"><Wallet className="size-3.5" />{t("cost")}</dt><dd className="font-bold num">{format.number(recipe.cost, { style: "currency", currency: "EUR" })}</dd></div>
            {!hidden && <div className="rounded-2xl bg-surface p-3"><dt className="flex items-center gap-1 text-xs text-muted"><Flame className="size-3.5" />{t("energy")}</dt><dd className="font-bold num">{n.kcal} kcal</dd></div>}
          </dl>
          <p className="text-sm text-muted">{t("prepCook", { prep: recipe.prepMin, cook: recipe.cookMin })}{recipe.keepsDays > 0 && <> · <Snowflake className="inline size-3.5" /> {t("keeps", { days: recipe.keepsDays })}</>}</p>
          <RateRecipe recipeId={recipe.id} initial={rating} />
          <AddRecipeToJournal recipeId={recipe.id} />
        </div>
      </div>

      {conflicts.length > 0 && (
        <Notice tone="danger" title={t("warningTitle")}>{t("warningText", { list: conflicts.map((c) => ((ALLERGENS as readonly string[]).includes(c) ? e(`allergen.${c}`) : c)).join(", ") })}</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="grid content-start gap-4">
          <h2 className="text-xl font-bold">{t("ingredients")}</h2>
          <IngredientScaler lines={lines} defaultServings={Math.max(1, uc.members.length)} />
          {allergens.length > 0 && (
            <p className="text-sm"><strong>{t("allergens")} :</strong> {allergens.map((a) => e(`allergen.${a}`)).join(", ")}</p>
          )}
        </Card>
        <Card className="grid content-start gap-4">
          <h2 className="text-xl font-bold">{t("steps")}</h2>
          <ol className="grid gap-4">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-basilic-soft font-display text-sm font-bold text-basilic">{i + 1}</span>
                <p className="pt-0.5">{s.fr}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {!hidden && (
        <Card className="grid gap-3">
          <h2 className="text-xl font-bold">{t("nutrition")}</h2>
          <p className="text-sm text-muted">{t("nutritionNote")}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-sm num">
              <tbody>
                {(["kcal", "protein", "carbs", "sugars", "fat", "satFat", "fiber", "salt"] as const).map((k) => (
                  <tr key={k} className="border-b border-line/70 last:border-0">
                    <th scope="row" className="py-2 text-left font-normal text-muted">{e(`nutrient.${k}`)}</th>
                    <td className="py-2 text-right font-semibold">{format.number(n[k], { maximumFractionDigits: 1 })} {k === "kcal" ? "kcal" : "g"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </article>
  );
}
