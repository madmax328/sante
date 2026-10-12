import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { ErrorView, Loading } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { MeProvider, useMeQuery } from "@/lib/me";
import { useColors } from "@/lib/theme";
import { syncAppleHealth } from "@/lib/health";
import { t } from "@/lib/i18n";
import { scheduleReminders } from "@/lib/reminders";

if (Platform.OS !== "web") {
  // A reminder arriving while the app is open is not shown: the person is already in it.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Notifications only exist in the iOS / Android app (not in the web preview). */
const useLastNotificationResponse = Platform.OS === "web" ? () => null : Notifications.useLastNotificationResponse;

/** Reschedules the reminders when the app opens or leaves, and opens the right screen on tap. */
function useReminders(active: boolean) {
  const response = useLastNotificationResponse();
  useEffect(() => {
    if (!active) return;
    void scheduleReminders();
    const sub = AppState.addEventListener("change", (s) => (s === "active" || s === "background") && void scheduleReminders());
    return () => sub.remove();
  }, [active]);
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (!active || typeof url !== "string" || response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    router.navigate(url as never);
    void Notifications.clearLastNotificationResponseAsync();
  }, [active, response]);
}

/** Imports Apple Santé data when the app opens or comes back, at most every 15 minutes. */
function useHealthSync(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const sync = () => void syncAppleHealth(15 * 60_000).catch(() => undefined);
    sync();
    const sub = AppState.addEventListener("change", (s) => s === "active" && sync());
    return () => sub.remove();
  }, [active]);
}

/** Signed-in area: the questionnaire first, then the app. */
export default function AppLayout() {
  const c = useColors();
  const header = { headerShown: true, headerBackTitle: t("Retour", "Back"), headerTintColor: c.basilic, headerStyle: { backgroundColor: c.riz }, headerTitleStyle: { color: c.encre }, headerShadowVisible: false } as const;
  const { data: me, error, loading, reload } = useMeQuery();
  useHealthSync(!!me?.onboarded);
  useReminders(!!me?.onboarded);
  if (loading && !me) return <Loading />;
  if (error?.status === 401) {
    void authClient.signOut();
    return <Loading />;
  }
  if (!me) return <ErrorView message={t("Impossible de joindre Sorloo. Vérifie ta connexion.", "Can't reach Sorloo. Check your connection.")} onRetry={reload} />;
  return (
    <MeProvider me={me} reload={reload}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={me.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" options={{ ...header, title: "" }} />
          <Stack.Screen name="account" options={{ ...header, title: t("Mon compte", "My account") }} />
          <Stack.Screen name="preferences" options={{ ...header, title: t("Mes préférences", "My preferences") }} />
          <Stack.Screen name="progress" options={{ ...header, title: t("Mes progrès", "My progress") }} />
          <Stack.Screen name="household" options={{ ...header, title: t("Mon foyer", "My household") }} />
          <Stack.Screen name="pantry" options={{ ...header, title: t("Garde-manger", "Pantry") }} />
          <Stack.Screen name="devices" options={{ ...header, title: t("Appareils et santé", "Devices and health") }} />
          <Stack.Screen name="reminders" options={{ ...header, title: t("Rappels", "Reminders") }} />
          <Stack.Screen name="coach" options={{ ...header, title: "Coach" }} />
          <Stack.Screen name="sport/[day]" options={{ ...header, title: t("Séance", "Workout") }} />
          <Stack.Screen name="sport-settings" options={{ ...header, title: t("Mon programme", "My programme") }} />
          <Stack.Screen name="add-food" options={{ ...header, title: t("Ajouter un aliment", "Add a food"), presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={!me.onboarded}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
      </Stack>
    </MeProvider>
  );
}
