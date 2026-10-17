import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import { Check, Clock, Droplet, MessageCircle, Minus, Plus, TrendingUp, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorView, IconButton, Loading, Notice, ProgressBar, Ring, Screen, SectionTitle, T } from "@/components/ui";
import { useCuisineChoice } from "@/components/cuisine-picker";
import { QuickAdjust } from "@/components/quick-adjust";
import { RemindersPrompt } from "@/components/reminders-prompt";
import { Thumb } from "@/components/thumb";
import { api, useApi } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useMe } from "@/lib/me";
import { euro, longDate, MEAL_LABEL, num } from "@/lib/format";
import { space, useColors } from "@/lib/theme";
import { t } from "@/lib/i18n";

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
  const { ask, sheet } = useCuisineChoice();

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.code === "network" ? t("Pas de connexion internet.", "No internet connection.") : t("Le chargement a échoué.", "Loading failed.")} onRetry={reload} />;

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
    const cuisines = await ask();
    if (!cuisines) return;
    setGenerating(true);
    await api.action("generateWeek", { cuisines }).catch(() => undefined);
    setGenerating(false);
    await reload();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {sheet}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <T variant="title">{t("Bonjour {0} !", "Hello {0}!", [data.name])}</T>
          <T variant="small">{longDate(data.date)}</T>
        </View>
        <IconButton label="Coach" icon={<MessageCircle size={20} color={c.basilic} />} onPress={() => router.push("/coach")} />
        <IconButton label={t("Mes progrès", "My progress")} icon={<TrendingUp size={20} color={c.basilic} />} onPress={() => router.push("/progress")} />
        <IconButton label={t("Mon compte", "My account")} icon={<UserRound size={20} color={c.basilic} />} onPress={() => router.push("/account")} />
      </View>

      {me.user.emailVerified === false && <VerifyEmail email={me.user.email} />}
      {data.hasPlan && <RemindersPrompt />}

      {data.notices.includes("pregnancy") && <Notice>{t("Pendant la grossesse, Sorloo ne propose jamais de perte de poids. Parle de ton alimentation avec ta sage-femme ou ton médecin.", "During pregnancy, Sorloo never suggests weight loss. Talk about your diet with your midwife or doctor.")}</Notice>}

      {!data.hasPlan ? (
        <EmptyState title={t("Ta semaine n'est pas encore prête", "Your week isn't ready yet")} text={t("Sorloo prépare tes repas, tes quantités et ta liste de courses en quelques secondes.", "Sorloo prepares your meals, portions and shopping list in seconds.")} action={<Button variant="accent" onPress={generate} loading={generating}>{t("Créer ma semaine", "Create my week")}</Button>} />
      ) : (
        <Card>
          <SectionTitle action={<Link href="/week"><T variant="small" tone="basilic" style={{ fontWeight: "700" }}>{t("Semaine →", "Week →")}</T></Link>}>{t("Que manger aujourd'hui ?", "What should I eat today?")}</SectionTitle>
          {data.meals.map((m) => (
            <View key={m.meal} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Link href={m.recipeId ? `/recipe/${m.recipeId}` : "/week"} asChild>
                <Pressable style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1 }}>
                  <Thumb uri={m.photo} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                      <T variant="label">{MEAL_LABEL[m.meal]}</T>
                      {m.kind === "leftover" && <Badge tone="miel">{t("Restes", "Leftovers")}</Badge>}
                      {m.kind === "external" && <Badge tone="eau">{t("Dehors", "Eating out")}</Badge>}
                    </View>
                    <T variant="h3" numberOfLines={2}>{m.name ?? t("Rien de prévu", "Nothing planned")}</T>
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
                  accessibilityLabel={t("{0} mangé", "{0} eaten", [MEAL_LABEL[m.meal]])}
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
          <SectionTitle>{t("Un imprévu ?", "Something came up?")}</SectionTitle>
          <QuickAdjust premium={data.premium} onApplied={reload} />
        </Card>
      )}

      <Card>
        <SectionTitle>{t("Où en suis-je ?", "How am I doing?")}</SectionTitle>
        {data.energy && (
          <View style={{ flexDirection: "row", gap: space.lg, alignItems: "center" }}>
            <Ring value={data.energy.kcal} max={data.energy.target}>
              <T variant="h2">{num(data.energy.kcal)}</T>
              <T variant="small">/ {num(data.energy.target)} kcal</T>
            </Ring>
            <View style={{ flex: 1, gap: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="small">{t("Protéines", "Protein")}</T>
                <T variant="small">{data.energy.protein} / {data.energy.proteinTarget} g</T>
              </View>
              <ProgressBar value={data.energy.protein} max={data.energy.proteinTarget} />
              <T variant="small">{t("Coche tes repas : le compteur se met à jour.", "Tick your meals: the counter updates.")}</T>
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
              <Button small variant="secondary" onPress={() => water(-250)} disabled={data.water.ml <= 0} icon={<Minus size={16} color={c.encre} />} accessibilityLabel={t("Retirer un verre", "Remove a glass")} />
              <Button small variant="secondary" onPress={() => water(250)} icon={<Plus size={16} color={c.encre} />}>{t("Un verre", "A glass")}</Button>
            </View>
          </View>
          <ProgressBar value={data.water.ml} max={data.water.target} tone="eau" />
        </View>
      </Card>

      {data.workout && (
        <Card>
          <SectionTitle>{t("Que faire aujourd'hui ?", "What should I do today?")}</SectionTitle>
          {data.workout.type === "none" || data.workout.type === "rest" ? (
            <T>{t("Jour de repos. Une petite marche reste une bonne idée !", "Rest day. A short walk is still a good idea!")}</T>
          ) : (
            <View style={{ gap: 4 }}>
              <T variant="h3">{data.workout.title}</T>
              <T variant="small">{data.workout.minutes} min{data.workout.done ? t(" · fait ✓", " · done ✓") : ""}</T>
              <Button small variant={data.workout.done ? "secondary" : "accent"} style={{ alignSelf: "flex-start", marginTop: space.sm }} onPress={() => router.push("/sport")}>
                {data.workout.done ? t("Voir mon programme", "See my programme") : t("Voir la séance", "See the workout")}
              </Button>
            </View>
          )}
        </Card>
      )}

      {data.budget && (
        <Card>
          <SectionTitle>{t("Combien me reste-t-il ?", "How much is left?")}</SectionTitle>
          {data.budget.budget ? (
            <View style={{ gap: space.sm }}>
              <T variant="big">{euro(Math.max(0, data.budget.budget - (data.budget.actualSpent ?? data.budget.cost)))}</T>
              <T variant="small">{t("{0} sur {1} cette semaine", "{0} of {1} this week", [euro(data.budget.actualSpent ?? data.budget.cost), euro(data.budget.budget)])}</T>
              <ProgressBar value={data.budget.actualSpent ?? data.budget.cost} max={data.budget.budget} tone="miel" />
            </View>
          ) : (
            <T variant="small">
              {t("Courses estimées : {0}", "Estimated groceries: {0}", [euro(data.budget.cost)])}
              {data.budget.kept >= 5 ? t(", dont {0} consommés cette semaine et {1} de produits qui te resteront.", ", including {0} eaten this week and {1} of food you'll have left.", [euro(data.budget.eaten), euro(data.budget.kept)]) : "."}
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
      {t("Confirme ton adresse e-mail : nous t'avons envoyé un lien à {0}.", "Confirm your email address: we sent a link to {0}.", [email])}{" "}
      {state === "sent" ? (
        <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>{t("E-mail renvoyé, pense à regarder dans les indésirables.", "Email sent again, check your spam folder.")}</T>
      ) : state === "error" ? (
        <T variant="small" tone="danger">{t("L'envoi a échoué, réessaie plus tard.", "Sending failed, try again later.")}</T>
      ) : (
        <T variant="small" tone="basilic" style={{ fontWeight: "700", textDecorationLine: "underline" }} onPress={state === "idle" ? resend : undefined}>{t("Renvoyer l'e-mail", "Resend the email")}</T>
      )}
    </Notice>
  );
}
