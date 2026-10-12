"use client";

import { useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Camera, Loader2, Lock, Trash2, X } from "lucide-react";
import { addProgressPhotoAction, deleteProgressPhotoAction } from "@/app/[locale]/app/progress/actions";
import type { ProgressPhoto } from "@/lib/progress-photos";
import { useRouter } from "@/i18n/navigation";
import { Button } from "./ui";

/** JPEG copy of the photo, longest side `side`. */
async function jpeg(bitmap: ImageBitmap, side: number, quality: number): Promise<{ base64: string; width: number; height: number }> {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", quality);
  return { base64: url.slice(url.indexOf(",") + 1), width: canvas.width, height: canvas.height };
}

const src = (p: ProgressPhoto, size: "thumb" | "full") => `/api/progress-photos/${p.id}?size=${size}`;

export function ProgressPhotos({ photos, today }: { photos: ProgressPhoto[]; today: string }) {
  const t = useTranslations("progress.photos");
  const format = useFormatter();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<ProgressPhoto | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00`), { day: "numeric", month: "long", year: "numeric" });

  const pick = (file: File | undefined) =>
    start(async () => {
      if (!file) return;
      setError(undefined);
      try {
        const bitmap = await createImageBitmap(file);
        const [full, thumb] = await Promise.all([jpeg(bitmap, 1080, 0.75), jpeg(bitmap, 360, 0.7)]);
        const res = await addProgressPhotoAction({ date: today, full: full.base64, thumb: thumb.base64, width: full.width, height: full.height });
        if (!res.ok) setError(t(res.error === "limit" ? "limit" : "error"));
        else router.refresh();
      } catch {
        setError(t("error"));
      }
      if (input.current) input.current.value = "";
    });

  const remove = (p: ProgressPhoto) =>
    window.confirm(t("deleteConfirm", { date: date(p.date) })) &&
    start(async () => {
      setOpen(null);
      await deleteProgressPhotoAction({ id: p.id });
      router.refresh();
    });

  const first = photos[photos.length - 1];
  const last = photos[0];

  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 text-sm text-muted"><Lock className="mt-0.5 size-4 shrink-0" /> {t("privacy")}</p>
      {photos.length >= 2 && first && last && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          {[
            [first, t("before")],
            [last, t("now")],
          ].map(([p, label]) => (
            <button key={(p as ProgressPhoto).id} type="button" onClick={() => setOpen(p as ProgressPhoto)} className="grid gap-1 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the app */}
              <img src={src(p as ProgressPhoto, "thumb")} alt={t("alt", { date: date((p as ProgressPhoto).date) })} className="aspect-[3/4] w-full rounded-2xl bg-riz object-cover" />
              <span className="text-center text-xs text-muted">{label as string} · {date((p as ProgressPhoto).date)}</span>
            </button>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {photos.slice(0, 48).map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className="block w-full" aria-label={t("alt", { date: date(p.date) })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the app */}
                <img src={src(p, "thumb")} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-xl bg-riz object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} {t("add")}
        </Button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("alt", { date: date(open.date) })} className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-black/95 p-4" onClick={() => setOpen(null)}>
          <div className="flex items-center gap-4 text-white" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(null)} aria-label={t("close")} className="p-1"><X className="size-6" /></button>
            <span className="flex-1 text-center font-semibold">{date(open.date)}</span>
            <button type="button" onClick={() => remove(open)} aria-label={t("delete")} className="p-1"><Trash2 className="size-5" /></button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- private image served by the app */}
          <img src={src(open, "full")} alt={t("alt", { date: date(open.date) })} className="m-auto max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
