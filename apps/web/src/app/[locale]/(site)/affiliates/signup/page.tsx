import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ApplicationForm } from "@/components/affiliate-client";
import { AffiliateRules } from "@/components/affiliate-info";
import { Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { PAYOUT_MIN } from "@/lib/affiliates";

export async function generateMetadata() {
  const t = await getTranslations("affiliateLanding");
  return { title: t("signupTitle") };
}

/** Sign-up to the programme (the application the admin reviews). */
export default async function AffiliateSignupPage({ params }: PageProps<"/[locale]/affiliates/signup">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("affiliateLanding");
  const a = await getTranslations("affiliate");
  const format = await getFormatter();
  const min = format.number(PAYOUT_MIN, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  return (
    <section className="mx-auto grid max-w-3xl gap-6 px-4 py-16">
      <div className="grid gap-2">
        <Link href="/affiliates" className="text-sm font-semibold text-basilic">← {t("backToProgramme")}</Link>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("signupTitle")}</h1>
        <p className="text-muted">{t("signupText", { min })}</p>
      </div>
      <Card className="p-6">
        <ApplicationForm />
      </Card>
      <details className="rounded-2xl border border-line bg-surface p-5">
        <summary className="cursor-pointer list-none font-bold marker:hidden">{a("rulesTitle")}</summary>
        <AffiliateRules className="mt-3" />
      </details>
      <Link href="/affiliates/login" className="text-sm font-semibold text-basilic">{t("signupLoginLink")}</Link>
    </section>
  );
}
