import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleRevenueCatEvent } from "@/lib/revenuecat";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** RevenueCat → Sorloo: an in-app purchase changed (bought, renewed, cancelled, expired…). */
export async function POST(request: Request) {
  if (!env.revenuecatWebhookAuth || !env.revenuecatSecret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const auth = request.headers.get("authorization") ?? "";
  const expected = env.revenuecatWebhookAuth;
  if (!sameSecret(auth, expected) && !sameSecret(auth, `Bearer ${expected}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { event?: Parameters<typeof handleRevenueCatEvent>[0] } | null;
  if (!body?.event) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const synced = await handleRevenueCatEvent(body.event);
    return NextResponse.json({ received: true, synced });
  } catch (e) {
    console.error("RevenueCat webhook failed", e);
    // A 5xx makes RevenueCat retry later.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
