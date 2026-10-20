import { isMarket, MARKET_CURRENCY, type Market } from "@weeko/engine";

/**
 * The country of the shops, guessed from where the visitor is (Vercel adds
 * the country of the IP address to every request). France when unknown or
 * not supported yet; the user can change it in the account page.
 */
export function marketFromHeaders(h: Headers): Market {
  const code = h.get("x-vercel-ip-country")?.toUpperCase();
  return isMarket(code) ? code : "FR";
}

export function currencyOf(market: Market | undefined): string {
  return (market && MARKET_CURRENCY[market]) || "EUR";
}
