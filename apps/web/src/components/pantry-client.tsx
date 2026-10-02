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

export function PantryAdd({ options }: { options: PantryOption[] }) {
  const t = useTranslations("pantry");
  const router = useRouter();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const selected = options.find((o) => o.name.toLowerCase() === name.trim().toLowerCase());
  return (
    <form
      className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return setError(t("unknown"));
        start(async () => {
          const res = await setPantryItemAction({ ingredientId: selected.id, qty: Number(qty) || 0 });
          if (!res.ok) return setError(t(res.error === "premium" ? "premium" : "unknown"));
          setName("");
          setQty("");
          setError(undefined);
          router.refresh();
        });
      }}
    >
      <Input list="pantry-options" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ingredient")} aria-label={t("ingredient")} />
      <datalist id="pantry-options">
        {options.map((o) => <option key={o.id} value={o.name} />)}
      </datalist>
      <div className="relative">
        <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t("quantity")} aria-label={t("quantity")} className="pr-10" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{selected ? unitLabel[selected.unit] : ""}</span>
      </div>
      <Button type="submit" disabled={pending}><Plus className="size-4" /> {t("add")}</Button>
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
      <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => Number(value) !== qty && save(Number(value) || 0)} className="w-24" aria-label={t("quantity")} />
      <span className="w-6 text-sm text-muted">{unitLabel[unit]}</span>
      <Button size="sm" variant="ghost" onClick={() => save(0)} disabled={pending} aria-label={t("remove")}><Trash2 className="size-4" /></Button>
    </li>
  );
}
