import { BadgePercent, CalendarClock, ChefHat, Dumbbell, Globe2, HeartPulse, Link2, PiggyBank, ShoppingBasket, UserPlus, Users, Wallet, BadgeCheck } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AffiliateSimulator } from "@/components/affiliate-client";
import { AffiliateRules } from "@/components/affiliate-info";
import { Badge, Card, LinkButton, LogoMark } from "@/components/ui";
import { PAYOUT_MIN } from "@/lib/affiliates";

export async function generateMetadata() {
  const t = await getTranslations("affiliateLanding");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Average commission per subscriber and month (monthly and yearly plans, website and app). */
const PER_SUBSCRIBER = 1.2;

/** The programme's advertising page: makes creators want to join, then sign up or sign in. */
export default async function AffiliatesPage({ params }: PageProps<"/[locale]/affiliates">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("affiliateLanding");
  const format = await getFormatter();
  const min = format.number(PAYOUT_MIN, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const figures = [
    { value: locale === "en" ? "25%" : "25\u00a0%", label: t("figures.rate") },
    { value: t("figures.monthsValue"), label: t("figures.months") },
    { value: t("figures.daysValue"), label: t("figures.days") },
    { value: min, label: t("figures.min") },
  ];
  const why = [
    { icon: CalendarClock, key: "menus" },
    { icon: PiggyBank, key: "budget" },
    { icon: Globe2, key: "world" },
    { icon: Dumbbell, key: "sport" },
  ] as const;
  const audiences = [
    { icon: ChefHat, key: "cooking" },
    { icon: Dumbbell, key: "fitness" },
    { icon: HeartPulse, key: "nutrition" },
    { icon: ShoppingBasket, key: "family" },
  ] as const;
  const steps = [
    { icon: UserPlus, key: "apply" },
    { icon: BadgeCheck, key: "review" },
    { icon: Link2, key: "share" },
    { icon: Wallet, key: "earn" },
  ] as const;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div className="grid gap-6">
          <Badge tone="abricot" className="justify-self-start">{t("eyebrow")}</Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-muted">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/affiliates/signup" size="lg" variant="accent">{t("signup")}</LinkButton>
            <LinkButton href="/affiliates/login" size="lg" variant="secondary">{t("login")}</LinkButton>
          </div>
          <p className="text-sm text-muted">{t("heroNote", { min })}</p>
        </div>
        <DashboardPreview />
      </section>

      <section className="border-y border-line bg-surface">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className="grid content-start gap-1">
              <dt className="order-2 text-sm text-muted">{f.label}</dt>
              <dd className="order-1 font-display text-4xl font-extrabold text-basilic num">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="grid content-start gap-3">
          <h2 className="text-3xl font-extrabold">{t("simTitle")}</h2>
          <p className="text-muted">{t("simText")}</p>
        </div>
        <AffiliateSimulator perSubscriber={PER_SUBSCRIBER} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-3xl font-extrabold">{t("whyTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted">{t("whyText")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {why.map(({ icon: Icon, key }) => (
            <Card key={key} className="grid content-start gap-3">
              <Icon className="size-6 text-basilic" aria-hidden />
              <h3 className="text-lg font-bold">{t(`why.${key}.title`)}</h3>
              <p className="text-sm text-muted">{t(`why.${key}.text`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{t("forTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {audiences.map(({ icon: Icon, key }) => (
            <div key={key} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-abricot-soft"><Icon className="size-5 text-abricot-strong" aria-hidden /></span>
              <div className="grid gap-1">
                <h3 className="font-bold">{t(`for.${key}.title`)}</h3>
                <p className="text-sm text-muted">{t(`for.${key}.text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-extrabold">{t("stepsTitle")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, key }, i) => (
              <li key={key} className="grid content-start gap-3 rounded-2xl border border-line bg-riz p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-basilic font-display font-bold text-surface">{i + 1}</span>
                  <Icon className="size-5 text-basilic" aria-hidden />
                </div>
                <h3 className="text-lg font-bold">{t(`steps.${key}.title`)}</h3>
                <p className="text-sm text-muted">{t(`steps.${key}.text`, { min })}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 rounded-3xl bg-basilic p-8 text-surface md:grid-cols-[1fr_1.4fr] md:p-12">
          <div className="grid content-start gap-3">
            <BadgePercent className="size-8" aria-hidden />
            <h2 className="text-3xl font-extrabold">{t("perksTitle")}</h2>
          </div>
          <ul className="grid content-center gap-2 text-sm">
            {(["realtime", "app", "payout", "invoice", "languages"] as const).map((k) => (
              <li key={k} className="rounded-xl bg-surface/10 px-4 py-3">{t(`perks.${k}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="text-3xl font-extrabold">{t("faqTitle")}</h2>
        <div className="mt-6 grid gap-3">
          {(["siret", "account", "tracking", "earn", "payout"] as const).map((k) => (
            <details key={k} className="group rounded-2xl border border-line bg-surface p-5">
              <summary className="cursor-pointer list-none font-bold marker:hidden">{t(`faq.${k}.q`)}</summary>
              <p className="mt-2 text-muted">{t(`faq.${k}.a`, { min })}</p>
            </details>
          ))}
          <details id="rules" className="group scroll-mt-24 rounded-2xl border border-line bg-surface p-5">
            <summary className="cursor-pointer list-none font-bold marker:hidden">{t("faq.rules.q")}</summary>
            <p className="mt-2 text-muted">{t("faq.rules.a")}</p>
            <AffiliateRules className="mt-3" />
          </details>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid justify-items-center gap-4 rounded-3xl border border-line bg-surface p-10 text-center">
          <Users className="size-8 text-basilic" aria-hidden />
          <h2 className="text-3xl font-extrabold">{t("finalTitle")}</h2>
          <p className="max-w-xl text-muted">{t("finalText")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton href="/affiliates/signup" size="lg" variant="accent">{t("signup")}</LinkButton>
            <LinkButton href="/affiliates/login" size="lg" variant="secondary">{t("login")}</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

/** What the affiliate space looks like (illustration, made-up figures). */
async function DashboardPreview() {
  const t = await getTranslations("affiliateLanding");
  const a = await getTranslations("affiliate");
  const format = await getFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency: "EUR" });
  return (
    <div className="mx-auto w-full max-w-sm rounded-[28px] border border-line bg-surface p-5 shadow-[0_30px_60px_-35px_rgba(23,32,28,0.45)]" aria-label={t("previewLabel")} role="img">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-display font-extrabold">
          <LogoMark size={22} today={4} /> {a("dashboardTitle")}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="grid gap-2 rounded-2xl bg-basilic-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{a("available")}</span>
          <strong className="font-display text-3xl num">{money(186.4)}</strong>
          <div className="h-2 rounded-full bg-line"><div className="h-2 w-full rounded-full bg-basilic" /></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {([["clicks", "1 248"], ["signups", "96"], ["customers", "31"]] as const).map(([k, v]) => (
            <div key={k} className="grid gap-0.5 rounded-2xl border border-line p-2">
              <span className="font-display text-lg font-bold num">{v}</span>
              <span className="text-[11px] text-muted">{a(k)}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-1 rounded-2xl border border-line p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">{a("source_app_store")}</span><span className="font-semibold num">+{money(8.85)}</span></div>
          <div className="flex justify-between"><span className="text-muted">{a("source_stripe")}</span><span className="font-semibold num">+{money(10.42)}</span></div>
          <div className="flex justify-between"><span className="text-muted">{a("source_play_store")}</span><span className="font-semibold num">+{money(1.24)}</span></div>
        </div>
        <div className="rounded-full bg-abricot px-4 py-3 text-center font-semibold text-on-abricot">{a("requestPayout")}</div>
      </div>
    </div>
  );
}
