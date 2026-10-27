import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApplicationForm } from "@/components/affiliate-client";
import { AffiliateInfo } from "@/components/affiliate-info";
import { Card, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("metaTitle"), description: t("subtitle") };
}

/** Public page of the programme: how it works, its rules and the application (no Sorloo account needed). */
export default async function AffiliatesPage({ params }: PageProps<"/[locale]/affiliates">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("affiliate");
  return (
    <section className="mx-auto grid max-w-4xl gap-8 px-4 py-16">
      <div className="grid gap-4">
        <h1 className="text-4xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("subtitle")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href="#apply" variant="accent" size="lg">{t("cta")}</LinkButton>
          <Link href="/affiliates/login" className="text-sm font-semibold text-basilic">{t("loginLink")}</Link>
        </div>
      </div>
      <AffiliateInfo />
      <Card id="apply" className="grid scroll-mt-24 gap-3 p-6">
        <h2 className="text-2xl font-bold">{t("applyTitle")}</h2>
        <p className="text-sm text-muted">{t("applyText")}</p>
        <ApplicationForm />
      </Card>
    </section>
  );
}
