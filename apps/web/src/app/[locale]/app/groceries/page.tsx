import { getFormatter, getTranslations } from "next-intl/server";
import { formatQty } from "@weeko/engine";
import { GenerateWeekButton } from "@/components/app-client";
import { GroceryItem, GroceryTools, ShoppedForm } from "@/components/groceries-client";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireContext } from "@/lib/app-user";
import { can } from "@/lib/premium";
import { loadWeek, shoppingFor } from "@/lib/week-service";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("groceries") };
}

export default async function GroceriesPage() {
  const { userId, uc } = await requireContext();
  const t = await getTranslations("groceries");
  const e = await getTranslations("enums");
  const format = await getFormatter();
  const { stored, result } = await loadWeek(userId);
  if (!stored || !result) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} />
        <EmptyState title={t("emptyTitle")} action={<GenerateWeekButton label={t("create")} />}>{t("emptyText")}</EmptyState>
      </div>
    );
  }
  const c = uc.ctx.catalog;
  const list = shoppingFor(uc, result);
  const money = (v: number) => format.number(v, { style: "currency", currency: stored.plan.currency });
  const name = (id: string) => c.ingredient(id).name.fr;
  const packs = (id: string, ps: number[]) => {
    const counts = new Map<number, number>();
    ps.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
    return [...counts].map(([size, n]) => `${n} × ${formatQty(c, id, size)}`).join(" + ");
  };
  const text = list.aisles
    .map((a) => `${e(`aisle.${a.aisle}`)}\n${a.items.map((i) => `- ${name(i.ingredientId)} : ${formatQty(c, i.ingredientId, i.toBuy)}`).join("\n")}`)
    .join("\n\n");
  // Only leftovers worth planning for: no "3 g of pear" crumbs.
  const worthKeeping = (id: string, qty: number) =>
    c.ingredient(id).unit === "pc" ? qty >= 1 : c.grams(id, qty) >= 40 && c.price(id, qty) >= 0.15;
  const leftovers = list.aisles
    .flatMap((a) => a.items)
    .filter((i) => i.leftover > 0 && c.ingredient(i.ingredientId).shelfLifeDays <= 14 && worthKeeping(i.ingredientId, i.leftover))
    .sort((a, b) => c.price(b.ingredientId, b.leftover) - c.price(a.ingredientId, a.leftover));
  const pantryOn = can(uc.profile, "pantry");

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { count: list.aisles.reduce((s, a) => s + a.items.length, 0), total: money(list.total) })}
        action={<GroceryTools text={text} />}
      />

      <Card className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">{t("estimated")}</p>
            <p className="font-display text-3xl font-extrabold num">{money(list.total)}</p>
            {result.summary.budget !== undefined && <p className="text-sm text-muted num">{t("budget", { budget: money(result.summary.budget) })}</p>}
          </div>
          <ShoppedForm weekStart={stored.weekStart} done={!!stored.shoppedAt} estimated={list.total} />
        </div>
        <p className="text-xs text-muted">{t("priceNote")}</p>
      </Card>

      {!pantryOn && (
        <Notice tone="eau" title={t("pantryTitle")}>
          {t("pantryPremium")} <Link href="/app/account" className="font-semibold underline">{t("discover")}</Link>
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.aisles.map((a) => (
          <Card key={a.aisle} className="grid content-start gap-1 break-inside-avoid">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{e(`aisle.${a.aisle}`)}</h2>
              <span className="text-sm text-muted num">{money(a.cost)}</span>
            </div>
            <ul className="divide-y divide-line/70">
              {a.items.map((i) => (
                <GroceryItem
                  key={i.ingredientId}
                  id={i.ingredientId}
                  label={name(i.ingredientId)}
                  detail={`${formatQty(c, i.ingredientId, i.toBuy)}${i.packs.length > 1 ? ` (${packs(i.ingredientId, i.packs)})` : ""}`}
                  cost={money(i.cost)}
                  checked={stored.checked.includes(i.ingredientId)}
                  weekStart={stored.weekStart}
                />
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.fromPantry.length > 0 && (
          <Card className="grid content-start gap-2">
            <h2 className="text-lg font-bold">{t("fromPantry")}</h2>
            <ul className="grid gap-1 text-sm">
              {list.fromPantry.map((p) => <li key={p.ingredientId}>{name(p.ingredientId)} · <span className="text-muted num">{formatQty(c, p.ingredientId, p.qty)}</span></li>)}
            </ul>
          </Card>
        )}
        {list.staples.length > 0 && (
          <Card className="grid content-start gap-2">
            <h2 className="text-lg font-bold">{t("staples")}</h2>
            <p className="text-sm text-muted">{t("staplesText")}</p>
            <p className="text-sm">{list.staples.map((s) => name(s.ingredientId)).join(", ")}</p>
          </Card>
        )}
        {leftovers.length > 0 && (
          <Card className="grid content-start gap-2">
            <h2 className="text-lg font-bold">{t("leftoversTitle")}</h2>
            <p className="text-sm text-muted">{t("leftoversText")}</p>
            <ul className="grid gap-1 text-sm">
              {leftovers.map((i) => <li key={i.ingredientId}>{name(i.ingredientId)} · <span className="text-muted num">{formatQty(c, i.ingredientId, i.leftover)}</span></li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
