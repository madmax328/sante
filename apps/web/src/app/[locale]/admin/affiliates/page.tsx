import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/admin-auth";
import { allAffiliates, COMMISSION_RATE, PAYOUT_MIN, socialHref, type AffiliateStatus } from "@/lib/affiliates";
import { AffiliateActions } from "./affiliate-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliés · Administration", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });
const money = (n: number, currency: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n);
const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const STATUS: Record<AffiliateStatus, { label: string; tone: "miel" | "basilic" | "neutral" | "danger" }> = {
  pending: { label: "À examiner", tone: "miel" },
  approved: { label: "Validé", tone: "basilic" },
  rejected: { label: "Refusé", tone: "neutral" },
  suspended: { label: "Suspendu", tone: "danger" },
};
const ORDER: AffiliateStatus[] = ["pending", "approved", "suspended", "rejected"];

/** Applications to examine (with their social networks), then affiliates, their results and what is owed. */
export default async function AdminAffiliatesPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const list = (await allAffiliates()).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const waiting = list.filter((a) => a.status === "pending").length;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <PageHeader
        title="Affiliés"
        subtitle={`${list.length} candidature${list.length > 1 ? "s" : ""} · ${waiting} à examiner · commission ${Math.round(COMMISSION_RATE * 100)} % pendant 12 mois`}
        action={<Link href="/admin" className="text-sm font-semibold text-basilic">← Tableau de bord</Link>}
      />
      {list.length === 0 && <Card><p className="text-sm text-muted">Pas encore de candidature. La page publique est sorloo.com/affiliates.</p></Card>}
      {list.map((a) => {
        const s = STATUS[a.status];
        const owed = a.stats.totals.filter((x) => x.available > 0);
        return (
          <Card key={a._id} className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-lg font-bold">{a.name} <Badge tone={s.tone}>{s.label}</Badge> {a.code && <Badge>{a.code}</Badge>}</p>
                <p className="text-sm text-muted">{a.email} · candidature du {fmt.format(a.appliedAt)}{a.reviewedAt ? ` · examinée le ${fmt.format(a.reviewedAt)}` : ""}</p>
              </div>
              <AffiliateActions id={a._id} status={a.status} code={a.code} owed={owed.map((x) => money(x.available, x.currency)).join(" + ")} canPay={owed.some((x) => x.available > 0)} belowMin={!owed.some((x) => x.available >= PAYOUT_MIN)} />
            </div>
            <ul className="grid gap-1 text-sm">
              {a.socials.map((x, i) => {
                const href = socialHref(x);
                return (
                  <li key={i}>
                    <span className="font-semibold">{x.platform}</span> :{" "}
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-basilic underline">{x.url}</a> : <span>{x.url}</span>}
                    {x.followers !== undefined && <span className="text-muted"> · {num(x.followers)} abonnés</span>}
                  </li>
                );
              })}
            </ul>
            {a.message && <p className="whitespace-pre-line rounded-xl bg-riz p-3 text-sm">{a.message}</p>}
            {a.status !== "pending" && a.status !== "rejected" && (
              <p className="text-sm text-muted">
                {num(a.stats.clicks)} visites · {num(a.stats.signups)} inscriptions · {num(a.stats.customers)} abonnés
                {a.stats.totals.map((x) => ` · ${money(x.pending, x.currency)} en attente · ${money(x.available, x.currency)} à verser · ${money(x.paid, x.currency)} versés`).join("")}
              </p>
            )}
          </Card>
        );
      })}
    </main>
  );
}
