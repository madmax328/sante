import { Stack } from "expo-router";
import { ErrorView, Loading } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { MeProvider, useMeQuery } from "@/lib/me";
import { useColors } from "@/lib/theme";

/** Signed-in area: the questionnaire first, then the app. */
export default function AppLayout() {
  const c = useColors();
  const header = { headerShown: true, headerBackTitle: "Retour", headerTintColor: c.basilic, headerStyle: { backgroundColor: c.riz }, headerTitleStyle: { color: c.encre }, headerShadowVisible: false } as const;
  const { data: me, error, loading, reload } = useMeQuery();
  if (loading && !me) return <Loading />;
  if (error?.status === 401) {
    void authClient.signOut();
    return <Loading />;
  }
  if (!me) return <ErrorView message="Impossible de joindre Sorloo. Vérifie ta connexion." onRetry={reload} />;
  return (
    <MeProvider me={me} reload={reload}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={me.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" options={{ ...header, title: "" }} />
          <Stack.Screen name="account" options={{ ...header, title: "Mon compte" }} />
          <Stack.Screen name="preferences" options={{ ...header, title: "Mes préférences" }} />
          <Stack.Screen name="progress" options={{ ...header, title: "Mes progrès" }} />
          <Stack.Screen name="household" options={{ ...header, title: "Mon foyer" }} />
          <Stack.Screen name="pantry" options={{ ...header, title: "Garde-manger" }} />
          <Stack.Screen name="coach" options={{ ...header, title: "Coach" }} />
          <Stack.Screen name="sport/[day]" options={{ ...header, title: "Séance" }} />
          <Stack.Screen name="sport-settings" options={{ ...header, title: "Mon programme" }} />
          <Stack.Screen name="add-food" options={{ ...header, title: "Ajouter un aliment", presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={!me.onboarded}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
    </MeProvider>
  );
}
