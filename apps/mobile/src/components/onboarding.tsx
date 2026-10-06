import { useState } from "react";
import { KeyboardAvoidingView, Platform, Switch, View } from "react-native";
import { Button, Card, Chip, Field, Notice, ProgressBar, Screen, T } from "./ui";
import { api } from "@/lib/api";
import { L } from "@/lib/labels";
import { useMe } from "@/lib/me";
import { space, useColors } from "@/lib/theme";

type Key<T> = keyof T & string;
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const STEPS = ["you", "goal", "health", "food", "sport"] as const;
type Step = (typeof STEPS)[number];

/** "16/04/1990" → "1990-04-16" */
function isoDate(text: string): string | null {
  const m = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

function Chips<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
      {(Object.keys(options) as T[]).map((k) => <Chip key={k} label={options[k]} active={value === k} onPress={() => onChange(k)} />)}
    </View>
  );
}

function MultiChips<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
      {(Object.keys(options) as T[]).map((k) => <Chip key={k} label={options[k]} active={value.includes(k)} onPress={() => onChange(toggle(value, k))} />)}
    </View>
  );
}

function Group({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ gap: space.sm }}>
      <T variant="h3">{label}</T>
      {children}
      {hint ? <T variant="small">{hint}</T> : null}
    </View>
  );
}

/** The website's questionnaire, essentials only (household and budget can be set on the website later). */
export function Onboarding() {
  const c = useColors();
  const { me, reload } = useMe();
  const [step, setStep] = useState<Step>("you");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const [sex, setSex] = useState<"female" | "male">();
  const [birth, setBirth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Key<typeof L.activity>>("light");
  const [goal, setGoal] = useState<Key<typeof L.goal>>("eat_better");
  const [target, setTarget] = useState("");
  const [pace, setPace] = useState<"gentle" | "moderate">("gentle");
  const [allergies, setAllergies] = useState<Key<typeof L.allergen>[]>([]);
  const [pregnancy, setPregnancy] = useState<Key<typeof L.pregnancy>>("none");
  const [medical, setMedical] = useState<Key<typeof L.medical>[]>([]);
  const [consent, setConsent] = useState(false);
  const [diet, setDiet] = useState<Key<typeof L.diet>>("omnivore");
  const [veggies, setVeggies] = useState<"more" | "normal" | "less">("normal");
  const [avoid, setAvoid] = useState<Key<typeof L.avoid>[]>([]);
  const [weekday, setWeekday] = useState("30");
  const [equipment, setEquipment] = useState<Key<typeof L.equipment>[]>(["oven", "microwave"]);
  const [leftovers, setLeftovers] = useState(true);
  const [sport, setSport] = useState(true);
  const [level, setLevel] = useState<Key<typeof L.level>>("beginner");
  const [days, setDays] = useState<number[]>([0, 2, 4]);
  const [minutes, setMinutes] = useState(20);

  const index = STEPS.indexOf(step);
  const valid = (): string | null => {
    if (step === "you") {
      if (!sex) return "Indique ton sexe (pour le calcul des besoins).";
      if (!isoDate(birth)) return "Date de naissance au format JJ/MM/AAAA.";
      const h = Number(height), w = Number(weight.replace(",", "."));
      if (!(h >= 100 && h <= 250)) return "Taille en cm, entre 100 et 250.";
      if (!(w >= 25 && w <= 350)) return "Poids en kg, entre 25 et 350.";
    }
    if (step === "health" && !consent) return "Ton accord est nécessaire pour calculer tes besoins.";
    return null;
  };

  const next = async () => {
    const problem = valid();
    if (problem) return setError(problem);
    setError(undefined);
    if (index < STEPS.length - 1) return setStep(STEPS[index + 1]!);
    setPending(true);
    const res = await api
      .action<{ ok: boolean; error?: string }>("completeOnboarding", {
        self: {
          name: me.user.name || "Moi",
          sex,
          birthDate: isoDate(birth),
          heightCm: Number(height),
          weightKg: Number(weight.replace(",", ".")),
          activity,
          goal,
          targetWeightKg: target ? Number(target.replace(",", ".")) : undefined,
          pace,
          allergies,
          eats: { breakfast: true, lunch: true, dinner: true, snack: true },
          pregnancy: sex === "female" ? pregnancy : "none",
          medical,
        },
        members: [],
        prefs: { diet, veggies, avoid, dislikedIngredients: [], maxMinutesWeekday: Number(weekday) || 30, maxMinutesWeekend: 60, equipment, leftovers, snacks: true },
        budget: { enabled: false, weekly: 70 },
        sport: { enabled: sport, level, availableDays: days, minutesPerSession: minutes, equipment: [], limitations: [] },
        consentHealth: true,
      })
      .catch(() => null);
    setPending(false);
    if (!res?.ok) {
      return setError(res?.error === "too_young" ? "Weeko est réservé aux personnes de 15 ans et plus." : "L'enregistrement a échoué. Vérifie tes réponses et réessaie.");
    }
    await reload();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ gap: space.sm }}>
          <T variant="label">Étape {index + 1} sur {STEPS.length}</T>
          <ProgressBar value={index + 1} max={STEPS.length} />
        </View>

        {step === "you" && (
          <Card>
            <T variant="title">Faisons connaissance</T>
            <T variant="small">Pour calculer des quantités adaptées à toi.</T>
            <Group label="Sexe">
              <Chips<"female" | "male"> options={{ female: "Femme", male: "Homme" }} value={sex} onChange={setSex} />
            </Group>
            <Field label="Date de naissance (JJ/MM/AAAA)" value={birth} onChangeText={setBirth} keyboardType="numbers-and-punctuation" placeholder="16/04/1990" />
            <View style={{ flexDirection: "row", gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Taille (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Poids (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
            </View>
            <Group label="Activité au quotidien (hors sport)">
              <Chips options={L.activity} value={activity} onChange={setActivity} />
            </Group>
          </Card>
        )}

        {step === "goal" && (
          <Card>
            <T variant="title">Ton objectif</T>
            <Chips options={L.goal} value={goal} onChange={setGoal} />
            {(goal === "lose_weight" || goal === "gain_muscle") && (
              <>
                <Field label="Poids visé (facultatif)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
                <Group label="Rythme">
                  <Chips options={{ gentle: "Doux (recommandé)", moderate: "Modéré" }} value={pace} onChange={setPace} />
                </Group>
              </>
            )}
          </Card>
        )}

        {step === "health" && (
          <Card>
            <T variant="title">Ta santé d'abord</T>
            <T variant="small">Certaines situations demandent un suivi professionnel : on adapte le programme en conséquence.</T>
            <Group label="Allergies et intolérances"><MultiChips options={L.allergen} value={allergies} onChange={setAllergies} /></Group>
            {sex === "female" && <Group label="Grossesse ou allaitement"><Chips options={L.pregnancy} value={pregnancy} onChange={setPregnancy} /></Group>}
            <Group label="Situations particulières (facultatif)" hint="Si tu coches une situation, Weeko reste prudent et te recommande d'en parler à un professionnel de santé.">
              <MultiChips options={L.medical} value={medical} onChange={setMedical} />
            </Group>
            <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ true: c.basilic }} accessibilityLabel="Consentement données de santé" />
              <T variant="small" style={{ flex: 1 }}>
                J'accepte que Weeko traite mes données de santé (poids, taille, allergies, situations déclarées) pour personnaliser mes menus et mon programme. Ces données sont chiffrées, jamais vendues, et je peux retirer mon consentement ou les supprimer à tout moment.
              </T>
            </View>
          </Card>
        )}

        {step === "food" && (
          <Card>
            <T variant="title">Tes habitudes</T>
            <Group label="Régime" hint={diet === "flexitarian" ? "De la viande 3 fois par semaine au maximum." : undefined}><Chips options={L.diet} value={diet} onChange={setDiet} /></Group>
            <Group label="Les légumes"><Chips options={{ more: "J'adore", normal: "Normal", less: "Pas trop" }} value={veggies} onChange={setVeggies} /></Group>
            <Group label="À éviter"><MultiChips options={L.avoid} value={avoid} onChange={setAvoid} /></Group>
            <Field label="Temps de cuisine max en semaine (min)" value={weekday} onChangeText={setWeekday} keyboardType="number-pad" />
            <Group label="Équipement"><MultiChips options={L.equipment} value={equipment} onChange={setEquipment} /></Group>
            <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
              <Switch value={leftovers} onValueChange={setLeftovers} trackColor={{ true: c.basilic }} accessibilityLabel="Cuisiner une fois, manger deux fois" />
              <T variant="small" style={{ flex: 1 }}>Cuisiner une fois, manger deux fois : certains dîners servent aussi de déjeuner le lendemain.</T>
            </View>
            <T variant="small">Aliments refusés, foyer et budget : réglables ensuite depuis ton compte.</T>
          </Card>
        )}

        {step === "sport" && (
          <Card>
            <T variant="title">Le sport</T>
            <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
              <Switch value={sport} onValueChange={setSport} trackColor={{ true: c.basilic }} accessibilityLabel="Programme sportif" />
              <T style={{ flex: 1 }}>Je veux un programme sportif adapté</T>
            </View>
            {sport && (
              <>
                <Group label="Niveau"><Chips options={L.level} value={level} onChange={setLevel} /></Group>
                <Group label="Jours disponibles">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => <Chip key={d} label={d} active={days.includes(i)} onPress={() => setDays(toggle(days, i).sort())} />)}
                  </View>
                </Group>
                <Group label="Durée d'une séance">
                  <View style={{ flexDirection: "row", gap: space.sm }}>
                    {[15, 20, 30, 45].map((m) => <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />)}
                  </View>
                </Group>
              </>
            )}
          </Card>
        )}

        {error && <Notice tone="danger">{error}</Notice>}
        <View style={{ flexDirection: "row", gap: space.md }}>
          {index > 0 && <Button variant="ghost" onPress={() => setStep(STEPS[index - 1]!)}>Retour</Button>}
          <Button variant={index === STEPS.length - 1 ? "accent" : "primary"} onPress={next} loading={pending} style={{ flex: 1 }}>
            {index === STEPS.length - 1 ? "Créer ma semaine" : "Continuer"}
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
