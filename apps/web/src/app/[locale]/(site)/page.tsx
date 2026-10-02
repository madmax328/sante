import { CalendarDays, ChefHat, Dumbbell, PiggyBank, ShoppingBasket, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Card, LinkButton, LogoMark } from "@/components/ui";

const LOOP = ["profile", "goal", "budget", "week", "groceries", "sport", "adapt", "review"] as const;

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const features = [
    { icon: CalendarDays, key: "week" },
    { icon: PiggyBank, key: "budget" },
    { icon: ShoppingBasket, key: "groceries" },
    { icon: ChefHat, key: "recipes" },
    { icon: Dumbbell, key: "sport" },
    { icon: Sparkles, key: "coach" },
  ] as const;

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div className="grid gap-6">
          <Badge tone="basilic" className="justify-self-start">{t("eyebrow")}</Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">{t("title")}</h1>
          <p className="max-w-xl text-lg text-muted">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/signup" size="lg" variant="accent">{t("cta")}</LinkButton>
            <LinkButton href="/pricing" size="lg" variant="secondary">{t("seePricing")}</LinkButton>
          </div>
          <p className="text-sm text-muted">{t("ctaNote")}</p>
        </div>
        <HeroPreview />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">{t("compareOthers")}</p>
            <p className="font-display text-2xl font-bold text-muted">« {t("compareOthersQuote")} »</p>
          </div>
          <div className="grid content-start gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-basilic">Weeko</p>
            <p className="font-display text-2xl font-bold">« {t("compareUsQuote")} »</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{t("loopTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted">{t("loopSubtitle")}</p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((k, i) => (
            <li key={k} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-basilic-soft font-display font-bold text-basilic">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-bold">{t(`loop.${k}.title`)}</p>
                <p className="text-sm text-muted">{t(`loop.${k}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, key }) => (
            <Card key={key} className="grid content-start gap-3">
              <Icon className="size-6 text-basilic" aria-hidden />
              <h3 className="text-lg font-bold">{t(`features.${key}.title`)}</h3>
              <p className="text-muted">{t(`features.${key}.text`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 rounded-3xl bg-basilic p-8 text-surface md:grid-cols-[2fr_1fr] md:p-12">
          <div className="grid gap-3">
            <h2 className="text-3xl font-extrabold">{t("safetyTitle")}</h2>
            <p className="max-w-2xl opacity-90">{t("safetyText")}</p>
          </div>
          <ul className="grid content-center gap-2 text-sm">
            {(["engine", "kind", "privacy"] as const).map((k) => (
              <li key={k} className="rounded-xl bg-surface/10 px-4 py-2">{t(`safety.${k}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="text-3xl font-extrabold">{t("faqTitle")}</h2>
        <div className="mt-6 grid gap-3">
          {(["what", "budget", "family", "ai", "data", "price"] as const).map((k) => (
            <details key={k} className="group rounded-2xl border border-line bg-surface p-5">
              <summary className="cursor-pointer list-none font-bold marker:hidden">{t(`faq.${k}.q`)}</summary>
              <p className="mt-2 text-muted">{t(`faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <LinkButton href="/signup" size="lg" variant="accent">{t("cta")}</LinkButton>
        </div>
      </section>
    </>
  );
}

async function HeroPreview() {
  const t = await getTranslations("home.preview");
  return (
    <div className="mx-auto w-full max-w-sm rounded-[28px] border border-line bg-surface p-5 shadow-[0_30px_60px_-35px_rgba(23,32,28,0.45)]" aria-label={t("label")}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-display font-extrabold">
          <LogoMark size={22} today={2} /> Weeko
        </span>
        <span className="text-sm text-muted">{t("date")}</span>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="grid gap-1 rounded-2xl bg-basilic-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("dinnerLabel")}</span>
          <strong className="font-display text-lg">{t("dinner")}</strong>
          <span className="text-sm text-muted num">{t("dinnerMeta")}</span>
        </div>
        <div className="grid gap-1 rounded-2xl border border-line p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("todoLabel")}</span>
          <strong>{t("todo")}</strong>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("progressLabel")}</span>
            <span className="font-display text-xl font-bold num">1 340 / 1 840</span>
            <div className="h-2 rounded-full bg-line"><div className="h-2 w-[73%] rounded-full bg-basilic" /></div>
          </div>
          <div className="grid gap-2 rounded-2xl border border-line p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("budgetLabel")}</span>
            <span className="font-display text-xl font-bold num">42,60 €</span>
            <div className="h-2 rounded-full bg-line"><div className="h-2 w-[61%] rounded-full bg-miel" /></div>
          </div>
        </div>
        <div className="rounded-full bg-abricot px-4 py-3 text-center font-semibold text-on-abricot">{t("cta")}</div>
      </div>
    </div>
  );
}
