import { getTranslations } from "next-intl/server";
import { CoachChat } from "@/components/coach-client";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/app-user";
import { features } from "@/lib/env";
import { can } from "@/lib/premium";
import { getCoachHistory } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("coach") };
}

export default async function CoachPage() {
  const { uc } = await requireContext();
  const t = await getTranslations("coach");
  if (!can(uc.profile, "coach")) {
    return (
      <div className="grid gap-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <EmptyState title={t("premiumTitle")} action={<LinkButton href="/app/account" variant="accent">{t("discover")}</LinkButton>}>{t("premiumText")}</EmptyState>
      </div>
    );
  }
  const history = await getCoachHistory();
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {!features.ai() && <p className="rounded-2xl bg-miel-soft p-3 text-sm">{t("noAi")}</p>}
      <CoachChat initial={history} />
      <p className="text-xs text-muted">{t("disclaimer")}</p>
    </div>
  );
}
