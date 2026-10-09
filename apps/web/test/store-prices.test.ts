import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// In-memory stand-in for the store_prices collection.
const docs = new Map<string, { _id: string; brands: Record<string, { price: number; count: number }>; samples: number; updatedAt: Date }>();
vi.mock("../src/lib/db", () => ({
  ensureIndexes: async () => undefined,
  db: {
    collection: () => ({
      find: (q: { _id?: { $in: string[] } }) => ({
        toArray: async () => [...docs.values()].filter((d) => !q?._id || q._id.$in.includes(d._id)),
      }),
      updateOne: async (f: { _id: string }, u: { $set: object }) => {
        docs.set(f._id, { _id: f._id, ...(u.$set as object) } as never);
      },
      countDocuments: async () => docs.size,
    }),
  },
}));

const { compareStores, refreshStorePrices } = await import("../src/lib/store-prices");

/** Answers like prices.openfoodfacts.org/api/v1/prices for a few categories. */
function fakeApi() {
  const loc = (brand: string, country = "FR") => ({ type: "OSM", osm_brand: brand, osm_name: brand, osm_address_country_code: country });
  return vi.fn(async (url: string) => {
    const q = new URL(url).searchParams;
    let items: unknown[] = [];
    if (q.get("category_tag") === "en:tomatoes") {
      items = [
        { price: "2.50", price_per: "KILOGRAM", location: loc("Carrefour Market") },
        { price: "2.70", price_per: "KILOGRAM", location: loc("Carrefour") },
        { price: "1.90", price_per: "KILOGRAM", location: loc("Lidl") },
        { price: "2.10", price_per: "KILOGRAM", location: loc("Lidl") },
        { price: "1.20", price_per: "KILOGRAM", location: loc("Mercadona", "ES") },
        { price: "90", price_per: "KILOGRAM", location: loc("Lidl") },
      ];
    }
    if (q.get("product__categories_tags__contains") === "en:dry-pastas") {
      items = [
        { price: "1.00", location: loc("E.Leclerc"), product: { product_quantity: 500, product_quantity_unit: "g" } },
        { price: "1.10", location: loc("Leclerc Drive"), product: { product_quantity: 500, product_quantity_unit: "g" } },
        { price: "0.80", location: loc("Lidl"), product: { product_quantity: 500, product_quantity_unit: "g" } },
        { price: "0.90", location: loc("Lidl"), product: { product_quantity: 500, product_quantity_unit: "g" } },
      ];
    }
    return new Response(JSON.stringify({ items, total: items.length }), { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  docs.clear();
});

describe("store prices", () => {
  it("keeps French prices per chain, converts packs to €/kg and drops outliers", async () => {
    vi.stubGlobal("fetch", fakeApi());
    await refreshStorePrices(20_000);
    expect(docs.get("tomato")?.brands).toEqual({ Carrefour: { price: 2.6, count: 2 }, Lidl: { price: 2, count: 2 } });
    expect(docs.get("pasta")?.brands).toEqual({ "E.Leclerc": { price: 2.1, count: 2 }, Lidl: { price: 1.7, count: 2 } });
  });

  it("estimates the list per chain from measured prices and the chain's usual gap", async () => {
    const at = new Date();
    docs.set("tomato", { _id: "tomato", brands: { Lidl: { price: 2, count: 3 }, Carrefour: { price: 2.6, count: 2 } }, samples: 5, updatedAt: at });
    docs.set("pasta", { _id: "pasta", brands: { Lidl: { price: 1.6, count: 4 } }, samples: 4, updatedAt: at });
    docs.set("rice", { _id: "rice", brands: { Lidl: { price: 2, count: 2 } }, samples: 2, updatedAt: at });
    const { getCatalog } = await import("@weeko/catalog");
    const c = getCatalog();
    const item = (id: string, qty: number) => ({ ingredientId: id, needed: qty, fromPantry: 0, toBuy: qty, packs: [qty], cost: c.price(id, qty), leftover: 0 });
    const list = { aisles: [{ aisle: "produce", items: [item("tomato", 1000), item("pasta", 500), item("rice", 1000), item("carrot", 1000)] }], staples: [], fromPantry: [], total: 0, leftoverValue: 0 };
    const res = await compareStores(list as never);
    expect(res.items).toBe(4);
    // Carrefour has a single measured product: not enough to compare.
    expect(res.stores.map((s) => s.brand)).toEqual(["Lidl"]);
    const lidl = res.stores[0]!;
    expect(lidl.measured).toBe(3);
    const ratio = (id: string, p: number) => p / c.price(id, 1000);
    const index = [ratio("tomato", 2), ratio("pasta", 1.6), ratio("rice", 2)].sort((a, b) => a - b)[1]!;
    const expected = c.price("tomato", 1000) * ratio("tomato", 2) + c.price("pasta", 500) * ratio("pasta", 1.6) + c.price("rice", 1000) * ratio("rice", 2) + c.price("carrot", 1000) * index;
    expect(lidl.total).toBeCloseTo(expected, 1);
  });
});
