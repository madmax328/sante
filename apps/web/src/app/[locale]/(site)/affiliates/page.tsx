import { getTranslations, setRequestLocale } from "next-intl/server";
import { AffiliateInfo } from "@/components/affiliate-info";
import { LinkButton } from "@/components/ui";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("metaTitle"), description: t("subtitle") };
}

/** Public presentation of the affiliate programme; applying happens in the app space. */
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
          <LinkButton href="/app/affiliate" variant="accent" size="lg">{t("cta")}</LinkButton>
          <span className="text-sm text-muted">{t("ctaHint")}</span>
        </div>
      </div>
      <AffiliateInfo />
      <LinkButton href="/app/affiliate" variant="accent" className="justify-self-start">{t("cta")}</LinkButton>
    </section>
  );
}
