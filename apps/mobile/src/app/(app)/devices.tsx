import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Footprints, HeartPulse, Scale, Watch } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Badge, Button, Card, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { connectAppleHealth, disconnectAppleHealth, healthAvailable, healthEnabled, syncAppleHealth, type SyncResult } from "@/lib/health";
import { useMe } from "@/lib/me";
import { space, useColors } from "@/lib/theme";
import { intlLocale, plural, t, tn } from "@/lib/i18n";

const dateTime = (iso: string) => new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function summary(r: SyncResult): string {
  const parts = [tn(r.steps, ["pas de {0} jour", "pas de {0} jours"], ["steps for {0} day", "steps for {0} days"])];
  if (r.weights) parts.push(`${r.weights} ${plural(r.weights, ["pesée", "pesées"], ["weigh-in", "weigh-ins"])}`);
  if (r.sessions) parts.push(`${r.sessions} ${plural(r.sessions, ["séance cochée", "séances cochées"], ["workout ticked", "workouts ticked"])}`);
  return t("Importé : {0}.", "Imported: {0}.", [parts.join(", ")]);
}

/** "Appareils et santé": Apple Santé today, Health Connect with the Android app. */
export default function DevicesScreen() {
  const c = useColors();
  const { me, reload } = useMe();
  const [enabled, setEnabled] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>();
  const available = healthAvailable();

  useEffect(() => {
    void healthEnabled().then(setEnabled);
  }, []);

  const run = async (fn: () => Promise<SyncResult | null>) => {
    setBusy(true);
    setResult(undefined);
    try {
      const r = await fn();
      setResult(r ? summary(r) : t("Aucune donnée importée. Vérifie les autorisations dans Réglages → Santé → Accès aux données → Sorloo.", "No data imported. Check the permissions in Settings → Health → Data Access → Sorloo."));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setResult(t("La synchronisation a échoué. Réessaie dans un instant.", "Sync failed. Try again in a moment."));
    }
    setBusy(false);
    setEnabled(await healthEnabled());
    await reload();
  };

  const disconnect = () =>
    Alert.alert(t("Déconnecter Apple Santé ?", "Disconnect Apple Health?"), t("Sorloo n'importera plus tes données. Pour retirer complètement l'accès : Réglages → Santé → Accès aux données → Sorloo.", "Sorloo will stop importing your data. To remove access completely: Settings → Health → Data Access → Sorloo."), [
      { text: t("Annuler", "Cancel"), style: "cancel" },
      { text: t("Déconnecter", "Disconnect"), style: "destructive", onPress: async () => { await disconnectAppleHealth(); setEnabled(false); setResult(undefined); } },
    ]);

  return (
    <Screen padTop={false}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <HeartPulse size={28} color={c.danger} />
          <View style={{ flex: 1 }}>
            <T variant="h2">{t("Apple Santé", "Apple Health")}</T>
            <T variant="small">{t("iPhone et Apple Watch", "iPhone and Apple Watch")}</T>
          </View>
          {enabled && <Badge>{t("Connecté", "Connected")}</Badge>}
        </View>
        {!available ? (
          <Notice>{Platform.OS === "android" ? t("Sur Android, la connexion à Health Connect arrivera avec la version Android de l'app.", "On Android, the Health Connect link will come with the Android version of the app.") : t("Apple Santé n'est pas disponible sur cet appareil.", "Apple Health isn't available on this device.")}</Notice>
        ) : (
          <>
            <View style={{ gap: space.sm }}>
              <Row icon={<Footprints size={18} color={c.basilic} />} text={t("Tes pas de chaque jour, pour ton objectif de pas.", "Your daily steps, for your step goal.")} />
              <Row icon={<Scale size={18} color={c.basilic} />} text={t("Tes pesées (balance connectée ou saisie dans Santé), pour ta courbe de poids.", "Your weigh-ins (smart scales or entered in Health), for your weight curve.")} />
              <Row icon={<Watch size={18} color={c.basilic} />} text={t("Tes entraînements : une séance prévue est cochée automatiquement.", "Your workouts: a planned session is ticked automatically.")} />
            </View>
            <T variant="small">{t("Sorloo lit ces données, sans jamais rien écrire dans Apple Santé. Elles restent privées et chiffrées.", "Sorloo reads this data and never writes anything to Apple Health. It stays private and encrypted.")}</T>
            {enabled ? (
              <>
                {me.devices?.appleHealth && <T variant="small">{t("Dernière synchronisation :", "Last sync:")} {dateTime(me.devices.appleHealth)}</T>}
                <Button loading={busy} onPress={() => run(syncAppleHealth)}>{t("Synchroniser maintenant", "Sync now")}</Button>
                <Button variant="ghost" onPress={disconnect}>{t("Déconnecter", "Disconnect")}</Button>
              </>
            ) : (
              enabled === false && <Button loading={busy} onPress={() => run(connectAppleHealth)}>{t("Connecter Apple Santé", "Connect Apple Health")}</Button>
            )}
            {result && <Notice tone="basilic">{result}</Notice>}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>{t("Montres et balances connectées", "Smartwatches and scales")}</SectionTitle>
        <T variant="small">{t("Garmin, Fitbit, Withings, Polar, Strava… peuvent envoyer leurs données dans Apple Santé. Active cette option dans l'app de ton appareil : Sorloo les récupère ensuite automatiquement.", "Garmin, Fitbit, Withings, Polar, Strava… can send their data to Apple Health. Turn this on in your device's app: Sorloo then picks it up automatically.")}</T>
        {available && (
          <Button variant="secondary" small style={{ alignSelf: "flex-start" }} onPress={() => Linking.openURL("x-apple-health://")}>
            {t("Ouvrir l'app Santé", "Open the Health app")}
          </Button>
        )}
      </Card>
    </Screen>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
      <View style={{ paddingTop: 2 }}>{icon}</View>
      <T variant="small" tone="encre" style={{ flex: 1 }}>{text}</T>
    </View>
  );
}
