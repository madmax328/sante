import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Refrigerator, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Button, Card, EmptyState, ErrorView, Field, Loading, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { euro } from "@/lib/format";
import { space, useColors } from "@/lib/theme";

interface Groceries {
  hasPlan: boolean;
  total: number;
  shopped: boolean;
  actualSpent: number | null;
  aisles: { aisle: string; label: string; total: number; items: { id: string; name: string; qty: string; cost: number; checked: boolean }[] }[];
  staples: string[];
  fromPantry: { name: string; qty: string }[];
  leftovers: { name: string; qty: string }[];
}

export default function GroceriesScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<Groceries>("/groceries");
  const [spent, setSpent] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;
  if (!data.hasPlan) return <Screen><T variant="title">Liste de courses</T><EmptyState title="Pas encore de liste" text="Crée ta semaine depuis l'onglet Aujourd'hui : la liste se fait toute seule." /></Screen>;

  const toggle = async (id: string) => {
    void Haptics.selectionAsync();
    setData({ ...data, aisles: data.aisles.map((a) => ({ ...a, items: a.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) })) });
    await api.action("toggleChecked", { ingredientId: id }).catch(() => undefined);
  };
  const share = () =>
    Share.share({ message: data.aisles.map((a) => `${a.label}\n${a.items.map((i) => `- ${i.name} : ${i.qty}`).join("\n")}`).join("\n\n") });
  const shopped = async () => {
    setSaving(true);
    const value = Number(spent.replace(",", "."));
    await api.action("markShopped", { actualSpent: Number.isFinite(value) && value > 0 ? value : undefined }).catch(() => undefined);
    setSaving(false);
    await reload();
  };
  const count = data.aisles.reduce((s, a) => s + a.items.length, 0);
  const done = data.aisles.reduce((s, a) => s + a.items.filter((i) => i.checked).length, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <T variant="title">Liste de courses</T>
          <T variant="small">{done}/{count} produits · {euro(data.total)}</T>
        </View>
        <Button small variant="secondary" onPress={share} icon={<Share2 size={16} color={c.encre} />}>Partager</Button>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/pantry")} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Refrigerator size={16} color={c.basilic} />
        <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Tu as déjà certains produits ? Garde-manger →</T>
      </Pressable>

      {data.aisles.map((a) => (
        <Card key={a.aisle} style={{ gap: 0 }}>
          <SectionTitle action={<T variant="small">{euro(a.total)}</T>}>{a.label}</SectionTitle>
          {a.items.map((i) => (
            <Pressable key={i.id} onPress={() => toggle(i.id)} accessibilityRole="checkbox" accessibilityState={{ checked: i.checked }} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: i.checked ? c.basilic : c.line, backgroundColor: i.checked ? c.basilic : "transparent", alignItems: "center", justifyContent: "center" }}>
                {i.checked && <Check size={15} color={c.surface} strokeWidth={3} />}
              </View>
              <T style={{ flex: 1, textDecorationLine: i.checked ? "line-through" : "none", opacity: i.checked ? 0.5 : 1 }}>
                <T style={{ fontWeight: "700" }}>{i.name}</T> <T variant="small">{i.qty}</T>
              </T>
              <T variant="small">{euro(i.cost)}</T>
            </Pressable>
          ))}
        </Card>
      ))}

      {data.staples.length > 0 && (
        <Card>
          <SectionTitle>À vérifier dans le placard</SectionTitle>
          <T variant="small">{data.staples.join(", ")}</T>
        </Card>
      )}
      {data.leftovers.length > 0 && (
        <Card>
          <SectionTitle>Il te restera</SectionTitle>
          <T variant="small">Pense à les utiliser (omelette, salade, soupe) ou à les congeler.</T>
          {data.leftovers.map((l) => <T key={l.name} variant="small">{l.name} · {l.qty}</T>)}
        </Card>
      )}

      <Card>
        <SectionTitle>Courses faites ?</SectionTitle>
        {data.shopped ? (
          <Notice tone="basilic">Courses faites, bravo !{data.actualSpent ? ` Montant réel : ${euro(data.actualSpent)}.` : ""}</Notice>
        ) : (
          <>
            <Field label="Montant réel (facultatif)" value={spent} onChangeText={setSpent} keyboardType="decimal-pad" placeholder={String(Math.round(data.total))} />
            <Button onPress={shopped} loading={saving}>Courses faites</Button>
          </>
        )}
      </Card>
    </Screen>
  );
}
