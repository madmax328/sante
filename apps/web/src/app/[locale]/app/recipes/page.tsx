import { Clock, Search } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { isCompatible, MEAL_TYPES, type Diet, type MealType, type RecipeInfo } from "@weeko/engine";
import { RecipeImage } from "@/components/recipe-image";
import { Badge, Card, EmptyState, Input, PageHeader, Select, buttonClass } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { getPhotoMap } from "@/lib/photos";

const PAGE = 24;
const DIETS: Diet[] = ["omnivore", "pescatarian", "vegetarian", "vegan"];

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("recipes") };
}

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default async function RecipesPage({ searchParams }: PageProps<"/[locale]/app/recipes">) {
  const { uc } = await requireContext();
  const t = await getTranslations("recipes");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const meal = MEAL_TYPES.includes(sp.meal as MealType) ? (sp.meal as MealType) : undefined;
  const diet = DIETS.includes(sp.diet as Diet) ? (sp.diet as Diet) : uc.ctx.prefs.diet;
  const max = Number(sp.max) > 0 ? Number(sp.max) : undefined;
  const onlyMine = sp.all !== "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const hidden = !!uc.health.numbersHidden;

  const avoid = [...new Set(uc.ctx.members.flatMap((m) => m.avoid))];
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const list: RecipeInfo[] = uc.ctx.catalog.allRecipes().filter((r) => {
    if (meal && !r.meals.includes(meal)) return false;
    if (!r.diets.includes(diet)) return false;
    if (max && r.totalMin > max) return false;
    if (onlyMine && !isCompatible(r, { prefs: { ...uc.ctx.prefs, diet, equipment: ["oven", "microwave", "blender", "airfryer", "slowcooker"] }, avoid })) return false;
    if (terms.length) {
      const hay = norm(r.name.fr + " " + r.ingredients.map((i) => uc.ctx.catalog.ingredient(i.id).name.fr).join(" "));
      if (!terms.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice((page - 1) * PAGE, page * PAGE);
  const photos = await getPhotoMap(shown.map((r) => r.id));
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all = { q, meal, diet, max, all: onlyMine ? undefined : "1", page, ...patch };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/app/recipes?${p.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle", { count: format.number(list.length) })} />
      <form className="grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" action="">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} className="pl-9" />
        </div>
        <Select name="meal" defaultValue={meal ?? ""} aria-label={t("meal")}>
          <option value="">{t("allMeals")}</option>
          {MEAL_TYPES.map((m) => <option key={m} value={m}>{e(`meal.${m}`)}</option>)}
        </Select>
        <Select name="diet" defaultValue={diet} aria-label={t("diet")}>
          {DIETS.map((d) => <option key={d} value={d}>{e(`diet.${d}`)}</option>)}
        </Select>
        <Select name="max" defaultValue={max ? String(max) : ""} aria-label={t("time")}>
          <option value="">{t("anyTime")}</option>
          {[15, 20, 30, 45].map((m) => <option key={m} value={m}>{t("maxTime", { m })}</option>)}
        </Select>
        <button type="submit" className={buttonClass("primary")}>{t("filter")}</button>
      </form>
      <p className="text-sm text-muted">
        {onlyMine ? t("filteredMine") : t("showingAll")}{" "}
        <Link href={qs({ all: onlyMine ? "1" : undefined, page: 1 })} className="font-semibold text-basilic">{onlyMine ? t("showAll") : t("showMine")}</Link>
      </p>

      {shown.length === 0 ? (
        <EmptyState title={t("none")}>{t("noneText")}</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((r) => (
            <Link key={r.id} href={`/app/recipes/${r.id}`} className="group">
              <Card className="grid h-full content-start gap-3 overflow-hidden p-0 transition-colors group-hover:border-basilic">
                <RecipeImage photo={photos.get(r.id)} meal={r.meals[0]} thumb className="aspect-[4/3] w-full" sizes="(max-width: 640px) 100vw, 25vw" />
                <div className="grid gap-2 px-4 pb-4">
                  <p className="line-clamp-2 font-semibold">{r.name.fr}</p>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted num">
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{r.totalMin} min</span>
                    {!hidden && <span>{r.nutrition.kcal} kcal</span>}
                    <span>{format.number(r.cost, { style: "currency", currency: "EUR" })}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {r.diets.includes("vegan") ? <Badge tone="basilic">{e("diet.vegan")}</Badge> : r.diets.includes("vegetarian") ? <Badge tone="basilic">{e("diet.vegetarian")}</Badge> : null}
                    {r.tags.includes("batch") && <Badge tone="miel">{t("batch")}</Badge>}
                    {r.tags.includes("high-protein") && <Badge tone="eau">{t("protein")}</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label={t("pagination")}>
          {page > 1 && <Link href={qs({ page: page - 1 })} className={buttonClass("secondary", "sm")}>{t("prev")}</Link>}
          <span className="text-sm text-muted num">{t("page", { page, pages })}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className={buttonClass("secondary", "sm")}>{t("next")}</Link>}
        </nav>
      )}
    </div>
  );
}
