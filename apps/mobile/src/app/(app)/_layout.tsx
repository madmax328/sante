import { Stack } from "expo-router";
import { ErrorView, Loading } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { MeProvider, useMeQuery } from "@/lib/me";

/** Signed-in area: the questionnaire first, then the app. */
export default function AppLayout() {
  const { data: me, error, loading, reload } = useMeQuery();
  if (loading && !me) return <Loading />;
  if (error?.status === 401) {
    void authClient.signOut();
    return <Loading />;
  }
  if (!me) return <ErrorView message="Impossible de joindre Weeko. Vérifie ta connexion." onRetry={reload} />;
  return (
    <MeProvider me={me} reload={reload}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={me.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: "", headerBackTitle: "Retour" }} />
        </Stack.Protected>
        <Stack.Protected guard={!me.onboarded}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
    </MeProvider>
  );
}
