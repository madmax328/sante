import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Input, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/admin-auth";
import { listUsers, type UserFilter } from "@/lib/admin-users";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscrits · Administration", robots: { index: false } };

const FILTERS: { key: UserFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "suspect", label: "Suspects" },
  { key: "unconfirmed", label: "E-mail non confirmé" },
  { key: "premium", label: "Abonnés" },
];

/** Every account, with search, filters and deletion. */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as UserFilter;
  const page = Math.max(1, Number(sp.page) || 1);
  const { users, total, pages } = await listUsers({ q: sp.q, filter, page });
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const all = { q: sp.q, filter, page, ...p };
    for (const [k, v] of Object.entries(all)) if (v && !(k === "filter" && v === "all") && !(k === "page" && v === 1)) params.set(k, String(v));
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <PageHeader
        title="Inscrits"
        subtitle={`${total} compte${total > 1 ? "s" : ""}${filter !== "all" || sp.q ? " (filtrés)" : ""}`}
        action={<Link href="/admin" className="text-sm font-semibold text-basilic">← Tableau de bord</Link>}
      />
      <Card className="grid gap-4">
        <form className="flex flex-wrap gap-2" action="/admin/users">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Rechercher un nom ou un e-mail" className="max-w-sm" />
          <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Rechercher</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href({ filter: f.key, page: 1 })}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${f.key === filter ? "bg-basilic text-surface" : "border border-line"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted">
          « Suspect » : nom qui ressemble à un robot (lien, lettres au hasard), ou e-mail jamais confirmé et questionnaire jamais commencé plus
          d&apos;un jour après l&apos;inscription. La suppression efface le compte et toutes ses données ; les abonnés ne peuvent pas être supprimés ici.
        </p>
        <UsersTable key={`${filter}-${sp.q ?? ""}-${page}`} users={users} />
        {pages > 1 && (
          <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
            {page > 1 && <Link href={href({ page: page - 1 })} className="font-semibold text-basilic">← Précédente</Link>}
            <span className="text-muted">Page {page} sur {pages}</span>
            {page < pages && <Link href={href({ page: page + 1 })} className="font-semibold text-basilic">Suivante →</Link>}
          </nav>
        )}
      </Card>
    </main>
  );
}
