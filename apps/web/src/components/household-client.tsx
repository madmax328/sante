"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ALLERGENS, type Allergen, type MealType } from "@weeko/engine";
import { removeMemberAction, saveMemberAction, type MemberInput } from "@/app/[locale]/app/account/actions";
import { useRouter } from "@/i18n/navigation";
import { Button, Field, Input, Select, cx } from "./ui";

export interface HouseholdMember {
  id: string;
  name: string;
  self: boolean;
  sex: "female" | "male";
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  allergies: Allergen[];
  eats: Record<MealType, boolean>;
  age: number;
}

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cx("rounded-full border px-3 py-1 text-sm font-semibold", active ? "border-basilic bg-basilic text-surface" : "border-line bg-surface")}>
      {children}
    </button>
  );
}

const blank: MemberInput = { name: "", sex: "female", birthDate: "", heightCm: 0, weightKg: 0, activity: "light", allergies: [], eats: { breakfast: true, lunch: false, dinner: true, snack: true } };

/** "Mon foyer": who eats at home, which meals, and their allergies. */
export function HouseholdEditor({ members, premium }: { members: HouseholdMember[]; premium: boolean }) {
  const t = useTranslations("household");
  const e = useTranslations("enums");
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new">();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string>();

  const remove = (m: HouseholdMember) => {
    if (!window.confirm(t("removeConfirm", { name: m.name }))) return;
    start(async () => {
      await removeMemberAction(m.id);
      setMessage(t("regenerate"));
      router.refresh();
    });
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">{t("text")}</p>
      <ul className="grid gap-2">
        {members.map((m) =>
          editing === m.id ? (
            <li key={m.id}>
              <MemberForm
                initial={m}
                selfOnly={m.self}
                onCancel={() => setEditing(undefined)}
                onSaved={() => {
                  setEditing(undefined);
                  setMessage(t("regenerate"));
                  router.refresh();
                }}
              />
            </li>
          ) : (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {m.name}
                  {m.self ? ` (${t("you")})` : ""} <span className="font-normal text-muted">· {t("age", { n: m.age })}</span>
                </p>
                <p className="text-xs text-muted">
                  {MEALS.filter((k) => m.eats[k]).map((k) => e(`meal.${k}`)).join(", ")} · {t("allergies")} : {m.allergies.length ? m.allergies.map((a) => e(`allergen.${a}`)).join(", ") : t("none")}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditing(m.id)}><Pencil className="size-4" /> {t("edit")}</Button>
              {!m.self && (
                <button type="button" onClick={() => remove(m)} disabled={pending} aria-label={`${t("remove")} : ${m.name}`} className="p-2 text-muted hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <MemberForm
          initial={blank}
          onCancel={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setMessage(t("regenerate"));
            router.refresh();
          }}
        />
      ) : (
        members.length < 9 && <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setEditing("new")}><Plus className="size-4" /> {t("add")}</Button>
      )}
      {!premium && members.length > 1 && <p className="text-xs text-muted">{t("premiumNote")}</p>}
      {message && <p className="text-sm font-semibold text-basilic" role="status">{message}</p>}
    </div>
  );
}

function MemberForm({ initial, selfOnly, onCancel, onSaved }: { initial: MemberInput & { id?: string }; selfOnly?: boolean; onCancel: () => void; onSaved: () => void }) {
  const t = useTranslations("household");
  const o = useTranslations("onboarding");
  const e = useTranslations("enums");
  const [m, setM] = useState<MemberInput>({
    id: initial.id,
    name: initial.name,
    sex: initial.sex,
    birthDate: initial.birthDate,
    heightCm: initial.heightCm,
    weightKg: initial.weightKg,
    activity: initial.activity,
    allergies: initial.allergies,
    eats: initial.eats,
  });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const id = initial.id ?? "new";
  const save = () =>
    start(async () => {
      setError(undefined);
      const res = await saveMemberAction(m);
      if (!res.ok) return setError(t(`errors.${res.error ?? "invalid"}`));
      onSaved();
    });

  return (
    <div className="grid gap-4 rounded-2xl border border-basilic p-4">
      {!selfOnly && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={o("you.name")} htmlFor={`hn-${id}`}><Input id={`hn-${id}`} value={m.name} onChange={(ev) => setM({ ...m, name: ev.target.value })} /></Field>
          <Field label={o("you.birthDate")} htmlFor={`hb-${id}`}><Input id={`hb-${id}`} type="date" value={m.birthDate} onChange={(ev) => setM({ ...m, birthDate: ev.target.value })} /></Field>
          <Field label={o("you.sex")} htmlFor={`hs-${id}`}>
            <Select id={`hs-${id}`} value={m.sex} onChange={(ev) => setM({ ...m, sex: ev.target.value as MemberInput["sex"] })}>
              <option value="female">{e("sex.female")}</option>
              <option value="male">{e("sex.male")}</option>
            </Select>
          </Field>
          <Field label={o("goal.activity")} htmlFor={`ha-${id}`}>
            <Select id={`ha-${id}`} value={m.activity} onChange={(ev) => setM({ ...m, activity: ev.target.value as MemberInput["activity"] })}>
              {ACTIVITIES.map((a) => <option key={a} value={a}>{e(`activity.${a}`)}</option>)}
            </Select>
          </Field>
          <Field label={`${o("you.height")} (cm)`} htmlFor={`hh-${id}`}><Input id={`hh-${id}`} type="number" min={50} max={250} value={m.heightCm || ""} onChange={(ev) => setM({ ...m, heightCm: Number(ev.target.value) })} /></Field>
          <Field label={`${o("you.weight")} (kg)`} htmlFor={`hw-${id}`}><Input id={`hw-${id}`} type="number" step="0.1" min={10} max={350} value={m.weightKg || ""} onChange={(ev) => setM({ ...m, weightKg: Number(ev.target.value) })} /></Field>
        </div>
      )}
      <div className="grid gap-2">
        <span className="text-sm font-semibold">{t("meals")}</span>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((k) => <Chip key={k} active={m.eats[k]} onClick={() => setM({ ...m, eats: { ...m.eats, [k]: !m.eats[k] } })}>{e(`meal.${k}`)}</Chip>)}
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-semibold">{t("allergies")}</span>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <Chip key={a} active={m.allergies.includes(a)} onClick={() => setM({ ...m, allergies: m.allergies.includes(a) ? m.allergies.filter((x) => x !== a) : [...m.allergies, a] })}>{e(`allergen.${a}`)}</Chip>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={save}>{t("save")}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
