import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Button, T } from "@/components/ui";
import { intlLocale, lang, t } from "@/lib/i18n";
import { space } from "@/lib/theme";

/**
 * Which version is running (the build, and the over-the-air update if any),
 * with a button to fetch and apply a new update at once.
 */
export function AppVersion() {
  const [busy, setBusy] = useState(false);
  const version = Constants.expoConfig?.version ?? "?";
  const update = Updates.isEmbeddedLaunch || !Updates.createdAt ? t("version d'origine", "original version") : t("mise à jour du {0}", "update of {0}", [new Intl.DateTimeFormat(intlLocale, { dateStyle: "short", timeStyle: "short" }).format(Updates.createdAt)]);

  const check = async () => {
    setBusy(true);
    try {
      const res = await Updates.checkForUpdateAsync();
      if (!res.isAvailable) {
        setBusy(false);
        return Alert.alert(t("Sorloo est à jour", "Sorloo is up to date"));
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setBusy(false);
      Alert.alert(t("Recherche impossible", "Couldn't check"), t("Vérifie ta connexion et réessaie.", "Check your connection and try again."));
    }
  };

  return (
    <View style={{ alignItems: "center", gap: space.xs }}>
      <T variant="small">{`Sorloo ${version} · ${update} · ${lang.toUpperCase()}`}</T>
      {Platform.OS !== "web" && Updates.isEnabled && (
        <Button small variant="ghost" loading={busy} onPress={check}>{t("Rechercher une mise à jour", "Check for updates")}</Button>
      )}
    </View>
  );
}
