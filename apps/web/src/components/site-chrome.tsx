import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LinkButton, Logo } from "./ui";

export async function SiteHeader() {
  const t = await getTranslations("site");
  const h = await headers();
  let session = null;
  try {
    session = await auth.api.getSession({ headers: h });
  } catch {
    // Database unreachable: show the logged-out header.
  }
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-riz/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Weeko">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/pricing" className="hidden text-sm font-semibold text-muted hover:text-encre sm:inline">
            {t("pricing")}
          </Link>
          <Link href="/contact" className="hidden text-sm font-semibold text-muted hover:text-encre sm:inline">
            {t("contact")}
          </Link>
          {session ? (
            <LinkButton href="/app" size="sm">
              {t("openApp")}
            </LinkButton>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold hover:text-basilic">
                {t("login")}
              </Link>
              <LinkButton href="/signup" size="sm" variant="accent">
                {t("start")}
              </LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("site");
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">{t("footerTagline")}</p>
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="font-bold">{t("product")}</p>
          <Link href="/pricing" className="text-muted hover:text-encre">{t("pricing")}</Link>
          <Link href="/signup" className="text-muted hover:text-encre">{t("start")}</Link>
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="font-bold">{t("legal")}</p>
          <Link href="/legal/privacy" className="text-muted hover:text-encre">{t("privacy")}</Link>
          <Link href="/legal/terms" className="text-muted hover:text-encre">{t("terms")}</Link>
          <Link href="/legal/notice" className="text-muted hover:text-encre">{t("notice")}</Link>
          <Link href="/contact" className="text-muted hover:text-encre">{t("contact")}</Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted">{t("disclaimer")}</p>
    </footer>
  );
}
