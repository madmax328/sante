"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pause, Play, SkipForward } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setStepsAction, toggleWorkoutAction } from "@/app/[locale]/app/sport/actions";
import { ExerciseDemo } from "./exercise-demo";
import { Button, Input, cx } from "./ui";

export function DoneToggle({ day, done }: { day: number; done: boolean }) {
  const t = useTranslations("sport");
  const router = useRouter();
  const [value, setValue] = useState(done);
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={value ? "primary" : "secondary"}
      disabled={pending}
      aria-pressed={value}
      onClick={() =>
        start(async () => {
          setValue(!value);
          await toggleWorkoutAction({ day, done: !value });
          router.refresh();
        })
      }
    >
      <Check className="size-4" /> {value ? t("done") : t("markDone")}
    </Button>
  );
}

export function StepsInput({ date, initial }: { date: string; initial?: number }) {
  const t = useTranslations("sport");
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await setStepsAction({ date, steps: Number(value) || 0 });
          setSaved(res.ok);
        });
      }}
    >
      <Input type="number" min={0} max={100000} value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} className="w-32" aria-label={t("stepsToday")} placeholder="6500" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>{saved ? t("saved") : t("save")}</Button>
    </form>
  );
}

export interface GuidedStep {
  name: string;
  amount: number;
  unit: "reps" | "seconds";
  restSec: number;
  round: number;
  rounds: number;
  exerciseId: string;
}

/** Step-by-step session player: timers for timed exercises and rest periods. */
export function GuidedSession({ steps, day }: { steps: GuidedStep[]; day: number }) {
  const t = useTranslations("sport");
  const router = useRouter();
  const [index, setIndex] = useState(-1);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [, start] = useTransition();
  const current = steps[index];

  const next = () => {
    if (current && phase === "work" && current.restSec > 0) {
      setPhase("rest");
      setLeft(current.restSec);
      setRunning(true);
      return;
    }
    const n = index + 1;
    if (n >= steps.length) {
      setFinished(true);
      setRunning(false);
      start(async () => {
        await toggleWorkoutAction({ day, done: true });
        router.refresh();
      });
      return;
    }
    setIndex(n);
    setPhase("work");
    const s = steps[n]!;
    setLeft(s.unit === "seconds" ? s.amount : 0);
    setRunning(s.unit === "seconds");
  };

  // The countdown calls the latest `next` when it reaches zero.
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setTimeout(() => nextRef.current(), 0);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  if (finished) {
    return <div className="rounded-3xl bg-basilic p-6 text-center text-surface"><p className="font-display text-2xl font-bold">{t("bravo")}</p><p className="opacity-90">{t("bravoText")}</p></div>;
  }
  if (index < 0) {
    return <Button size="lg" variant="accent" onClick={() => next()}><Play className="size-5" /> {t("start")}</Button>;
  }
  return (
    <div className={cx("grid gap-4 rounded-3xl p-6 text-center", phase === "rest" ? "bg-eau-soft" : "bg-basilic-soft")} aria-live="polite">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">
        {phase === "rest" ? t("rest") : t("roundOf", { round: current!.round, rounds: current!.rounds })} · {index + 1}/{steps.length}
      </p>
      <p className="font-display text-3xl font-extrabold">{phase === "rest" ? t("breathe") : current!.name}</p>
      {phase === "work" ? (
        <ExerciseDemo key={index} exerciseId={current!.exerciseId} label={t("demo", { name: current!.name })} className="mx-auto max-w-xs bg-surface" />
      ) : (
        steps[index + 1] && <ExerciseDemo key={`next-${index}`} exerciseId={steps[index + 1]!.exerciseId} label={t("demo", { name: steps[index + 1]!.name })} className="mx-auto max-w-[12rem] bg-surface opacity-80" />
      )}
      <p className="font-display text-6xl font-extrabold num">
        {phase === "rest" || current!.unit === "seconds" ? `${left}s` : `× ${current!.amount}`}
      </p>
      <div className="flex justify-center gap-2">
        {(phase === "rest" || current!.unit === "seconds") && (
          <Button variant="secondary" onClick={() => setRunning(!running)}>{running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? t("pause") : t("resume")}</Button>
        )}
        <Button onClick={() => { setRunning(false); setLeft(0); next(); }}><SkipForward className="size-4" /> {phase === "rest" ? t("skipRest") : t("next")}</Button>
      </div>
      {phase === "rest" && steps[index + 1] && <p className="text-sm text-muted">{t("upNext", { name: steps[index + 1]!.name })}</p>}
    </div>
  );
}
