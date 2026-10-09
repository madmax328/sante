import * as Haptics from "expo-haptics";
import { Check, Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import { Button, Card, EmptyState, ErrorView, Field, Loading, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { radius, space, useColors } from "@/lib/theme";

type Unit = "g" | "ml" | "pc";

interface Pantry {
  allowed: boolean;
  items: { id: string; name: string; qty: number; unit: Unit }[];
  options: { id: string; name: string; unit: Unit }[];
}

const UNIT: Record<Unit, string> = { g: "g", ml: "ml", pc: "pièce(s)" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "Garde-manger": what is already at home is taken off the grocery list and cooked first. */
export default function PantryScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useApi<Pantry>("/pantry");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Pantry["options"][number]>();
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;
  if (!data.allowed) {
    return (
      <Screen padTop={false}>
        <EmptyState title="Ton garde-manger" text="Avec Sorloo Premium, indique ce que tu as déjà chez toi : Sorloo le retire de ta liste de courses et le cuisine en priorité, pour dépenser moins et gaspiller moins." />
      </Screen>
    );
  }

  const set = async (id: string, value: number) => {
    setBusy(true);
    await api.action("setPantryItem", { ingredientId: id, qty: value }).catch(() => undefined);
    setBusy(false);
    void Haptics.selectionAsync();
    await reload();
  };
  const hits = query.trim().length >= 2 ? data.options.filter((o) => norm(o.name).includes(norm(query.trim()))).slice(0, 12) : [];

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      <T variant="small">Ce que tu as déjà est retiré de ta liste de courses et cuisiné en priorité.</T>
      <Card>
        <SectionTitle>Ajouter un produit</SectionTitle>
        {picked ? (
          <>
            <T variant="h3">{picked.name}</T>
            <Field label={`Quantité (${UNIT[picked.unit]})`} value={qty} onChangeText={setQty} keyboardType="decimal-pad" autoFocus selectTextOnFocus />
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button variant="ghost" onPress={() => setPicked(undefined)}>Retour</Button>
              <Button
                style={{ flex: 1 }}
                loading={busy}
                disabled={!(Number(qty.replace(",", ".")) > 0)}
                onPress={async () => {
                  await set(picked.id, Number(qty.replace(",", ".")));
                  setPicked(undefined);
                  setQuery("");
                }}
              >
                Ajouter
              </Button>
            </View>
          </>
        ) : (
          <>
            <View>
              <Field label="Produit" value={query} onChangeText={setQuery} placeholder="ex. riz, tomates, œufs…" autoCorrect={false} style={{ paddingLeft: 40 }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 12, bottom: 14 }}><Search size={18} color={c.muted} /></View>
            </View>
            {hits.map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                onPress={() => {
                  setPicked(o);
                  setQty(o.unit === "pc" ? "1" : "500");
                }}
                style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: space.sm, borderRadius: radius.sm, backgroundColor: pressed ? c.riz : "transparent" })}
              >
                <T>{o.name}</T>
              </Pressable>
            ))}
          </>
        )}
      </Card>
      {data.items.length === 0 ? (
        <EmptyState title="Ton garde-manger est vide" text="Ajoute ce qu'il te reste (un paquet de pâtes entamé, des œufs…) : ta prochaine semaine en tiendra compte." />
      ) : (
        <Card style={{ gap: 0 }}>
          {data.items.map((i, k) => (
            <PantryRow key={i.id} item={i} first={k === 0} onSave={(v) => set(i.id, v)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function PantryRow({ item, first, onSave }: { item: Pantry["items"][number]; first: boolean; onSave: (qty: number) => void }) {
  const c = useColors();
  const [value, setValue] = useState(String(item.qty));
  useEffect(() => setValue(String(item.qty)), [item.qty]);
  const q = Number(value.replace(",", ".")) || 0;
  const changed = value.trim() !== "" && q !== item.qty;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <T style={{ flex: 1 }} numberOfLines={2}>{item.name}</T>
      <TextInput
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`Quantité de ${item.name}`}
        style={{ width: 72, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: changed ? c.basilic : c.line, paddingHorizontal: space.sm, color: c.encre, backgroundColor: c.surface, textAlign: "right" }}
      />
      <T variant="small" style={{ width: 52 }}>{UNIT[item.unit]}</T>
      {changed ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Enregistrer la quantité de ${item.name}`} hitSlop={8} onPress={() => { Keyboard.dismiss(); onSave(q); }}>
          <Check size={20} color={c.basilic} />
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${item.name}`} hitSlop={8} onPress={() => onSave(0)}>
          <X size={18} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}
