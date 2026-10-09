import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { Check, Clock, Droplet, MessageCircle, Minus, Plus, TrendingUp, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorView, IconButton, Loading, Notice, ProgressBar, Ring, Screen, SectionTitle, T } from "@/components/ui";
import { QuickAdjust } from "@/components/quick-adjust";
import { Thumb } from "@/components/thumb";
import { api, useApi } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useMe } from "@/lib/me";
import { euro, longDate, MEAL_LABEL, num } from "@/lib/format";
import { space, useColors } from "@/lib/theme";

interface Today {
  date: string;
  day: number;
  name: string;
  premium: boolean;
  hasPlan: boolean;
  notices: string[];
  meals: { meal: string; kind: string; recipeId: string | null; name: string | null; kcal: number | null; minutes: number | null; servings: number; photo: string | null; eaten: boolean }[];
  energy: { kcal: number; target: number; protein: number; proteinTarget: number } | null;
  water: { ml: number; target: number };
  workout: { type: string; title?: string; minutes?: number; done?: boolean } | null;
  budget: { cost: number; eaten: number; kept: number; budget: number | null; actualSpent: number | null } | null;
}

export default function TodayScreen() {
  const c = useColors();
  const { me } = useMe();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi<Today>("/today");
  const [generating, setGenerating] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? "Pas de connexion internet." : "Le chargement a échoué."} onRetry={reload} />;

  const toggle = async (meal: string) => {
    void Haptics.selectionAsync();
    // Optimistic: tick at once, then sync (the journal and energy are recomputed).
    setData({ ...data, meals: data.meals.map((m) => (m.meal === meal ? { ...m, eaten: !m.eaten } : m)) });
    await api.action("toggleEaten", { day: data.day, meal }).catch(() => undefined);
    await reload();
  };
  const water = async (ml: number) => {
    void Haptics.selectionAsync();
    setData({ ...data, water: { ...data.water, ml: Math.max(0, data.water.ml + ml) } });
    await api.action("addWater", { ml, date: data.date }).catch(() => undefined);
  };
  const generate = async () => {
    setGenerating(true);
    await api.action("generateWeek").catch(() => undefined);
    setGenerating(false);
    await reload();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <T variant="title">Bonjour {data.name} !</T>
          <T variant="small">{longDate(data.date)}</T>
        </View>
        <IconButton label="Coach" icon={<MessageCircle size={20} color={c.basilic} />} onPress={() => router.push("/coach")} />
        <IconButton label="Mes progrès" icon={<TrendingUp size={20} color={c.basilic} />} onPress={() => router.push("/progress")} />
        <IconButton label="Mon compte" icon={<UserRound size={20} color={c.basilic} />} onPress={() => router.push("/account")} />
      </View>

      {me.user.emailVerified === false && <VerifyEmail email={me.user.email} />}

      {data.notices.includes("pregnancy") && <Notice>Pendant la grossesse, Sorloo ne propose jamais de perte de poids. Parle de ton alimentation avec ta sage-femme ou ton médecin.</Notice>}

      {!data.hasPlan ? (
        <EmptyState title="Ta semaine n'est pas encore prête" text="Sorloo prépare tes repas, tes quantités et ta liste de courses en quelques secondes." action={<Button variant="accent" onPress={generate} loading={generating}>Créer ma semaine</Button>} />
      ) : (
        <Card>
          <SectionTitle action={<Link href="/week"><T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Semaine →</T></Link>}>Que manger aujourd'hui ?</SectionTitle>
          {data.meals.map((m) => (
            <View key={m.meal} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Link href={m.recipeId ? `/recipe/${m.recipeId}` : "/week"} asChild>
                <Pressable style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1 }}>
                  <Thumb uri={m.photo} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                      <T variant="label">{MEAL_LABEL[m.meal]}</T>
                      {m.kind === "leftover" && <Badge tone="miel">Restes</Badge>}
                      {m.kind === "external" && <Badge tone="eau">Dehors</Badge>}
                    </View>
                    <T variant="h3" numberOfLines={2}>{m.name ?? "Rien de prévu"}</T>
                    {m.minutes !== null && (
                      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
                        {m.kcal !== null && <T variant="small">{num(m.kcal)} kcal</T>}
                        <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
                          <Clock size={13} color={c.muted} />
                          <T variant="small">{m.minutes} min</T>
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Link>
              {m.name && (
                <Pressable
                  onPress={() => toggle(m.meal)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: m.eaten }}
                  accessibilityLabel={`${MEAL_LABEL[m.meal]} mangé`}
                  hitSlop={8}
                  style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: m.eaten ? c.basilic : c.line, backgroundColor: m.eaten ? c.basilic : "transparent", alignItems: "center", justifyContent: "center" }}
                >
                  {m.eaten && <Check size={18} color={c.surface} strokeWidth={3} />}
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      )}

      {data.hasPlan && (
        <Card>
          <SectionTitle>Un imprévu ?</SectionTitle>
          <QuickAdjust premium={data.premium} onApplied={reload} />
        </Card>
      )}

      <Card>
        <SectionTitle>Où en suis-je ?</SectionTitle>
        {data.energy && (
          <View style={{ flexDirection: "row", gap: space.lg, alignItems: "center" }}>
            <Ring value={data.energy.kcal} max={data.energy.target}>
              <T variant="h2">{num(data.energy.kcal)}</T>
              <T variant="small">/ {num(data.energy.target)} kcal</T>
            </Ring>
            <View style={{ flex: 1, gap: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="small">Protéines</T>
                <T variant="small">{data.energy.protein} / {data.energy.proteinTarget} g</T>
              </View>
              <ProgressBar value={data.energy.protein} max={data.energy.proteinTarget} />
              <T variant="small">Coche tes repas : le compteur se met à jour.</T>
            </View>
          </View>
        )}
        <View style={{ gap: space.sm }}>
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
        </View>
      </Card>

      {data.workout && (
        <Card>
          <SectionTitle>Que faire aujourd'hui ?</SectionTitle>
          {data.workout.type === "none" || data.workout.type === "rest" ? (
            <T>Jour de repos. Une petite marche reste une bonne idée !</T>
          ) : (
            <View style={{ gap: 4 }}>
              <T variant="h3">{data.workout.title}</T>
              <T variant="small">{data.workout.minutes} min{data.workout.done ? " · fait ✓" : ""}</T>
              <Button small variant={data.workout.done ? "secondary" : "accent"} style={{ alignSelf: "flex-start", marginTop: space.sm }} onPress={() => router.push("/sport")}>
                {data.workout.done ? "Voir mon programme" : "Voir la séance"}
              </Button>
            </View>
          )}
        </Card>
      )}

      {data.budget && (
        <Card>
          <SectionTitle>Combien me reste-t-il ?</SectionTitle>
          {data.budget.budget ? (
            <View style={{ gap: space.sm }}>
              <T variant="big">{euro(Math.max(0, data.budget.budget - (data.budget.actualSpent ?? data.budget.cost)))}</T>
              <T variant="small">{euro(data.budget.actualSpent ?? data.budget.cost)} sur {euro(data.budget.budget)} cette semaine</T>
              <ProgressBar value={data.budget.actualSpent ?? data.budget.cost} max={data.budget.budget} tone="miel" />
            </View>
          ) : (
            <T variant="small">
              Courses estimées : {euro(data.budget.cost)}
              {data.budget.kept >= 5 ? `, dont ${euro(data.budget.eaten)} consommés cette semaine et ${euro(data.budget.kept)} de produits qui te resteront.` : "."}
            </T>
          )}
        </Card>
      )}
    </Screen>
  );
}

/** Reminder until the email address is confirmed (used to recover the account). */
function VerifyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const resend = async () => {
    setState("sending");
    const res = await authClient.sendVerificationEmail({ email, callbackURL: "/app" }).catch(() => ({ error: true }));
    setState(res?.error ? "error" : "sent");
  };
  return (
    <Notice>
      Confirme ton adresse e-mail : nous t'avons envoyé un lien à {email}.{" "}
      {state === "sent" ? (
        <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>E-mail renvoyé, pense à regarder dans les indésirables.</T>
      ) : state === "error" ? (
        <T variant="small" tone="danger">L'envoi a échoué, réessaie plus tard.</T>
      ) : (
        <T variant="small" tone="basilic" style={{ fontWeight: "700", textDecorationLine: "underline" }} onPress={state === "idle" ? resend : undefined}>Renvoyer l'e-mail</T>
      )}
    </Notice>
  );
}
