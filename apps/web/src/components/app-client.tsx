"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Droplet, Loader2, Minus, Plus, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MealType, PlanAction } from "@weeko/engine";
import { Link, useRouter } from "@/i18n/navigation";
import {
  addWaterAction,
  generateWeekAction,
  planActionAction,
  rateRecipeAction,
  toggleEatenAction,
  type ActionResult,
} from "@/app/[locale]/app/actions";
import { interpretAction, type CoachProposal } from "@/app/[locale]/app/coach/actions";
import { AiQuota } from "./coach-client";
import { Button, Progress, cx } from "./ui";

export function useActionError() {
  const t = useTranslations("errors");
  const [error, setError] = useState<string>();
  const handle = (res: ActionResult) => {
    if (res.ok) {
      setError(undefined);
      return true;
    }
    setError(t(res.error));
    return false;
  };
  return { error, setError, handle };
}

export function ErrorLine({ error }: { error?: string }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error}{" "}
      {error === t("premium") || error === t("quota") ? (
        <Link href="/app/account" className="font-semibold underline">{t("seePremium")}</Link>
      ) : null}
    </p>
  );
}

export function EatenToggle({ day, meal, eaten, weekStart }: { day: number; meal: MealType; eaten: boolean; weekStart?: string }) {
  const t = useTranslations("today");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(eaten);
  return (
    <button
      type="button"
      aria-pressed={value}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const res = await toggleEatenAction({ day, meal, weekStart });
          if (!res.ok) setValue(value);
          router.refresh();
        })
      }
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        value ? "border-basilic bg-basilic text-surface" : "border-line text-transparent hover:border-basilic hover:text-basilic/50",
      )}
      title={value ? t("eaten") : t("markEaten")}
    >
      <Check className="size-5" aria-hidden />
      <span className="sr-only">{value ? t("eaten") : t("markEaten")}</span>
    </button>
  );
}

export function WaterTracker({ initial, goal }: { initial: number; goal: number }) {
  const t = useTranslations("today");
  const format = useFormatter();
  const [ml, setMl] = useState(initial);
  const [pending, start] = useTransition();
  const add = (delta: number) =>
    start(async () => {
      setMl((v) => Math.max(0, v + delta));
      const res = await addWaterAction({ ml: delta });
      if (res.ok && res.waterMl !== undefined) setMl(res.waterMl);
    });
  const glasses = Math.round(ml / 250);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Droplet className="size-5 text-eau" aria-hidden />
          <span className="font-display text-xl font-bold num">{format.number(ml / 1000, { maximumFractionDigits: 2 })} L</span>
          <span className="text-sm text-muted num">/ {format.number(goal / 1000, { maximumFractionDigits: 1 })} L</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => add(-250)} disabled={pending || ml <= 0} aria-label={t("waterLess")}>
            <Minus className="size-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => add(250)} disabled={pending} aria-label={t("waterMore")}>
            <Plus className="size-4" /> {t("glass")}
          </Button>
        </div>
      </div>
      <Progress value={ml} max={goal} tone="eau" label={t("water")} />
      <p className="text-xs text-muted">{t("glasses", { count: glasses })}</p>
    </div>
  );
}

export function GenerateWeekButton({ label, variant = "accent", weekStart, confirmText }: { label: string; variant?: "accent" | "secondary"; weekStart?: string; confirmText?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { error, handle } = useActionError();
  const [confirming, setConfirming] = useState(false);
  const t = useTranslations("week");
  if (confirmText && confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-miel-soft p-3 text-sm">
        <span>{confirmText}</span>
        <Button
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (handle(await generateWeekAction({ weekStart }))) setConfirming(false);
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} {t("confirmRegenerate")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>{t("cancel")}</Button>
        <ErrorLine error={error} />
      </div>
    );
  }
  return (
    <div className="grid gap-1">
      <Button
        variant={variant}
        size={variant === "accent" ? "lg" : "md"}
        disabled={pending}
        onClick={() => {
          if (confirmText) return setConfirming(true);
          start(async () => {
            handle(await generateWeekAction({ weekStart }));
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {label}
      </Button>
      <ErrorLine error={error} />
    </div>
  );
}

const SUGGESTIONS = ["restaurant", "guests", "quick", "missing"] as const;

export function QuickAdjust({ premium }: { premium: boolean }) {
  const t = useTranslations("adjust");
  const router = useRouter();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<CoachProposal>();
  const [pending, start] = useTransition();
  const { error, setError, handle } = useActionError();
  const te = useTranslations("errors");

  const ask = (value: string) =>
    start(async () => {
      setProposal(undefined);
      const res = await interpretAction({ text: value });
      if (!res.ok) return setError(te(res.error === "profile" ? "server" : res.error));
      setProposal(res.proposal);
    });

  const apply = (actions: PlanAction[]) =>
    start(async () => {
      if (handle(await planActionAction({ actions }))) {
        setProposal(undefined);
        setText("");
        router.refresh();
      }
    });

  return (
    <div className="grid gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length > 1) ask(text);
        }}
      >
        <label htmlFor="adjust" className="sr-only">{t("label")}</label>
        <input
          id="adjust"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          maxLength={400}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 focus:border-basilic focus:outline-none"
        />
        <Button type="submit" variant="accent" disabled={pending || text.trim().length < 2}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          <span className="hidden sm:inline">{t("submit")}</span>
        </Button>
      </form>
      {!proposal && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setText(t(`suggestions.${s}`));
                ask(t(`suggestions.${s}`));
              }}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted hover:border-basilic hover:text-encre"
            >
              {t(`suggestions.${s}`)}
            </button>
          ))}
        </div>
      )}
      {!premium && <p className="text-xs text-muted">{t("premiumNote")}</p>}
      <ErrorLine error={error} />
      {proposal && (
        <div className="grid gap-3 rounded-2xl bg-basilic-soft p-4">
          <p>{proposal.reply}</p>
          <AiQuota left={proposal.aiLeft} />
          {proposal.labels.length > 0 && (
            <>
              <ul className="grid gap-1 text-sm">
                {proposal.labels.map((l, i) => (
                  <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-basilic" aria-hidden />{l}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => apply(proposal.actions)} disabled={pending}>{t("apply")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setProposal(undefined)}>{t("dismiss")}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function RateRecipe({ recipeId, initial }: { recipeId: string; initial: "liked" | "disliked" | "none" }) {
  const t = useTranslations("recipe");
  const [rating, setRating] = useState(initial);
  const [pending, start] = useTransition();
  const set = (r: "liked" | "disliked") =>
    start(async () => {
      const next = rating === r ? "none" : r;
      setRating(next);
      await rateRecipeAction({ recipeId, rating: next });
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant={rating === "liked" ? "primary" : "secondary"} onClick={() => set("liked")} disabled={pending} aria-pressed={rating === "liked"}>
        <ThumbsUp className="size-4" /> {t("like")}
      </Button>
      <Button size="sm" variant={rating === "disliked" ? "danger" : "secondary"} onClick={() => set("disliked")} disabled={pending} aria-pressed={rating === "disliked"}>
        <ThumbsDown className="size-4" /> {t("dislike")}
      </Button>
    </div>
  );
}
