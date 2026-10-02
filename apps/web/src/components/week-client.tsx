"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, MoreHorizontal, Repeat, Search, Shuffle, X } from "lucide-react";
import type { MealType } from "@weeko/engine";
import { useRouter } from "@/i18n/navigation";
import {
  getAlternativesAction,
  planActionAction,
  replaceMealAction,
  setBudgetAction,
  type AlternativeView,
} from "@/app/[locale]/app/actions";
import { ErrorLine, useActionError } from "./app-client";
import { Button, Input, cx } from "./ui";

export function ReplaceMeal({ day, meal, weekStart, hidden }: { day: number; meal: MealType; weekStart: string; hidden: boolean }) {
  const t = useTranslations("week");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alts, setAlts] = useState<AlternativeView[]>();
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const { error, handle } = useActionError();

  const load = (q?: string) =>
    start(async () => {
      setAlts(await getAlternativesAction({ day, meal, weekStart, query: q || undefined }));
    });

  const choose = (recipeId?: string) =>
    start(async () => {
      if (handle(await replaceMealAction({ day, meal, recipeId, weekStart }))) {
        setOpen(false);
        router.refresh();
      }
    });

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(true);
          load();
        }}
        aria-label={t("replace")}
      >
        <Repeat className="size-4" />
      </Button>
    );
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-encre/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("replaceTitle")}>
      <div className="grid max-h-[85dvh] w-full max-w-lg gap-4 overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("replaceTitle")}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="rounded-full p-1 hover:bg-riz">
            <X className="size-5" />
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(query);
          }}
        >
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} />
          <Button type="submit" variant="secondary" aria-label={t("search")}><Search className="size-4" /></Button>
        </form>
        <Button variant="secondary" onClick={() => choose()} disabled={pending}>
          <Shuffle className="size-4" /> {t("surprise")}
        </Button>
        {pending && !alts ? (
          <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" />{t("loading")}</p>
        ) : alts && alts.length === 0 ? (
          <p className="text-muted">{t("noAlternative")}</p>
        ) : (
          <ul className="grid gap-2">
            {alts?.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => choose(a.id)}
                  className="grid w-full gap-1 rounded-2xl border border-line p-3 text-left hover:border-basilic"
                >
                  <span className="font-semibold">{a.name}</span>
                  <span className="flex flex-wrap gap-x-3 text-sm text-muted num">
                    {!hidden && <span>{a.kcal} kcal · {a.protein} g prot.</span>}
                    <span>{a.minutes} min</span>
                    <span className={cx(a.costDelta > 0 ? "text-abricot-strong" : "text-basilic")}>
                      {a.costDelta === 0 ? t("sameCost") : `${a.costDelta > 0 ? "+" : "−"}${format.number(Math.abs(a.costDelta), { style: "currency", currency: "EUR" })}`}
                    </span>
                    {a.reuse >= 0.4 && <span className="text-basilic">{t("usesLeftovers")}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <ErrorLine error={error} />
      </div>
    </div>
  );
}

export function MealMenu({ day, meal, weekStart }: { day: number; meal: MealType; weekStart: string }) {
  const t = useTranslations("week");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "out" | "guests" | "time">("menu");
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const { error, handle } = useActionError();

  const run = (actions: Parameters<typeof planActionAction>[0]["actions"]) =>
    start(async () => {
      if (handle(await planActionAction({ actions, weekStart }))) {
        setOpen(false);
        setMode("menu");
        setValue("");
        router.refresh();
      }
    });

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("more")}>
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 grid w-64 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          {mode === "menu" && (
            <>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-riz" onClick={() => setMode("out")}>{t("eatOut")}</button>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-riz" onClick={() => setMode("guests")}>{t("guests")}</button>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-riz" onClick={() => setMode("time")}>{t("lessTime")}</button>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-riz" onClick={() => run([{ type: "skip_meal", day, meal }])}>{t("skip")}</button>
            </>
          )}
          {mode !== "menu" && (
            <form
              className="grid gap-2 p-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "out") run([{ type: "eat_out", day, meal, label: value || t("eatOutDefault") }]);
                if (mode === "guests") run([{ type: "guests", day, meal, total: Math.max(1, Number(value) || 1) }]);
                if (mode === "time") run([{ type: "time_limit", day, meal, minutes: Math.max(5, Number(value) || 15) }]);
              }}
            >
              <label className="text-sm font-semibold" htmlFor={`mm-${day}-${meal}`}>
                {mode === "out" ? t("eatOutLabel") : mode === "guests" ? t("guestsLabel") : t("timeLabel")}
              </label>
              <Input
                id={`mm-${day}-${meal}`}
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type={mode === "out" ? "text" : "number"}
                min={mode === "guests" ? 1 : 5}
                max={mode === "guests" ? 20 : 180}
                placeholder={mode === "out" ? t("eatOutDefault") : mode === "guests" ? "4" : "15"}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>{t("validate")}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setMode("menu")}>{t("cancel")}</Button>
              </div>
            </form>
          )}
          <ErrorLine error={error} />
        </div>
      )}
    </div>
  );
}

export function BudgetControl({ enabled, weekly }: { enabled: boolean; weekly: number }) {
  const t = useTranslations("week");
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [amount, setAmount] = useState(weekly);
  const [pending, start] = useTransition();
  const { error, handle } = useActionError();
  const save = (regenerate: boolean) =>
    start(async () => {
      if (handle(await setBudgetAction({ enabled: on, weekly: amount, regenerate }))) router.refresh();
    });
  return (
    <div className="grid gap-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-4 accent-[var(--basilic)]" />
        {t("budgetEnable")}
      </label>
      {on && (
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" min={10} max={1000} step={5} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-28" aria-label={t("budgetAmount")} />
          <span className="text-sm text-muted">€ / {t("perWeek")}</span>
          <div className="flex flex-wrap gap-2">
            {[40, 50, 70, 100].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(v)} className={cx("rounded-full border px-3 py-1 text-sm", amount === v ? "border-basilic bg-basilic-soft" : "border-line")}>{v} €</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save(true)} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} {t("budgetRebuild")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => save(false)} disabled={pending}>{t("budgetSaveOnly")}</Button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}
