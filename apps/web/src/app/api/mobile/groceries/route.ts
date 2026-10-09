import { formatQty } from "@weeko/engine";
import { getTranslations } from "next-intl/server";
import { mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";
import { compareStores } from "@/lib/store-prices";
import { loadWeek, shoppingFor } from "@/lib/week-service";

export const dynamic = "force-dynamic";

/** Shopping list by aisle, what to check in the cupboard, and what will be left. */
export const GET = mobileRoute(async (_req, userId) => {
  const { uc, stored, result } = await loadWeek(userId);
  if (!stored || !result) return { hasPlan: false };
  const e = await getTranslations("enums");
  const c = uc.ctx.catalog;
  const list = shoppingFor(uc, result);
  const storesOn = can(uc.profile, "budget");
  const comparison = storesOn ? await compareStores(list) : null;
  const name = (id: string) => c.ingredient(id).name.fr;
  const worthKeeping = (id: string, qty: number) =>
    c.ingredient(id).unit === "pc" ? qty >= 1 : c.grams(id, qty) >= 40 && c.price(id, qty) >= 0.15;
  return {
    hasPlan: true,
    weekStart: stored.weekStart,
    total: list.total,
    shopped: !!stored.shoppedAt,
    actualSpent: stored.actualSpent ?? null,
    pantry: can(uc.profile, "pantry"),
    stores: comparison ? { premium: true, items: comparison.items, list: comparison.stores } : { premium: false, items: 0, list: [] },
    aisles: list.aisles.map((a) => ({
      aisle: a.aisle,
      label: e(`aisle.${a.aisle}`),
      total: Math.round(a.items.reduce((s, i) => s + i.cost, 0) * 100) / 100,
      items: a.items.map((i) => ({
        id: i.ingredientId,
        name: name(i.ingredientId),
        qty: formatQty(c, i.ingredientId, i.toBuy),
        cost: i.cost,
        checked: stored.checked.includes(i.ingredientId),
      })),
    })),
    staples: list.staples.map((s) => name(s.ingredientId)),
    fromPantry: list.fromPantry.map((p) => ({ name: name(p.ingredientId), qty: formatQty(c, p.ingredientId, p.qty) })),
    leftovers: list.aisles
      .flatMap((a) => a.items)
      .filter((i) => i.leftover > 0 && c.ingredient(i.ingredientId).shelfLifeDays <= 14 && worthKeeping(i.ingredientId, i.leftover))
      .sort((a, b) => c.price(b.ingredientId, b.leftover) - c.price(a.ingredientId, a.leftover))
      .map((i) => ({ name: name(i.ingredientId), qty: formatQty(c, i.ingredientId, i.leftover) })),
  };
});
