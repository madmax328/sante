import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Camera, ImageIcon, Sparkles, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Badge, Button, Card, Notice, T } from "@/components/ui";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { t, tn } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { pickPhoto } from "@/lib/photo";
import { radius, space, useColors } from "@/lib/theme";

interface Food {
  name: string;
  grams: number;
  ingredientId: string | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  confidence: "high" | "medium" | "low";
}

type Result = { ok: true; foods: Food[]; note: string | null } | { ok: false; error: "not_food" | "unavailable" | "unclear" | "premium" | "quota" | "invalid" };

const ERRORS: Record<Exclude<Result, { ok: true }>["error"], string> = {
  not_food: t("Je ne vois pas de repas sur cette photo. Essaie avec l'assiette bien visible, vue de dessus.", "I can't see a meal in this photo. Try again with the plate clearly visible, from above."),
  unclear: t("La photo n'est pas assez nette pour reconnaître les aliments. Réessaie avec plus de lumière.", "The photo isn't clear enough to recognise the foods. Try again with more light."),
  unavailable: t("L'analyse n'est pas disponible pour le moment. Réessaie dans un instant ou ajoute tes aliments à la main.", "Analysis isn't available right now. Try again shortly or add your foods by hand."),
  premium: t("La reconnaissance des repas par photo fait partie de Premium.", "Meal photo recognition is part of Premium."),
  quota: t("Tu as utilisé toutes tes analyses IA de ce mois-ci. Elles reviennent le 1er du mois.", "You've used all of this month's AI analyses. They come back on the 1st."),
  invalid: t("Cette photo n'a pas pu être envoyée. Essaie avec une autre.", "This photo couldn't be sent. Try another one."),
};

/** "Photo" tab: take a picture of the plate, check the foods and weights, add them. */
export function PhotoFood({ date, meal, onDone }: { date?: string; meal: string; onDone: () => void }) {
  const c = useColors();
  const { me, reload } = useMe();
  const [uri, setUri] = useState<string>();
  const [analyzing, setAnalyzing] = useState(false);
  const [foods, setFoods] = useState<(Food & { text: string })[]>();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);

  if (!me.premium) {
    return (
      <Card>
        <Sparkles size={24} color={c.basilic} />
        <T variant="h3">{t("Photographie ton assiette, Sorloo note le reste", "Snap your plate, Sorloo logs the rest")}</T>
        <T variant="small">{t("Les aliments et leurs quantités sont reconnus en quelques secondes ; tu vérifies, puis tout s'ajoute à ton journal. Cette fonction fait partie de Premium.", "Foods and portions are recognised in seconds; you check, then everything goes into your journal. This feature is part of Premium.")}</T>
      </Card>
    );
  }

  const start = async (source: "camera" | "library") => {
    setError(undefined);
    const photo = await pickPhoto(source).catch(() => null);
    if (!photo) return;
    setUri(photo.uri);
    setFoods(undefined);
    setAnalyzing(true);
    const res = await api.action<Result>("analyzeMealPhoto", { image: photo.base64, mediaType: "image/jpeg" }).catch(() => null);
    setAnalyzing(false);
    void reload();
    if (!res) return setError(t("Pas de connexion internet.", "No internet connection."));
    if (!res.ok) return setError(ERRORS[res.error] ?? ERRORS.unavailable);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFoods(res.foods.map((f) => ({ ...f, text: String(f.grams) })));
    setNote(res.note);
  };

  const grams = (f: { text: string }) => Math.round(Number(f.text.replace(",", ".")));
  const valid = (foods ?? []).filter((f) => grams(f) >= 1 && grams(f) <= 2000);
  const kcal = (f: Food & { text: string }) => (f.per100.kcal * grams(f)) / 100;
  const total = valid.reduce((s, f) => s + kcal(f), 0);

  const add = async () => {
    setAdding(true);
    const res = await api
      .action<{ ok: boolean }>("addPhotoFoods", { date, meal, foods: valid.map(({ name, ingredientId, per100, ...f }) => ({ name, ingredientId, per100, grams: grams(f) })) })
      .catch(() => null);
    setAdding(false);
    if (!res?.ok) return setError(t("L'ajout a échoué. Réessaie.", "Adding failed. Try again."));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  };

  return (
    <>
      {!uri && (
        <Card>
          <Camera size={24} color={c.basilic} />
          <T variant="h3">{t("Photographie ton assiette", "Take a photo of your plate")}</T>
          <T variant="small">{t("De préférence vue de dessus, avec toute l'assiette dans le cadre. Tu pourras corriger chaque aliment avant de l'ajouter.", "Ideally from above, with the whole plate in frame. You can correct each food before adding it.")}</T>
        </Card>
      )}
      {uri && <Image source={{ uri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" accessibilityLabel={t("Photo du repas", "Meal photo")} />}
      {analyzing && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, justifyContent: "center", padding: space.md }}>
          <ActivityIndicator color={c.basilic} />
          <T variant="small">{t("Je regarde ton assiette…", "Looking at your plate…")}</T>
        </View>
      )}
      {error && <Notice tone="danger">{error}</Notice>}

      {foods && (
        <Card>
          <T variant="h3">{t("Vérifie et corrige", "Check and correct")}</T>
          {foods.map((f, i) => (
            <View key={`${f.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontWeight: "600" }} numberOfLines={2}>{f.name}</T>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  {!me.numbersHidden && <T variant="small">{num(kcal(f))} kcal</T>}
                  {f.confidence === "low" && <Badge tone="miel">{t("À vérifier", "Check")}</Badge>}
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TextInput
                  value={f.text}
                  onChangeText={(text) => setFoods(foods.map((x, j) => (j === i ? { ...x, text } : x)))}
                  keyboardType="number-pad"
                  accessibilityLabel={t("Quantité de {0} en grammes", "{0} amount in grams", [f.name])}
                  style={{ width: 64, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 8, color: c.encre, backgroundColor: c.surface, textAlign: "right", fontSize: 16 }}
                />
                <T variant="small">g</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Retirer {0}", "Remove {0}", [f.name])} hitSlop={8} onPress={() => setFoods(foods.filter((_, j) => j !== i))} style={{ padding: 4 }}>
                <Trash2 size={18} color={c.muted} />
              </Pressable>
            </View>
          ))}
          {note && <T variant="small">{note}</T>}
          <T variant="small">{t("Les quantités sont des estimations : ajuste-les si besoin.", "Amounts are estimates: adjust them if needed.")}</T>
          <Button variant="accent" loading={adding} disabled={!valid.length} onPress={add}>
            {me.numbersHidden
              ? tn(valid.length, ["Ajouter {0} aliment", "Ajouter {0} aliments"], ["Add {0} food", "Add {0} foods"])
              : tn(valid.length, ["Ajouter {0} aliment · {1} kcal", "Ajouter {0} aliments · {1} kcal"], ["Add {0} food · {1} kcal", "Add {0} foods · {1} kcal"], [num(total)])}
          </Button>
        </Card>
      )}

      {!analyzing && (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button style={{ flex: 1 }} variant={foods ? "secondary" : "primary"} icon={<Camera size={18} color={foods ? c.encre : c.surface} />} onPress={() => start("camera")}>
            {uri ? t("Reprendre", "Retake") : t("Prendre une photo", "Take a photo")}
          </Button>
          <Button variant="secondary" icon={<ImageIcon size={18} color={c.encre} />} accessibilityLabel={t("Choisir dans mes photos", "Choose from my photos")} onPress={() => start("library")} />
        </View>
      )}
      {me.ai && <T variant="small" style={{ textAlign: "center" }}>{t("{0} analyses IA restantes ce mois-ci", "{0} AI analyses left this month", [me.ai.left])}</T>}
    </>
  );
}
