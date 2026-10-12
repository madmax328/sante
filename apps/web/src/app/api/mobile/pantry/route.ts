import { localeOf, tr } from "@/lib/locale";
import { contextFor, mobileRoute } from "@/lib/mobile";
import { can } from "@/lib/premium";
import { getPantry } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** What the person already has at home, and the ingredients that can be added. */
export const GET = mobileRoute(async (req, userId) => {
  const loc = localeOf(req);
  const uc = await contextFor(userId);
  if (!can(uc.profile, "pantry")) return { allowed: false, items: [], options: [] };
  const c = uc.ctx.catalog;
  const items = (await getPantry(userId)).filter((i) => c.ingredients.has(i.ingredientId));
  return {
    allowed: true,
    items: items
      .map((i) => ({ id: i.ingredientId, name: tr(c.ingredient(i.ingredientId).name, loc), qty: Math.round(i.qty), unit: c.ingredient(i.ingredientId).unit }))
      .sort((a, b) => a.name.localeCompare(b.name, loc)),
    options: [...c.ingredients.values()]
      .filter((i) => !i.staple)
      .map((i) => ({ id: i.id, name: tr(i.name, loc), unit: i.unit }))
      .sort((a, b) => a.name.localeCompare(b.name, loc)),
  };
});
