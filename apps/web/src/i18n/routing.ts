import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "de", "es", "it", "pt"],
  defaultLocale: "fr",
  // French at the root (/app), the other languages under /en, /de, /es, /it, /pt
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
