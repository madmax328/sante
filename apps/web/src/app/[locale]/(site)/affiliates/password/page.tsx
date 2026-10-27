import { getTranslations, setRequestLocale } from "next-intl/server";
import { PasswordForm } from "@/components/affiliate-client";
import { Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { PASSWORD_MIN } from "@/lib/affiliates";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("passwordTitle"), robots: { index: false } };
}

/** Reached from the approval or reset email: the token is checked when the form is sent. */
export default async function AffiliatePasswordPage({ params, searchParams }: PageProps<"/[locale]/affiliates/password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const t = await getTranslations("affiliate");
  return (
    <section className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-extrabold">{t("passwordTitle")}</h1>
        <p className="mt-2 text-muted">{t("passwordText", { min: PASSWORD_MIN })}</p>
      </div>
      <Card className="p-6">
        {id && token ? <PasswordForm id={id} token={token} min={PASSWORD_MIN} /> : <p className="text-sm text-danger">{t("passwordExpired")}</p>}
      </Card>
      <Link href="/affiliates/forgot" className="text-sm font-semibold text-basilic">{t("forgotLink")}</Link>
    </section>
  );
}
