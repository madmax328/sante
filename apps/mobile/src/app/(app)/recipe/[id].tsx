import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Clock, Minus, Plus, ThumbsDown, ThumbsUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, ErrorView, Loading, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { euro, num, quantity } from "@/lib/format";
import { radius, space, useColors } from "@/lib/theme";
import { plural, t } from "@/lib/i18n";

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  totalMin: number;
  prepMin: number;
  cookMin: number;
  cost: number;
  photo: { url: string; photographer: string; photographerUrl: string; sourceUrl: string; source: string } | null;
  ingredients: { id: string; name: string; plural: string | null; qty: number; unit: "g" | "ml" | "pc"; staple: boolean }[];
  steps: string[];
  nutrition: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugars: number; salt: number } | null;
  allergens: string[];
  omitted: string[];
  disliked: string[];
  rating: "liked" | "disliked" | "none";
}

export default function RecipeScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload, setData } = useApi<Recipe>(`/recipes/${encodeURIComponent(id)}`);
  const [servings, setServings] = useState(1);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorView message={error?.status === 404 ? t("Recette introuvable.", "Recipe not found.") : t("Le chargement a échoué.", "Loading failed.")} onRetry={reload} />;

  const rate = async (rating: "liked" | "disliked") => {
    const next = data.rating === rating ? "none" : rating;
    setData({ ...data, rating: next });
    await api.action("rateRecipe", { recipeId: data.id, rating: next }).catch(() => undefined);
  };
  const main = data.ingredients.filter((i) => !i.staple);
  const staples = data.ingredients.filter((i) => i.staple);

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Screen padTop={false}>
        {data.photo ? (
          <View style={{ gap: 4 }}>
            <Image source={{ uri: data.photo.url }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg }} contentFit="cover" transition={200} />
            <Pressable onPress={() => WebBrowser.openBrowserAsync(data.photo!.photographerUrl)}>
              <T variant="small">{t("Photo :", "Photo:")} {data.photo.photographer} · {data.photo.source === "unsplash" ? "Unsplash" : "Pexels"}</T>
            </Pressable>
          </View>
        ) : null}
        <View style={{ gap: space.sm }}>
          <T variant="title">{data.name}</T>
          {data.description && <T variant="small">{data.description}</T>}
          <View style={{ flexDirection: "row", gap: space.lg, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Clock size={15} color={c.muted} /><T variant="small">{data.totalMin} min</T></View>
            <T variant="small">{euro(data.cost)} / portion</T>
            {data.nutrition && <T variant="small">{num(data.nutrition.kcal)} kcal / portion</T>}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button small variant={data.rating === "liked" ? "primary" : "secondary"} onPress={() => rate("liked")} icon={<ThumbsUp size={16} color={data.rating === "liked" ? c.surface : c.encre} />}>{t("J'aime", "I like it")}</Button>
            <Button small variant={data.rating === "disliked" ? "danger" : "secondary"} onPress={() => rate("disliked")} icon={<ThumbsDown size={16} color={data.rating === "disliked" ? c.surface : c.encre} />}>{t("Pas pour moi", "Not for me")}</Button>
          </View>
        </View>

        {data.disliked.length > 0 && <Notice>{t("Contient un aliment que tu ne manges pas : {0}.", "Contains a food you don't eat: {0}.", [data.disliked.join(", ")])}</Notice>}
        {data.omitted.length > 0 && <Notice tone="basilic">{t("Adaptée pour toi : sans {0}. Passe simplement les étapes qui en parlent.", "Adapted for you: without {0}. Just skip the steps that mention it.", [data.omitted.join(", ")])}</Notice>}

        <Card>
          <SectionTitle
            action={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Pressable accessibilityLabel={t("Une portion de moins", "One serving less")} onPress={() => setServings(Math.max(1, servings - 1))} style={{ padding: 6 }}><Minus size={18} color={c.encre} /></Pressable>
                <T variant="h3">{servings} {plural(servings, ["portion", "portions"], ["serving", "servings"])}</T>
                <Pressable accessibilityLabel={t("Une portion de plus", "One serving more")} onPress={() => setServings(Math.min(12, servings + 1))} style={{ padding: 6 }}><Plus size={18} color={c.encre} /></Pressable>
              </View>
            }
          >
            {t("Ingrédients", "Ingredients")}
          </SectionTitle>
          {main.map((i) => <T key={i.id}>• {quantity(i.qty, i.unit, i.name, i.plural, servings)}</T>)}
          {staples.length > 0 && <T variant="small">{t("Placard :", "Cupboard:")} {staples.map((i) => i.name.toLowerCase()).join(", ")}</T>}
          {data.allergens.length > 0 && <T variant="small">{t("Allergènes :", "Allergens:")} {data.allergens.join(", ")}</T>}
        </Card>

        <Card>
          <SectionTitle>{t("Préparation", "Method")}</SectionTitle>
          {data.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space.md }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.basilicSoft, alignItems: "center", justifyContent: "center" }}>
                <T variant="small" tone="basilic" style={{ fontWeight: "800" }}>{i + 1}</T>
              </View>
              <T style={{ flex: 1 }}>{s}</T>
            </View>
          ))}
        </Card>

        {data.nutrition && (
          <Card>
            <SectionTitle>{t("Valeurs par portion", "Per serving")}</SectionTitle>
            {[
              [t("Énergie", "Energy"), `${num(data.nutrition.kcal)} kcal`],
              [t("Protéines", "Protein"), `${num(data.nutrition.protein, 1)} g`],
              [t("Glucides", "Carbs"), `${num(data.nutrition.carbs, 1)} g`],
              [t("dont sucres", "of which sugars"), `${num(data.nutrition.sugars, 1)} g`],
              [t("Lipides", "Fat"), `${num(data.nutrition.fat, 1)} g`],
              [t("Fibres", "Fibre"), `${num(data.nutrition.fiber, 1)} g`],
              [t("Sel", "Salt"), `${num(data.nutrition.salt, 1)} g`],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="small">{k}</T>
                <T variant="small" tone="encre" style={{ fontWeight: "700" }}>{v}</T>
              </View>
            ))}
            <T variant="small">{t("Calculées à partir de la table CIQUAL (ANSES).", "Calculated from the CIQUAL table (ANSES).")}</T>
          </Card>
        )}
      </Screen>
    </>
  );
}
