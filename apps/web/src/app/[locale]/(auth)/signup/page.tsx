import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth-forms";
import { features } from "@/lib/env";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signupTitle") };
}

export default function SignupPage() {
  return <SignupForm google={features.google()} />;
}
