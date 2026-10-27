import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/affiliate-client";
import { Card } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { currentAffiliate } from "@/lib/affiliate-auth";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function AffiliateLoginPage({ params }: PageProps<"/[locale]/affiliates/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await currentAffiliate()) return redirect({ href: "/affiliates/dashboard", locale });
  const t = await getTranslations("affiliate");
  return (
    <section className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-extrabold">{t("loginTitle")}</h1>
        <p className="mt-2 text-muted">{t("loginText")}</p>
      </div>
      <Card className="p-6">
        <LoginForm />
      </Card>
      <Link href="/affiliates" className="text-sm font-semibold text-basilic">{t("applyLink")}</Link>
    </section>
  );
}
