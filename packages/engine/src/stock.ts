import type { Catalog } from "./catalog";

export interface PantryItem {
  ingredientId: string;
  /** Quantity in the ingredient base unit */
  qty: number;
}

export interface Purchase {
  ingredientId: string;
  /** Pack sizes bought, base unit */
  packs: number[];
  /** Total bought, base unit */
  qty: number;
  cost: number;
}

/**
 * Tracks what is in the kitchen while meals are planned: the pantry, then what
 * has been bought. Buying always happens by whole packs, so the leftovers of a
 * pack become stock that later meals can use — that is the anti-waste lever.
 */
export class Stock {
  private available = new Map<string, number>();
  private fromPantry = new Map<string, number>();
  private pantryLeft = new Map<string, number>();
  readonly purchases = new Map<string, Purchase>();
  /** Staples used (salt, oil...), shown as "à vérifier" */
  readonly staples = new Map<string, number>();
  /** Quantity consumed per ingredient */
  readonly consumed = new Map<string, number>();

  constructor(
    private catalog: Catalog,
    pantry: PantryItem[] = [],
  ) {
    for (const p of pantry) {
      if (p.qty <= 0) continue;
      this.pantryLeft.set(p.ingredientId, (this.pantryLeft.get(p.ingredientId) ?? 0) + p.qty);
    }
  }

  clone(): Stock {
    const s = new Stock(this.catalog);
    s.available = new Map(this.available);
    s.fromPantry = new Map(this.fromPantry);
    s.pantryLeft = new Map(this.pantryLeft);
    for (const [k, v] of this.purchases) s.purchases.set(k, { ...v, packs: [...v.packs] });
    for (const [k, v] of this.staples) s.staples.set(k, v);
    for (const [k, v] of this.consumed) s.consumed.set(k, v);
    return s;
  }

  get totalCost(): number {
    let c = 0;
    for (const p of this.purchases.values()) c += p.cost;
    return c;
  }

  /** Quantity on hand (pantry + leftovers of bought packs). */
  onHand(id: string): number {
    return (this.pantryLeft.get(id) ?? 0) + (this.available.get(id) ?? 0);
  }

  pantryUsed(id: string): number {
    return this.fromPantry.get(id) ?? 0;
  }

  /**
   * What consuming `qty` would cost and how much of it comes from stock,
   * without changing anything.
   */
  quote(id: string, qty: number): { cost: number; fromStock: number; packs: number[] } {
    const ing = this.catalog.ingredient(id);
    if (ing.staple) return { cost: 0, fromStock: qty, packs: [] };
    const have = this.onHand(id);
    const fromStock = Math.min(have, qty);
    const deficit = qty - fromStock;
    if (deficit <= 1e-9) return { cost: 0, fromStock, packs: [] };
    const packs = choosePacks(ing.packs, deficit);
    const cost = packs.reduce((s, p) => s + this.catalog.price(id, p), 0);
    return { cost, fromStock, packs };
  }

  consume(id: string, qty: number): void {
    if (qty <= 0) return;
    this.consumed.set(id, (this.consumed.get(id) ?? 0) + qty);
    const ing = this.catalog.ingredient(id);
    if (ing.staple) {
      this.staples.set(id, (this.staples.get(id) ?? 0) + qty);
      return;
    }
    let need = qty;
    const pantry = this.pantryLeft.get(id) ?? 0;
    if (pantry > 0) {
      const used = Math.min(pantry, need);
      this.pantryLeft.set(id, pantry - used);
      this.fromPantry.set(id, (this.fromPantry.get(id) ?? 0) + used);
      need -= used;
    }
    const avail = this.available.get(id) ?? 0;
    if (avail > 0 && need > 0) {
      const used = Math.min(avail, need);
      this.available.set(id, avail - used);
      need -= used;
    }
    if (need > 1e-9) {
      const packs = choosePacks(ing.packs, need);
      const bought = packs.reduce((s, p) => s + p, 0);
      const cost = packs.reduce((s, p) => s + this.catalog.price(id, p), 0);
      const prev = this.purchases.get(id) ?? { ingredientId: id, packs: [], qty: 0, cost: 0 };
      prev.packs.push(...packs);
      prev.qty += bought;
      prev.cost += cost;
      this.purchases.set(id, prev);
      this.available.set(id, (this.available.get(id) ?? 0) + bought - need);
    }
  }

  /** Bought quantities not consumed by the plan. */
  leftovers(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [id, q] of this.available) if (q > 1e-6) out.set(id, q);
    return out;
  }
}

/** Cheapest set of packs covering `need` (linear prices => least waste). */
export function choosePacks(sizes: number[], need: number): number[] {
  if (sizes.length === 0) return [need];
  const sorted = [...sizes].sort((a, b) => a - b);
  let best: number[] | null = null;
  let bestTotal = Infinity;
  const consider = (packs: number[]) => {
    const total = packs.reduce((s, p) => s + p, 0);
    if (total + 1e-9 < need) return;
    if (total < bestTotal || (total === bestTotal && best && packs.length < best.length)) {
      best = packs;
      bestTotal = total;
    }
  };
  for (const s of sorted) {
    consider(Array(Math.max(1, Math.ceil(need / s - 1e-9))).fill(s));
  }
  // Large packs plus one smaller pack for the remainder
  const largest = sorted[sorted.length - 1]!;
  const nLarge = Math.floor(need / largest);
  if (nLarge > 0) {
    const rest = need - nLarge * largest;
    if (rest <= 1e-9) consider(Array(nLarge).fill(largest));
    else {
      const small = sorted.find((s) => s >= rest) ?? largest;
      consider([...Array(nLarge).fill(largest), small]);
    }
  }
  return best ?? [need];
}
