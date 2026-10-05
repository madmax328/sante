import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { ContactForm } from "@/components/contact-form";
import { Card } from "@/components/ui";
import { auth } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("contact");
  return { title: t("title") };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return (
    <section className="mx-auto grid max-w-2xl gap-6 px-4 py-16">
      <div>
        <h1 className="text-4xl font-extrabold">{t("title")}</h1>
        <p className="mt-3 text-muted">{t("subtitle")}</p>
      </div>
      <Card className="p-6">
        <ContactForm defaultName={session?.user.name ?? ""} defaultEmail={session?.user.email ?? ""} />
      </Card>
    </section>
  );
}
