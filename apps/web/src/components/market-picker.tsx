"use client";

import { MARKET_LIST } from "@weeko/catalog/markets";
import type { Locale, Market } from "@weeko/engine";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setMarketAction } from "@/app/[locale]/app/actions";
import { ErrorLine, useActionError } from "./app-client";
import { Select } from "./ui";

/** Country of the shops: prices, currency and chains compared. */
export function MarketPicker({ initial }: { initial: Market }) {
  const t = useTranslations("account");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const { error, handle } = useActionError();
  const change = (market: Market) => {
    setValue(market);
    start(async () => {
      if (handle(await setMarketAction({ market }))) router.refresh();
      else setValue(initial);
    });
  };
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Select value={value} onChange={(e) => change(e.target.value as Market)} disabled={pending} aria-label={t("market")} className="max-w-xs">
          {MARKET_LIST.map((m) => (
            <option key={m.code} value={m.code}>{`${m.flag} ${m.name[locale] ?? m.name.fr} (${m.currency})`}</option>
          ))}
        </Select>
        {pending && <Loader2 className="size-4 animate-spin text-muted" />}
      </div>
      <p className="text-sm text-muted">{t("marketText")}</p>
      <ErrorLine error={error} />
    </div>
  );
}
