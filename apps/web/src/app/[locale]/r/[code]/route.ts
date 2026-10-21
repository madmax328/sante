import { NextResponse, type NextRequest } from "next/server";
import { normalizeCode, recordClick, REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

/**
 * An affiliate's link (sorloo.com/r/JULIE): remembers who sent the visitor
 * for 60 days, then opens the home page. The account created in that time is
 * linked to the affiliate.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  const home = new URL(locale === "fr" ? "/" : `/${locale}`, req.url);
  const wanted = normalizeCode(code);
  const res = NextResponse.redirect(home, 302);
  if (!wanted) return res;
  // The same browser opening the link again counts once.
  if (req.cookies.get(REF_COOKIE)?.value === wanted) return res;
  const affiliate = await recordClick(wanted).catch(() => null);
  if (affiliate?.code) {
    res.cookies.set(REF_COOKIE, affiliate.code, { maxAge: REF_COOKIE_DAYS * 86400, httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/" });
  }
  return res;
}
