import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { syncPhotos } from "@/lib/photos";

export const maxDuration = 60;

/** Called by Vercel Cron (Authorization: Bearer CRON_SECRET). Fills recipe photos in batches. */
export async function GET(request: Request) {
  if (!env.cronSecret || request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const max = Math.min(180, Math.max(1, Number(url.searchParams.get("max")) || 150));
  const result = await syncPhotos(max);
  return NextResponse.json(result);
}
