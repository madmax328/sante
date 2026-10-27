import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CopyField, LogoutButton, PayoutProfileForm, PayoutRequestButton } from "@/components/affiliate-client";
import { AffiliateInfo } from "@/components/affiliate-info";
import { Badge, Card, Notice, Progress } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { currentAffiliate } from "@/lib/affiliate-auth";
import { affiliateStats, listPayouts, PAYOUT_MIN } from "@/lib/affiliates";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("affiliate");
  return { title: t("dashboardTitle"), robots: { index: false } };
}

/** The affiliate's space: link and code, results, what can be asked for, payment details and payouts. */
export default async function AffiliateDashboardPage({ params }: PageProps<"/[locale]/affiliates/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const a = await currentAffiliate();
  if (!a) return redirect({ href: "/affiliates/login", locale });
  const t = await getTranslations("affiliate");
  const format = await getFormatter();
  const [stats, payouts] = await Promise.all([affiliateStats(a), listPayouts({ affiliateId: a._id })]);
  const money = (v: number, currency: string) => format.number(v, { style: "currency", currency });
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });
  const link = `${env.appUrl.replace(/\/$/, "")}/r/${a.code}`;
  const totals = stats.totals.length ? stats.totals : [{ currency: "EUR", pending: 0, available: 0, requested: 0, paid: 0 }];
  const tone = { pending: "miel", available: "basilic", requested: "eau", paid: "neutral", cancelled: "danger" } as const;
  const payoutTone = { requested: "miel", paid: "basilic", cancelled: "neutral" } as const;
  const p = a.payout;

  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{t("dashboardTitle")}</h1>
          <p className="mt-1 text-muted">{a.name} · {a.email}</p>
        </div>
        <LogoutButton />
      </div>
      {a.status === "suspended" && <Notice tone="danger" title={t("suspendedTitle")}>{t("suspendedText")}</Notice>}

      {a.code && (
        <Card className="grid gap-4 md:grid-cols-2">
          <CopyField label={t("yourLink")} value={link} />
          <CopyField label={t("yourCode")} value={a.code} />
          <p className="text-sm text-muted md:col-span-2">{t("codeHint")}</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {([["clicks", stats.clicks], ["signups", stats.signups], ["customers", stats.customers]] as const).map(([k, v]) => (
          <Card key={k} className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t(k)}</p>
            <p className="font-display text-3xl font-extrabold num">{v}</p>
          </Card>
        ))}
      </div>

      {totals.map((x) => {
        const ready = x.available >= PAYOUT_MIN;
        return (
          <Card key={x.currency} className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("available")}</p>
                <p className="font-display text-4xl font-extrabold num">{money(x.available, x.currency)}</p>
              </div>
              <PayoutRequestButton currency={x.currency} enabled={ready && !!p} label={t("requestPayout")} />
            </div>
            <Progress value={x.available} max={PAYOUT_MIN} label={t("available")} />
            <p className="text-sm text-muted">
              {ready ? (p ? t("requestReady") : t("requestNeedsProfile")) : t("progressText", { left: money(PAYOUT_MIN - x.available, x.currency), min: money(PAYOUT_MIN, x.currency) })}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["pending", "requested", "paid"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-riz p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t(k)}</p>
                  <p className="font-display text-xl font-extrabold num">{money(x[k], x.currency)}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">{t("payoutProfileTitle")}</h2>
        <p className="text-sm text-muted">{t("payoutProfileText")}</p>
        <PayoutProfileForm
          defaultName={a.name}
          initial={
            p
              ? { kind: p.kind, legalName: p.legalName, address: p.address, siret: p.siret, vat: p.vat, vatNumber: p.vatNumber, mandateAccepted: !!p.mandateAt, holder: p.holder, ibanMasked: p.ibanMasked }
              : null
          }
        />
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">{t("payoutsTitle")}</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">{t("payoutsEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="text-left text-muted"><th className="py-2">{t("date")}</th><th>{t("number")}</th><th className="text-right">{t("amount")}</th><th className="pl-4">{t("status")}</th><th className="pl-4">{t("document")}</th></tr>
              </thead>
              <tbody>
                {payouts.map((x) => (
                  <tr key={x._id} className="border-t border-line/70">
                    <td className="py-2 num">{date(x.requestedAt)}</td>
                    <td className="num">{x.number}</td>
                    <td className="text-right num">{money(x.total, x.currency)}</td>
                    <td className="pl-4"><Badge tone={payoutTone[x.status]}>{t(`payout_${x.status}`)}</Badge></td>
                    <td className="pl-4">
                      <a href={`/api/affiliates/payouts/${x._id}`} className="font-semibold text-basilic">{t(`doc_${x.kind}`)}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    </section>
  );
}
