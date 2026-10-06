"use client";

import { DislikePicker } from "./dislike-picker";
import type { DislikeOptions } from "@/lib/dislikes";

import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { completeOnboarding, previewTargets, type OnboardingInput } from "@/app/[locale]/app/welcome/actions";
import { Button, Card, Field, Input, Notice, Select, cx } from "./ui";

type Self = OnboardingInput["self"];
type Member = OnboardingInput["members"][number];
type Prefs = OnboardingInput["prefs"];

const STEPS = ["you", "goal", "health", "food", "household", "budget", "sport", "summary"] as const;
type Step = (typeof STEPS)[number];

const ALLERGENS = ["gluten", "dairy", "egg", "peanut", "nuts", "fish", "seafood", "soy", "sesame", "celery", "mustard", "sulphites", "lupin"] as const;
const AVOID = ["pork", "beef", "lamb", "alcohol", "fish", "seafood"] as const;
const EQUIPMENT = ["oven", "microwave", "blender", "airfryer", "slowcooker"] as const;
const SPORT_EQ = ["dumbbells", "band", "kettlebell", "pullup_bar"] as const;
const LIMITS = ["knees", "back", "shoulders", "wrists"] as const;
const MEDICAL = ["diabetes", "kidney_disease", "heart_disease", "eating_disorder_history", "bariatric_surgery", "other"] as const;
const GOALS = ["lose_weight", "maintain", "gain_muscle", "eat_better", "save_money", "family_meals"] as const;
const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;
const DIETS = ["omnivore", "flexitarian", "pescatarian", "vegetarian", "vegan"] as const;
const VEGGIES = ["more", "normal", "less"] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const allMeals = { breakfast: true, lunch: true, dinner: true, snack: true };

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-basilic bg-basilic text-surface" : "border-line bg-surface hover:border-basilic",
      )}
    >
      {children}
    </button>
  );
}

function ChoiceCard({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "grid gap-1 rounded-2xl border-2 p-4 text-left transition-colors",
        active ? "border-basilic bg-basilic-soft" : "border-line bg-surface hover:border-basilic/60",
      )}
    >
      <span className="font-bold">{title}</span>
      {text && <span className="text-sm text-muted">{text}</span>}
    </button>
  );
}

function NumberField({ id, label, value, onChange, min, max, step = 1, suffix }: { id: string; label: string; value: number | undefined; onChange: (v: number | undefined) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="pr-12"
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Onboarding({ defaultName, dislikeOptions }: { defaultName: string; dislikeOptions: DislikeOptions }) {
  const t = useTranslations("onboarding");
  const format = useFormatter();
  const e = useTranslations("enums");
  const router = useRouter();
  const [step, setStep] = useState<Step>("you");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [self, setSelf] = useState<Partial<Self> & { allergies: Self["allergies"]; medical: Self["medical"]; eats: Self["eats"] }>({
    name: defaultName,
    sex: undefined,
    activity: "light",
    goal: undefined,
    pace: "gentle",
    pregnancy: "none",
    medical: [],
    allergies: [],
    eats: allMeals,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({
    diet: "omnivore",
    avoid: [],
    dislikedIngredients: [],
    maxMinutesWeekday: 30,
    maxMinutesWeekend: 60,
    equipment: ["oven", "microwave"],
    leftovers: true,
    snacks: true,
  });
  const [budget, setBudget] = useState({ enabled: false, weekly: 70 });
  const [sport, setSport] = useState<OnboardingInput["sport"]>({
    enabled: true,
    level: "beginner",
    availableDays: [0, 2, 4],
    minutesPerSession: 30,
    equipment: [],
    limitations: [],
  });
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewTargets>>>();

  const index = STEPS.indexOf(step);
  const set = <K extends keyof Self>(k: K, v: Self[K] | undefined) => setSelf((s) => ({ ...s, [k]: v }));

  const youValid = !!self.name && !!self.sex && !!self.birthDate && !!self.heightCm && !!self.weightKg;
  const goalValid = !!self.goal && !!self.activity;
  const canNext: Record<Step, boolean> = {
    you: youValid,
    goal: goalValid,
    health: consent,
    food: true,
    household: members.every((m) => m.name && m.birthDate && m.heightCm && m.weightKg),
    budget: !budget.enabled || budget.weekly >= 10,
    sport: !sport.enabled || sport.availableDays.length > 0,
    summary: true,
  };

  useEffect(() => {
    if (step !== "summary" || !youValid || !goalValid) return;
    previewTargets({
      sex: self.sex!,
      birthDate: self.birthDate!,
      heightCm: self.heightCm!,
      weightKg: self.weightKg!,
      activity: self.activity!,
      goal: self.goal!,
      pace: self.pace ?? "gentle",
      targetWeightKg: self.targetWeightKg,
      pregnancy: self.pregnancy ?? "none",
      medical: self.medical,
    }).then(setPreview);
  }, [step, youValid, goalValid, self]);

  function next() {
    setError(undefined);
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]!);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    if (index > 0) setStep(STEPS[index - 1]!);
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const res = await completeOnboarding({
        self: self as Self,
        members,
        prefs,
        budget,
        sport,
        consentHealth: consent as true,
      });
      if (!res.ok) {
        setError(t(`errors.${res.error}`));
        return;
      }
      router.push("/app/week");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-muted num">
          {t("progress", { step: index + 1, total: STEPS.length })}
        </p>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cx("h-1.5 flex-1 rounded-full", i <= index ? "bg-basilic" : "bg-line")} />
          ))}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold">{t(`${step}.title`)}</h1>
        <p className="text-muted">{t(`${step}.subtitle`)}</p>
      </div>

      <Card className="grid gap-5">
        {step === "you" && (
          <>
            <Field label={t("you.name")} htmlFor="name">
              <Input id="name" value={self.name ?? ""} onChange={(ev) => set("name", ev.target.value)} maxLength={40} />
            </Field>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("you.sex")}</span>
              <div className="flex flex-wrap gap-2">
                {(["female", "male"] as const).map((s) => (
                  <Chip key={s} active={self.sex === s} onClick={() => set("sex", s)}>{e(`sex.${s}`)}</Chip>
                ))}
              </div>
              <p className="text-xs text-muted">{t("you.sexHint")}</p>
            </div>
            <Field label={t("you.birthDate")} htmlFor="birth">
              <Input id="birth" type="date" value={self.birthDate ?? ""} onChange={(ev) => set("birthDate", ev.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <NumberField id="height" label={t("you.height")} value={self.heightCm} onChange={(v) => set("heightCm", v)} min={100} max={230} suffix="cm" />
              <NumberField id="weight" label={t("you.weight")} value={self.weightKg} onChange={(v) => set("weightKg", v)} min={30} max={300} step={0.1} suffix="kg" />
            </div>
          </>
        )}

        {step === "goal" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOALS.map((g) => (
                <ChoiceCard key={g} active={self.goal === g} onClick={() => set("goal", g)} title={e(`goal.${g}`)} text={t(`goal.hints.${g}`)} />
              ))}
            </div>
            {(self.goal === "lose_weight" || self.goal === "gain_muscle") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField id="target" label={t("goal.target")} value={self.targetWeightKg} onChange={(v) => set("targetWeightKg", v)} min={30} max={300} step={0.5} suffix="kg" />
                <Field label={t("goal.pace")} htmlFor="pace">
                  <Select id="pace" value={self.pace} onChange={(ev) => set("pace", ev.target.value as Self["pace"])}>
                    <option value="gentle">{t("goal.gentle")}</option>
                    <option value="moderate">{t("goal.moderate")}</option>
                  </Select>
                </Field>
              </div>
            )}
            <Field label={t("goal.activity")} htmlFor="activity">
              <Select id="activity" value={self.activity} onChange={(ev) => set("activity", ev.target.value as Self["activity"])}>
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>{e(`activity.${a}`)}</option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {step === "health" && (
          <>
            {self.sex === "female" && (
              <Field label={t("health.pregnancy")} htmlFor="pregnancy">
                <Select id="pregnancy" value={self.pregnancy} onChange={(ev) => set("pregnancy", ev.target.value as Self["pregnancy"])}>
                  {(["none", "pregnant_t1", "pregnant_t2", "pregnant_t3", "breastfeeding"] as const).map((p) => (
                    <option key={p} value={p}>{e(`pregnancy.${p}`)}</option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("health.medical")}</span>
              <div className="flex flex-wrap gap-2">
                {MEDICAL.map((m) => (
                  <Chip key={m} active={self.medical.includes(m)} onClick={() => set("medical", toggle(self.medical, m))}>{e(`medical.${m}`)}</Chip>
                ))}
              </div>
              <p className="text-xs text-muted">{t("health.medicalHint")}</p>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("health.allergies")}</span>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <Chip key={a} active={self.allergies.includes(a)} onClick={() => set("allergies", toggle(self.allergies, a))}>{e(`allergen.${a}`)}</Chip>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-2xl bg-basilic-soft p-4 text-sm">
              <input type="checkbox" checked={consent} onChange={(ev) => setConsent(ev.target.checked)} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span>{t("health.consent")}</span>
            </label>
          </>
        )}

        {step === "food" && (
          <>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("food.diet")}</span>
              <div className="flex flex-wrap gap-2">
                {DIETS.map((d) => (
                  <Chip key={d} active={prefs.diet === d} onClick={() => setPrefs({ ...prefs, diet: d })}>{e(`diet.${d}`)}</Chip>
                ))}
              </div>
              {prefs.diet === "flexitarian" && <p className="text-xs text-muted">{t("food.flexiHint")}</p>}
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("food.veggies")}</span>
              <div className="flex flex-wrap gap-2">
                {VEGGIES.map((v) => (
                  <Chip key={v} active={(prefs.veggies ?? "normal") === v} onClick={() => setPrefs({ ...prefs, veggies: v })}>{t(`food.veggiesOptions.${v}`)}</Chip>
                ))}
              </div>
              {prefs.veggies === "less" && <p className="text-xs text-muted">{t("food.veggiesLessHint")}</p>}
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("food.avoid")}</span>
              <div className="flex flex-wrap gap-2">
                {AVOID.map((a) => (
                  <Chip key={a} active={prefs.avoid.includes(a)} onClick={() => setPrefs({ ...prefs, avoid: toggle(prefs.avoid, a) })}>{e(`avoid.${a}`)}</Chip>
                ))}
              </div>
            </div>
            <DislikePicker value={prefs.dislikedIngredients} onChange={(ids) => setPrefs({ ...prefs, dislikedIngredients: ids })} options={dislikeOptions} />
            <div className="grid grid-cols-2 gap-4">
              <NumberField id="wd" label={t("food.weekday")} value={prefs.maxMinutesWeekday} onChange={(v) => setPrefs({ ...prefs, maxMinutesWeekday: v ?? 30 })} min={10} max={120} step={5} suffix="min" />
              <NumberField id="we" label={t("food.weekend")} value={prefs.maxMinutesWeekend} onChange={(v) => setPrefs({ ...prefs, maxMinutesWeekend: v ?? 60 })} min={10} max={180} step={5} suffix="min" />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("food.equipment")}</span>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT.map((q) => (
                  <Chip key={q} active={prefs.equipment.includes(q)} onClick={() => setPrefs({ ...prefs, equipment: toggle(prefs.equipment, q) })}>{e(`equipment.${q}`)}</Chip>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={prefs.leftovers} onChange={(ev) => setPrefs({ ...prefs, leftovers: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span><strong>{t("food.leftovers")}</strong> — {t("food.leftoversHint")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={prefs.snacks} onChange={(ev) => setPrefs({ ...prefs, snacks: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span><strong>{t("food.snacks")}</strong></span>
            </label>
          </>
        )}

        {step === "household" && (
          <>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">{t("household.selfMeals")}</span>
              <div className="flex flex-wrap gap-2">
                {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
                  <Chip key={m} active={self.eats[m]} onClick={() => set("eats", { ...self.eats, [m]: !self.eats[m] })}>{e(`meal.${m}`)}</Chip>
                ))}
              </div>
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid gap-3 rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{m.name || t("household.member", { n: i + 1 })}</p>
                  <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} aria-label={t("household.remove")} className="text-muted hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("you.name")} htmlFor={`mn${i}`}>
                    <Input id={`mn${i}`} value={m.name} onChange={(ev) => setMembers(members.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
                  </Field>
                  <Field label={t("you.birthDate")} htmlFor={`mb${i}`}>
                    <Input id={`mb${i}`} type="date" value={m.birthDate} onChange={(ev) => setMembers(members.map((x, j) => (j === i ? { ...x, birthDate: ev.target.value } : x)))} />
                  </Field>
                  <Field label={t("you.sex")} htmlFor={`ms${i}`}>
                    <Select id={`ms${i}`} value={m.sex} onChange={(ev) => setMembers(members.map((x, j) => (j === i ? { ...x, sex: ev.target.value as Member["sex"] } : x)))}>
                      <option value="female">{e("sex.female")}</option>
                      <option value="male">{e("sex.male")}</option>
                    </Select>
                  </Field>
                  <Field label={t("goal.activity")} htmlFor={`ma${i}`}>
                    <Select id={`ma${i}`} value={m.activity} onChange={(ev) => setMembers(members.map((x, j) => (j === i ? { ...x, activity: ev.target.value as Member["activity"] } : x)))}>
                      {ACTIVITIES.map((a) => (
                        <option key={a} value={a}>{e(`activity.${a}`)}</option>
                      ))}
                    </Select>
                  </Field>
                  <NumberField id={`mh${i}`} label={t("you.height")} value={m.heightCm} onChange={(v) => setMembers(members.map((x, j) => (j === i ? { ...x, heightCm: v ?? 0 } : x)))} min={50} max={230} suffix="cm" />
                  <NumberField id={`mw${i}`} label={t("you.weight")} value={m.weightKg} onChange={(v) => setMembers(members.map((x, j) => (j === i ? { ...x, weightKg: v ?? 0 } : x)))} min={10} max={300} step={0.1} suffix="kg" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
                    <Chip key={meal} active={m.eats[meal]} onClick={() => setMembers(members.map((x, j) => (j === i ? { ...x, eats: { ...x.eats, [meal]: !x.eats[meal] } } : x)))}>{e(`meal.${meal}`)}</Chip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((a) => (
                    <Chip key={a} active={m.allergies.includes(a)} onClick={() => setMembers(members.map((x, j) => (j === i ? { ...x, allergies: toggle(x.allergies, a) } : x)))}>{e(`allergen.${a}`)}</Chip>
                  ))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setMembers([
                  ...members,
                  { name: "", sex: "female", birthDate: "", heightCm: 0, weightKg: 0, activity: "light", goal: "maintain", allergies: [], eats: { breakfast: true, lunch: false, dinner: true, snack: true } },
                ])
              }
            >
              <Plus className="size-4" /> {t("household.add")}
            </Button>
            <p className="text-xs text-muted">{t("household.premiumNote")}</p>
          </>
        )}

        {step === "budget" && (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={budget.enabled} onChange={(ev) => setBudget({ ...budget, enabled: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span><strong>{t("budget.enable")}</strong> — {t("budget.hint")}</span>
            </label>
            {budget.enabled && (
              <div className="grid gap-3">
                <span className="text-sm font-semibold">{t("budget.amount")}</span>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setBudget({ ...budget, weekly: Math.max(10, budget.weekly - 5) })} aria-label="-5 €"><Minus className="size-4" /></Button>
                  <span className="min-w-28 text-center font-display text-3xl font-extrabold num">{budget.weekly} €</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setBudget({ ...budget, weekly: Math.min(1000, budget.weekly + 5) })} aria-label="+5 €"><Plus className="size-4" /></Button>
                </div>
                <p className="text-xs text-muted">{t("budget.note")}</p>
              </div>
            )}
          </>
        )}

        {step === "sport" && (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={sport.enabled} onChange={(ev) => setSport({ ...sport, enabled: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span><strong>{t("sport.enable")}</strong></span>
            </label>
            {sport.enabled && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                    <ChoiceCard key={l} active={sport.level === l} onClick={() => setSport({ ...sport, level: l })} title={e(`level.${l}`)} text={t(`sport.levelHints.${l}`)} />
                  ))}
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-semibold">{t("sport.days")}</span>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <Chip key={d} active={sport.availableDays.includes(d)} onClick={() => setSport({ ...sport, availableDays: toggle(sport.availableDays, d).sort() })}>{e(`dayShort.${d}`)}</Chip>
                    ))}
                  </div>
                </div>
                <NumberField id="sm" label={t("sport.minutes")} value={sport.minutesPerSession} onChange={(v) => setSport({ ...sport, minutesPerSession: v ?? 30 })} min={10} max={90} step={5} suffix="min" />
                <div className="grid gap-2">
                  <span className="text-sm font-semibold">{t("sport.equipment")}</span>
                  <div className="flex flex-wrap gap-2">
                    {SPORT_EQ.map((q) => (
                      <Chip key={q} active={sport.equipment.includes(q)} onClick={() => setSport({ ...sport, equipment: toggle(sport.equipment, q) })}>{e(`sportEquipment.${q}`)}</Chip>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-semibold">{t("sport.limitations")}</span>
                  <div className="flex flex-wrap gap-2">
                    {LIMITS.map((q) => (
                      <Chip key={q} active={sport.limitations.includes(q)} onClick={() => setSport({ ...sport, limitations: toggle(sport.limitations, q) })}>{e(`limitation.${q}`)}</Chip>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {step === "summary" && (
          <>
            {!preview ? (
              <p className="text-muted">{t("summary.computing")}</p>
            ) : (
              <>
                {preview.safety.notices.map((n) => (
                  <Notice key={n.code} tone={n.level === "blocked" ? "danger" : "miel"} title={e(`safety.${n.code}.title`)}>
                    {e(`safety.${n.code}.text`)}
                  </Notice>
                ))}
                {preview.safety.level !== "blocked" && !preview.safety.numbersHidden && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { k: "kcal", v: preview.targets.kcal, u: "kcal" },
                      { k: "protein", v: preview.targets.protein, u: "g" },
                      { k: "carbs", v: preview.targets.carbs, u: "g" },
                      { k: "fat", v: preview.targets.fat, u: "g" },
                    ].map((x) => (
                      <div key={x.k} className="rounded-2xl bg-surface-2 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{e(`nutrient.${x.k}`)}</p>
                        <p className="font-display text-2xl font-bold num">{format.number(x.v)} <span className="text-sm font-semibold text-muted">{x.u}</span></p>
                      </div>
                    ))}
                  </div>
                )}
                {preview.safety.level !== "blocked" && (
                  <p className="text-sm text-muted">{t("summary.explain", { bmr: preview.targets.bmr, tdee: preview.targets.tdee })}</p>
                )}
              </>
            )}
          </>
        )}

        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </Card>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="ghost" onClick={back} disabled={index === 0 || pending}>{t("back")}</Button>
        {step === "summary" ? (
          <Button type="button" variant="accent" size="lg" onClick={submit} disabled={pending || !preview || preview.safety.level === "blocked"}>
            {pending ? t("creating") : t("create")}
          </Button>
        ) : (
          <Button type="button" onClick={next} disabled={!canNext[step]}>{t("next")}</Button>
        )}
      </div>
    </div>
  );
}
