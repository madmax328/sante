import { Link } from "expo-router";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Thumb } from "@/components/thumb";
import { Badge, Button, Card, EmptyState, ErrorView, Loading, Screen, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { DAY_LABEL, euro, MEAL_LABEL, num, shortDate } from "@/lib/format";
import { radius, space, useColors } from "@/lib/theme";

interface Week {
  weekStart: string;
  hasPlan: boolean;
  today?: number;
  summary?: { cost: number; eaten: number; kept: number; budget: number | null; avgKcal: number | null; targetKcal: number | null };
  days: {
    day: number;
    date: string;
    kcal: number | null;
    meals: { meal: string; kind: string; recipeId: string | null; name: string | null; minutes: number | null; kcal: number | null; cost: number | null; photo: string | null; leftoverOf: number | null; cookDouble: boolean; guests: number }[];
  }[];
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function WeekScreen() {
  const c = useColors();
  const [start, setStart] = useState<string>();
  const { data, error, loading, refreshing, refresh, reload } = useApi<Week>(start ? `/week?start=${start}` : "/week");
  const [busy, setBusy] = useState<string>();

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const generate = () =>
    Alert.alert("Nouveau menu", "Refaire tous les repas de cette semaine ? Les repas pris dehors sont conservés.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refaire",
        onPress: async () => {
          setBusy("all");
          await api.action("generateWeek", { weekStart: data.weekStart }).catch(() => undefined);
          setBusy(undefined);
          await reload();
        },
      },
    ]);
  const replace = async (day: number, meal: string) => {
    setBusy(`${day}:${meal}`);
    const res = await api.action<{ ok: boolean; error?: string }>("replaceMeal", { day, meal, weekStart: data.weekStart }).catch(() => null);
    setBusy(undefined);
    if (res?.error === "quota") Alert.alert("Remplacements gratuits utilisés", "Tu as utilisé tes 3 remplacements gratuits de la semaine. Ils sont illimités avec Weeko Premium.");
    await reload();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <T variant="title">Ma semaine</T>
          <T variant="small">{shortDate(data.weekStart)} – {shortDate(addDays(data.weekStart, 6))}</T>
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Pressable accessibilityLabel="Semaine précédente" hitSlop={8} onPress={() => setStart(addDays(data.weekStart, -7))} style={{ padding: 8 }}><ChevronLeft color={c.encre} /></Pressable>
          <Pressable accessibilityLabel="Semaine suivante" hitSlop={8} onPress={() => setStart(addDays(data.weekStart, 7))} style={{ padding: 8 }}><ChevronRight color={c.encre} /></Pressable>
        </View>
      </View>

      {!data.hasPlan ? (
        <EmptyState
          title="Pas encore de menu"
          text="Weeko prépare les 7 jours de repas et la liste de courses."
          action={<Button variant="accent" loading={busy === "all"} onPress={async () => { setBusy("all"); await api.action("generateWeek", { weekStart: data.weekStart }).catch(() => undefined); setBusy(undefined); await reload(); }}>Créer cette semaine</Button>}
        />
      ) : (
        <>
          {data.summary && (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <View>
                  <T variant="label">Courses estimées</T>
                  <T variant="big">{euro(data.summary.cost)}</T>
                </View>
                {data.summary.avgKcal !== null && (
                  <View style={{ alignItems: "flex-end" }}>
                    <T variant="label">Moyenne / jour</T>
                    <T variant="h2">{num(data.summary.avgKcal)} kcal</T>
                  </View>
                )}
              </View>
              {data.summary.kept >= 5 && <T variant="small">dont {euro(data.summary.kept)} de produits qui te resteront pour la suite</T>}
              <Button small variant="secondary" onPress={generate} loading={busy === "all"} icon={<RefreshCw size={16} color={c.encre} />} style={{ alignSelf: "flex-start" }}>Nouveau menu</Button>
            </Card>
          )}
          {data.days.map((d) => (
            <View key={d.day} style={{ gap: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                  <T variant="h2">{DAY_LABEL[d.day]}</T>
                  <T variant="small">{shortDate(d.date)}</T>
                  {d.day === data.today && <Badge tone="abricot">Aujourd'hui</Badge>}
                </View>
                {d.kcal !== null && <T variant="small">{num(d.kcal)} kcal</T>}
              </View>
              <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: d.day === data.today ? c.abricot : c.line, overflow: "hidden" }}>
                {d.meals.map((m, i) => (
                  <View key={m.meal} style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                    <Link href={m.recipeId ? `/recipe/${m.recipeId}` : "/week"} asChild>
                      <Pressable style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.md }}>
                        <Thumb uri={m.photo} size={52} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <T variant="label">{MEAL_LABEL[m.meal]}</T>
                          <T variant="h3" numberOfLines={2}>{m.name ?? "Rien de prévu"}</T>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            {m.kind === "leftover" && m.leftoverOf !== null && <Badge tone="miel">{`Restes de ${DAY_LABEL[m.leftoverOf]}`}</Badge>}
                            {m.cookDouble && <Badge>Cuisiner en double</Badge>}
                            {m.kind === "external" && <Badge tone="eau">Dehors</Badge>}
                            {m.guests > 0 && <Badge tone="abricot">{`+${m.guests} invités`}</Badge>}
                            {m.minutes !== null && <T variant="small">{m.minutes} min{m.cost !== null ? ` · ${euro(m.cost)}` : ""}</T>}
                          </View>
                        </View>
                      </Pressable>
                    </Link>
                    {m.kind === "recipe" && (
                      <Pressable accessibilityLabel={`Remplacer ${MEAL_LABEL[m.meal]}`} hitSlop={8} onPress={() => replace(d.day, m.meal)} disabled={!!busy} style={{ padding: 6, opacity: busy === `${d.day}:${m.meal}` ? 0.4 : 1 }}>
                        <RefreshCw size={18} color={c.muted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
