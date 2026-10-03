"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, X } from "lucide-react";
import type { DislikeOptions } from "@/lib/dislikes";
import { Input, cx } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "Foods I don't eat": common choices as chips, plus a search for any other ingredient. */
export function DislikePicker({ value, onChange, options }: { value: string[]; onChange: (ids: string[]) => void; options: DislikeOptions }) {
  const t = useTranslations("onboarding.food");
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const groupOn = (ids: string[]) => ids.every((id) => selected.has(id));
  const toggleGroup = (ids: string[]) => {
    if (groupOn(ids)) onChange(value.filter((id) => !ids.includes(id)));
    else onChange([...new Set([...value, ...ids])]);
  };
  const labels = useMemo(() => new Map(options.ingredients.map((i) => [i.id, i.label])), [options.ingredients]);
  // Ingredients picked one by one (not already shown through an active chip).
  const covered = new Set(options.groups.filter((g) => groupOn(g.ingredients)).flatMap((g) => g.ingredients));
  const singles = value.filter((id) => !covered.has(id));
  const q = norm(query.trim());
  const hits = q.length < 2 ? [] : options.ingredients.filter((i) => !selected.has(i.id) && norm(i.label).includes(q)).slice(0, 8);

  return (
    <div className="grid gap-2">
      <div>
        <span className="text-sm font-semibold">{t("dislikes")}</span>
        <p className="text-xs text-muted">{t("dislikesHint")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.groups.map((g) => {
          const on = groupOn(g.ingredients);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggleGroup(g.ingredients)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                on ? "border-danger bg-danger-soft text-danger line-through decoration-2" : "border-line bg-surface hover:border-basilic",
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      {singles.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("dislikesOthers")}>
          {singles.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== id))}
                className="inline-flex items-center gap-1 rounded-full border border-danger bg-danger-soft px-3 py-1.5 text-sm font-semibold text-danger"
                aria-label={t("dislikesRemove", { name: labels.get(id) ?? id })}
              >
                {labels.get(id) ?? id} <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder={t("dislikesSearch")} aria-label={t("dislikesSearch")} className="pl-9" />
      </div>
      {hits.length > 0 && (
        <ul className="grid max-w-sm gap-1 rounded-2xl border border-line p-1">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => { onChange([...value, h.id]); setQuery(""); }}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-riz"
              >
                {h.label} <Plus className="size-4 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && hits.length === 0 && <p className="text-xs text-muted">{t("dislikesNone")}</p>}
    </div>
  );
}
