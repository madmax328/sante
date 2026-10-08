import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, Field, Notice, Screen, Segmented, T } from "@/components/ui";
import { api } from "@/lib/api";
import { MEAL_ORDER, num, type Meal } from "@/lib/format";
import { radius, space, useColors } from "@/lib/theme";

interface FoodHit {
  kind: "recipe" | "ingredient";
  id: string;
  name: string;
  /** kcal per 100 g for ingredients, per serving for recipes */
  kcal: number;
  unit: "g" | "ml" | "pc" | "serving";
  pieceWeight?: number;
}

interface Product {
  code: string;
  name: string;
  brand?: string;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  nutriscore?: string;
}

type Tab = "search" | "barcode" | "custom";

const MEAL_SHORT: Record<Meal, string> = { breakfast: "Matin", lunch: "Midi", snack: "Goûter", dinner: "Soir" };

/** Parses "1,5" as well as "1.5". */
const parse = (s: string) => Number(s.replace(",", "."));

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date: string; meal?: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "barcode" ? "barcode" : "search");
  const [meal, setMeal] = useState<Meal>(MEAL_ORDER.includes(params.meal as Meal) ? (params.meal as Meal) : "lunch");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const add = async (entry: unknown) => {
    setBusy(true);
    setError(undefined);
    const res = await api.action<{ ok: boolean }>("addFood", { date: params.date, meal, entry }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("L'ajout a échoué. Vérifie la quantité et réessaie.");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen padTop={false}>
      <Segmented options={MEAL_ORDER.map((m) => ({ key: m, label: MEAL_SHORT[m] }))} value={meal} onChange={setMeal} />
      <Segmented<Tab>
        options={[
          { key: "search", label: "Rechercher" },
          { key: "barcode", label: "Scanner" },
          { key: "custom", label: "Manuel" },
        ]}
        value={tab}
        onChange={(k) => {
          setTab(k);
          setError(undefined);
        }}
      />
      {error && <Notice tone="danger">{error}</Notice>}
      {tab === "search" && <SearchFood busy={busy} onAdd={add} />}
      {tab === "barcode" && <ScanFood busy={busy} onAdd={add} />}
      {tab === "custom" && <CustomFood busy={busy} onAdd={add} />}
    </Screen>
  );
}

function SearchFood({ busy, onAdd }: { busy: boolean; onAdd: (entry: unknown) => void }) {
  const c = useColors();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [picked, setPicked] = useState<FoodHit>();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) return setHits([]);
    let live = true;
    const id = setTimeout(() => {
      api.action<FoodHit[]>("searchFoods", { query }).then((h) => live && setHits(h ?? []), () => undefined);
    }, 250);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query]);

  if (picked) {
    const value = parse(amount) || 0;
    const unit = picked.kind === "recipe" ? "part(s)" : picked.unit === "pc" ? "pièce(s)" : picked.unit === "ml" ? "ml" : "g";
    const grams = picked.kind === "ingredient" && picked.unit === "pc" ? value * (picked.pieceWeight ?? 100) : value;
    const kcal = picked.kind === "recipe" ? picked.kcal * value : (picked.kcal * grams) / 100;
    return (
      <Card>
        <T variant="h2">{picked.name}</T>
        <Field label={`Quantité (${unit})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus selectTextOnFocus />
        {value > 0 && <T variant="small">≈ {num(kcal)} kcal</T>}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button variant="ghost" onPress={() => setPicked(undefined)}>Retour</Button>
          <Button
            style={{ flex: 1 }}
            loading={busy}
            disabled={value <= 0}
            onPress={() => onAdd(picked.kind === "recipe" ? { kind: "recipe", id: picked.id, amount: value } : { kind: "ingredient", id: picked.id, amount: value })}
          >
            Ajouter
          </Button>
        </View>
      </Card>
    );
  }

  return (
    <>
      <View>
        <Field label="Aliment ou recette" value={query} onChangeText={setQuery} placeholder="ex. pomme, poulet, lasagnes…" autoFocus autoCorrect={false} returnKeyType="search" style={{ paddingLeft: 40 }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 12, bottom: 14 }}>
          <Search size={18} color={c.muted} />
        </View>
      </View>
      {query.trim().length >= 2 && hits.length === 0 && <T variant="small">Aucun résultat. Essaie un autre mot, ou ajoute-le en manuel.</T>}
      {hits.length > 0 && (
        <Card style={{ padding: space.sm, gap: 0 }}>
          {hits.map((h, i) => (
            <Pressable
              key={`${h.kind}-${h.id}`}
              accessibilityRole="button"
              onPress={() => {
                setPicked(h);
                setAmount(h.kind === "recipe" || h.unit === "pc" ? "1" : "100");
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 12, paddingHorizontal: space.sm, borderRadius: radius.sm, backgroundColor: pressed ? c.riz : "transparent", borderTopWidth: i ? 1 : 0, borderTopColor: c.line })}
            >
              <T numberOfLines={2} style={{ flex: 1 }}>{h.name}</T>
              <T variant="small">{num(h.kcal)} kcal / {h.kind === "recipe" ? "part" : "100 g"}</T>
            </Pressable>
          ))}
        </Card>
      )}
    </>
  );
}

function ScanFood({ busy, onAdd }: { busy: boolean; onAdd: (entry: unknown) => void }) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [product, setProduct] = useState<Product | null>();
  const [looking, setLooking] = useState(false);
  const [code, setCode] = useState("");
  const [grams, setGrams] = useState("100");
  const lastCode = useRef<string>(undefined);

  const lookup = async (value: string) => {
    if (!/^\d{8,14}$/.test(value) || looking) return;
    lastCode.current = value;
    setCode(value);
    setLooking(true);
    void Haptics.selectionAsync();
    const p = await api.action<Product | null>("lookupBarcode", { code: value }).catch(() => null);
    setLooking(false);
    setProduct(p);
  };

  if (product) {
    const g = parse(grams) || 0;
    return (
      <Card>
        <T variant="h2">{product.name}</T>
        {product.brand && <T variant="small">{product.brand}</T>}
        <T variant="small">{num(product.per100.kcal)} kcal / 100 g{product.nutriscore && "abcde".includes(product.nutriscore) ? ` · Nutri-Score ${product.nutriscore.toUpperCase()}` : ""}</T>
        <Field label="Quantité (g)" value={grams} onChangeText={setGrams} keyboardType="number-pad" selectTextOnFocus />
        {g > 0 && <T variant="small">≈ {num((product.per100.kcal * g) / 100)} kcal</T>}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button variant="ghost" onPress={() => { setProduct(undefined); lastCode.current = undefined; }}>Scanner un autre</Button>
          <Button
            style={{ flex: 1 }}
            loading={busy}
            disabled={g <= 0}
            onPress={() => onAdd({ kind: "barcode", code: product.code, name: product.brand ? `${product.name} (${product.brand})` : product.name, grams: g, per100: product.per100 })}
          >
            Ajouter
          </Button>
        </View>
        <T variant="small">Données Open Food Facts (base collaborative) : vérifie l'étiquette en cas de doute.</T>
      </Card>
    );
  }

  return (
    <>
      {!permission ? null : permission.granted ? (
        <View style={{ borderRadius: radius.lg, overflow: "hidden", aspectRatio: 1, backgroundColor: "#000" }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={looking ? undefined : (r) => r.data !== lastCode.current && void lookup(r.data)}
          />
          <View pointerEvents="none" style={{ position: "absolute", left: "12%", right: "12%", top: "38%", bottom: "38%", borderWidth: 3, borderColor: c.abricot, borderRadius: radius.md }} />
        </View>
      ) : (
        <Card>
          <T>Autorise l'appareil photo pour scanner le code-barres d'un produit.</T>
          <Button onPress={requestPermission}>Autoriser l'appareil photo</Button>
          {!permission.canAskAgain && <T variant="small">L'accès a été refusé : active-le dans Réglages → Sorloo → Appareil photo.</T>}
        </Card>
      )}
      {looking && <T variant="small">Recherche du produit…</T>}
      {product === null && !looking && <Notice>Produit introuvable ({code}). Essaie la recherche ou l'ajout manuel.</Notice>}
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field label="Ou tape le code-barres" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={14} />
        </View>
        <Button variant="secondary" loading={looking} disabled={!/^\d{8,14}$/.test(code)} onPress={() => lookup(code)}>Chercher</Button>
      </View>
    </>
  );
}

function CustomFood({ busy, onAdd }: { busy: boolean; onAdd: (entry: unknown) => void }) {
  const [f, setF] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Card>
      <Field label="Nom" value={f.name} onChangeText={set("name")} placeholder="ex. sandwich de la boulangerie" />
      <Field label="Calories (kcal)" value={f.kcal} onChangeText={set("kcal")} keyboardType="number-pad" />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}><Field label="Protéines (g)" value={f.protein} onChangeText={set("protein")} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Glucides (g)" value={f.carbs} onChangeText={set("carbs")} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Lipides (g)" value={f.fat} onChangeText={set("fat")} keyboardType="number-pad" /></View>
      </View>
      <Button
        loading={busy}
        disabled={!f.name.trim() || !(parse(f.kcal) >= 0) || f.kcal === ""}
        onPress={() => onAdd({ kind: "custom", name: f.name.trim(), kcal: parse(f.kcal) || 0, protein: parse(f.protein) || 0, carbs: parse(f.carbs) || 0, fat: parse(f.fat) || 0 })}
      >
        Ajouter
      </Button>
    </Card>
  );
}
