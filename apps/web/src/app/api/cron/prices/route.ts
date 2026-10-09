import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { refreshStorePrices } from "@/lib/store-prices";

export const maxDuration = 60;

/**
 * Refreshes store prices from Open Prices. Called daily by Vercel Cron, or by
 * hand: /api/cron/prices?key=CRON_SECRET (each call continues where the last stopped).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorized = request.headers.get("authorization") === `Bearer ${env.cronSecret}` || url.searchParams.get("key") === env.cronSecret;
  if (!env.cronSecret || !authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await refreshStorePrices());
}
