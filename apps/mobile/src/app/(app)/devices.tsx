import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Footprints, HeartPulse, Scale, Watch } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Badge, Button, Card, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { connectAppleHealth, disconnectAppleHealth, healthAvailable, healthEnabled, syncAppleHealth, type SyncResult } from "@/lib/health";
import { useMe } from "@/lib/me";
import { space, useColors } from "@/lib/theme";

const dateTime = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function summary(r: SyncResult): string {
  const parts = [`pas de ${r.steps} jour${r.steps > 1 ? "s" : ""}`];
  if (r.weights) parts.push(`${r.weights} pesée${r.weights > 1 ? "s" : ""}`);
  if (r.sessions) parts.push(`${r.sessions} séance${r.sessions > 1 ? "s" : ""} cochée${r.sessions > 1 ? "s" : ""}`);
  return `Importé : ${parts.join(", ")}.`;
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
      setResult(r ? summary(r) : "Aucune donnée importée. Vérifie les autorisations dans Réglages → Santé → Accès aux données → Sorloo.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setResult("La synchronisation a échoué. Réessaie dans un instant.");
    }
    setBusy(false);
    setEnabled(await healthEnabled());
    await reload();
  };

  const disconnect = () =>
    Alert.alert("Déconnecter Apple Santé ?", "Sorloo n'importera plus tes données. Pour retirer complètement l'accès : Réglages → Santé → Accès aux données → Sorloo.", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: async () => { await disconnectAppleHealth(); setEnabled(false); setResult(undefined); } },
    ]);

  return (
    <Screen padTop={false}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <HeartPulse size={28} color={c.danger} />
          <View style={{ flex: 1 }}>
            <T variant="h2">Apple Santé</T>
            <T variant="small">iPhone et Apple Watch</T>
          </View>
          {enabled && <Badge>Connecté</Badge>}
        </View>
        {!available ? (
          <Notice>{Platform.OS === "android" ? "Sur Android, la connexion à Health Connect arrivera avec la version Android de l'app." : "Apple Santé n'est pas disponible sur cet appareil."}</Notice>
        ) : (
          <>
            <View style={{ gap: space.sm }}>
              <Row icon={<Footprints size={18} color={c.basilic} />} text="Tes pas de chaque jour, pour ton objectif de pas." />
              <Row icon={<Scale size={18} color={c.basilic} />} text="Tes pesées (balance connectée ou saisie dans Santé), pour ta courbe de poids." />
              <Row icon={<Watch size={18} color={c.basilic} />} text="Tes entraînements : une séance prévue est cochée automatiquement." />
            </View>
            <T variant="small">Sorloo lit ces données, sans jamais rien écrire dans Apple Santé. Elles restent privées et chiffrées.</T>
            {enabled ? (
              <>
                {me.devices?.appleHealth && <T variant="small">Dernière synchronisation : {dateTime(me.devices.appleHealth)}</T>}
                <Button loading={busy} onPress={() => run(syncAppleHealth)}>Synchroniser maintenant</Button>
                <Button variant="ghost" onPress={disconnect}>Déconnecter</Button>
              </>
            ) : (
              enabled === false && <Button loading={busy} onPress={() => run(connectAppleHealth)}>Connecter Apple Santé</Button>
            )}
            {result && <Notice tone="basilic">{result}</Notice>}
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>Montres et balances connectées</SectionTitle>
        <T variant="small">Garmin, Fitbit, Withings, Polar, Strava… peuvent envoyer leurs données dans Apple Santé. Active cette option dans l'app de ton appareil : Sorloo les récupère ensuite automatiquement.</T>
        {available && (
          <Button variant="secondary" small style={{ alignSelf: "flex-start" }} onPress={() => Linking.openURL("x-apple-health://")}>
            Ouvrir l'app Santé
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
