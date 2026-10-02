import { getTranslations } from "next-intl/server";
import { PantryAdd, PantryRow } from "@/components/pantry-client";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/app-user";
import { can } from "@/lib/premium";
import { getPantry } from "@/lib/repo";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("pantry") };
}

export default async function PantryPage() {
  const { userId, uc } = await requireContext();
  const t = await getTranslations("pantry");
  const c = uc.ctx.catalog;
  if (!can(uc.profile, "pantry")) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <EmptyState title={t("premiumTitle")} action={<LinkButton href="/app/account" variant="accent">{t("discover")}</LinkButton>}>{t("premiumText")}</EmptyState>
      </div>
    );
  }
  const items = (await getPantry(userId)).filter((i) => c.ingredients.has(i.ingredientId));
  const options = [...c.ingredients.values()].filter((i) => !i.staple).map((i) => ({ id: i.id, name: i.name.fr, unit: i.unit })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Card className="grid gap-3">
        <h2 className="font-bold">{t("addTitle")}</h2>
        <PantryAdd options={options} />
        <p className="text-xs text-muted">{t("hint")}</p>
      </Card>
      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")}>{t("emptyText")}</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-line/70">
            {items
              .sort((a, b) => c.ingredient(a.ingredientId).name.fr.localeCompare(c.ingredient(b.ingredientId).name.fr, "fr"))
              .map((i) => (
                <PantryRow key={i.ingredientId} id={i.ingredientId} name={c.ingredient(i.ingredientId).name.fr} qty={Math.round(i.qty)} unit={c.ingredient(i.ingredientId).unit} />
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
