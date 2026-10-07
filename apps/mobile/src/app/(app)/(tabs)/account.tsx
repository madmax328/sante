import * as WebBrowser from "expo-web-browser";
import { LogOut, Mail } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Badge, Button, Card, Field, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { WEBSITE_URL } from "@/lib/config";
import { useMe } from "@/lib/me";
import { space, useColors } from "@/lib/theme";

const longDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export default function AccountScreen() {
  const c = useColors();
  const { me, reload } = useMe();
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const sub = me.subscription;
  const end = sub?.currentPeriodEnd ? longDate(sub.currentPeriodEnd) : null;

  const cancel = (value: boolean) =>
    Alert.alert(
      value ? "Résilier l'abonnement" : "Réactiver l'abonnement",
      value ? `Ton abonnement ne sera pas renouvelé : tu gardes Premium${end ? ` jusqu'au ${end}` : " jusqu'à la fin de la période payée"}. Aucun autre prélèvement.` : "Ton abonnement reprendra normalement à la prochaine échéance.",
      [
        { text: value ? "Garder Premium" : "Annuler", style: "cancel" },
        {
          text: value ? "Résilier" : "Réactiver",
          style: value ? "destructive" : "default",
          onPress: async () => {
            setBusy(true);
            await api.action("setCancel", { cancel: value }).catch(() => undefined);
            setBusy(false);
            await reload();
          },
        },
      ],
    );

  const remove = async () => {
    setBusy(true);
    const res = await api.action<{ ok: boolean }>("deleteAccount", { confirm }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return Alert.alert("Suppression impossible", "Écris SUPPRIMER pour confirmer.");
    await authClient.signOut();
  };

  return (
    <Screen>
      <T variant="title">Mon compte</T>
      <T variant="small">{me.user.email}</T>

      <Card>
        <SectionTitle action={me.premium ? <Badge>Premium</Badge> : <Badge tone="miel">Gratuit</Badge>}>Abonnement</SectionTitle>
        {me.premium ? (
          <>
            {end && <T variant="small">{sub?.cancelAtPeriodEnd ? `Premium jusqu'au ${end}, sans renouvellement.` : `Prochain renouvellement le ${end}.`}</T>}
            <Button variant="secondary" small style={{ alignSelf: "flex-start" }} loading={busy} onPress={() => cancel(!sub?.cancelAtPeriodEnd)}>
              {sub?.cancelAtPeriodEnd ? "Réactiver mon abonnement" : "Résilier mon abonnement"}
            </Button>
          </>
        ) : (
          <T variant="small">Tu utilises la version gratuite de Sorloo. L'abonnement se gère depuis ton compte sur le site Sorloo, avec les mêmes identifiants.</T>
        )}
        {me.ai && me.premium && <T variant="small">Coach IA : {me.ai.left} messages restants ce mois-ci.</T>}
      </Card>

      <Card>
        <SectionTitle>Aide</SectionTitle>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/contact`)} style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <Mail size={18} color={c.basilic} />
          <T tone="basilic" style={{ fontWeight: "600" }}>Nous contacter</T>
        </Pressable>
        <View style={{ flexDirection: "row", gap: space.lg, flexWrap: "wrap" }}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/legal/privacy`)}><T variant="small" tone="basilic">Confidentialité</T></Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/legal/terms`)}><T variant="small" tone="basilic">Conditions</T></Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/legal/notice`)}><T variant="small" tone="basilic">Mentions légales</T></Pressable>
        </View>
      </Card>

      <Button variant="secondary" onPress={() => authClient.signOut()} icon={<LogOut size={18} color={c.encre} />}>Se déconnecter</Button>

      <Card>
        <SectionTitle>Supprimer mon compte</SectionTitle>
        {!showDelete ? (
          <Button variant="ghost" small style={{ alignSelf: "flex-start" }} onPress={() => setShowDelete(true)}>Supprimer mon compte et mes données</Button>
        ) : (
          <>
            <Notice tone="danger">Toutes tes données seront supprimées définitivement et ton abonnement résilié. Cette action est irréversible.</Notice>
            <Field label="Écris SUPPRIMER pour confirmer" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
            <Button variant="danger" onPress={remove} loading={busy} disabled={confirm.trim().toUpperCase() !== "SUPPRIMER"}>Supprimer définitivement</Button>
          </>
        )}
      </Card>
      <T variant="small" style={{ textAlign: "center" }}>Sorloo est une application de bien-être et d'organisation. Elle ne remplace pas un avis médical.</T>
    </Screen>
  );
}
