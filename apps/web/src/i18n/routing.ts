import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // French at the root (/app), English under /en/app
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
