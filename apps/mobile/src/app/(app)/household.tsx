import { router } from "expo-router";
import { Pencil, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Button, Card, Chip, ErrorView, Field, Loading, Notice, Screen, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { MEAL_LABEL, MEAL_ORDER, type Meal } from "@/lib/format";
import { L } from "@/lib/labels";
import { space, useColors } from "@/lib/theme";

type Allergen = keyof typeof L.allergen;
type Activity = keyof typeof L.activity;

interface Member {
  id: string;
  name: string;
  self: boolean;
  sex: "female" | "male";
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  allergies: Allergen[];
  eats: Record<Meal, boolean>;
  age: number;
}

interface Household {
  premium: boolean;
  members: Member[];
}

const ERRORS: Record<string, string> = {
  invalid: "Vérifie les informations saisies.",
  limit: "Le foyer est limité à 9 personnes.",
  future: "La date de naissance ne peut pas être dans le futur.",
};

/** "1/6/2015" or "01/06/2015" → "2015-06-01". */
function toIso(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return Number.isNaN(new Date(`${iso}T12:00:00`).getTime()) ? null : iso;
}
const fromIso = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

function offerRegenerate() {
  Alert.alert("Foyer mis à jour", "Veux-tu refaire les menus de cette semaine pour en tenir compte ?", [
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

export default function HouseholdScreen() {
  const c = useColors();
  const { data, error, loading, reload } = useApi<Household>("/household");
  const [editing, setEditing] = useState<string>();

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const remove = (m: Member) =>
    Alert.alert(`Retirer ${m.name} du foyer ?`, undefined, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          await api.action("removeMember", { id: m.id }).catch(() => undefined);
          await reload();
          offerRegenerate();
        },
      },
    ]);
  const saved = async () => {
    setEditing(undefined);
    await reload();
    offerRegenerate();
  };

  return (
    <Screen padTop={false}>
      <T variant="small">Le même repas pour tout le monde, avec des portions adaptées à chacun et sans les allergènes de personne.</T>
      {data.members.map((m) =>
        editing === m.id ? (
          <MemberForm key={m.id} initial={m} onCancel={() => setEditing(undefined)} onSaved={saved} />
        ) : (
          <Card key={m.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="h3">{m.name}{m.self ? " (toi)" : ""} <T variant="small">· {m.age} ans</T></T>
                <T variant="small">{MEAL_ORDER.filter((k) => m.eats[k]).map((k) => MEAL_LABEL[k]).join(", ") || "Aucun repas à la maison"}</T>
                <T variant="small">Allergies : {m.allergies.length ? m.allergies.map((a) => L.allergen[a]).join(", ") : "aucune"}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Modifier ${m.name}`} hitSlop={8} onPress={() => setEditing(m.id)} style={{ padding: 6 }}>
                <Pencil size={18} color={c.basilic} />
              </Pressable>
              {!m.self && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${m.name}`} hitSlop={8} onPress={() => remove(m)} style={{ padding: 6 }}>
                  <Trash2 size={18} color={c.muted} />
                </Pressable>
              )}
            </View>
          </Card>
        ),
      )}
      {editing === "new" ? (
        <MemberForm onCancel={() => setEditing(undefined)} onSaved={saved} />
      ) : (
        data.members.length < 9 && <Button variant="secondary" icon={<Plus size={18} color={c.encre} />} onPress={() => setEditing("new")}>Ajouter une personne</Button>
      )}
      {!data.premium && data.members.length > 1 && <Notice>La planification pour plusieurs personnes fait partie de Premium : sans abonnement, seuls tes repas sont calculés.</Notice>}
    </Screen>
  );
}

function MemberForm({ initial, onCancel, onSaved }: { initial?: Member; onCancel: () => void; onSaved: () => void }) {
  const selfOnly = !!initial?.self;
  const [m, setM] = useState({
    name: initial?.name ?? "",
    sex: initial?.sex ?? ("female" as Member["sex"]),
    birth: fromIso(initial?.birthDate ?? ""),
    height: initial ? String(initial.heightCm) : "",
    weight: initial ? String(initial.weightKg).replace(".", ",") : "",
    activity: initial?.activity ?? ("light" as Activity),
    allergies: initial?.allergies ?? ([] as Allergen[]),
    eats: initial?.eats ?? { breakfast: true, lunch: false, dinner: true, snack: true },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    setError(undefined);
    const birthDate = selfOnly ? initial!.birthDate : toIso(m.birth);
    if (!birthDate) return setError("Écris la date de naissance sous la forme JJ/MM/AAAA.");
    setBusy(true);
    const res = await api
      .action<{ ok: boolean; error?: string }>("saveMember", {
        ...(initial ? { id: initial.id } : {}),
        name: m.name.trim(),
        sex: m.sex,
        birthDate,
        heightCm: Number(m.height),
        weightKg: Number(m.weight.replace(",", ".")),
        activity: m.activity,
        allergies: m.allergies,
        eats: m.eats,
      })
      .catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(ERRORS[res?.error ?? "invalid"] ?? ERRORS.invalid);
    onSaved();
  };

  return (
    <Card style={{ borderWidth: 2 }}>
      <T variant="h3">{initial ? initial.name : "Nouvelle personne"}</T>
      {!selfOnly && (
        <>
          <Field label="Prénom" value={m.name} onChangeText={(name) => setM({ ...m, name })} />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Chip label="Femme" active={m.sex === "female"} onPress={() => setM({ ...m, sex: "female" })} />
            <Chip label="Homme" active={m.sex === "male"} onPress={() => setM({ ...m, sex: "male" })} />
          </View>
          <Field label="Date de naissance" value={m.birth} onChangeText={(birth) => setM({ ...m, birth })} placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}><Field label="Taille (cm)" value={m.height} onChangeText={(height) => setM({ ...m, height })} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Poids (kg)" value={m.weight} onChangeText={(weight) => setM({ ...m, weight })} keyboardType="decimal-pad" /></View>
          </View>
          <T variant="label">Activité</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {(Object.keys(L.activity) as Activity[]).map((k) => <Chip key={k} label={L.activity[k].split(" (")[0]!} active={m.activity === k} onPress={() => setM({ ...m, activity: k })} />)}
          </View>
        </>
      )}
      <T variant="label">Repas pris à la maison</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {MEAL_ORDER.map((k) => <Chip key={k} label={MEAL_LABEL[k]!} active={m.eats[k]} onPress={() => setM({ ...m, eats: { ...m.eats, [k]: !m.eats[k] } })} />)}
      </View>
      <T variant="label">Allergies</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {(Object.keys(L.allergen) as Allergen[]).map((a) => (
          <Chip key={a} label={L.allergen[a]} active={m.allergies.includes(a)} onPress={() => setM({ ...m, allergies: m.allergies.includes(a) ? m.allergies.filter((x) => x !== a) : [...m.allergies, a] })} />
        ))}
      </View>
      {error && <Notice tone="danger">{error}</Notice>}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button variant="ghost" onPress={onCancel}>Annuler</Button>
        <Button style={{ flex: 1 }} loading={busy} onPress={save}>Enregistrer</Button>
      </View>
    </Card>
  );
}
