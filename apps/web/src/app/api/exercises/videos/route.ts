import { NextResponse } from "next/server";
import { exerciseVideos } from "@weeko/catalog/demos";

/**
 * Exercises that have a real video. The app reads this list, so a new video
 * only needs the website to be deployed (no app update).
 */
export function GET() {
  return NextResponse.json([...exerciseVideos], { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=86400" } });
}
