import { NextRequest, NextResponse } from "next/server";
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
  return intl(withLanguageFallback(req));
}

/**
 * The site exists in six languages; for any other language (Dutch, Polish…)
 * English rather than French, like the app. Only the first visit is
 * concerned: the choice is then kept.
 */
function withLanguageFallback(req: NextRequest): NextRequest {
  const accept = req.headers.get("accept-language");
  const supported = new RegExp(`(^|[\\s,])(${routing.locales.join("|")})\\b`, "i");
  if (!accept || supported.test(accept) || req.cookies.has("NEXT_LOCALE")) return req;
  const headers = new Headers(req.headers);
  headers.set("accept-language", "en");
  return new NextRequest(req.url, { headers, method: req.method });
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
