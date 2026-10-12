"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "./ui";

const LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
] as const;

/** The same page in another language (the choice is remembered). */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label="Langue / Language" className={cx("flex flex-wrap gap-x-3 gap-y-1 text-xs", className)}>
      {LANGS.map((l) =>
        l.code === locale ? (
          <span key={l.code} aria-current="true" className="font-bold text-encre">{l.label}</span>
        ) : (
          <Link key={l.code} href={pathname} locale={l.code} hrefLang={l.code} lang={l.code} className="text-muted hover:text-encre">{l.label}</Link>
        ),
      )}
    </nav>
  );
}
