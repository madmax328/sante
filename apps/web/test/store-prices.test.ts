import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// In-memory stand-in for the store_prices collection.
const docs = new Map<string, { _id: string; brands: Record<string, { price: number; count: number }>; samples: number; updatedAt: Date; v?: number }>();
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
        { price: "6.90", price_per: "KILOGRAM", labels_tags: ["en:organic"], location: loc("Carrefour") },
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
  it("keeps French, non-organic prices per chain, converts packs to €/kg and drops outliers", async () => {
    vi.stubGlobal("fetch", fakeApi());
    await refreshStorePrices(20_000);
    expect(docs.get("tomato")?.brands).toEqual({ Carrefour: { price: 2.6, count: 2 }, Lidl: { price: 2, count: 2 } });
    expect(docs.get("pasta")?.brands).toEqual({ "E.Leclerc": { price: 2.1, count: 2 }, Lidl: { price: 1.7, count: 2 } });
    expect(docs.get("tomato")?.v).toBe(2);
  });

  it("compares chains with each other on the same products", async () => {
    const at = new Date();
    const ids = ["tomato", "pasta", "rice", "carrot", "apple", "banana"];
    // Lidl 10 % under Carrefour on every product; Aldi priced on 2 products only.
    for (const id of ids) docs.set(id, { _id: id, brands: { Lidl: { price: 0.9, count: 3 }, Carrefour: { price: 1, count: 3 } }, samples: 6, updatedAt: at, v: 2 } as never);
    docs.get("apple")!.brands.Aldi = { price: 0.5, count: 2 };
    docs.get("banana")!.brands.Aldi = { price: 0.5, count: 2 };
    const { getCatalog } = await import("@weeko/catalog");
    const c = getCatalog();
    const item = (id: string, qty: number) => ({ ingredientId: id, needed: qty, fromPantry: 0, toBuy: qty, packs: [qty], cost: c.price(id, qty), leftover: 0 });
    const list = { aisles: [{ aisle: "produce", items: [...ids.map((id) => item(id, 1000)), item("onion", 1000)] }], staples: [], fromPantry: [], total: 0, leftoverValue: 0 };
    const res = await compareStores(list as never);
    expect(res.items).toBe(7);
    expect(res.stores.map((s) => s.brand)).toEqual(["Lidl", "Carrefour"]);
    const [lidl, carrefour] = res.stores;
    expect(lidl!.measured).toBe(6);
    expect(lidl!.total / carrefour!.total).toBeCloseTo(0.9, 2);
  });
});
