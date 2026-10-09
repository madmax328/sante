import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Dumbbell, Footprints, Moon, Settings2, StretchHorizontal, Timer } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorView, Field, IconButton, Loading, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { healthAvailable, healthEnabled } from "@/lib/health";
import { DAY_LABEL, num } from "@/lib/format";
import { space, useColors } from "@/lib/theme";

export interface SportSettings {
  enabled: boolean;
  level: "beginner" | "intermediate" | "advanced";
  availableDays: number[];
  minutesPerSession: number;
  equipment: string[];
  limitations: string[];
}

interface Sport {
  allowed: boolean;
  settings: SportSettings;
  today?: number;
  date?: string;
  week: {
    number: number;
    stepsGoal: number;
    steps: number | null;
    sessions: { day: number; type: "rest" | "walk" | "strength" | "cardio" | "mobility"; title: string; minutes: number; kcal: number; guided: boolean; done: boolean }[];
  } | null;
}

const ICONS = { rest: Moon, walk: Footprints, strength: Dumbbell, cardio: Timer, mobility: StretchHorizontal } as const;

export default function SportScreen() {
  const c = useColors();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<Sport>("/sport");

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <T variant="title">Sport</T>
        {data.week && (
          <T variant="small">
            Semaine {data.week.number} · {data.week.sessions.filter((s) => s.done).length} / {data.week.sessions.filter((s) => s.type !== "rest").length} séances
          </T>
        )}
      </View>
      {data.allowed && <IconButton label="Réglages du programme" icon={<Settings2 size={20} color={c.encre} />} onPress={() => router.push("/sport-settings")} />}
    </View>
  );

  if (!data.allowed) {
    return (
      <Screen>
        {header}
        <EmptyState title="Ton programme sportif" text="Avec Sorloo Premium, tu reçois des séances adaptées à ton niveau, ton matériel et tes disponibilités, avec des exercices guidés et animés." />
      </Screen>
    );
  }
  if (!data.week) {
    return (
      <Screen>
        {header}
        <EmptyState title="Le programme sportif est désactivé" text="Active-le et choisis tes jours : Sorloo prépare tes séances de la semaine." action={<Button onPress={() => router.push("/sport-settings")}>Régler mon programme</Button>} />
      </Screen>
    );
  }

  const toggle = async (day: number, done: boolean) => {
    void Haptics.selectionAsync();
    setData({ ...data, week: { ...data.week!, sessions: data.week!.sessions.map((s) => (s.day === day ? { ...s, done } : s)) } });
    await api.action("toggleWorkout", { day, done }).catch(() => undefined);
    await reload();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      {data.week.sessions.map((s) => {
        const Icon = ICONS[s.type];
        const isToday = s.day === data.today;
        return (
          <Card key={s.day} style={isToday ? { borderColor: c.abricot, borderWidth: 2 } : undefined}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Icon size={24} color={s.type === "rest" ? c.muted : c.basilic} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <T variant="label">{DAY_LABEL[s.day]}</T>
                  {isToday && <Badge tone="abricot">Aujourd'hui</Badge>}
                </View>
                <T variant="h3">{s.title}</T>
                {s.type !== "rest" && <T variant="small">{s.minutes} min · environ {num(s.kcal)} kcal</T>}
              </View>
              {s.type !== "rest" && (
                <Pressable
                  onPress={() => toggle(s.day, !s.done)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done }}
                  accessibilityLabel={`Séance de ${DAY_LABEL[s.day]} faite`}
                  hitSlop={8}
                  style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: s.done ? c.basilic : c.line, backgroundColor: s.done ? c.basilic : "transparent", alignItems: "center", justifyContent: "center" }}
                >
                  {s.done && <Check size={18} color={c.surface} strokeWidth={3} />}
                </Pressable>
              )}
            </View>
            {s.guided && (
              <Button small variant={isToday && !s.done ? "accent" : "secondary"} style={{ alignSelf: "flex-start" }} onPress={() => router.push(`/sport/${s.day}`)}>
                {isToday && !s.done ? "Commencer la séance" : "Voir la séance"}
              </Button>
            )}
          </Card>
        );
      })}
      <Steps date={data.date!} goal={data.week.stepsGoal} initial={data.week.steps} />
    </Screen>
  );
}

function Steps({ date, goal, initial }: { date: string; goal: number; initial: number | null }) {
  const c = useColors();
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [saved, setSaved] = useState(false);
  const [synced, setSynced] = useState(false);
  useEffect(() => setValue(initial ? String(initial) : ""), [initial]);
  useEffect(() => {
    void healthEnabled().then(setSynced);
  }, []);
  const save = async () => {
    const steps = Math.round(Number(value) || 0);
    await api.action("setSteps", { date, steps }).catch(() => undefined);
    setSaved(true);
    void Haptics.selectionAsync();
  };
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Footprints size={20} color={c.basilic} />
        <SectionTitle>Mes pas</SectionTitle>
      </View>
      <T variant="small">Objectif : {num(goal)} pas par jour.</T>
      {healthAvailable() &&
        (synced ? (
          <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Comptés automatiquement avec Apple Santé.</T>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push("/devices")}>
            <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Connecte Apple Santé pour les compter automatiquement →</T>
          </Pressable>
        ))}
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field label="Pas aujourd'hui" value={value} onChangeText={(v) => { setValue(v); setSaved(false); }} keyboardType="number-pad" />
        </View>
        <Button variant="secondary" onPress={save}>{saved ? "Enregistré" : "Enregistrer"}</Button>
      </View>
    </Card>
  );
}
