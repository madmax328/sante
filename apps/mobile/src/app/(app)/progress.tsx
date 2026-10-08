import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { Button, Card, EmptyState, ErrorView, Field, Loading, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { euro, num, shortDate } from "@/lib/format";
import { radius, space, useColors } from "@/lib/theme";

interface Review {
  trendChangeKg: number | null;
  adherence: number | null;
  sessionsDone: number;
  sessionsPlanned: number;
  budgetPlanned: number | null;
  budgetActual: number | null;
  avgKcal: number | null;
  daysLogged: number;
  recommendations: { code: string; title: string; text: string }[];
}

interface Progress {
  today: string;
  hidden: boolean;
  premium: boolean;
  goalKg: number | null;
  measurements: { date: string; kg: number | null; waistCm: number | null }[];
  lastWeek: Review | null;
  thisWeek: Review | null;
  next: { weekStart: string; ready: boolean } | null;
}

const parse = (s: string) => Number(s.replace(",", "."));

export default function ProgressScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload } = useApi<Progress>("/progress");
  const [kg, setKg] = useState("");
  const [waist, setWaist] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const weights = data.measurements.filter((m) => m.kg !== null).map((m) => ({ date: m.date, kg: m.kg! }));
  const save = async () => {
    setBusy(true);
    setFailed(false);
    const input = { date: data.today, ...(kg ? { kg: parse(kg) } : {}), ...(waist ? { waistCm: parse(waist) } : {}) };
    const res = await api.action<{ ok: boolean }>("addMeasurement", input).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFailed(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKg("");
    setWaist("");
    await reload();
  };
  const remove = (date: string) =>
    Alert.alert("Supprimer cette mesure ?", shortDate(date), [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => { await api.action("deleteMeasurement", { date }).catch(() => undefined); await reload(); } },
    ]);
  const createNext = async () => {
    if (!data.next) return;
    setBusy(true);
    await api.action("generateWeek", { weekStart: data.next.weekStart }).catch(() => undefined);
    setBusy(false);
    await reload();
  };

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      {!data.hidden && (
        <Card>
          <SectionTitle>Mon poids</SectionTitle>
          {weights.length >= 2 ? <WeightChart entries={weights} goal={data.goalKg} /> : <T variant="small">Ajoute au moins deux pesées pour voir ta courbe.</T>}
          <T variant="small">La courbe montre la tendance : les variations d'un jour à l'autre (eau, repas) sont normales.</T>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}><Field label="Poids (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="ex. 72,5" /></View>
            <View style={{ flex: 1 }}><Field label="Tour de taille (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="facultatif" /></View>
          </View>
          {failed && <Notice tone="danger">Vérifie les valeurs (poids entre 25 et 350 kg).</Notice>}
          <Button onPress={save} loading={busy} disabled={!kg && !waist}>Enregistrer la mesure du jour</Button>
        </Card>
      )}

      {data.premium && data.lastWeek && data.thisWeek ? (
        <>
          <ReviewCard title="Bilan de la semaine dernière" r={data.lastWeek} />
          <ReviewCard title="Cette semaine, jusqu'ici" r={data.thisWeek} />
          {data.next && (
            <Card>
              <SectionTitle>La semaine prochaine</SectionTitle>
              <T variant="small">Sorloo tient compte de tes goûts (recettes aimées, remplacées) pour te proposer une nouvelle semaine.</T>
              {data.next.ready ? (
                <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Ta semaine prochaine est prête : ouvre l'onglet Semaine et passe à la suivante.</T>
              ) : (
                <Button variant="accent" loading={busy} onPress={createNext}>Préparer la semaine prochaine</Button>
              )}
            </Card>
          )}
        </>
      ) : (
        <EmptyState title="Ton bilan de la semaine" text="Avec Sorloo Premium, tu reçois chaque semaine un bilan (poids, repas suivis, séances, budget) et des conseils pour la suite." />
      )}

      {!data.hidden && data.measurements.length > 0 && (
        <Card>
          <SectionTitle>Historique</SectionTitle>
          {[...data.measurements].reverse().slice(0, 30).map((m) => (
            <View key={m.date} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <T style={{ width: 80 }} variant="small">{shortDate(m.date)}</T>
              <T style={{ flex: 1 }}>{m.kg !== null ? `${num(m.kg, 1)} kg` : "—"}{m.waistCm !== null ? ` · ${num(m.waistCm)} cm` : ""}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer la mesure du ${shortDate(m.date)}`} hitSlop={8} onPress={() => remove(m.date)}>
                <X size={18} color={c.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ width: "47%", backgroundColor: c.riz, borderRadius: radius.md, padding: space.md, gap: 2 }}>
      <T variant="small">{label}</T>
      <T variant="h2">{value}</T>
    </View>
  );
}

function ReviewCard({ title, r }: { title: string; r: Review }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {r.trendChangeKg !== null && <Stat label="Tendance du poids" value={`${r.trendChangeKg > 0 ? "+" : ""}${num(r.trendChangeKg, 2)} kg`} />}
        {r.adherence !== null && <Stat label="Repas suivis" value={`${Math.round(r.adherence * 100)} %`} />}
        <Stat label="Séances" value={`${r.sessionsDone} / ${r.sessionsPlanned}`} />
        {r.budgetPlanned !== null && <Stat label="Budget" value={`${r.budgetActual !== null ? euro(r.budgetActual) : "—"} / ${euro(r.budgetPlanned)}`} />}
        {r.avgKcal !== null && <Stat label="Moyenne" value={`${num(r.avgKcal)} kcal`} />}
        <Stat label="Jours notés" value={`${r.daysLogged} / 7`} />
      </View>
      {r.recommendations.map((rec) => (
        <Notice key={rec.code} tone="basilic">
          <T variant="small" style={{ fontWeight: "700" }}>{rec.title} — </T>
          {rec.text}
        </Notice>
      ))}
    </Card>
  );
}

/** Weigh-ins (dots), their 7-point moving average (line) and the goal (dashed). */
function WeightChart({ entries, goal }: { entries: { date: string; kg: number }[]; goal: number | null }) {
  const c = useColors();
  const { width: screen } = useWindowDimensions();
  const width = screen - space.lg * 4;
  const height = 180;
  const pad = { left: 34, right: 8, top: 10, bottom: 22 };
  const pts = entries.slice(-60);
  const trend = pts.map((_, i) => {
    const slice = pts.slice(Math.max(0, i - 6), i + 1);
    return slice.reduce((s, p) => s + p.kg, 0) / slice.length;
  });
  const values = [...pts.map((p) => p.kg), ...(goal ? [goal] : [])];
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const t0 = new Date(pts[0]!.date).getTime();
  const t1 = Math.max(t0 + 86400000, new Date(pts[pts.length - 1]!.date).getTime());
  const x = (d: string) => pad.left + ((new Date(d).getTime() - t0) / (t1 - t0)) * (width - pad.left - pad.right);
  const y = (kg: number) => pad.top + ((max - kg) / (max - min)) * (height - pad.top - pad.bottom);
  const line = trend.map((kg, i) => `${i ? "L" : "M"}${x(pts[i]!.date).toFixed(1)},${y(kg).toFixed(1)}`).join(" ");
  const ticks = [min, Math.round((min + max) / 2), max];
  return (
    <Svg width={width} height={height} accessibilityLabel={`Courbe de poids : dernière pesée ${num(pts[pts.length - 1]!.kg, 1)} kg`}>
      {ticks.map((t) => (
        <Line key={t} x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} />
      ))}
      {ticks.map((t) => (
        <SvgText key={`l${t}`} x={pad.left - 6} y={y(t) + 4} fontSize={11} fill={c.muted} textAnchor="end">{t}</SvgText>
      ))}
      {goal && <Line x1={pad.left} x2={width - pad.right} y1={y(goal)} y2={y(goal)} stroke={c.abricot} strokeWidth={1.5} strokeDasharray="5 4" />}
      {pts.map((p) => <Circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={2.5} fill={c.muted} fillOpacity={0.6} />)}
      <Path d={line} stroke={c.basilic} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x={pad.left} y={height - 4} fontSize={11} fill={c.muted}>{shortDate(pts[0]!.date)}</SvgText>
      <SvgText x={width - pad.right} y={height - 4} fontSize={11} fill={c.muted} textAnchor="end">{shortDate(pts[pts.length - 1]!.date)}</SvgText>
    </Svg>
  );
}
