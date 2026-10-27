import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotForm } from "@/components/affiliate-client";
import { Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default async function AffiliateForgotPage({ params }: PageProps<"/[locale]/affiliates/forgot">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("affiliate");
  return (
    <section className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-extrabold">{t("forgotTitle")}</h1>
        <p className="mt-2 text-muted">{t("forgotText")}</p>
      </div>
      <Card className="p-6">
        <ForgotForm />
      </Card>
      <Link href="/affiliates/login" className="text-sm font-semibold text-basilic">{t("login")}</Link>
    </section>
  );
}
