// Types only: this file is also bundled in the mobile app, without the engine.
import type { Aisle, Ingredient, Locale, Market } from "@weeko/engine";

/**
 * Shop prices by country. The catalog prices are French supermarket prices;
 * other countries are derived from them with the price level of food and
 * non-alcoholic beverages (Eurostat, EU27 = 100, 2024), then converted to
 * the local currency. Where Open Prices has enough measured prices in the
 * country, the shopping list comparison uses them on top of this.
 */
export interface MarketInfo {
  code: Market;
  flag: string;
  name: Record<Locale, string>;
  currency: string;
  /** Food price level, EU27 = 100 */
  level: number;
  /** Aisles whose prices are far from the country's average gap */
  aisles?: Partial<Record<Aisle, number>>;
  /** Local currency for 1 € */
  rate: number;
}

const m = (code: Market, flag: string, level: number, name: Record<Locale, string>, extra: Partial<MarketInfo> = {}): MarketInfo => ({
  code,
  flag,
  name,
  level,
  currency: "EUR",
  rate: 1,
  ...extra,
});

export const MARKET_LIST: MarketInfo[] = [
  m("FR", "🇫🇷", 110, { fr: "France", en: "France", de: "Frankreich", es: "Francia", it: "Francia", pt: "França" }),
  m("BE", "🇧🇪", 111, { fr: "Belgique", en: "Belgium", de: "Belgien", es: "Bélgica", it: "Belgio", pt: "Bélgica" }),
  m("LU", "🇱🇺", 125, { fr: "Luxembourg", en: "Luxembourg", de: "Luxemburg", es: "Luxemburgo", it: "Lussemburgo", pt: "Luxemburgo" }),
  // Meat costs about twice the French price in Switzerland.
  m("CH", "🇨🇭", 161, { fr: "Suisse", en: "Switzerland", de: "Schweiz", es: "Suiza", it: "Svizzera", pt: "Suíça" }, { currency: "CHF", rate: 0.94, aisles: { meat: 1.35 } }),
  m("DE", "🇩🇪", 107, { fr: "Allemagne", en: "Germany", de: "Deutschland", es: "Alemania", it: "Germania", pt: "Alemanha" }),
  m("AT", "🇦🇹", 115, { fr: "Autriche", en: "Austria", de: "Österreich", es: "Austria", it: "Austria", pt: "Áustria" }),
  m("NL", "🇳🇱", 101, { fr: "Pays-Bas", en: "Netherlands", de: "Niederlande", es: "Países Bajos", it: "Paesi Bassi", pt: "Países Baixos" }),
  m("IE", "🇮🇪", 112, { fr: "Irlande", en: "Ireland", de: "Irland", es: "Irlanda", it: "Irlanda", pt: "Irlanda" }),
  m("GB", "🇬🇧", 104, { fr: "Royaume-Uni", en: "United Kingdom", de: "Vereinigtes Königreich", es: "Reino Unido", it: "Regno Unito", pt: "Reino Unido" }, { currency: "GBP", rate: 0.85 }),
  m("ES", "🇪🇸", 94, { fr: "Espagne", en: "Spain", de: "Spanien", es: "España", it: "Spagna", pt: "Espanha" }),
  m("IT", "🇮🇹", 106, { fr: "Italie", en: "Italy", de: "Italien", es: "Italia", it: "Italia", pt: "Itália" }),
  m("PT", "🇵🇹", 94, { fr: "Portugal", en: "Portugal", de: "Portugal", es: "Portugal", it: "Portogallo", pt: "Portugal" }),
];

export const MARKET_INFO = Object.fromEntries(MARKET_LIST.map((x) => [x.code, x])) as Record<Market, MarketInfo>;

/** How much an ingredient costs in the country compared with France, in local currency. */
export function priceFactor(market: Market, aisle: Aisle): number {
  const info = MARKET_INFO[market];
  return (info.level / MARKET_INFO.FR.level) * (info.aisles?.[aisle] ?? 1) * info.rate;
}

/** The ingredients with their price in the country's shops. */
export function localizePrices(ingredients: Ingredient[], market: Market): Ingredient[] {
  if (market === "FR") return ingredients;
  return ingredients.map((i) => {
    const fr = i.price.FR;
    if (fr === undefined || i.price[market] !== undefined) return i;
    return { ...i, price: { ...i.price, [market]: Math.round(fr * priceFactor(market, i.aisle) * 100) / 100 } };
  });
}
