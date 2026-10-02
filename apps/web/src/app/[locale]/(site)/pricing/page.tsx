import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Card, LinkButton } from "@/components/ui";

const FREE = ["profile", "targets", "simpleWeek", "recipes", "list", "journal", "water", "weight"] as const;
const PREMIUM = ["everythingFree", "budget", "pantry", "unlimitedSwaps", "ai", "coach", "sport", "family", "review"] as const;

export async function generateMetadata() {
  const t = await getTranslations("pricing");
  return { title: t("title") };
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center text-4xl font-extrabold">{t("title")}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("subtitle")}</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="grid content-start gap-5 p-7">
          <div>
            <h2 className="text-xl font-bold">{t("free")}</h2>
            <p className="mt-1 font-display text-4xl font-extrabold num">0 €</p>
            <p className="text-sm text-muted">{t("freeNote")}</p>
          </div>
          <ul className="grid gap-2">
            {FREE.map((k) => (
              <li key={k} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-basilic" aria-hidden />{t(`freeItems.${k}`)}</li>
            ))}
          </ul>
          <LinkButton href="/signup" variant="secondary">{t("startFree")}</LinkButton>
        </Card>
        <Card className="grid content-start gap-5 border-2 border-basilic p-7">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Premium</h2>
              <Badge tone="abricot">{t("popular")}</Badge>
            </div>
            <p className="mt-1 font-display text-4xl font-extrabold num">{t("monthlyPrice")}<span className="text-base font-semibold text-muted"> / {t("month")}</span></p>
            <p className="text-sm text-muted">{t("yearlyOffer")}</p>
          </div>
          <ul className="grid gap-2">
            {PREMIUM.map((k) => (
              <li key={k} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-basilic" aria-hidden />{t(`premiumItems.${k}`)}</li>
            ))}
          </ul>
          <LinkButton href="/app/account" variant="accent">{t("goPremium")}</LinkButton>
          <p className="text-xs text-muted">{t("paymentNote")}</p>
        </Card>
      </div>
    </section>
  );
}
