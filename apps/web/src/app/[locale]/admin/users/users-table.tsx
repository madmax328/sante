"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui";
import type { AdminUser } from "@/lib/admin-users";
import { deleteUsersAction } from "../actions";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

/** The accounts, with a checkbox on each one that can be deleted (not subscribers). */
export function UsersTable({ users }: { users: AdminUser[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const deletable = users.filter((u) => u.plan === "free");
  const allChecked = deletable.length > 0 && deletable.every((u) => selected.has(u.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remove = () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Supprimer définitivement ${ids.length} compte${ids.length > 1 ? "s" : ""} et toutes leurs données ? C'est irréversible.`)) return;
    start(async () => {
      const r = await deleteUsersAction(ids);
      setSelected(new Set());
      setMessage(`${r.deleted} compte${r.deleted > 1 ? "s" : ""} supprimé${r.deleted > 1 ? "s" : ""}.${r.skipped ? ` ${r.skipped} abonné${r.skipped > 1 ? "s" : ""} non supprimé${r.skipped > 1 ? "s" : ""}.` : ""}`);
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={pending || selected.size === 0}
          className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-surface disabled:opacity-40"
        >
          {pending ? "Suppression…" : `Supprimer la sélection (${selected.size})`}
        </button>
        {message && <p className="text-sm text-muted" role="status">{message}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="w-8 py-2">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner sur cette page"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(deletable.map((u) => u.id)))}
                  className="size-4 accent-[var(--basilic)]"
                />
              </th>
              <th>Date</th>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line/70">
                <td className="py-2">
                  {u.plan === "free" && (
                    <input type="checkbox" aria-label={`Sélectionner ${u.email}`} checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="size-4 accent-[var(--basilic)]" />
                  )}
                </td>
                <td className="num whitespace-nowrap">{fmt.format(new Date(u.createdAt))}</td>
                <td className="max-w-[14rem] truncate" title={u.name}>{u.name}</td>
                <td className="max-w-[18rem] truncate" title={u.email}>
                  {u.email} {!u.emailVerified && <span className="text-xs text-muted">(non confirmé)</span>}
                </td>
                <td className="flex flex-wrap gap-1 py-2">
                  {u.plan === "free" ? <Badge>Gratuit</Badge> : <Badge tone="basilic">{u.plan === "trial" ? "Essai" : "Premium"}</Badge>}
                  {!u.onboarded && <Badge tone="miel">Questionnaire non terminé</Badge>}
                  {u.suspect && <Badge tone="abricot">Suspect</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
