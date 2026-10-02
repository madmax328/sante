import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth-forms";
import { features } from "@/lib/env";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default function LoginPage() {
  return <LoginForm google={features.google()} />;
}
