import { getLocale, getTranslations } from "next-intl/server";
import { Onboarding } from "@/components/onboarding";
import { requireAppUser } from "@/lib/app-user";
import { dislikeOptions } from "@/lib/dislikes";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("metaTitle") };
}

export default async function WelcomePage() {
  const user = await requireAppUser();
  return <Onboarding defaultName={user.name} dislikeOptions={dislikeOptions(await getLocale())} />;
}
