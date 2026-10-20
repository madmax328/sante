import type { Market } from "@weeko/engine";

/**
 * Where to look for each ingredient in Open Prices (prices.openfoodfacts.org):
 * `raw` = loose products priced per kg or per piece (category_tag),
 * `product` = packaged products (Open Food Facts category), priced per pack
 * and converted with the pack size. Several tags may be tried; an unknown tag
 * simply returns nothing.
 */
export interface PriceSource {
  raw?: string[];
  product?: string[];
}

const raw = (...tags: string[]): PriceSource => ({ raw: tags.map((t) => `en:${t}`) });
const pack = (...tags: string[]): PriceSource => ({ product: tags.map((t) => `en:${t}`) });

export const PRICE_SOURCES: Record<string, PriceSource> = {
  // Fruits and vegetables (loose)
  carrot: raw("carrots"),
  onion: raw("onions", "yellow-onions"),
  red_onion: raw("red-onions"),
  shallot: raw("shallots"),
  garlic: raw("garlic"),
  potato: raw("potatoes"),
  sweet_potato: raw("sweet-potatoes"),
  zucchini: raw("zucchini", "courgettes"),
  eggplant: raw("eggplants", "aubergines"),
  bell_pepper: raw("bell-peppers", "sweet-peppers", "red-bell-peppers"),
  tomato: raw("tomatoes", "round-tomatoes"),
  cherry_tomato: raw("cherry-tomatoes"),
  cucumber: raw("cucumbers"),
  lettuce: raw("lettuces", "iceberg-lettuces"),
  salad_mix: pack("mesclun", "mixed-salads"),
  arugula: pack("rocket-salads", "arugula"),
  spinach: pack("baby-spinach", "fresh-spinachs"),
  celery: raw("celery-stalks", "celery"),
  beetroot: pack("cooked-beetroots", "beetroots"),
  broccoli: raw("broccoli"),
  cauliflower: raw("cauliflowers"),
  green_beans: raw("green-beans"),
  leek: raw("leeks"),
  mushroom: raw("button-mushrooms", "mushrooms"),
  cabbage: raw("cabbages", "green-cabbages"),
  red_cabbage: raw("red-cabbages"),
  butternut: raw("butternut-squashes", "butternuts"),
  fennel: raw("fennels", "fennel-bulbs"),
  radish: raw("radishes"),
  avocado: raw("avocados"),
  ginger: raw("gingers", "ginger"),
  lemon: raw("lemons"),
  lime: raw("limes"),
  apple: raw("apples"),
  banana: raw("bananas"),
  orange: raw("oranges"),
  pear: raw("pears"),
  kiwi: raw("kiwis", "kiwifruits"),
  strawberry: raw("strawberries"),
  mango: raw("mangoes"),
  // Packaged
  canned_tomato: pack("canned-tomatoes", "crushed-tomatoes"),
  passata: pack("tomato-passata", "tomato-purees"),
  tomato_paste: pack("tomato-pastes", "tomato-concentrates"),
  corn: pack("canned-sweet-corn", "sweet-corns"),
  frozen_spinach: pack("frozen-spinachs", "frozen-spinach"),
  frozen_green_beans: pack("frozen-green-beans"),
  frozen_peas: pack("frozen-peas"),
  frozen_veg_mix: pack("frozen-vegetable-mixes", "frozen-vegetables"),
  frozen_broccoli: pack("frozen-broccoli"),
  olives: pack("black-olives"),
  frozen_berries: pack("frozen-red-fruits", "frozen-berries"),
  raisins: pack("raisins"),
  dried_apricot: pack("dried-apricots"),
  applesauce: pack("apple-compotes", "applesauces"),
  chicken_breast: pack("chicken-breasts", "chicken-breast-fillets"),
  chicken_thigh: pack("chicken-thighs"),
  chicken_drumstick: pack("chicken-drumsticks"),
  chicken_whole_legs: pack("chicken-legs"),
  turkey: pack("turkey-escalopes", "turkey-cutlets"),
  ground_beef: pack("minced-beef", "ground-beef"),
  ground_beef_15: pack("minced-beef", "ground-beef"),
  beef_steak: pack("beef-steaks"),
  beef_stew: pack("beef-for-stew", "stewing-beef"),
  pork_tenderloin: pack("pork-tenderloins", "pork-fillets"),
  pork_chop: pack("pork-chops"),
  ham: pack("white-hams", "cooked-hams"),
  bacon: pack("lardons", "bacon-bits"),
  chorizo: pack("chorizos", "chorizo"),
  sausage: pack("toulouse-sausages", "sausages"),
  merguez: pack("merguez"),
  lamb: pack("lamb-shoulders"),
  salmon: pack("salmon-fillets", "salmons"),
  cod: pack("cod-fillets", "cods"),
  white_fish: pack("frozen-pollock-fillets", "pollock-fillets"),
  frozen_salmon: pack("frozen-salmon-fillets"),
  tuna_can: pack("canned-tunas", "tunas-in-brine"),
  sardines_can: pack("canned-sardines", "sardines-in-oil"),
  mackerel_can: pack("canned-mackerels", "mackerel-fillets"),
  smoked_salmon: pack("smoked-salmons"),
  shrimp: pack("frozen-shrimps", "shrimps"),
  mussels: pack("mussels"),
  surimi: pack("surimi"),
  milk: pack("semi-skimmed-milks"),
  butter: pack("unsalted-butters", "butters"),
  cream: pack("creme-fraiche", "thick-creams"),
  light_cream: pack("light-creams"),
  yogurt: pack("plain-yogurts", "natural-yogurts"),
  greek_yogurt: pack("greek-style-yogurts", "greek-yogurts"),
  skyr: pack("skyrs", "skyr"),
  fromage_blanc: pack("fromages-blancs", "fromage-blanc"),
  emmental: pack("grated-emmental", "emmental"),
  mozzarella: pack("mozzarella"),
  parmesan: pack("parmigiano-reggiano", "parmesan"),
  feta: pack("feta"),
  goat_cheese: pack("goat-cheese-logs", "goat-cheeses"),
  comte: pack("comte"),
  ricotta: pack("ricotta"),
  cream_cheese: pack("cream-cheeses", "fresh-cheese-spreads"),
  raclette: pack("raclette-cheeses", "raclette"),
  pizza_dough: pack("pizza-doughs"),
  puff_pastry: pack("puff-pastries"),
  shortcrust: pack("shortcrust-pastries"),
  gnocchi: pack("gnocchi"),
  fresh_pasta: pack("fresh-pastas", "tagliatelle"),
  hummus: pack("hummus"),
  tofu: pack("tofu", "plain-tofu"),
  smoked_tofu: pack("smoked-tofu"),
  soy_drink: pack("soy-milks", "soy-based-drinks"),
  oat_drink: pack("oat-based-drinks", "oat-milks"),
  soy_yogurt: pack("soy-yogurts", "soy-desserts"),
  soy_mince: pack("textured-soy-proteins"),
  coconut_milk: pack("coconut-milks"),
  baguette: pack("baguettes"),
  wholemeal_bread: pack("wholemeal-breads", "whole-wheat-breads"),
  sandwich_bread: pack("wholemeal-sliced-breads", "sliced-breads"),
  rice_cakes: pack("puffed-rice-cakes", "rice-cakes"),
  pasta: pack("dry-pastas", "pastas"),
  spaghetti: pack("spaghetti"),
  wholewheat_pasta: pack("whole-wheat-pastas", "wholemeal-pastas"),
  lasagna_sheets: pack("lasagna-sheets", "lasagne"),
  rice: pack("long-grain-rices", "rices"),
  basmati: pack("basmati-rices"),
  brown_rice: pack("brown-rices", "whole-rices"),
  risotto_rice: pack("arborio-rices", "risotto-rices"),
  quinoa: pack("quinoa", "quinoas"),
  bulgur: pack("bulgurs", "bulgur"),
  couscous: pack("couscous", "couscous-semolinas"),
  oats: pack("rolled-oats", "oat-flakes"),
  green_lentils: pack("green-lentils"),
  red_lentils: pack("red-lentils", "coral-lentils"),
  chickpeas: pack("canned-chickpeas", "chickpeas"),
  kidney_beans: pack("canned-red-kidney-beans", "red-kidney-beans"),
  white_beans: pack("canned-white-beans", "white-beans"),
  flour: pack("wheat-flours", "t55-wheat-flours"),
  rice_noodles: pack("rice-noodles"),
  egg_noodles: pack("egg-noodles"),
  polenta: pack("polentas", "polenta"),
  breadcrumbs: pack("breadcrumbs"),
  muesli: pack("mueslis", "muesli"),
  peanut_butter: pack("peanut-butters"),
  almonds: pack("almonds"),
  walnuts: pack("walnut-kernels", "walnuts"),
  cashews: pack("cashew-nuts"),
  chia: pack("chia-seeds"),
  dark_chocolate: pack("dark-chocolates"),
  honey: pack("honeys"),
  jam: pack("jams"),
  cocoa: pack("unsweetened-cocoa-powders", "cocoa-powders"),
  pesto: pack("pesto-alla-genovese", "pestos"),
  tahini: pack("tahini", "tahinis"),
  dates: pack("dates"),
  maple_syrup: pack("maple-syrups"),
};

/**
 * Store chains shown in the comparison, matched on the OpenStreetMap brand or
 * name, in the countries where they trade (all countries when not given).
 * `organic`: organic shops, whose organic prices are kept.
 */
export const BRANDS: { name: string; match: RegExp; countries?: Market[]; organic?: boolean }[] = [
  // Across Europe
  { name: "Lidl", match: /\blidl\b/i },
  { name: "Aldi", match: /\baldi\b/i },
  { name: "Hofer", match: /\bhofer\b/i, countries: ["AT"] },
  { name: "Carrefour", match: /carrefour/i, countries: ["FR", "BE", "ES", "IT"] },
  { name: "Auchan", match: /auchan/i, countries: ["FR", "LU", "PT"] },
  { name: "Alcampo", match: /alcampo/i, countries: ["ES"] },
  { name: "Intermarché", match: /intermarch/i, countries: ["FR", "BE", "PT"] },
  { name: "E.Leclerc", match: /leclerc/i, countries: ["FR", "ES", "PT"] },
  { name: "Spar", match: /\b(euro|inter)?spar\b/i, countries: ["AT", "NL", "IE", "IT", "CH", "GB"] },
  { name: "Penny", match: /\bpenny\b/i, countries: ["DE", "AT", "IT"] },
  { name: "Netto", match: /\bnetto\b/i, countries: ["FR", "DE"] },
  { name: "Delhaize", match: /delhaize/i, countries: ["BE", "LU"] },
  // France
  { name: "Système U", match: /^(super|hyper|marché)?\s*u\b|u express|système u|systeme u/i, countries: ["FR"] },
  { name: "Monoprix", match: /monoprix|monop'/i, countries: ["FR"] },
  { name: "Franprix", match: /franprix/i, countries: ["FR"] },
  { name: "Casino", match: /casino/i, countries: ["FR"] },
  { name: "Grand Frais", match: /grand frais/i, countries: ["FR"] },
  { name: "Picard", match: /picard/i, countries: ["FR"] },
  { name: "Cora", match: /\bcora\b/i, countries: ["FR", "LU"] },
  { name: "Biocoop", match: /biocoop/i, countries: ["FR"], organic: true },
  // Belgium, Luxembourg
  { name: "Colruyt", match: /colruyt/i, countries: ["BE", "LU"] },
  { name: "Cactus", match: /\bcactus\b/i, countries: ["LU"] },
  // Switzerland
  { name: "Migros", match: /migros/i, countries: ["CH"] },
  { name: "Coop", match: /^coop\b|\bcoop pronto\b/i, countries: ["CH", "IT"] },
  { name: "Denner", match: /denner/i, countries: ["CH"] },
  // Germany, Austria
  { name: "Edeka", match: /edeka/i, countries: ["DE"] },
  { name: "Rewe", match: /\brewe\b/i, countries: ["DE"] },
  { name: "Kaufland", match: /kaufland/i, countries: ["DE"] },
  { name: "Billa", match: /\bbilla\b/i, countries: ["AT"] },
  { name: "Alnatura", match: /alnatura/i, countries: ["DE"], organic: true },
  // Netherlands
  { name: "Albert Heijn", match: /albert heijn|\bah to go\b/i, countries: ["NL"] },
  { name: "Jumbo", match: /\bjumbo\b/i, countries: ["NL"] },
  { name: "Plus", match: /^plus\b/i, countries: ["NL"] },
  { name: "Dirk", match: /\bdirk\b/i, countries: ["NL"] },
  // Ireland, United Kingdom
  { name: "Tesco", match: /tesco/i, countries: ["IE", "GB"] },
  { name: "Dunnes Stores", match: /dunnes/i, countries: ["IE"] },
  { name: "SuperValu", match: /supervalu/i, countries: ["IE"] },
  { name: "Sainsbury's", match: /sainsbury/i, countries: ["GB"] },
  { name: "Asda", match: /\basda\b/i, countries: ["GB"] },
  { name: "Morrisons", match: /morrisons/i, countries: ["GB"] },
  { name: "Waitrose", match: /waitrose/i, countries: ["GB"] },
  { name: "Co-op", match: /\bco-?op\b/i, countries: ["GB"] },
  // Spain
  { name: "Mercadona", match: /mercadona/i, countries: ["ES"] },
  { name: "Dia", match: /^dia\b|\bdia market\b/i, countries: ["ES"] },
  { name: "Eroski", match: /eroski/i, countries: ["ES"] },
  { name: "Consum", match: /\bconsum\b/i, countries: ["ES"] },
  // Italy
  { name: "Conad", match: /conad/i, countries: ["IT"] },
  { name: "Esselunga", match: /esselunga/i, countries: ["IT"] },
  { name: "Eurospin", match: /eurospin/i, countries: ["IT"] },
  // Portugal
  { name: "Continente", match: /continente/i, countries: ["PT"] },
  { name: "Pingo Doce", match: /pingo doce/i, countries: ["PT"] },
  { name: "Minipreço", match: /minipre[cç]o/i, countries: ["PT"] },
];

const sells = (b: (typeof BRANDS)[number], market: Market) => !b.countries || b.countries.includes(market);

export function brandOf(osmBrand: string | null | undefined, osmName: string | null | undefined, market: Market = "FR"): string | null {
  for (const text of [osmBrand, osmName]) {
    if (!text) continue;
    const b = BRANDS.find((x) => sells(x, market) && x.match.test(text.trim()));
    if (b) return b.name;
  }
  return null;
}

export function isOrganicShop(brand: string): boolean {
  return !!BRANDS.find((b) => b.name === brand)?.organic;
}

/** A few chains of the country, for texts ("Leclerc, Carrefour, Lidl…"). */
export function brandExamples(market: Market): string[] {
  const local = BRANDS.filter((b) => b.countries?.includes(market) && !b.organic).map((b) => b.name);
  return [...local, "Lidl", "Aldi"].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
}
