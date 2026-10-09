"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Barcode, BookmarkPlus, Camera, CopyPlus, Loader2, Plus, Search, Star, Trash2 } from "lucide-react";
import type { MealType } from "@weeko/engine";
import { useRouter } from "@/i18n/navigation";
import {
  addFoodAction,
  addSavedMealAction,
  copyMealAction,
  deleteSavedMealAction,
  lookupBarcodeAction,
  quickFoodsAction,
  saveMealAction,
  toggleFavoriteAction,
  type QuickFoods,
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

type Tab = "quick" | "search" | "custom" | "barcode";

export function AddFood({ date, defaultMeal }: { date: string; defaultMeal: MealType }) {
  const t = useTranslations("journal");
  const e = useTranslations("enums");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quick");
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
          {(["quick", "search", "custom", "barcode"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMessage(undefined); }} className={cx("rounded-full px-3 py-1 text-sm font-semibold", tab === k ? "bg-basilic text-surface" : "text-muted")}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "quick" && <QuickAdd date={date} meal={meal} onAdded={() => { setMessage(t("added")); router.refresh(); }} />}

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

/** Favorites, recent foods and saved meals: added in one tap. */
function QuickAdd({ date, meal, onAdded }: { date: string; meal: MealType; onAdded: () => void }) {
  const t = useTranslations("journal.quick");
  const [data, setData] = useState<QuickFoods>();
  const [pending, start] = useTransition();
  const load = () => quickFoodsAction().then(setData, () => setData({ favorites: [], recents: [], meals: [] }));
  useEffect(() => {
    void load();
  }, []);
  if (!data) return <p className="text-sm text-muted"><Loader2 className="inline size-4 animate-spin" /></p>;
  const empty = !data.favorites.length && !data.recents.length && !data.meals.length;
  const add = (entry: QuickFoods["favorites"][number]["entry"]) =>
    start(async () => {
      const res = await addFoodAction({ date, meal, entry });
      if (res.ok) onAdded();
    });
  const star = (entry: QuickFoods["favorites"][number]["entry"]) =>
    start(async () => {
      await toggleFavoriteAction({ entry });
      await load();
    });
  const Row = ({ f }: { f: QuickFoods["favorites"][number] }) => (
    <li className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-riz">
      <button type="button" onClick={() => star(f.entry)} disabled={pending} aria-label={f.favorite ? t("unstar", { name: f.name }) : t("star", { name: f.name })} aria-pressed={f.favorite} className="p-1">
        <Star className={cx("size-4", f.favorite ? "fill-miel text-miel" : "text-muted")} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{f.name}</span>
        <span className="text-xs text-muted num">{f.detail}</span>
      </span>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => add(f.entry)} aria-label={t("addOne", { name: f.name })}><Plus className="size-4" /></Button>
    </li>
  );
  return (
    <div className="grid gap-4">
      {empty && <p className="text-sm text-muted">{t("empty")}</p>}
      {data.meals.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("meals")}</h3>
          <ul className="grid gap-1">
            {data.meals.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-riz">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-muted num">{m.kcal} kcal · {m.names.join(", ")}</span>
                </span>
                <Button size="sm" disabled={pending} onClick={() => start(async () => { const res = await addSavedMealAction({ id: m.id, date, meal }); if (res.ok) onAdded(); })}>
                  <Plus className="size-4" /> {t("addMeal")}
                </Button>
                <button type="button" aria-label={t("deleteMeal", { name: m.name })} disabled={pending} onClick={() => window.confirm(t("deleteConfirm", { name: m.name })) && start(async () => { await deleteSavedMealAction({ id: m.id }); await load(); })} className="p-1 text-muted hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.favorites.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("favorites")}</h3>
          <ul className="grid gap-1">{data.favorites.map((f) => <Row key={f.key} f={f} />)}</ul>
        </section>
      )}
      {data.recents.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("recents")}</h3>
          <ul className="grid max-h-80 gap-1 overflow-y-auto">{data.recents.map((f) => <Row key={f.key} f={f} />)}</ul>
        </section>
      )}
    </div>
  );
}

/** Star on a journal line: adds the food to the favorites. */
export function FavoriteEntry({ date, id, name, initial }: { date: string; id: string; name: string; initial: boolean }) {
  const t = useTranslations("journal.quick");
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? t("unstar", { name }) : t("star", { name })}
      onClick={() => start(async () => { const res = await toggleFavoriteAction({ date, id }); if (res.ok) setOn(!!res.favorite); })}
      className="p-1.5"
    >
      <Star className={cx("size-4", on ? "fill-miel text-miel" : "text-muted")} />
    </button>
  );
}

/** "Copier d'hier" and "Enregistrer ce repas" under each meal of the journal. */
export function MealTools({ date, meal, yesterday, hasEntries }: { date: string; meal: MealType; yesterday: string; hasEntries: boolean }) {
  const t = useTranslations("journal.quick");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string>();
  const copy = () =>
    start(async () => {
      const res = await copyMealAction({ fromDate: yesterday, meal, toDate: date });
      setNote(res.ok && res.added ? t("copied", { n: res.added }) : t("nothingYesterday"));
      router.refresh();
    });
  const save = () => {
    const name = window.prompt(t("savePrompt"));
    if (!name?.trim()) return;
    start(async () => {
      const res = await saveMealAction({ date, meal, name: name.trim() });
      setNote(res.ok ? t("saved", { name: name.trim() }) : t("saveError"));
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
      <button type="button" onClick={copy} disabled={pending} className="inline-flex items-center gap-1 font-semibold text-basilic"><CopyPlus className="size-4" /> {t("copyYesterday")}</button>
      {hasEntries && <button type="button" onClick={save} disabled={pending} className="inline-flex items-center gap-1 font-semibold text-basilic"><BookmarkPlus className="size-4" /> {t("saveMeal")}</button>}
      {note && <span className="w-full text-xs text-muted" role="status">{note}</span>}
    </div>
  );
}
