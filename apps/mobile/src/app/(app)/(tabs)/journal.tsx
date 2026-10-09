import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BookmarkPlus, ChevronLeft, ChevronRight, CopyPlus, Droplet, Minus, Plus, ScanBarcode, Star, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { Badge, Button, Card, ErrorView, Loading, ProgressBar, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { addDays, longDate, MEAL_LABEL, MEAL_ORDER, num } from "@/lib/format";
import { space, useColors } from "@/lib/theme";

interface Entry {
  id: string;
  kind: "planned" | "recipe" | "ingredient" | "custom" | "barcode";
  name: string;
  amount: number;
  kcal: number | null;
  protein: number | null;
  favorite?: boolean;
}

interface Journal {
  date: string;
  yesterday: string;
  today: string;
  hidden: boolean;
  defaultMeal: string;
  totals: { kcal: number; protein: number; carbs: number; fat: number } | null;
  targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  meals: { meal: string; entries: Entry[] }[];
  water: { ml: number; target: number };
}

const NUTRIENTS = [
  ["kcal", "Calories", "kcal", "basilic"],
  ["protein", "Protéines", "g", "eau"],
  ["carbs", "Glucides", "g", "miel"],
  ["fat", "Lipides", "g", "abricot"],
] as const;

function amountLabel(e: Entry): string {
  if (e.kind === "ingredient" || e.kind === "barcode") return `${num(e.amount)} g · `;
  if (e.kind === "recipe") return `${num(e.amount, 2)} part${e.amount > 1 ? "s" : ""} · `;
  return "";
}

export default function JournalScreen() {
  const c = useColors();
  const [date, setDate] = useState<string>();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<Journal>(date ? `/journal?date=${date}` : "/journal");

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const isToday = data.date === data.today;
  const add = (meal: string, scan = false) => router.push({ pathname: "/add-food", params: { date: data.date, meal, ...(scan ? { tab: "barcode" } : {}) } });
  const remove = (e: Entry) =>
    Alert.alert("Retirer cet aliment ?", e.name, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          void Haptics.selectionAsync();
          setData({ ...data, meals: data.meals.map((m) => ({ ...m, entries: m.entries.filter((x) => x.id !== e.id) })) });
          await api.action("removeFood", { date: data.date, id: e.id }).catch(() => undefined);
          await reload();
        },
      },
    ]);
  const water = async (ml: number) => {
    void Haptics.selectionAsync();
    setData({ ...data, water: { ...data.water, ml: Math.max(0, data.water.ml + ml) } });
    await api.action("addWater", { ml, date: data.date }).catch(() => undefined);
  };
  const star = async (e: Entry) => {
    void Haptics.selectionAsync();
    setData({ ...data, meals: data.meals.map((m) => ({ ...m, entries: m.entries.map((x) => (x.id === e.id ? { ...x, favorite: !x.favorite } : x)) })) });
    await api.action("toggleFavorite", { date: data.date, id: e.id }).catch(() => undefined);
  };
  const copyYesterday = async (meal: string) => {
    const res = await api.action<{ ok: boolean; added?: number }>("copyMeal", { fromDate: data.yesterday, meal, toDate: data.date }).catch(() => null);
    if (res?.ok && !res.added) Alert.alert("Rien à copier", "Ce repas était vide hier.");
    await reload();
  };
  const saveMeal = (meal: string) => {
    const save = async (name: string) => {
      if (!name.trim()) return;
      const res = await api.action<{ ok: boolean }>("saveMeal", { date: data.date, meal, name: name.trim() }).catch(() => null);
      Alert.alert(res?.ok ? "Repas enregistré" : "Enregistrement impossible", res?.ok ? `Retrouve « ${name.trim()} » dans l'onglet Favoris quand tu ajoutes un aliment.` : "50 repas enregistrés au maximum.");
    };
    if (Platform.OS === "ios") Alert.prompt("Enregistrer ce repas", "Donne-lui un nom (ex. Mon petit-déjeuner habituel).", (name) => void save(name ?? ""), "plain-text", MEAL_LABEL[meal]);
    else void save(`${MEAL_LABEL[meal]} du ${longDate(data.date)}`);
  };
  const meals = [...data.meals].sort((a, b) => MEAL_ORDER.indexOf(a.meal as never) - MEAL_ORDER.indexOf(b.meal as never));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <T variant="title">Journal</T>
          <T variant="small">{isToday ? "Aujourd'hui" : longDate(data.date)}</T>
        </View>
        <Pressable accessibilityLabel="Jour précédent" hitSlop={8} onPress={() => setDate(addDays(data.date, -1))} style={{ padding: 8 }}><ChevronLeft color={c.encre} /></Pressable>
        <Pressable accessibilityLabel="Jour suivant" hitSlop={8} disabled={isToday} onPress={() => setDate(addDays(data.date, 1))} style={{ padding: 8, opacity: isToday ? 0.3 : 1 }}><ChevronRight color={c.encre} /></Pressable>
      </View>

      {data.totals && data.targets && (
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.md, columnGap: space.lg }}>
            {NUTRIENTS.map(([k, label, unit, tone]) => (
              <View key={k} style={{ width: "46%", gap: 4 }}>
                <T variant="label">{label}</T>
                <T variant="h3">{num(data.totals![k])} <T variant="small">/ {num(data.targets![k])} {unit}</T></T>
                <ProgressBar value={data.totals![k]} max={data.targets![k]} tone={tone} />
              </View>
            ))}
          </View>
        </Card>
      )}

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button variant="accent" style={{ flex: 1 }} icon={<Plus size={18} color={c.onAbricot} />} onPress={() => add(data.defaultMeal)}>Ajouter un aliment</Button>
        <Button variant="secondary" icon={<ScanBarcode size={18} color={c.encre} />} onPress={() => add(data.defaultMeal, true)} accessibilityLabel="Scanner un code-barres" />
      </View>

      {meals.map((m) => {
        const sum = m.entries.reduce((s, x) => s + (x.kcal ?? 0), 0);
        return (
          <Card key={m.meal}>
            <SectionTitle action={!data.hidden ? <T variant="small">{num(sum)} kcal</T> : undefined}>{MEAL_LABEL[m.meal]}</SectionTitle>
            {m.entries.length === 0 && <T variant="small">Rien pour l'instant.</T>}
            {m.entries.map((e) => (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T numberOfLines={2} style={{ fontWeight: "600" }}>{e.name}</T>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {e.kind === "planned" && <Badge>Du menu</Badge>}
                    <T variant="small">{amountLabel(e)}{e.kcal !== null ? `${num(e.kcal)} kcal · ${num(e.protein ?? 0)} g prot.` : ""}</T>
                  </View>
                </View>
                {e.kind !== "planned" && (
                  <Pressable accessibilityRole="button" accessibilityLabel={e.favorite ? `Retirer ${e.name} des favoris` : `Ajouter ${e.name} aux favoris`} hitSlop={8} onPress={() => star(e)} style={{ padding: 6 }}>
                    <Star size={18} color={e.favorite ? c.miel : c.muted} fill={e.favorite ? c.miel : "transparent"} />
                  </Pressable>
                )}
                <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${e.name}`} hitSlop={8} onPress={() => remove(e)} style={{ padding: 6 }}>
                  <X size={18} color={c.muted} />
                </Pressable>
              </View>
            ))}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.lg }}>
              <Pressable onPress={() => add(m.meal)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityRole="button">
                <Plus size={16} color={c.basilic} />
                <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Ajouter</T>
              </Pressable>
              <Pressable onPress={() => copyYesterday(m.meal)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityRole="button">
                <CopyPlus size={16} color={c.basilic} />
                <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Copier d'hier</T>
              </Pressable>
              {m.entries.length > 0 && (
                <Pressable onPress={() => saveMeal(m.meal)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessibilityRole="button">
                  <BookmarkPlus size={16} color={c.basilic} />
                  <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Enregistrer</T>
                </Pressable>
              )}
            </View>
          </Card>
        );
      })}

      <Card>
        <SectionTitle>Eau</SectionTitle>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Droplet size={18} color={c.eau} />
            <T variant="h3">{num(data.water.ml / 1000, 2)} L</T>
            <T variant="small">/ {num(data.water.target / 1000, 1)} L</T>
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button small variant="secondary" onPress={() => water(-250)} disabled={data.water.ml <= 0} icon={<Minus size={16} color={c.encre} />} accessibilityLabel="Retirer un verre" />
            <Button small variant="secondary" onPress={() => water(250)} icon={<Plus size={16} color={c.encre} />}>Un verre</Button>
          </View>
        </View>
        <ProgressBar value={data.water.ml} max={data.water.target} tone="eau" />
      </Card>
    </Screen>
  );
}
