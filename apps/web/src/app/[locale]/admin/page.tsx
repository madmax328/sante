import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAppUser } from "@/lib/app-user";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { recentErrors } from "@/lib/errors";
import { stripe } from "@/lib/stripe";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false } };

const DAY = 86400_000;
const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/** Monthly price of each Stripe price, to estimate recurring revenue. */
async function monthlyAmounts(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!features.stripe()) return map;
  for (const id of [env.stripePriceMonthly, env.stripePriceYearly]) {
    if (!id) continue;
    const p = await stripe().prices.retrieve(id).catch(() => null);
    if (p?.unit_amount) map.set(id, p.unit_amount / 100 / (p.recurring?.interval === "year" ? 12 : 1));
  }
  return map;
}

/** Current time, read outside render. */
function clock() {
  return { now: Date.now(), month: new Date().toISOString().slice(0, 7) };
}

/** Private dashboard: sign-ups, subscribers, AI usage and recent errors. Only for ADMIN_EMAILS. */
export default async function AdminPage() {
  const me = await requireAppUser();
  if (!env.adminEmails.includes(me.email.toLowerCase())) notFound();

  const users = db.collection<{ _id: unknown; name: string; email: string; emailVerified: boolean; createdAt: Date }>("user");
  const profiles = db.collection<Profile>("profiles");
  const { now, month } = clock();
  const [total, week, month30, verified, onboarded, active7, subs, aiAgg, latest, errors, amounts] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
    users.countDocuments({ createdAt: { $gte: new Date(now - 30 * DAY) } }),
    users.countDocuments({ emailVerified: true }),
    profiles.countDocuments({ onboarded: true }),
    db.collection("session").distinct("userId", { updatedAt: { $gte: new Date(now - 7 * DAY) } }).then((x) => x.length),
    profiles.find({ "subscription.status": { $in: ["active", "trialing", "past_due"] } }, { projection: { subscription: 1 } }).toArray(),
    profiles.aggregate<{ total: number; users: number }>([{ $match: { "aiUsage.month": month } }, { $group: { _id: null, total: { $sum: "$aiUsage.count" }, users: { $sum: 1 } } }]).toArray(),
    users.find({}, { sort: { createdAt: -1 }, limit: 25 }).toArray(),
    recentErrors(),
    monthlyAmounts(),
  ]);
  const plans = await profiles.find({ _id: { $in: latest.map((u) => String(u._id)) } }, { projection: { onboarded: 1, subscription: 1 } }).toArray();
  const byId = new Map(plans.map((p) => [p._id, p]));

  const paying = subs.filter((p) => p.subscription?.status === "active" || (p.subscription?.status === "trialing" && p.subscription.hasPaymentMethod));
  const trialing = subs.filter((p) => p.subscription?.status === "trialing").length;
  const pastDue = subs.filter((p) => p.subscription?.status === "past_due").length;
  const cancelling = paying.filter((p) => p.subscription?.cancelAtPeriodEnd).length;
  const yearly = paying.filter((p) => p.subscription?.priceId && p.subscription.priceId === env.stripePriceYearly).length;
  const mrr = paying.filter((p) => p.subscription?.status === "active").reduce((s, p) => s + (amounts.get(p.subscription?.priceId ?? "") ?? 0), 0);
  const ai = aiAgg[0];

  const stats: [string, string, string?][] = [
    ["Inscrits", String(total), `+${week} sur 7 jours · +${month30} sur 30 jours`],
    ["Questionnaire terminé", String(onboarded), total ? `${Math.round((onboarded / total) * 100)} % des inscrits` : undefined],
    ["Actifs (7 jours)", String(active7)],
    ["E-mail confirmé", String(verified)],
    ["Abonnés Premium", String(paying.length), `${yearly} annuels · ${paying.length - yearly} mensuels`],
    ["Revenu mensuel estimé", amounts.size ? eur(mrr) : "—", "abonnements actifs, hors essais, TTC"],
    ["Essais en cours", String(trialing), cancelling ? `${cancelling} résiliation(s) en fin de période` : undefined],
    ["Paiements en échec", String(pastDue)],
    ["Coach IA ce mois-ci", String(ai?.total ?? 0), ai ? `${ai.users} personne(s)` : undefined],
  ];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <PageHeader title="Administration" subtitle={`Mis à jour le ${fmt.format(now)}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value, hint]) => (
          <Card key={label} className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
            <p className="font-display text-3xl font-extrabold num">{value}</p>
            {hint && <p className="text-xs text-muted">{hint}</p>}
          </Card>
        ))}
      </div>

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">Dernières inscriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-muted"><th className="py-2">Date</th><th>Nom</th><th>E-mail</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {latest.map((u) => {
                const p = byId.get(String(u._id));
                const sub = p?.subscription?.status;
                return (
                  <tr key={String(u._id)} className="border-t border-line/70">
                    <td className="py-2 num">{fmt.format(u.createdAt)}</td>
                    <td>{u.name}</td>
                    <td>{u.email} {!u.emailVerified && <span className="text-xs text-muted">(non confirmé)</span>}</td>
                    <td className="flex flex-wrap gap-1 py-2">
                      {sub === "active" || sub === "trialing" ? <Badge tone="basilic">{sub === "trialing" ? "Essai" : "Premium"}</Badge> : <Badge>Gratuit</Badge>}
                      {!p?.onboarded && <Badge tone="miel">Questionnaire non terminé</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">Erreurs des 7 derniers jours</h2>
        {errors.length === 0 ? (
          <p className="text-sm text-muted">Aucune erreur. 🎉</p>
        ) : (
          <ul className="grid gap-2">
            {errors.map((e) => (
              <li key={e.key} className="rounded-2xl border border-line p-3 text-sm">
                <p className="font-semibold">{e.message} <span className="font-normal text-muted">× {e.count}</span></p>
                <p className="text-xs text-muted">{fmt.format(e.at)} · {e.source} · {e.method} {e.path}</p>
                {e.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">Détails</summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
