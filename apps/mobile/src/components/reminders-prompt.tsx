import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { BellRing, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Button, Card, T } from "@/components/ui";
import { t } from "@/lib/i18n";
import { getReminderSettings, permissionState } from "@/lib/reminders";
import { space, useColors } from "@/lib/theme";

const DISMISSED = "sorloo.remindersPrompt";

/** Suggests the reminders once, on the home screen, until set up or dismissed. */
export function RemindersPrompt() {
  const c = useColors();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void (async () => {
      const [settings, permission, dismissed] = await Promise.all([getReminderSettings(), permissionState(), SecureStore.getItemAsync(DISMISSED).catch(() => null)]);
      setShow(!settings && permission !== "denied" && !dismissed);
    })().catch(() => undefined);
  }, []);

  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    void SecureStore.setItemAsync(DISMISSED, "1");
  };
  return (
    <Card tone="basilicSoft">
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <BellRing size={22} color={c.basilic} />
        <View style={{ flex: 1, gap: space.sm }}>
          <T style={{ fontWeight: "700" }}>{t("Des rappels au bon moment ?", "Reminders at the right time?")}</T>
          <T variant="small">{t("Ta séance du jour, ton repas à noter, un verre d'eau, ton bilan du dimanche. Tu choisis lesquels.", "Today's workout, a meal to log, a glass of water, your Sunday review. You pick which ones.")}</T>
          <Button small style={{ alignSelf: "flex-start" }} onPress={() => { setShow(false); router.push("/reminders"); }}>{t("Choisir mes rappels", "Choose my reminders")}</Button>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Plus tard", "Later")} hitSlop={8} onPress={dismiss}>
          <X size={18} color={c.muted} />
        </Pressable>
      </View>
    </Card>
  );
}
