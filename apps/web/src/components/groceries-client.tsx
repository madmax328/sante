"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ClipboardCopy, Printer, ShoppingCart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { markShoppedAction, toggleCheckedAction } from "@/app/[locale]/app/actions";
import { Button, Input, cx } from "./ui";

export function GroceryItem({ id, label, detail, cost, checked: initial, weekStart }: { id: string; label: string; detail: string; cost: string; checked: boolean; weekStart: string }) {
  const [checked, setChecked] = useState(initial);
  const [, start] = useTransition();
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {
            setChecked(!checked);
            start(async () => {
              await toggleCheckedAction({ ingredientId: id, weekStart });
            });
          }}
          className="peer sr-only"
        />
        <span className={cx("grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors", checked ? "border-basilic bg-basilic text-surface" : "border-line")}>
          {checked && <Check className="size-4" aria-hidden />}
        </span>
        <span className={cx("min-w-0 flex-1", checked && "text-muted line-through")}>
          <span className="font-semibold">{label}</span> <span className="text-sm text-muted num">{detail}</span>
        </span>
        <span className="text-sm text-muted num">{cost}</span>
      </label>
    </li>
  );
}

export function GroceryTools({ text }: { text: string }) {
  const t = useTranslations("groceries");
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <ClipboardCopy className="size-4" /> {copied ? t("copied") : t("copy")}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> {t("print")}
      </Button>
    </div>
  );
}

export function ShoppedForm({ weekStart, done, estimated }: { weekStart: string; done: boolean; estimated: number }) {
  const t = useTranslations("groceries");
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.round(estimated)));
  const [pending, start] = useTransition();
  if (done) return <p className="flex items-center gap-2 font-semibold text-basilic"><Check className="size-5" />{t("shoppedDone")}</p>;
  return (
    <form
      className="flex flex-wrap items-end gap-2 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await markShoppedAction({ weekStart, actualSpent: amount ? Number(amount) : undefined });
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1 text-sm font-semibold">
        {t("actualSpent")}
        <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
      </label>
      <Button type="submit" disabled={pending}><ShoppingCart className="size-4" /> {t("shopped")}</Button>
    </form>
  );
}
