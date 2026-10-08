import { router } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { Button, Card, Chip, ErrorView, Field, Loading, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { L } from "@/lib/labels";
import { useMe } from "@/lib/me";
import { radius, space, useColors } from "@/lib/theme";

interface Prefs {
  diet: keyof typeof L.diet;
  veggies?: "less" | "normal" | "more";
  avoid: string[];
  maxMinutesWeekday: number;
  maxMinutesWeekend: number;
  equipment: string[];
  leftovers: boolean;
  snacks: boolean;
  dislikedIngredients?: string[];
}

interface Body {
  weightKg: number;
  heightCm: number;
  goal: keyof typeof L.goal;
  activity: keyof typeof L.activity;
  targetWeightKg: number | null;
  pace: "gentle" | "moderate";
}

interface Preferences {
  prefs: Prefs;
  dislikeOptions: { groups: { id: string; label: string; ingredients: string[] }[]; ingredients: { id: string; label: string }[] };
  budget: { allowed: boolean; enabled: boolean; weekly: number };
  body: Body | null;
}

const AVOID: Record<string, string> = { ...L.avoid, dairy: "Produits laitiers", egg: "Œufs", gluten: "Gluten" };
const VEGGIES = { more: "J'adore", normal: "Normal", less: "Pas trop" } as const;
const WEEKDAY = [15, 20, 30, 45, 60];
const WEEKEND = [20, 30, 45, 60, 90];
const parse = (s: string) => Number(s.replace(",", "."));
const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">{label}</T>
      {hint && <T variant="small">{hint}</T>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{children}</View>
    </View>
  );
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: "600" }}>{label}</T>
        {hint && <T variant="small">{hint}</T>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.basilic }} accessibilityLabel={label} />
    </View>
  );
}

export default function PreferencesScreen() {
  const { data, error, loading, reload } = useApi<Preferences>("/preferences");
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;
  return (
    <Screen padTop={false}>
      <FoodPrefs initial={data.prefs} options={data.dislikeOptions} />
      <Budget initial={data.budget} />
      {data.body && <BodyForm initial={data.body} />}
    </Screen>
  );
}

/** Offers to rebuild the current week after a change that affects the menus. */
function offerRegenerate() {
  Alert.alert("Préférences enregistrées", "Veux-tu refaire les menus de cette semaine avec ces préférences ? Les repas pris dehors sont conservés.", [
    { text: "Plus tard", style: "cancel" },
    {
      text: "Refaire mes menus",
      onPress: async () => {
        await api.action("generateWeek").catch(() => undefined);
        router.navigate("/week");
      },
    },
  ]);
}

function FoodPrefs({ initial, options }: { initial: Prefs; options: Preferences["dislikeOptions"] }) {
  const [p, setP] = useState<Prefs>({ ...initial, veggies: initial.veggies ?? "normal", dislikedIngredients: initial.dislikedIngredients ?? [] });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const res = await api
      .action<{ ok: boolean }>("saveFoodPrefs", {
        diet: p.diet,
        veggies: p.veggies,
        avoid: p.avoid,
        maxMinutesWeekday: p.maxMinutesWeekday,
        maxMinutesWeekend: p.maxMinutesWeekend,
        equipment: p.equipment,
        leftovers: p.leftovers,
        snacks: p.snacks,
        dislikedIngredients: p.dislikedIngredients,
      })
      .catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    offerRegenerate();
  };

  return (
    <Card>
      <SectionTitle>Mon alimentation</SectionTitle>
      <Group label="Régime">
        {(Object.keys(L.diet) as Prefs["diet"][]).map((k) => <Chip key={k} label={L.diet[k]} active={p.diet === k} onPress={() => setP({ ...p, diet: k })} />)}
      </Group>
      {p.diet === "flexitarian" && <T variant="small">Flexitarien : de la viande 3 fois par semaine au plus, le reste en poisson, œufs et protéines végétales.</T>}
      <Group label="Les légumes">
        {(Object.keys(VEGGIES) as (keyof typeof VEGGIES)[]).map((k) => <Chip key={k} label={VEGGIES[k]} active={p.veggies === k} onPress={() => setP({ ...p, veggies: k })} />)}
      </Group>
      <Group label="À éviter">
        {Object.entries(AVOID).map(([k, label]) => <Chip key={k} label={label} active={p.avoid.includes(k)} onPress={() => setP({ ...p, avoid: toggle(p.avoid, k) })} />)}
      </Group>
      <Dislikes value={p.dislikedIngredients ?? []} onChange={(dislikedIngredients) => setP({ ...p, dislikedIngredients })} options={options} />
      <Group label="Temps de cuisine en semaine">
        {WEEKDAY.map((m) => <Chip key={m} label={`${m} min`} active={p.maxMinutesWeekday === m} onPress={() => setP({ ...p, maxMinutesWeekday: m })} />)}
      </Group>
      <Group label="Temps de cuisine le week-end">
        {WEEKEND.map((m) => <Chip key={m} label={`${m} min`} active={p.maxMinutesWeekend === m} onPress={() => setP({ ...p, maxMinutesWeekend: m })} />)}
      </Group>
      <Group label="Équipement de cuisine">
        {Object.entries(L.equipment).map(([k, label]) => <Chip key={k} label={label} active={p.equipment.includes(k)} onPress={() => setP({ ...p, equipment: toggle(p.equipment, k) })} />)}
      </Group>
      <SwitchRow label="Cuisiner une fois, manger deux fois" hint="Le dîner du lundi, du mercredi et du vendredi sert aussi de déjeuner le lendemain." value={p.leftovers} onChange={(leftovers) => setP({ ...p, leftovers })} />
      <SwitchRow label="Prévoir des collations" value={p.snacks} onChange={(snacks) => setP({ ...p, snacks })} />
      {failed && <Notice tone="danger">L'enregistrement a échoué. Réessaie.</Notice>}
      <Button onPress={save} loading={busy}>Enregistrer mon alimentation</Button>
    </Card>
  );
}

/** "Ce que je ne mange pas": whole families (fromage, champignons…) or single ingredients. */
function Dislikes({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: Preferences["dislikeOptions"] }) {
  const c = useColors();
  const [query, setQuery] = useState("");
  const names = useMemo(() => new Map(options.ingredients.map((i) => [i.id, i.label])), [options]);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hits = query.trim().length >= 2 ? options.ingredients.filter((i) => norm(i.label).includes(norm(query.trim()))).slice(0, 12) : [];
  const groupOn = (g: { ingredients: string[] }) => g.ingredients.length > 0 && g.ingredients.every((id) => value.includes(id));
  const toggleGroup = (g: { ingredients: string[] }) => onChange(groupOn(g) ? value.filter((id) => !g.ingredients.includes(id)) : [...new Set([...value, ...g.ingredients])]);

  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">Aliments que je ne mange pas</T>
      <T variant="small">Aucune recette qui en contient ne te sera proposée. L'ail, les herbes et les épices sont simplement retirés de la recette.</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {options.groups.map((g) => <Chip key={g.id} label={g.label} active={groupOn(g)} onPress={() => toggleGroup(g)} />)}
      </View>
      <View>
        <Field label="Un ingrédient précis" value={query} onChangeText={setQuery} placeholder="ex. fenouil" autoCorrect={false} style={{ paddingLeft: 40 }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 12, bottom: 14 }}><Search size={18} color={c.muted} /></View>
      </View>
      {hits.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {hits.map((i) => <Chip key={i.id} label={i.label} active={value.includes(i.id)} onPress={() => onChange(toggle(value, i.id))} />)}
        </View>
      )}
      {value.length > 0 && (
        <View style={{ gap: space.sm }}>
          <T variant="small">{value.length} ingrédient{value.length > 1 ? "s" : ""} exclu{value.length > 1 ? "s" : ""} :</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {value.map((id) => (
              <Pressable
                key={id}
                onPress={() => onChange(value.filter((x) => x !== id))}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${names.get(id) ?? id}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.abricotSoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <T variant="small" tone="encre">{names.get(id) ?? id}</T>
                <X size={14} color={c.encre} />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Budget({ initial }: { initial: Preferences["budget"] }) {
  const { reload } = useMe();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [weekly, setWeekly] = useState(String(initial.weekly || 60));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setEnabled(initial.enabled), [initial.enabled]);

  if (!initial.allowed) {
    return (
      <Card>
        <SectionTitle>Mon budget courses</SectionTitle>
        <T variant="small">Avec Sorloo Premium, fixe un budget par semaine : Sorloo construit des menus qui le respectent.</T>
      </Card>
    );
  }
  const save = async (regenerate: boolean) => {
    setBusy(true);
    setFailed(false);
    const res = await api.action<{ ok: boolean }>("setBudget", { enabled, weekly: parse(weekly) || 0, regenerate }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    await reload();
    if (regenerate) router.navigate("/week");
  };
  return (
    <Card>
      <SectionTitle>Mon budget courses</SectionTitle>
      <SwitchRow label="Respecter un budget" value={enabled} onChange={setEnabled} />
      {enabled && <Field label="Budget par semaine (€)" value={weekly} onChangeText={setWeekly} keyboardType="decimal-pad" />}
      {failed && <Notice tone="danger">Le budget doit être compris entre 10 et 1 000 €.</Notice>}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button variant="secondary" style={{ flex: 1 }} loading={busy} onPress={() => save(false)}>Enregistrer</Button>
        {enabled && <Button style={{ flex: 1 }} loading={busy} onPress={() => save(true)}>Refaire ma semaine</Button>}
      </View>
    </Card>
  );
}

function BodyForm({ initial }: { initial: Body }) {
  const [b, setB] = useState({ ...initial, weight: String(initial.weightKg).replace(".", ","), height: String(initial.heightCm), target: initial.targetWeightKg ? String(initial.targetWeightKg).replace(".", ",") : "" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setBusy(true);
    setFailed(false);
    const res = await api
      .action<{ ok: boolean }>("saveBody", {
        weightKg: parse(b.weight),
        heightCm: parse(b.height),
        goal: b.goal,
        activity: b.activity,
        ...(b.target ? { targetWeightKg: parse(b.target) } : {}),
        pace: b.pace,
      })
      .catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    setSaved(true);
  };
  const set = (patch: Partial<typeof b>) => {
    setB({ ...b, ...patch });
    setSaved(false);
  };
  return (
    <Card>
      <SectionTitle>Mon objectif</SectionTitle>
      <Group label="Objectif">
        {(Object.keys(L.goal) as Body["goal"][]).map((k) => <Chip key={k} label={L.goal[k]} active={b.goal === k} onPress={() => set({ goal: k })} />)}
      </Group>
      {(b.goal === "lose_weight" || b.goal === "gain_muscle") && (
        <Group label="Rythme">
          <Chip label="Doux" active={b.pace === "gentle"} onPress={() => set({ pace: "gentle" })} />
          <Chip label="Modéré" active={b.pace === "moderate"} onPress={() => set({ pace: "moderate" })} />
        </Group>
      )}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}><Field label="Poids (kg)" value={b.weight} onChangeText={(weight) => set({ weight })} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Taille (cm)" value={b.height} onChangeText={(height) => set({ height })} keyboardType="number-pad" /></View>
      </View>
      {(b.goal === "lose_weight" || b.goal === "gain_muscle") && <Field label="Poids visé (kg, facultatif)" value={b.target} onChangeText={(target) => set({ target })} keyboardType="decimal-pad" />}
      <Group label="Activité au quotidien">
        {(Object.keys(L.activity) as Body["activity"][]).map((k) => <Chip key={k} label={L.activity[k].split(" (")[0]!} active={b.activity === k} onPress={() => set({ activity: k })} />)}
      </Group>
      {failed && <Notice tone="danger">Vérifie les valeurs saisies.</Notice>}
      {saved && <Notice tone="basilic">Enregistré : tes objectifs du jour sont recalculés.</Notice>}
      <Button onPress={save} loading={busy}>Enregistrer mon objectif</Button>
    </Card>
  );
}
