import { getFormatter, getTranslations } from "next-intl/server";
import type { StoreComparison } from "@/lib/store-prices";
import { Badge, Card } from "./ui";

/** "Comparer les enseignes": estimated cost of the week's list in each chain. */
export async function StoreComparisonCard({ data, premium }: { data: StoreComparison | null; premium: boolean }) {
  const t = await getTranslations("stores");
  const format = await getFormatter();
  const money = (v: number) => format.number(v, { style: "currency", currency: "EUR" });
  const gap = (index: number) => {
    const pct = Math.round(Math.abs(1 - index) * 100);
    return pct === 0 ? t("same") : index < 1 ? t("cheaper", { pct }) : t("dearer", { pct });
  };
  return (
    <Card className="grid gap-3">
      <div>
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm text-muted">{premium ? t("subtitle") : t("premium")}</p>
      </div>
      {premium && data && (
        <>
          {data.stores.length === 0 ? (
            <p className="text-sm text-muted">{t("none")}</p>
          ) : (
            <ul className="grid gap-2">
              {data.stores.map((s, i) => (
                <li key={s.brand} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line p-3">
                  <p className="min-w-32 flex-1 font-semibold">
                    {s.brand} {i === 0 && data.stores.length > 1 && <Badge tone="basilic" className="ml-1">{t("cheapest")}</Badge>}
                  </p>
                  <p className="font-display text-xl font-bold num">{money(s.total)}</p>
                  <p className="w-full text-xs text-muted">
                    {gap(s.index)} · {t("measured", { n: s.measured, total: data.items })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">
            {t("note")}{" "}
            <a href="https://prices.openfoodfacts.org" target="_blank" rel="noopener" className="font-semibold text-basilic underline">{t("contribute")}</a>
          </p>
        </>
      )}
    </Card>
  );
}
