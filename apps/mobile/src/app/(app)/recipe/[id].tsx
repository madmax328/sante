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
  if (!data) return <ErrorView message={error?.status === 404 ? "Recette introuvable." : "Le chargement a échoué."} onRetry={reload} />;

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
              <T variant="small">Photo : {data.photo.photographer} · {data.photo.source === "unsplash" ? "Unsplash" : "Pexels"}</T>
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
            <Button small variant={data.rating === "liked" ? "primary" : "secondary"} onPress={() => rate("liked")} icon={<ThumbsUp size={16} color={data.rating === "liked" ? c.surface : c.encre} />}>J'aime</Button>
            <Button small variant={data.rating === "disliked" ? "danger" : "secondary"} onPress={() => rate("disliked")} icon={<ThumbsDown size={16} color={data.rating === "disliked" ? c.surface : c.encre} />}>Pas pour moi</Button>
          </View>
        </View>

        {data.disliked.length > 0 && <Notice>Contient un aliment que tu ne manges pas : {data.disliked.join(", ")}.</Notice>}
        {data.omitted.length > 0 && <Notice tone="basilic">Adaptée pour toi : sans {data.omitted.join(", ")}. Passe simplement les étapes qui en parlent.</Notice>}

        <Card>
          <SectionTitle
            action={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Pressable accessibilityLabel="Une portion de moins" onPress={() => setServings(Math.max(1, servings - 1))} style={{ padding: 6 }}><Minus size={18} color={c.encre} /></Pressable>
                <T variant="h3">{servings} {servings > 1 ? "portions" : "portion"}</T>
                <Pressable accessibilityLabel="Une portion de plus" onPress={() => setServings(Math.min(12, servings + 1))} style={{ padding: 6 }}><Plus size={18} color={c.encre} /></Pressable>
              </View>
            }
          >
            Ingrédients
          </SectionTitle>
          {main.map((i) => <T key={i.id}>• {quantity(i.qty, i.unit, i.name, i.plural, servings)}</T>)}
          {staples.length > 0 && <T variant="small">Placard : {staples.map((i) => i.name.toLowerCase()).join(", ")}</T>}
          {data.allergens.length > 0 && <T variant="small">Allergènes : {data.allergens.join(", ")}</T>}
        </Card>

        <Card>
          <SectionTitle>Préparation</SectionTitle>
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
            <SectionTitle>Valeurs par portion</SectionTitle>
            {[
              ["Énergie", `${num(data.nutrition.kcal)} kcal`],
              ["Protéines", `${num(data.nutrition.protein, 1)} g`],
              ["Glucides", `${num(data.nutrition.carbs, 1)} g`],
              ["dont sucres", `${num(data.nutrition.sugars, 1)} g`],
              ["Lipides", `${num(data.nutrition.fat, 1)} g`],
              ["Fibres", `${num(data.nutrition.fiber, 1)} g`],
              ["Sel", `${num(data.nutrition.salt, 1)} g`],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="small">{k}</T>
                <T variant="small" tone="encre" style={{ fontWeight: "700" }}>{v}</T>
              </View>
            ))}
            <T variant="small">Calculées à partir de la table CIQUAL (ANSES).</T>
          </Card>
        )}
      </Screen>
    </>
  );
}
