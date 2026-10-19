import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { BellRing, ChevronRight, Dumbbell, HeartPulse, LogOut, Mail, MessageCircle, Refrigerator, SlidersHorizontal, TrendingUp, Users } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { AppVersion } from "@/components/app-version";
import { PremiumButton } from "@/components/premium-button";
import { Badge, Button, Card, Field, Notice, Screen, SectionTitle, T } from "@/components/ui";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { sitePage } from "@/lib/config";
import { useMe } from "@/lib/me";
import { resetPurchases } from "@/lib/purchases";
import { space, useColors } from "@/lib/theme";
import { intlLocale, t } from "@/lib/i18n";

const longDate = (iso: string) => new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

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
      value ? t("Résilier l'abonnement", "Cancel subscription") : t("Réactiver l'abonnement", "Reactivate subscription"),
      value
        ? end
          ? t("Ton abonnement ne sera pas renouvelé : tu gardes Premium jusqu'au {0}. Aucun autre prélèvement.", "Your subscription won't renew: you keep Premium until {0}. No further charges.", [end])
          : t("Ton abonnement ne sera pas renouvelé : tu gardes Premium jusqu'à la fin de la période payée. Aucun autre prélèvement.", "Your subscription won't renew: you keep Premium until the end of the paid period. No further charges.") : t("Ton abonnement reprendra normalement à la prochaine échéance.", "Your subscription will resume normally at the next renewal."),
      [
        { text: value ? t("Garder Premium", "Keep Premium") : t("Annuler", "Cancel"), style: "cancel" },
        {
          text: value ? t("Résilier", "Cancel it") : t("Réactiver", "Reactivate"),
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
    if (!res?.ok) return Alert.alert(t("Suppression impossible", "Couldn't delete"), t("Écris SUPPRIMER pour confirmer.", "Type DELETE to confirm."));
    await resetPurchases();
    await authClient.signOut();
  };

  return (
    <Screen padTop={false}>
      <T variant="small">{me.user.email}</T>

      <Card style={{ padding: space.sm, gap: 0 }}>
        {[
          { href: "/preferences", label: t("Mes préférences", "My preferences"), hint: t("Alimentation, budget, objectif", "Food, budget, goal"), icon: SlidersHorizontal },
          { href: "/household", label: t("Mon foyer", "My household"), hint: t("Personnes, repas, allergies", "People, meals, allergies"), icon: Users },
          { href: "/pantry", label: t("Garde-manger", "Pantry"), hint: t("Ce que j'ai déjà à la maison", "What I already have at home"), icon: Refrigerator },
          { href: "/progress", label: t("Mes progrès", "My progress"), hint: t("Poids, bilan de la semaine", "Weight, weekly review"), icon: TrendingUp },
          { href: "/reminders", label: t("Rappels", "Reminders"), hint: t("Séances, repas, eau, bilan", "Workouts, meals, water, review"), icon: BellRing },
          { href: "/devices", label: t("Appareils et santé", "Devices and health"), hint: t("Apple Santé, montre, balance", "Apple Health, watch, scales"), icon: HeartPulse },
          { href: "/sport-settings", label: t("Mon programme sportif", "My workout programme"), hint: t("Jours, niveau, matériel", "Days, level, equipment"), icon: Dumbbell },
          { href: "/coach", label: "Coach", hint: t("Questions et changements de menu", "Questions and menu changes"), icon: MessageCircle },
        ].map((item, i) => (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            onPress={() => router.push(item.href as never)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, backgroundColor: pressed ? c.riz : "transparent", borderTopWidth: i ? 1 : 0, borderTopColor: c.line })}
          >
            <item.icon size={20} color={c.basilic} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: "600" }}>{item.label}</T>
              <T variant="small">{item.hint}</T>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <SectionTitle action={me.premium ? <Badge>Premium</Badge> : <Badge tone="miel">{t("Gratuit", "Free")}</Badge>}>{t("Abonnement", "Subscription")}</SectionTitle>
        {me.store ? (
          <>
            <T variant="small">
              {me.store.source === "promotional"
                ? t("Premium t'a été offert.", "Premium was given to you.")
                : me.store.willRenew && me.store.expiresAt
                  ? t("Prochain renouvellement le {0}.", "Next renewal on {0}.", [longDate(me.store.expiresAt)])
                  : me.store.expiresAt
                    ? t("Premium jusqu'au {0}, sans renouvellement.", "Premium until {0}, not renewing.", [longDate(me.store.expiresAt)])
                    : ""}
            </T>
            {me.store.billingIssue && <Notice>{t("Le dernier paiement n'a pas abouti : mets à jour ton moyen de paiement dans les réglages du store pour garder Premium.", "The last payment failed: update your payment method in the store settings to keep Premium.")}</Notice>}
            {me.store.source !== "promotional" && (
              <Button variant="secondary" small style={{ alignSelf: "flex-start" }} onPress={() => Linking.openURL(me.store?.source === "play_store" ? "https://play.google.com/store/account/subscriptions?package=com.sorloo.app" : "https://apps.apple.com/account/subscriptions")}>
                {t("Gérer mon abonnement", "Manage my subscription")}
              </Button>
            )}
          </>
        ) : me.premium ? (
          <>
            {end && <T variant="small">{sub?.cancelAtPeriodEnd ? t("Premium jusqu'au {0}, sans renouvellement.", "Premium until {0}, not renewing.", [end]) : t("Prochain renouvellement le {0}.", "Next renewal on {0}.", [end])}</T>}
            <Button variant="secondary" small style={{ alignSelf: "flex-start" }} loading={busy} onPress={() => cancel(!sub?.cancelAtPeriodEnd)}>
              {sub?.cancelAtPeriodEnd ? t("Réactiver mon abonnement", "Reactivate my subscription") : t("Résilier mon abonnement", "Cancel my subscription")}
            </Button>
          </>
        ) : (
          <>
            <T variant="small">{t("Tu utilises la version gratuite de Sorloo.", "You're using the free version of Sorloo.")}</T>
            <PremiumButton />
          </>
        )}
        {me.ai && me.premium && <T variant="small">{t("Coach IA : {0} messages restants ce mois-ci.", "AI coach: {0} messages left this month.", [me.ai.left])}</T>}
      </Card>

      <Card>
        <SectionTitle>{t("Aide", "Help")}</SectionTitle>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(sitePage(`/contact`))} style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <Mail size={18} color={c.basilic} />
          <T tone="basilic" style={{ fontWeight: "600" }}>{t("Nous contacter", "Contact us")}</T>
        </Pressable>
        <View style={{ flexDirection: "row", gap: space.lg, flexWrap: "wrap" }}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(sitePage(`/legal/privacy`))}><T variant="small" tone="basilic">{t("Confidentialité", "Privacy")}</T></Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(sitePage(`/legal/terms`))}><T variant="small" tone="basilic">{t("Conditions", "Terms")}</T></Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(sitePage(`/legal/notice`))}><T variant="small" tone="basilic">{t("Mentions légales", "Legal notice")}</T></Pressable>
        </View>
      </Card>

      <Button variant="secondary" onPress={async () => { await resetPurchases(); await authClient.signOut(); }} icon={<LogOut size={18} color={c.encre} />}>{t("Se déconnecter", "Sign out")}</Button>

      <Card>
        <SectionTitle>{t("Supprimer mon compte", "Delete my account")}</SectionTitle>
        {!showDelete ? (
          <Button variant="ghost" small style={{ alignSelf: "flex-start" }} onPress={() => setShowDelete(true)}>{t("Supprimer mon compte et mes données", "Delete my account and my data")}</Button>
        ) : (
          <>
            <Notice tone="danger">{t("Toutes tes données seront supprimées définitivement et ton abonnement résilié. Cette action est irréversible.", "All your data will be permanently deleted and your subscription cancelled. This can't be undone.")}</Notice>
            {me.store && me.store.source !== "promotional" && me.store.willRenew && (
              <Notice>{t("Ton abonnement pris dans l'app ne peut pas être résilié par Sorloo : résilie-le d'abord avec « Gérer mon abonnement », sinon le store continuera de le facturer.", "Your in-app subscription can't be cancelled by Sorloo: cancel it first with \"Manage my subscription\", or the store will keep charging it.")}</Notice>
            )}
            <Field label={t("Écris SUPPRIMER pour confirmer", "Type DELETE to confirm")} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
            <Button variant="danger" onPress={remove} loading={busy} disabled={confirm.trim().toUpperCase() !== t("SUPPRIMER", "DELETE")}>{t("Supprimer définitivement", "Delete permanently")}</Button>
          </>
        )}
      </Card>
      <T variant="small" style={{ textAlign: "center" }}>{t("Sorloo est une application de bien-être et d'organisation. Elle ne remplace pas un avis médical.", "Sorloo is a wellbeing and organisation app. It doesn't replace medical advice.")}</T>
      <AppVersion />
    </Screen>
  );
}
