"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Barcode, Camera, Loader2, Plus, Search, Trash2 } from "lucide-react";
import type { MealType } from "@weeko/engine";
import { useRouter } from "@/i18n/navigation";
import {
  addFoodAction,
  lookupBarcodeAction,
  removeFoodAction,
  searchFoodsAction,
  type BarcodeProduct,
  type FoodHit,
} from "@/app/[locale]/app/journal/actions";
import { Button, Input, Select, cx } from "./ui";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function RemoveEntry({ date, id }: { date: string; id: string }) {
  const t = useTranslations("journal");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      aria-label={t("remove")}
      onClick={() =>
        start(async () => {
          await removeFoodAction({ date, id });
          router.refresh();
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

type Tab = "search" | "custom" | "barcode";

export function AddFood({ date, defaultMeal }: { date: string; defaultMeal: MealType }) {
  const t = useTranslations("journal");
  const e = useTranslations("enums");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("search");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [picked, setPicked] = useState<FoodHit>();
  const [amount, setAmount] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<BarcodeProduct | null>();
  const [grams, setGrams] = useState("100");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (tab !== "search" || query.trim().length < 2) return;
    const id = setTimeout(() => {
      searchFoodsAction(query).then(setHits);
    }, 250);
    return () => clearTimeout(id);
  }, [query, tab]);

  const done = () => {
    setMessage(t("added"));
    setPicked(undefined);
    setQuery("");
    setAmount("");
    setCustom({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
    setProduct(undefined);
    setCode("");
    router.refresh();
  };

  const submitPicked = () =>
    start(async () => {
      if (!picked) return;
      const value = Number(amount) || (picked.kind === "recipe" ? 1 : picked.unit === "pc" ? 1 : 100);
      const res = await addFoodAction({ date, meal, entry: picked.kind === "recipe" ? { kind: "recipe", id: picked.id, amount: value } : { kind: "ingredient", id: picked.id, amount: value } });
      if (res.ok) done();
    });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={meal} onChange={(ev) => setMeal(ev.target.value as MealType)} className="w-44" aria-label={t("meal")}>
          {MEALS.map((m) => <option key={m} value={m}>{e(`meal.${m}`)}</option>)}
        </Select>
        <div className="flex rounded-full border border-line bg-surface p-1" role="tablist">
          {(["search", "custom", "barcode"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMessage(undefined); }} className={cx("rounded-full px-3 py-1 text-sm font-semibold", tab === k ? "bg-basilic text-surface" : "text-muted")}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "search" && (
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(ev) => { setQuery(ev.target.value); setPicked(undefined); }} placeholder={t("searchPlaceholder")} className="pl-9" aria-label={t("searchPlaceholder")} />
          </div>
          {!picked && query.trim().length >= 2 && hits.length > 0 && (
            <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-2xl border border-line p-1">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <button type="button" onClick={() => { setPicked(h); setAmount(h.kind === "recipe" ? "1" : h.unit === "pc" ? "1" : "100"); }} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-riz">
                    <span className="min-w-0 truncate">{h.name}</span>
                    <span className="shrink-0 text-xs text-muted num">{h.kcal} kcal / {h.kind === "recipe" ? t("perServing") : h.unit === "pc" ? `100 g` : "100 g"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(ev) => { ev.preventDefault(); submitPicked(); }}>
              <p className="w-full font-semibold">{picked.name}</p>
              <label className="grid gap-1 text-sm">
                {picked.kind === "recipe" ? t("servings") : picked.unit === "pc" ? t("pieces") : picked.unit === "ml" ? "ml" : t("grams")}
                <Input type="number" min={0.1} step="any" value={amount} onChange={(ev) => setAmount(ev.target.value)} className="w-28" />
              </label>
              <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t("add")}</Button>
              <Button type="button" variant="ghost" onClick={() => setPicked(undefined)}>{t("cancel")}</Button>
            </form>
          )}
        </div>
      )}

      {tab === "custom" && (
        <form
          className="grid gap-2 sm:grid-cols-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            start(async () => {
              const res = await addFoodAction({
                date,
                meal,
                entry: { kind: "custom", name: custom.name, kcal: Number(custom.kcal) || 0, protein: Number(custom.protein) || 0, carbs: Number(custom.carbs) || 0, fat: Number(custom.fat) || 0 },
              });
              if (res.ok) done();
            });
          }}
        >
          <Input className="sm:col-span-2" required value={custom.name} onChange={(ev) => setCustom({ ...custom, name: ev.target.value })} placeholder={t("customName")} aria-label={t("customName")} />
          <Input type="number" min={0} required value={custom.kcal} onChange={(ev) => setCustom({ ...custom, kcal: ev.target.value })} placeholder="kcal" aria-label="kcal" />
          <Input type="number" min={0} value={custom.protein} onChange={(ev) => setCustom({ ...custom, protein: ev.target.value })} placeholder={t("proteinShort")} aria-label={t("proteinShort")} />
          <Input type="number" min={0} value={custom.carbs} onChange={(ev) => setCustom({ ...custom, carbs: ev.target.value })} placeholder={t("carbsShort")} aria-label={t("carbsShort")} />
          <Input type="number" min={0} value={custom.fat} onChange={(ev) => setCustom({ ...custom, fat: ev.target.value })} placeholder={t("fatShort")} aria-label={t("fatShort")} />
          <Button type="submit" disabled={pending} className="sm:col-span-6 sm:justify-self-start"><Plus className="size-4" /> {t("add")}</Button>
        </form>
      )}

      {tab === "barcode" && (
        <div className="grid gap-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              start(async () => setProduct(await lookupBarcodeAction(code.trim())));
            }}
          >
            <Input inputMode="numeric" pattern="\d{8,14}" value={code} onChange={(ev) => setCode(ev.target.value)} placeholder={t("barcodePlaceholder")} aria-label={t("barcodePlaceholder")} className="w-56" />
            <Button type="submit" variant="secondary" disabled={pending}><Barcode className="size-4" /> {t("lookup")}</Button>
            <CameraScan onCode={(c) => { setCode(c); start(async () => setProduct(await lookupBarcodeAction(c))); }} />
          </form>
          {product === null && <p className="text-sm text-muted">{t("notFound")}</p>}
          {product && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                start(async () => {
                  const res = await addFoodAction({ date, meal, entry: { kind: "barcode", code: product.code, name: product.brand ? `${product.name} (${product.brand})` : product.name, grams: Number(grams) || 100, per100: product.per100 } });
                  if (res.ok) done();
                });
              }}
            >
              <p className="w-full">
                <strong>{product.name}</strong> {product.brand && <span className="text-muted">· {product.brand}</span>} <span className="text-sm text-muted num">· {product.per100.kcal} kcal / 100 g</span>
                {product.nutriscore && ["a", "b", "c", "d", "e"].includes(product.nutriscore) && <span className="ml-2 rounded bg-riz px-1.5 text-xs font-bold uppercase">Nutri-Score {product.nutriscore}</span>}
              </p>
              <label className="grid gap-1 text-sm">
                {t("grams")}
                <Input type="number" min={1} value={grams} onChange={(ev) => setGrams(ev.target.value)} className="w-28" />
              </label>
              <Button type="submit" disabled={pending}><Plus className="size-4" /> {t("add")}</Button>
            </form>
          )}
          <p className="text-xs text-muted">{t("offCredit")}</p>
        </div>
      )}
      {message && <p className="text-sm font-semibold text-basilic" role="status">{message}</p>}
    </div>
  );
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

/** Uses the browser's BarcodeDetector when available (Chrome on Android, Safari 17+). */
function CameraScan({ onCode }: { onCode: (code: string) => void }) {
  const t = useTranslations("journal");
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  // Rendered only after the user opens the barcode tab, so this runs in the browser.
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | undefined;
    let stop = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) {
            onCode(codes[0].rawValue);
            setActive(false);
            break;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        setActive(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [active, onCode]);

  if (!supported) return null;
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setActive(!active)}><Camera className="size-4" /> {active ? t("stopCamera") : t("scan")}</Button>
      {active && <video ref={video} className="mt-2 w-full max-w-sm rounded-2xl" muted playsInline />}
    </>
  );
}
