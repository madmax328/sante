import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/admin-auth";
import { allAffiliates, COMMISSION_RATE, listPayouts, paidByYear, revealIban, socialHref, type AffiliateStatus } from "@/lib/affiliates";
import { formatIban } from "@/lib/iban";
import { AffiliateActions, PayoutActions } from "./affiliate-actions";

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
/** Above this amount paid to one person in a year, Sorloo declares it (DAS2). */
const DAS2_THRESHOLD = 1200;

function iban(sealed: Parameters<typeof revealIban>[0], masked: string): string {
  try {
    return formatIban(revealIban(sealed));
  } catch {
    return masked;
  }
}

/** Payout requests (with their document and IBAN), then applications and affiliates. */
export default async function AdminAffiliatesPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [list, payouts] = await Promise.all([allAffiliates(), listPayouts()]);
  list.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const byId = new Map(list.map((a) => [a._id, a]));
  const waiting = list.filter((a) => a.status === "pending").length;
  const requested = payouts.filter((p) => p.status === "requested");
  const year = new Date().getFullYear();
  const yearly = paidByYear(payouts);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <PageHeader
        title="Affiliés"
        subtitle={`${list.length} candidature${list.length > 1 ? "s" : ""} · ${waiting} à examiner · ${requested.length} versement${requested.length > 1 ? "s" : ""} demandé${requested.length > 1 ? "s" : ""} · commission ${Math.round(COMMISSION_RATE * 100)} % pendant 12 mois`}
        action={<Link href="/admin" className="text-sm font-semibold text-basilic">← Tableau de bord</Link>}
      />

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">Demandes de versement</h2>
        {requested.length === 0 ? (
          <p className="text-sm text-muted">Aucune demande en attente.</p>
        ) : (
          requested.map((p) => {
            const a = byId.get(p.affiliateId);
            return (
              <div key={p._id} className="grid gap-2 rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <p className="font-bold">{a?.name ?? "Affilié supprimé"} · {money(p.total, p.currency)}</p>
                    <p className="text-sm text-muted">
                      {p.kind === "invoice" ? "Facture (autofacturation)" : "Relevé (particulier)"} {p.number} · demandée le {fmt.format(p.requestedAt)} · {p.commissionIds.length} commission(s)
                      {p.vat > 0 ? ` · dont TVA ${money(p.vat, p.currency)}` : ""}
                    </p>
                    <p className="text-sm">Virement à <strong>{p.payee.holder}</strong> · IBAN <code>{iban(p.payee.iban, p.payee.ibanMasked)}</code></p>
                    <a href={`/api/affiliates/payouts/${p._id}`} className="text-sm font-semibold text-basilic">Télécharger le PDF</a>
                  </div>
                  <PayoutActions id={p._id} amount={money(p.total, p.currency)} />
                </div>
              </div>
            );
          })
        )}
      </Card>

      {list.length === 0 && <Card><p className="text-sm text-muted">Pas encore de candidature. Le formulaire est sur sorloo.com/affiliates.</p></Card>}
      {list.map((a) => {
        const s = STATUS[a.status];
        const paidThisYear = yearly[`${a._id}:${year}`] ?? 0;
        return (
          <Card key={a._id} className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-lg font-bold">{a.name} <Badge tone={s.tone}>{s.label}</Badge> {a.code && <Badge>{a.code}</Badge>}</p>
                <p className="text-sm text-muted">
                  {a.email} · candidature du {fmt.format(a.appliedAt)}
                  {a.reviewedAt ? ` · examinée le ${fmt.format(a.reviewedAt)}` : ""}
                  {a.status === "approved" || a.status === "suspended" ? (a.password ? " · mot de passe choisi" : " · mot de passe pas encore choisi") : ""}
                </p>
              </div>
              <AffiliateActions id={a._id} status={a.status} />
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
            {(a.status === "approved" || a.status === "suspended") && (
              <div className="grid gap-1 text-sm text-muted">
                <p>
                  {num(a.stats.clicks)} visites · {num(a.stats.signups)} inscriptions · {num(a.stats.customers)} abonnés
                  {a.stats.totals.map((x) => ` · ${money(x.pending, x.currency)} en attente · ${money(x.available, x.currency)} disponibles · ${money(x.requested, x.currency)} demandés · ${money(x.paid, x.currency)} versés`).join("")}
                </p>
                <p>
                  {a.payout ? `Paiement : ${a.payout.kind === "business" ? `professionnel${a.payout.siret ? `, SIRET ${a.payout.siret}` : ""}` : "particulier"} · ${a.payout.legalName} · ${a.payout.ibanMasked}` : "Informations de paiement pas encore renseignées."}
                </p>
                <p>
                  Versé en {year} : {money(paidThisYear, "EUR")}
                  {paidThisYear > DAS2_THRESHOLD && <Badge tone="miel" className="ml-2">Plus de 1 200 € : à déclarer (DAS2)</Badge>}
                </p>
              </div>
            )}
          </Card>
        );
      })}

      {payouts.some((p) => p.status !== "requested") && (
        <Card className="grid gap-3">
          <h2 className="text-lg font-bold">Versements passés</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-muted"><th className="py-2">N°</th><th>Affilié</th><th className="text-right">Montant</th><th className="pl-4">Statut</th><th className="pl-4">Document</th></tr>
              </thead>
              <tbody>
                {payouts
                  .filter((p) => p.status !== "requested")
                  .slice(0, 50)
                  .map((p) => (
                    <tr key={p._id} className="border-t border-line/70">
                      <td className="py-2 num">{p.number}</td>
                      <td>{byId.get(p.affiliateId)?.name ?? "—"}</td>
                      <td className="text-right num">{money(p.total, p.currency)}</td>
                      <td className="pl-4">{p.status === "paid" ? `Versé le ${fmt.format(p.paidAt!)}` : "Annulé"}</td>
                      <td className="pl-4"><a href={`/api/affiliates/payouts/${p._id}`} className="font-semibold text-basilic">PDF</a></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
