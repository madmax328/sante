"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setPantryItemAction } from "@/app/[locale]/app/pantry/actions";
import { Button, Input } from "./ui";

export interface PantryOption {
  id: string;
  name: string;
  unit: "g" | "ml" | "pc";
}

const unitLabel = { g: "g", ml: "ml", pc: "pc" } as const;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Search an ingredient, pick it, set the quantity. (No <datalist>: it renders badly on iPhone.) */
export function PantryAdd({ options }: { options: PantryOption[] }) {
  const t = useTranslations("pantry");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PantryOption>();
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const hits = !selected && query.trim().length >= 2 ? options.filter((o) => norm(o.name).includes(norm(query.trim()))).slice(0, 8) : [];

  return (
    <form
      className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return setError(t("unknown"));
        start(async () => {
          const res = await setPantryItemAction({ ingredientId: selected.id, qty: Number(qty.replace(",", ".")) || 0 });
          if (!res.ok) return setError(t(res.error === "premium" ? "premium" : "unknown"));
          setQuery("");
          setSelected(undefined);
          setQty("");
          setError(undefined);
          router.refresh();
        });
      }}
    >
      <div className="relative">
        <Input
          value={selected ? selected.name : query}
          onChange={(e) => {
            setSelected(undefined);
            setQuery(e.target.value);
          }}
          placeholder={t("ingredient")}
          aria-label={t("ingredient")}
          autoComplete="off"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="pantry-hits"
        />
        {hits.length > 0 && (
          <ul id="pantry-hits" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 grid max-h-64 gap-0.5 overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-lg">
            {hits.map((o) => (
              <li key={o.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-riz"
                  onClick={() => {
                    setSelected(o);
                    setQty(o.unit === "pc" ? "1" : "500");
                    setError(undefined);
                  }}
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative">
        <Input type="number" inputMode="decimal" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("quantity")} aria-label={t("quantity")} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{selected ? unitLabel[selected.unit] : ""}</span>
      </div>
      <Button type="submit" disabled={pending || !selected}><Plus className="size-4" /> {t("add")}</Button>
      {error && <p className="text-sm text-danger sm:col-span-3">{error}</p>}
    </form>
  );
}

export function PantryRow({ id, name, qty, unit }: { id: string; name: string; qty: number; unit: "g" | "ml" | "pc" }) {
  const t = useTranslations("pantry");
  const router = useRouter();
  const [value, setValue] = useState(String(qty));
  const [pending, start] = useTransition();
  const save = (q: number) =>
    start(async () => {
      await setPantryItemAction({ ingredientId: id, qty: q });
      router.refresh();
    });
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 font-semibold">{name}</span>
      {/* Fixed-width box: the Input itself is full width. */}
      <div className="w-24 shrink-0">
        <Input type="number" inputMode="decimal" min={0} value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => Number(value) !== qty && save(Number(value) || 0)} className="text-right" aria-label={`${t("quantity")} : ${name}`} />
      </div>
      <span className="w-6 shrink-0 text-sm text-muted">{unitLabel[unit]}</span>
      <Button size="sm" variant="ghost" className="shrink-0" onClick={() => save(0)} disabled={pending} aria-label={t("remove")}><Trash2 className="size-4" /></Button>
    </li>
  );
}
