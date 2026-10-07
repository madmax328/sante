import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** Former addresses of the site. API routes stay reachable there for older app builds. */
const LEGACY_HOSTS = new Set(["getweeko.com", "www.getweeko.com"]);

function canonicalHost(): string | null {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").hostname;
    return LEGACY_HOSTS.has(host) || host === "localhost" ? null : host;
  } catch {
    return null;
  }
}

export default function proxy(req: NextRequest) {
  // One address for the whole site (sessions are tied to one host):
  // the former domain → the current one, then www.sorloo.com → sorloo.com.
  const host = req.headers.get("host") ?? "";
  const canonical = canonicalHost();
  if (canonical && LEGACY_HOSTS.has(host) && host !== canonical) {
    const url = req.nextUrl.clone();
    url.host = canonical;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  if (host.startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.host = host.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return intl(req);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
