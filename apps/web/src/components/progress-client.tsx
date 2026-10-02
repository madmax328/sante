"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { addMeasurementAction, deleteMeasurementAction } from "@/app/[locale]/app/progress/actions";
import { Button, Field, Input } from "./ui";

export function MeasurementForm({ today }: { today: string }) {
  const t = useTranslations("progress");
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  const [waist, setWaist] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addMeasurementAction({ date, kg: kg ? Number(kg) : undefined, waistCm: waist ? Number(waist) : undefined });
          setError(!res.ok);
          if (res.ok) {
            setKg("");
            setWaist("");
            router.refresh();
          }
        });
      }}
    >
      <Field label={t("date")} htmlFor="m-date"><Input id="m-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={t("weight")} htmlFor="m-kg"><Input id="m-kg" type="number" step="0.1" min={25} max={350} value={kg} onChange={(e) => setKg(e.target.value)} className="w-28" /></Field>
      <Field label={t("waist")} htmlFor="m-w"><Input id="m-w" type="number" step="0.5" min={40} max={250} value={waist} onChange={(e) => setWaist(e.target.value)} className="w-28" /></Field>
      <Button type="submit" disabled={pending}><Plus className="size-4" /> {t("add")}</Button>
      {error && <p className="w-full text-sm text-danger">{t("invalid")}</p>}
    </form>
  );
}

export function DeleteMeasurement({ date }: { date: string }) {
  const t = useTranslations("progress");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} aria-label={t("delete")} onClick={() => start(async () => { await deleteMeasurementAction(date); router.refresh(); })}>
      <Trash2 className="size-4" />
    </Button>
  );
}
