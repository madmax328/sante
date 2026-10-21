import { getFormatter, getTranslations } from "next-intl/server";
import { AffiliateForm, CopyField } from "@/components/affiliate-client";
import { AffiliateInfo } from "@/components/affiliate-info";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { affiliateStats, getAffiliate, PAYOUT_MIN } from "@/lib/affiliates";
import { requireAppUser } from "@/lib/app-user";
import { CONTACT } from "@/lib/contact";
import { env } from "@/lib/env";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("metaTitle") };
}

/** Affiliate space: the application while it is examined, then the link, code and commissions. */
export default async function AffiliatePage() {
  const user = await requireAppUser();
  const t = await getTranslations("affiliate");
  const format = await getFormatter();
  const affiliate = await getAffiliate(user.userId);
  const money = (v: number, currency: string) => format.number(v, { style: "currency", currency });
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });

  if (affiliate?.status === "approved" && affiliate.code) {
    const stats = await affiliateStats(affiliate);
    const link = `${env.appUrl.replace(/\/$/, "")}/r/${affiliate.code}`;
    const totals = stats.totals.length ? stats.totals : [{ currency: "EUR", pending: 0, available: 0, paid: 0 }];
    const tone = { pending: "miel", available: "basilic", paid: "neutral", cancelled: "danger" } as const;
    return (
      <div className="grid gap-6">
        <PageHeader title={t("approvedTitle")} subtitle={t("approvedText")} />
        <Card className="grid gap-4 md:grid-cols-2">
          <CopyField label={t("yourLink")} value={link} />
          <CopyField label={t("yourCode")} value={affiliate.code} />
          <p className="text-sm text-muted md:col-span-2">{t("codeHint")}</p>
        </Card>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["clicks", stats.clicks], ["signups", stats.signups], ["customers", stats.customers]] as const).map(([k, v]) => (
            <Card key={k} className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t(k)}</p>
              <p className="font-display text-3xl font-extrabold num">{v}</p>
            </Card>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["pending", "available", "paid"] as const).map((k) => (
            <Card key={k} className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t(k)}</p>
              {totals.map((x) => (
                <p key={x.currency} className="font-display text-2xl font-extrabold num">{money(x[k], x.currency)}</p>
              ))}
            </Card>
          ))}
        </div>
        <Card className="grid gap-2">
          <h2 className="text-lg font-bold">{t("payoutTitle")}</h2>
          <p className="text-sm text-muted">{t("payoutText", { min: money(PAYOUT_MIN, "EUR"), email: CONTACT.general })}</p>
        </Card>
        <Card className="grid gap-3">
          <h2 className="text-lg font-bold">{t("historyTitle")}</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted">{t("historyEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="text-left text-muted"><th className="py-2">{t("date")}</th><th>{t("source")}</th><th className="text-right">{t("amount")}</th><th className="pl-4">{t("status")}</th></tr>
                </thead>
                <tbody>
                  {stats.recent.map((c, i) => (
                    <tr key={i} className="border-t border-line/70">
                      <td className="py-2 num">{date(c.at)}</td>
                      <td>{t(`source_${c.source}`)}</td>
                      <td className="text-right num">{money(c.amount, c.currency)}</td>
                      <td className="pl-4"><Badge tone={tone[c.status]}>{t(`status_${c.status}`)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <AffiliateInfo />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {affiliate?.status === "pending" && <Notice tone="miel" title={t("pendingTitle")}>{t("pendingText")}</Notice>}
      {affiliate?.status === "rejected" && <Notice tone="neutral" title={t("rejectedTitle")}>{t("rejectedText")}</Notice>}
      {affiliate?.status === "suspended" ? (
        <Notice tone="danger" title={t("suspendedTitle")}>{t("suspendedText")}</Notice>
      ) : (
        <Card className="grid gap-3">
          <h2 className="text-lg font-bold">{t("applyTitle")}</h2>
          <p className="text-sm text-muted">{t("applyText")}</p>
          <AffiliateForm initial={affiliate ? { socials: affiliate.socials, message: affiliate.message } : undefined} update={affiliate?.status === "pending"} />
        </Card>
      )}
      <AffiliateInfo />
    </div>
  );
}
