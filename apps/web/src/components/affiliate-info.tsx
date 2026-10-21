import { BadgePercent, CalendarClock, Link2 } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { PAYOUT_MIN } from "@/lib/affiliates";
import { Card } from "./ui";

/** How the affiliate programme works, and its rules (public page and affiliate space). */
export async function AffiliateInfo({ rules = true }: { rules?: boolean }) {
  const t = await getTranslations("affiliate");
  const format = await getFormatter();
  const min = format.number(PAYOUT_MIN, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const steps = [
    { icon: BadgePercent, title: t("how1Title"), text: t("how1Text") },
    { icon: Link2, title: t("how2Title"), text: t("how2Text") },
    { icon: CalendarClock, title: t("how3Title"), text: t("how3Text", { min }) },
  ];
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.title} className="grid content-start gap-2">
            <s.icon className="size-6 text-basilic" aria-hidden />
            <p className="font-bold">{s.title}</p>
            <p className="text-sm text-muted">{s.text}</p>
          </Card>
        ))}
      </div>
      {rules && (
        <Card className="grid gap-2">
          <h2 className="text-lg font-bold">{t("rulesTitle")}</h2>
          <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
            {(["rule1", "rule2", "rule3", "rule4", "rule5", "rule6", "rule7"] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
