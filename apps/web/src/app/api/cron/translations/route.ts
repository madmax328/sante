import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { stepCatalogTranslation } from "@/lib/catalog-i18n";

export const maxDuration = 60;

/**
 * Catalog in the other languages: starts a translation batch for the texts
 * still missing, or collects the finished one. Called daily by Vercel Cron, or by
 * hand: /api/cron/translations?key=CRON_SECRET.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorized = request.headers.get("authorization") === `Bearer ${env.cronSecret}` || url.searchParams.get("key") === env.cronSecret;
  if (!env.cronSecret || !authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await stepCatalogTranslation());
}
