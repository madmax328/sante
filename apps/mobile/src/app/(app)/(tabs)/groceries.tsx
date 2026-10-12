import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Refrigerator, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorView, Field, Loading, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { euro } from "@/lib/format";
import { space, useColors } from "@/lib/theme";
import { t } from "@/lib/i18n";

interface Groceries {
  hasPlan: boolean;
  total: number;
  shopped: boolean;
  actualSpent: number | null;
  aisles: { aisle: string; label: string; total: number; items: { id: string; name: string; qty: string; cost: number; checked: boolean }[] }[];
  staples: string[];
  fromPantry: { name: string; qty: string }[];
  leftovers: { name: string; qty: string }[];
  stores?: { premium: boolean; items: number; list: { brand: string; total: number; measured: number; index: number }[] };
}

export default function GroceriesScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<Groceries>("/groceries");
  const [spent, setSpent] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? t("Pas de connexion internet.", "No internet connection.") : t("Le chargement a échoué.", "Loading failed.")} onRetry={reload} />;
  if (!data.hasPlan) return <Screen><T variant="title">{t("Liste de courses", "Shopping list")}</T><EmptyState title={t("Pas encore de liste", "No list yet")} text={t("Crée ta semaine depuis l'onglet Aujourd'hui : la liste se fait toute seule.", "Create your week from the Today tab: the list builds itself.")} /></Screen>;

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
          <T variant="title">{t("Liste de courses", "Shopping list")}</T>
          <T variant="small">{done}/{count} {t("produits", "items")} · {euro(data.total)}</T>
        </View>
        <Button small variant="secondary" onPress={share} icon={<Share2 size={16} color={c.encre} />}>{t("Partager", "Share")}</Button>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/pantry")} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Refrigerator size={16} color={c.basilic} />
        <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>{t("Tu as déjà certains produits ? Garde-manger →", "Already have some items? Pantry →")}</T>
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

      {data.stores && <Stores stores={data.stores} />}

      {data.staples.length > 0 && (
        <Card>
          <SectionTitle>{t("À vérifier dans le placard", "Check your cupboard")}</SectionTitle>
          <T variant="small">{data.staples.join(", ")}</T>
        </Card>
      )}
      {data.leftovers.length > 0 && (
        <Card>
          <SectionTitle>{t("Il te restera", "You'll have left")}</SectionTitle>
          <T variant="small">{t("Pense à les utiliser (omelette, salade, soupe) ou à les congeler.", "Use them up (omelette, salad, soup) or freeze them.")}</T>
          {data.leftovers.map((l) => <T key={l.name} variant="small">{l.name} · {l.qty}</T>)}
        </Card>
      )}

      <Card>
        <SectionTitle>{t("Courses faites ?", "Shopping done?")}</SectionTitle>
        {data.shopped ? (
          <Notice tone="basilic">{t("Courses faites, bravo !", "Shopping done, well done!")}{data.actualSpent ? t(" Montant réel : {0}.", " Actual amount: {0}.", [euro(data.actualSpent)]) : ""}</Notice>
        ) : (
          <>
            <Field label={t("Montant réel (facultatif)", "Actual amount (optional)")} value={spent} onChangeText={setSpent} keyboardType="decimal-pad" placeholder={String(Math.round(data.total))} />
            <Button onPress={shopped} loading={saving}>{t("Courses faites", "Shopping done")}</Button>
          </>
        )}
      </Card>
    </Screen>
  );
}

/** Estimated cost of the list in each chain (Open Prices data). */
function Stores({ stores }: { stores: NonNullable<Groceries["stores"]> }) {
  const c = useColors();
  const gap = (index: number) => {
    const pct = Math.round(Math.abs(1 - index) * 100);
    return pct === 0 ? t("dans la moyenne des enseignes", "around the average of the chains") : index < 1 ? t("{0} % moins cher que la moyenne", "{0}% cheaper than average", [pct]) : t("{0} % plus cher que la moyenne", "{0}% more expensive than average", [pct]);
  };
  return (
    <Card>
      <SectionTitle>{t("Comparer les enseignes", "Compare supermarkets")}</SectionTitle>
      {!stores.premium ? (
        <T variant="small">{t("Avec Sorloo Premium, compare le coût de ta liste dans chaque enseigne (Leclerc, Carrefour, Lidl…).", "With Sorloo Premium, compare the cost of your list at each supermarket chain (Leclerc, Carrefour, Lidl…).")}</T>
      ) : stores.list.length === 0 ? (
        <T variant="small">{t("Pas encore assez de prix relevés pour comparer les enseignes sur ta liste. La base s'enrichit chaque jour.", "Not enough prices recorded yet to compare chains for your list. The data grows every day.")}</T>
      ) : (
        <>
          {stores.list.map((s, i) => (
            <View key={s.brand} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <T style={{ fontWeight: "700" }}>{s.brand}</T>
                  {i === 0 && stores.list.length > 1 && <Badge>{t("Le moins cher", "Cheapest")}</Badge>}
                </View>
                <T variant="small">{gap(s.index)} · {t("prix relevés pour {0}/{1} produits", "prices recorded for {0}/{1} items", [s.measured, stores.items])}</T>
              </View>
              <T variant="h3">{euro(s.total)}</T>
            </View>
          ))}
        </>
      )}
      {stores.premium && <T variant="small">{t("Estimation à partir des prix relevés en magasin sur Open Prices (12 derniers mois, hors promotions et hors bio, sauf Biocoop). Chaque enseigne est comparée aux autres sur les mêmes produits. Les prix varient selon les magasins.", "Estimate based on in-store prices recorded on Open Prices (last 12 months, excluding promotions and organic, except Biocoop). Each chain is compared with the others on the same products. Prices vary between stores.")}</T>}
    </Card>
  );
}
