import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { PHOTO_BATCH, syncPhotos } from "@/lib/photos";

export const maxDuration = 60;

/**
 * Fills recipe photos in batches. Called daily by Vercel Cron, or by hand:
 * /api/cron/photos?key=CRON_SECRET (once per hour with Unsplash in demo mode).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Vercel Cron sends the secret as a header; by hand, it can be passed as ?key=
  const authorized = request.headers.get("authorization") === `Bearer ${env.cronSecret}` || url.searchParams.get("key") === env.cronSecret;
  if (!env.cronSecret || !authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const max = Math.min(180, Math.max(1, Number(url.searchParams.get("max")) || PHOTO_BATCH()));
  const result = await syncPhotos(max);
  return NextResponse.json(result);
}
