"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Minus, Plus } from "lucide-react";
import type { MealType } from "@weeko/engine";
import { addFoodAction } from "@/app/[locale]/app/journal/actions";
import { Button, Select } from "./ui";

export interface IngredientLine {
  id: string;
  name: string;
  plural?: string;
  /** Quantity for one serving, in base unit */
  qty: number;
  unit: "g" | "ml" | "pc";
  staple: boolean;
}

function formatLine(l: IngredientLine, servings: number, nf: (n: number, d?: number) => string): string {
  const q = l.qty * servings;
  if (l.unit === "pc") {
    const n = Math.round(q * 4) / 4;
    return `${nf(n, 2)} ${(n > 1 ? l.plural ?? l.name : l.name).toLowerCase()}`;
  }
  const [small, big] = l.unit === "ml" ? ["ml", "l"] : ["g", "kg"];
  if (q >= 1000) return `${nf(q / 1000, 2)} ${big} · ${l.name.toLowerCase()}`;
  const r = q < 10 ? Math.round(q * 2) / 2 : q < 100 ? Math.round(q) : Math.round(q / 5) * 5;
  return `${nf(r, 1)} ${small} · ${l.name.toLowerCase()}`;
}

export function IngredientScaler({ lines, defaultServings }: { lines: IngredientLine[]; defaultServings: number }) {
  const t = useTranslations("recipe");
  const format = useFormatter();
  const [servings, setServings] = useState(defaultServings);
  const nf = (n: number, d = 1) => format.number(n, { maximumFractionDigits: d });
  const main = lines.filter((l) => !l.staple);
  const staples = lines.filter((l) => l.staple);
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{t("servings")}</span>
        <Button size="sm" variant="secondary" onClick={() => setServings(Math.max(1, servings - 1))} aria-label={t("less")}><Minus className="size-4" /></Button>
        <span className="min-w-6 text-center font-display text-xl font-bold num">{servings}</span>
        <Button size="sm" variant="secondary" onClick={() => setServings(Math.min(20, servings + 1))} aria-label={t("more")}><Plus className="size-4" /></Button>
      </div>
      <ul className="grid gap-2">
        {main.map((l) => (
          <li key={l.id} className="flex gap-2 border-b border-line/70 pb-2 last:border-0 num">{formatLine(l, servings, nf)}</li>
        ))}
      </ul>
      {staples.length > 0 && (
        <p className="text-sm text-muted">
          {t("staples")} : {staples.map((l) => formatLine(l, servings, nf)).join(" ; ")}
        </p>
      )}
    </div>
  );
}

export function AddRecipeToJournal({ recipeId }: { recipeId: string }) {
  const t = useTranslations("recipe");
  const e = useTranslations("enums");
  const [meal, setMeal] = useState<MealType>("dinner");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={meal} onChange={(ev) => setMeal(ev.target.value as MealType)} className="w-40" aria-label={t("meal")}>
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => <option key={m} value={m}>{e(`meal.${m}`)}</option>)}
      </Select>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await addFoodAction({ meal, entry: { kind: "recipe", id: recipeId, amount: 1 } });
            setDone(res.ok);
          })
        }
      >
        {done ? <Check className="size-4" /> : <Plus className="size-4" />} {done ? t("added") : t("addToJournal")}
      </Button>
    </div>
  );
}
