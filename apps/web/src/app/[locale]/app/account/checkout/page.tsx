import { Check } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SubscribeForm } from "@/components/checkout-client";
import { Card, Notice, PageHeader, cx } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { requireAppUser } from "@/lib/app-user";
import { env, features } from "@/lib/env";
import { isPremium } from "@/lib/premium";
import { checkoutOffer, type CheckoutOffer } from "@/lib/stripe";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return { title: t("title") };
}

const FEATURES = ["budget", "pantry", "unlimitedSwaps", "ai", "coach", "sport", "family", "review"] as const;

export default async function CheckoutPage({ searchParams }: PageProps<"/[locale]/app/account/checkout">) {
  const user = await requireAppUser();
  const locale = await getLocale();
  if (isPremium(user.profile)) redirect({ href: "/app/account", locale });
  const sp = await searchParams;
  const plan = sp.plan === "yearly" ? "yearly" : "monthly";
  const t = await getTranslations("checkout");
  const p = await getTranslations("pricing");
  const format = await getFormatter();

  if (!features.stripe()) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} />
        <Notice tone="miel">{t("notConfigured")}</Notice>
      </div>
    );
  }

  // Read-only: the subscription is only created when the card form is submitted.
  let started: CheckoutOffer | undefined;
  try {
    started = await checkoutOffer(user.userId, plan);
  } catch (e) {
    console.error(e);
  }
  const prefix = locale === "fr" ? "" : `/${locale}`;
  const completeUrl = `${env.appUrl}${prefix}/app/account/checkout/complete`;
  const price = started ? format.number(started.amount, { style: "currency", currency: started.currency.toUpperCase() }) : "";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Link href="/app/account" className="text-sm font-semibold text-muted hover:text-encre">← {t("back")}</Link>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="grid content-start gap-5 rounded-2xl bg-basilic p-6 text-surface">
          <div className="grid gap-1">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Weeko Premium</p>
            <p className="font-display text-4xl font-extrabold num">
              {started ? price : plan === "yearly" ? "49,99 €" : p("monthlyPrice")}
              <span className="text-base font-semibold opacity-80"> / {plan === "yearly" ? t("year") : t("month")}</span>
            </p>
            {plan === "yearly" && <p className="text-sm opacity-90">{t("yearlyNote")}</p>}
            {started && started.trialDays > 0 && <p className="text-sm opacity-90">{t("trialNote", { days: started.trialDays })}</p>}
          </div>
          <ul className="grid gap-2">
            {FEATURES.map((k) => (
              <li key={k} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />{p(`premiumItems.${k}`)}</li>
            ))}
          </ul>
          <p className="text-xs opacity-80">{t("cancelAnytime")}</p>
        </section>

        <Card className="grid content-start gap-5">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-riz p-1" role="tablist" aria-label={t("planLabel")}>
            {(["monthly", "yearly"] as const).map((k) => (
              <Link
                key={k}
                href={`/app/account/checkout?plan=${k}`}
                role="tab"
                aria-selected={plan === k}
                className={cx("rounded-full px-3 py-2 text-center text-sm font-semibold", plan === k ? "bg-surface text-encre shadow-sm" : "text-muted hover:text-encre")}
              >
                {k === "monthly" ? t("monthly") : t("yearly")}
              </Link>
            ))}
          </div>
          {started ? (
            <SubscribeForm
              key={plan}
              publishableKey={env.stripePublishableKey!}
              plan={plan}
              amountMinor={started.amountMinor}
              currency={started.currency}
              trialDays={started.trialDays}
              completeUrl={completeUrl}
            />
          ) : (
            <Notice tone="danger">{t("startError")}</Notice>
          )}
          <p className="text-xs text-muted">
            {t.rich("legal", {
              terms: (c) => <Link href="/legal/terms" className="underline">{c}</Link>,
            })}
          </p>
        </Card>
      </div>
    </div>
  );
}
