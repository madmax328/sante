import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { Stack, useLocalSearchParams } from "expo-router";
import { Pause, Play, SkipForward } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ExerciseDemo } from "@/components/exercise-demo";
import { Button, Card, ErrorView, Loading, Notice, Screen, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { radius, space, useColors } from "@/lib/theme";
import { plural, t } from "@/lib/i18n";

interface Step {
  exerciseId: string;
  name: string;
  amount: number;
  unit: "reps" | "seconds";
  restSec: number;
  round: number;
  rounds: number;
}

interface Session {
  day: number;
  title: string;
  minutes: number;
  rounds: number;
  done: boolean;
  steps: Step[];
  exercises: { id: string; name: string; warmup: boolean; amount: number; unit: "reps" | "seconds"; restSec: number; steps: string[]; tips: string[]; easier: string | null }[];
}

export default function SessionScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const { data, error, loading, reload } = useApi<Session>(`/sport/${day}`);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? t("Pas de connexion internet.", "No internet connection.") : t("Cette séance n'est pas disponible.", "This workout isn't available.")} onRetry={reload} />;

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: data.title }} />
      <T variant="small">{data.minutes} min · {data.rounds} {plural(data.rounds, ["tour", "tours"], ["round", "rounds"])}</T>
      <GuidedSession steps={data.steps} day={data.day} />
      <T variant="small">{t("Arrête-toi en cas de douleur ou de malaise. Adapte le rythme : mieux vaut un mouvement propre qu'un mouvement rapide.", "Stop if you feel pain or unwell. Adjust the pace: a clean movement beats a fast one.")}</T>
      {data.exercises.map((x, i) => (
        <Card key={`${x.id}-${i}`}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
            <T variant="h2" style={{ flex: 1 }}>{x.warmup ? `${t("Échauffement", "Warm-up")} · ${x.name}` : x.name}</T>
            <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>
              {x.unit === "seconds" ? `${x.amount} s` : `${x.amount} ${t("répét.", "reps")}`}
              {x.restSec ? ` · ${t("repos", "rest")} ${x.restSec} s` : ""}
            </T>
          </View>
          <ExerciseDemo exerciseId={x.id} label={t("Démonstration : {0}", "Demonstration: {0}", [x.name])} style={{ maxHeight: 220 }} />
          {x.steps.map((s, k) => (
            <T key={k} variant="small" tone="encre">{k + 1}. {s}</T>
          ))}
          {x.tips.length > 0 && (
            <Notice tone="basilic">
              <T variant="small" style={{ fontWeight: "700" }}>{t("Astuce : ", "Tip: ")}</T>
              {x.tips.join(" ")}
            </Notice>
          )}
          {x.easier && <T variant="small">{t("Trop difficile ? Remplace par : {0}.", "Too hard? Swap for: {0}.", [x.easier])}</T>}
        </Card>
      ))}
    </Screen>
  );
}

/** Step-by-step player: timers for timed exercises and rest periods (same as the website). */
function GuidedSession({ steps, day }: { steps: Step[]; day: number }) {
  const c = useColors();
  const [index, setIndex] = useState(-1);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const current = steps[index];

  const next = () => {
    if (current && phase === "work" && current.restSec > 0) {
      setPhase("rest");
      setLeft(current.restSec);
      setRunning(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    const n = index + 1;
    if (n >= steps.length) {
      setFinished(true);
      setRunning(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void api.action("toggleWorkout", { day, done: true }).catch(() => undefined);
      return;
    }
    setIndex(n);
    setPhase("work");
    const s = steps[n]!;
    setLeft(s.unit === "seconds" ? s.amount : 0);
    setRunning(s.unit === "seconds");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // The countdown calls the latest `next` when it reaches zero.
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setTimeout(() => nextRef.current(), 0);
          return 0;
        }
        if (v <= 4) void Haptics.selectionAsync();
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  if (finished) {
    return (
      <View style={{ backgroundColor: c.basilic, borderRadius: radius.lg, padding: space.xl, alignItems: "center", gap: space.sm }}>
        <T variant="title" style={{ color: c.surface }}>{t("Bravo !", "Well done!")}</T>
        <T style={{ color: c.surface, textAlign: "center" }}>{t("Séance terminée et cochée dans ton programme.", "Workout finished and ticked in your programme.")}</T>
      </View>
    );
  }
  if (index < 0) {
    return <Button variant="accent" onPress={next} icon={<Play size={18} color={c.onAbricot} />}>{t("Démarrer la séance guidée", "Start the guided workout")}</Button>;
  }
  const upcoming = steps[index + 1];
  return (
    <View style={{ backgroundColor: phase === "rest" ? c.eauSoft : c.basilicSoft, borderRadius: radius.lg, padding: space.lg, gap: space.md, alignItems: "center" }} accessibilityLiveRegion="polite">
      <KeepAwake />
      <T variant="label">
        {phase === "rest" ? t("Repos", "Rest") : `${t("Tour", "Round")} ${current!.round} / ${current!.rounds}`} · {index + 1}/{steps.length}
      </T>
      <T variant="title" style={{ textAlign: "center" }}>{phase === "rest" ? t("Respire", "Breathe") : current!.name}</T>
      {phase === "work" ? (
        <ExerciseDemo key={index} exerciseId={current!.exerciseId} label={t("Démonstration : {0}", "Demonstration: {0}", [current!.name])} background={c.surface} style={{ maxWidth: 300 }} />
      ) : (
        upcoming && <ExerciseDemo key={`next-${index}`} exerciseId={upcoming.exerciseId} label={t("Démonstration : {0}", "Demonstration: {0}", [upcoming.name])} background={c.surface} style={{ maxWidth: 180, opacity: 0.8 }} />
      )}
      <T style={{ fontSize: 56, fontWeight: "800", fontVariant: ["tabular-nums"], lineHeight: 64 }}>
        {phase === "rest" || current!.unit === "seconds" ? `${left}s` : `× ${current!.amount}`}
      </T>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {(phase === "rest" || current!.unit === "seconds") && (
          <Button variant="secondary" onPress={() => setRunning(!running)} icon={running ? <Pause size={16} color={c.encre} /> : <Play size={16} color={c.encre} />}>
            {running ? t("Pause", "Pause") : t("Reprendre", "Resume")}
          </Button>
        )}
        <Button onPress={() => { setRunning(false); setLeft(0); next(); }} icon={<SkipForward size={16} color={c.surface} />}>
          {phase === "rest" ? t("Passer le repos", "Skip the rest") : t("Suivant", "Next")}
        </Button>
      </View>
      {phase === "rest" && upcoming && <T variant="small">{t("Ensuite :", "Next:")} {upcoming.name}</T>}
    </View>
  );
}

/** The screen stays on during the guided session. */
function KeepAwake() {
  useKeepAwake();
  return null;
}
