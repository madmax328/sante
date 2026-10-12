"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import type { MealType } from "@weeko/engine";
import { addPhotoFoodsAction, analyzeMealPhotoAction } from "@/app/[locale]/app/journal/actions";
import type { PhotoFood } from "@/lib/meal-photo";
import { Link } from "@/i18n/navigation";
import { Button, Input } from "./ui";

/** Shrinks the photo in the browser (longest side 1280 px, JPEG) before sending it. */
async function shrink(file: File, maxSide = 1280): Promise<{ base64: string; url: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.72);
  return { base64: url.slice(url.indexOf(",") + 1), url };
}

type Row = PhotoFood & { text: string };

export function MealPhoto({ date, meal, premium, onAdded }: { date: string; meal: MealType; premium: boolean; onAdded: () => void }) {
  const t = useTranslations("journal.photo");
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [rows, setRows] = useState<Row[]>();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, start] = useTransition();

  if (!premium) {
    return (
      <div className="grid gap-2 rounded-2xl bg-basilic-soft p-4">
        <p className="font-semibold">{t("premiumTitle")}</p>
        <p className="text-sm text-muted">{t("premiumText")}</p>
        <Link href="/app/account" className="text-sm font-semibold text-basilic">{t("premiumLink")} →</Link>
      </div>
    );
  }

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setRows(undefined);
    setAnalyzing(true);
    try {
      const { base64, url } = await shrink(file);
      setPreview(url);
      const res = await analyzeMealPhotoAction({ image: base64, mediaType: "image/jpeg" });
      if (!res.ok) setError(t(`errors.${res.error}`));
      else {
        setRows(res.foods.map((f) => ({ ...f, text: String(f.grams) })));
        setNote(res.note);
      }
    } catch {
      setError(t("errors.invalid"));
    }
    setAnalyzing(false);
    if (input.current) input.current.value = "";
  };

  const grams = (r: Row) => Math.round(Number(r.text.replace(",", ".")));
  const valid = (rows ?? []).filter((r) => grams(r) >= 1 && grams(r) <= 2000);
  const kcal = (r: Row) => Math.round((r.per100.kcal * grams(r)) / 100);
  const total = valid.reduce((s, r) => s + kcal(r), 0);

  const add = () =>
    start(async () => {
      const res = await addPhotoFoodsAction({ date, meal, foods: valid.map((r) => ({ name: r.name, ingredientId: r.ingredientId, per100: r.per100, grams: grams(r) })) });
      if (!res.ok) return setError(t("errors.add"));
      setRows(undefined);
      setPreview(undefined);
      onAdded();
    });

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">{t("intro")}</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div>
        <Button type="button" variant={rows ? "secondary" : "primary"} disabled={analyzing} onClick={() => input.current?.click()}>
          {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} {analyzing ? t("analyzing") : preview ? t("retake") : t("choose")}
        </Button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview (data URL) */}
      {preview && <img src={preview} alt={t("photoAlt")} className="max-h-72 w-full max-w-md rounded-2xl object-cover" />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {rows && (
        <div className="grid gap-2">
          <p className="font-semibold">{t("check")}</p>
          <ul className="grid gap-2">
            {rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.name}</span>
                  <span className="text-xs text-muted num">
                    {kcal(r)} kcal{r.confidence === "low" && <> · <span className="font-semibold text-miel">{t("toCheck")}</span></>}
                  </span>
                </span>
                <span className="w-24">
                  <Input type="number" min={1} max={2000} value={r.text} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} aria-label={t("gramsOf", { name: r.name })} className="w-24 text-right" />
                </span>
                <span className="text-sm text-muted">g</span>
                <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t("remove", { name: r.name })} className="p-1 text-muted hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {note && <p className="text-sm text-muted">{note}</p>}
          <p className="text-xs text-muted">{t("estimates")}</p>
          <div>
            <Button type="button" disabled={pending || !valid.length} onClick={add}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t("addAll", { n: valid.length, kcal: total })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
