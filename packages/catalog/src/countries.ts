import type { Locale } from "@weeko/engine";

/** Countries offered before a week is created (the `origin` of lunch and dinner recipes). */
export interface CuisineCountry {
  code: string;
  flag: string;
  name: Record<Locale, string>;
}

export const CUISINE_COUNTRIES: CuisineCountry[] = [
  { code: "fr", flag: "🇫🇷", name: { fr: "France", en: "France", de: "Frankreich", es: "Francia", it: "Francia", pt: "França" } },
  { code: "it", flag: "🇮🇹", name: { fr: "Italie", en: "Italy", de: "Italien", es: "Italia", it: "Italia", pt: "Itália" } },
  { code: "es", flag: "🇪🇸", name: { fr: "Espagne", en: "Spain", de: "Spanien", es: "España", it: "Spagna", pt: "Espanha" } },
  { code: "pt", flag: "🇵🇹", name: { fr: "Portugal", en: "Portugal", de: "Portugal", es: "Portugal", it: "Portogallo", pt: "Portugal" } },
  { code: "gr", flag: "🇬🇷", name: { fr: "Grèce", en: "Greece", de: "Griechenland", es: "Grecia", it: "Grecia", pt: "Grécia" } },
  { code: "ma", flag: "🇲🇦", name: { fr: "Maghreb", en: "North Africa", de: "Maghreb", es: "Magreb", it: "Maghreb", pt: "Magrebe" } },
  { code: "lb", flag: "🇱🇧", name: { fr: "Liban", en: "Lebanon", de: "Libanon", es: "Líbano", it: "Libano", pt: "Líbano" } },
  { code: "in", flag: "🇮🇳", name: { fr: "Inde", en: "India", de: "Indien", es: "India", it: "India", pt: "Índia" } },
  { code: "cn", flag: "🇨🇳", name: { fr: "Chine", en: "China", de: "China", es: "China", it: "Cina", pt: "China" } },
  { code: "jp", flag: "🇯🇵", name: { fr: "Japon", en: "Japan", de: "Japan", es: "Japón", it: "Giappone", pt: "Japão" } },
  { code: "kr", flag: "🇰🇷", name: { fr: "Corée", en: "Korea", de: "Korea", es: "Corea", it: "Corea", pt: "Coreia" } },
  { code: "th", flag: "🇹🇭", name: { fr: "Thaïlande", en: "Thailand", de: "Thailand", es: "Tailandia", it: "Thailandia", pt: "Tailândia" } },
  { code: "vn", flag: "🇻🇳", name: { fr: "Vietnam", en: "Vietnam", de: "Vietnam", es: "Vietnam", it: "Vietnam", pt: "Vietname" } },
  { code: "mx", flag: "🇲🇽", name: { fr: "Mexique", en: "Mexico", de: "Mexiko", es: "México", it: "Messico", pt: "México" } },
  { code: "br", flag: "🇧🇷", name: { fr: "Brésil", en: "Brazil", de: "Brasilien", es: "Brasil", it: "Brasile", pt: "Brasil" } },
  { code: "us", flag: "🇺🇸", name: { fr: "États-Unis", en: "United States", de: "USA", es: "Estados Unidos", it: "Stati Uniti", pt: "Estados Unidos" } },
];

export const CUISINE_CODES = CUISINE_COUNTRIES.map((c) => c.code);
