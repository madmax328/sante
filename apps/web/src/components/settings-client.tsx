"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
  deleteAccountAction,
  portalAction,
  saveBodyAction,
  saveFoodPrefsAction,
  withdrawHealthConsentAction,
} from "@/app/[locale]/app/account/actions";
import { saveSportSettingsAction } from "@/app/[locale]/app/sport/actions";
import type { SportSettings } from "@/lib/types";
import type { FoodPreferences, Goal, ActivityLevel } from "@weeko/engine";
import { Button, Field, Input, LinkButton, Select, cx } from "./ui";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cx("rounded-full border px-3 py-1 text-sm font-semibold", active ? "border-basilic bg-basilic text-surface" : "border-line bg-surface")}>
      {children}
    </button>
  );
}

function Saved({ state }: { state: "idle" | "saved" | "error" }) {
  const t = useTranslations("account");
  if (state === "idle") return null;
  return <span className={cx("text-sm font-semibold", state === "saved" ? "text-basilic" : "text-danger")}>{state === "saved" ? t("saved") : t("saveError")}</span>;
}

export function SportSettingsForm({ initial }: { initial: SportSettings }) {
  const t = useTranslations("onboarding.sport");
  const e = useTranslations("enums");
  const a = useTranslations("account");
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={s.enabled} onChange={(ev) => setS({ ...s, enabled: ev.target.checked })} className="size-4 accent-[var(--basilic)]" /> {t("enable")}
      </label>
      <div className="flex flex-wrap gap-2">
        {(["beginner", "intermediate", "advanced"] as const).map((l) => <Chip key={l} active={s.level === l} onClick={() => setS({ ...s, level: l })}>{e(`level.${l}`)}</Chip>)}
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-semibold">{t("days")}</span>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => <Chip key={d} active={s.availableDays.includes(d)} onClick={() => setS({ ...s, availableDays: toggle(s.availableDays, d).sort() })}>{e(`dayShort.${d}`)}</Chip>)}
        </div>
      </div>
      <Field label={t("minutes")} htmlFor="sport-min">
        <Input id="sport-min" type="number" min={10} max={90} step={5} value={s.minutesPerSession} onChange={(ev) => setS({ ...s, minutesPerSession: Number(ev.target.value) })} className="w-28" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {(["dumbbells", "band", "kettlebell", "pullup_bar"] as const).map((q) => <Chip key={q} active={s.equipment.includes(q)} onClick={() => setS({ ...s, equipment: toggle(s.equipment, q) })}>{e(`sportEquipment.${q}`)}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["knees", "back", "shoulders", "wrists"] as const).map((q) => <Chip key={q} active={s.limitations.includes(q)} onClick={() => setS({ ...s, limitations: toggle(s.limitations, q) })}>{e(`limitation.${q}`)}</Chip>)}
      </div>
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveSportSettingsAction({ enabled: s.enabled, level: s.level, availableDays: s.availableDays, minutesPerSession: s.minutesPerSession, equipment: s.equipment, limitations: s.limitations });
              setState(res.ok ? "saved" : "error");
              router.refresh();
            })
          }
        >
          {a("saveAndRebuild")}
        </Button>
        <Saved state={state} />
      </div>
    </div>
  );
}

export function FoodPrefsForm({ initial }: { initial: FoodPreferences }) {
  const t = useTranslations("onboarding.food");
  const e = useTranslations("enums");
  const a = useTranslations("account");
  const [p, setP] = useState(initial);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const avoidOptions = ["pork", "beef", "lamb", "alcohol", "fish", "seafood"] as const;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(["omnivore", "pescatarian", "vegetarian", "vegan"] as const).map((d) => <Chip key={d} active={p.diet === d} onClick={() => setP({ ...p, diet: d })}>{e(`diet.${d}`)}</Chip>)}
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-semibold">{t("avoid")}</span>
        <div className="flex flex-wrap gap-2">
          {avoidOptions.map((x) => <Chip key={x} active={p.avoid.includes(x)} onClick={() => setP({ ...p, avoid: toggle(p.avoid, x) })}>{e(`avoid.${x}`)}</Chip>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Field label={t("weekday")} htmlFor="pwd"><Input id="pwd" type="number" min={10} max={120} step={5} value={p.maxMinutesWeekday} onChange={(ev) => setP({ ...p, maxMinutesWeekday: Number(ev.target.value) })} /></Field>
        <Field label={t("weekend")} htmlFor="pwe"><Input id="pwe" type="number" min={10} max={180} step={5} value={p.maxMinutesWeekend} onChange={(ev) => setP({ ...p, maxMinutesWeekend: Number(ev.target.value) })} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["oven", "microwave", "blender", "airfryer", "slowcooker"] as const).map((q) => <Chip key={q} active={p.equipment.includes(q)} onClick={() => setP({ ...p, equipment: toggle(p.equipment, q) })}>{e(`equipment.${q}`)}</Chip>)}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.leftovers} onChange={(ev) => setP({ ...p, leftovers: ev.target.checked })} className="size-4 accent-[var(--basilic)]" />{t("leftovers")}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.snacks} onChange={(ev) => setP({ ...p, snacks: ev.target.checked })} className="size-4 accent-[var(--basilic)]" />{t("snacks")}</label>
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveFoodPrefsAction({ diet: p.diet, avoid: p.avoid as never, maxMinutesWeekday: p.maxMinutesWeekday, maxMinutesWeekend: p.maxMinutesWeekend, equipment: p.equipment, leftovers: p.leftovers, snacks: p.snacks });
              setState(res.ok ? "saved" : "error");
            })
          }
        >
          {a("save")}
        </Button>
        <Saved state={state} />
      </div>
      <p className="text-xs text-muted">{a("prefsNote")}</p>
    </div>
  );
}

export function BodyForm({ initial }: { initial: { weightKg: number; heightCm: number; goal: Goal; activity: ActivityLevel; targetWeightKg?: number } }) {
  const t = useTranslations("onboarding");
  const e = useTranslations("enums");
  const a = useTranslations("account");
  const router = useRouter();
  const [b, setB] = useState({ ...initial, pace: "gentle" as "gentle" | "moderate" });
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={t("you.weight")} htmlFor="bw"><Input id="bw" type="number" step="0.1" value={b.weightKg} onChange={(ev) => setB({ ...b, weightKg: Number(ev.target.value) })} /></Field>
        <Field label={t("you.height")} htmlFor="bh"><Input id="bh" type="number" value={b.heightCm} onChange={(ev) => setB({ ...b, heightCm: Number(ev.target.value) })} /></Field>
        <Field label={t("goal.target")} htmlFor="bt"><Input id="bt" type="number" step="0.5" value={b.targetWeightKg ?? ""} onChange={(ev) => setB({ ...b, targetWeightKg: ev.target.value ? Number(ev.target.value) : undefined })} /></Field>
        <Field label={t("goal.pace")} htmlFor="bp">
          <Select id="bp" value={b.pace} onChange={(ev) => setB({ ...b, pace: ev.target.value as "gentle" | "moderate" })}>
            <option value="gentle">{t("goal.gentle")}</option>
            <option value="moderate">{t("goal.moderate")}</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={a("goal")} htmlFor="bg">
          <Select id="bg" value={b.goal} onChange={(ev) => setB({ ...b, goal: ev.target.value as Goal })}>
            {(["lose_weight", "maintain", "gain_muscle", "eat_better", "save_money", "family_meals"] as const).map((g) => <option key={g} value={g}>{e(`goal.${g}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("goal.activity")} htmlFor="ba">
          <Select id="ba" value={b.activity} onChange={(ev) => setB({ ...b, activity: ev.target.value as ActivityLevel })}>
            {(["sedentary", "light", "moderate", "active", "very_active"] as const).map((x) => <option key={x} value={x}>{e(`activity.${x}`)}</option>)}
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => start(async () => { const res = await saveBodyAction(b); setState(res.ok ? "saved" : "error"); router.refresh(); })}>{a("save")}</Button>
        <Saved state={state} />
      </div>
    </div>
  );
}

export function SubscriptionButtons({ premium, hasCustomer, configured }: { premium: boolean; hasCustomer: boolean; configured: boolean }) {
  const t = useTranslations("account");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const go = (fn: () => Promise<{ url?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.url) window.location.href = res.url;
      else setError(t(`stripeErrors.${res.error ?? "server"}`));
    });
  if (!configured) return <p className="text-sm text-muted">{t("stripeErrors.not_configured")}</p>;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {!premium && (
          <>
            <LinkButton href="/app/account/checkout?plan=monthly" variant="accent">{t("monthly")}</LinkButton>
            <LinkButton href="/app/account/checkout?plan=yearly" variant="primary">{t("yearly")}</LinkButton>
          </>
        )}
        {hasCustomer && <Button variant="secondary" disabled={pending} onClick={() => go(portalAction)}>{t("manage")}</Button>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function DangerZone() {
  const t = useTranslations("account");
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {/* A plain link: the API answers with a file download, not a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/account/export" className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 font-semibold hover:border-basilic">{t("export")}</a>
        <Button variant="secondary" onClick={() => authClient.signOut().then(() => { router.push("/"); router.refresh(); })}><LogOut className="size-4" /> {t("logout")}</Button>
      </div>
      <div className="grid gap-2 rounded-2xl border border-line p-4">
        <p className="font-semibold">{t("withdrawTitle")}</p>
        <p className="text-sm text-muted">{t("withdrawText")}</p>
        {showWithdraw ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => { await withdrawHealthConsentAction(); router.push("/app/welcome"); router.refresh(); })}>{t("withdrawConfirm")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowWithdraw(false)}>{t("cancel")}</Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setShowWithdraw(true)}>{t("withdraw")}</Button>
        )}
      </div>
      <div className="grid gap-2 rounded-2xl border border-danger/40 bg-danger-soft/40 p-4">
        <p className="font-semibold text-danger">{t("deleteTitle")}</p>
        <p className="text-sm">{t("deleteText")}</p>
        {showDelete ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              start(async () => {
                await deleteAccountAction(confirm);
              });
            }}
          >
            <Input value={confirm} onChange={(ev) => setConfirm(ev.target.value)} placeholder={t("deletePlaceholder")} className="w-44" aria-label={t("deletePlaceholder")} />
            <Button type="submit" variant="danger" size="sm" disabled={pending || confirm.trim().toUpperCase() !== t("deleteWord")}>{t("deleteConfirm")}</Button>
          </form>
        ) : (
          <Button variant="danger" size="sm" className="justify-self-start" onClick={() => setShowDelete(true)}>{t("delete")}</Button>
        )}
      </div>
    </div>
  );
}
