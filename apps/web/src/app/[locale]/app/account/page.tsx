import { Check } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { BodyForm, DangerZone, FoodPrefsForm, SubscriptionButtons } from "@/components/settings-client";
import { Badge, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { requireAppUser } from "@/lib/app-user";
import { features } from "@/lib/env";
import { isPremium } from "@/lib/premium";
import { getHealth } from "@/lib/repo";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("account") };
}

const PREMIUM = ["budget", "pantry", "unlimitedSwaps", "ai", "coach", "sport", "family", "review"] as const;

export default async function AccountPage({ searchParams }: PageProps<"/[locale]/app/account">) {
  const user = await requireAppUser();
  const sp = await searchParams;
  const t = await getTranslations("account");
  const p = await getTranslations("pricing");
  const format = await getFormatter();
  const premium = isPremium(user.profile);
  const sub = user.profile.subscription;
  const health = await getHealth(user.userId);
  const self = health?.members.find((m) => m.self);

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={user.email} />
      {sp.checkout === "success" && <Notice tone="basilic" title={t("thanksTitle")}>{t("thanksText")}</Notice>}
      {sp.checkout === "pending" && !premium && <Notice tone="miel">{t("pending")}</Notice>}
      {sp.checkout === "cancel" && <Notice tone="miel">{t("cancelled")}</Notice>}

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{t("subscription")}</h2>
          {premium ? <Badge tone="basilic">Premium</Badge> : <Badge tone="neutral">{p("free")}</Badge>}
        </div>
        {premium && sub?.currentPeriodEnd && (
          <p className="text-sm text-muted">
            {sub.cancelAtPeriodEnd ? t("endsOn", { date: format.dateTime(new Date(sub.currentPeriodEnd), { dateStyle: "long" }) }) : t("renewsOn", { date: format.dateTime(new Date(sub.currentPeriodEnd), { dateStyle: "long" }) })}
          </p>
        )}
        {!premium && (
          <>
            <p>{t("upgradeText", { monthly: p("monthlyPrice"), yearly: "49,99 €" })}</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {PREMIUM.map((k) => <li key={k} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 text-basilic" aria-hidden />{p(`premiumItems.${k}`)}</li>)}
            </ul>
          </>
        )}
        <SubscriptionButtons premium={premium} hasCustomer={!!sub?.customerId} configured={features.stripe()} />
        <p className="text-xs text-muted">{p("paymentNote")}</p>
      </Card>

      {self && (
        <Card className="grid gap-4">
          <h2 className="text-xl font-bold">{t("body")}</h2>
          <BodyForm initial={{ weightKg: self.weightKg, heightCm: self.heightCm, goal: self.goal, activity: self.activity, targetWeightKg: self.targetWeightKg }} />
        </Card>
      )}

      <Card className="grid gap-4">
        <h2 className="text-xl font-bold">{t("food")}</h2>
        <FoodPrefsForm initial={user.profile.prefs} />
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-xl font-bold">{t("household")}</h2>
        <ul className="grid gap-1 text-sm">
          {health?.members.map((m) => <li key={m.id}>{m.name}{m.self ? ` (${t("you")})` : ""}</li>)}
        </ul>
        <LinkButton href="/app/welcome" variant="secondary" size="sm" className="justify-self-start">{t("redoProfile")}</LinkButton>
      </Card>

      <Card className="grid gap-4">
        <h2 className="text-xl font-bold">{t("privacy")}</h2>
        <p className="text-sm text-muted">{t("privacyText")}</p>
        <DangerZone />
      </Card>
    </div>
  );
}
