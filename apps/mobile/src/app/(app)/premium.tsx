import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { Badge, Button, Card, Loading, Notice, Screen, T } from "@/components/ui";
import { sitePage } from "@/lib/config";
import { t, tn } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { buy, loadPlans, purchasesAvailable, restore, type Plan } from "@/lib/purchases";
import { radius, space, useColors } from "@/lib/theme";

const BENEFITS: [string, string][] = [
  ["Les menus de tout le foyer, avec les bonnes quantités pour chacun", "Menus for the whole household, with the right portions for everyone"],
  ["Un budget par semaine, respecté par les menus", "A weekly budget the menus stick to"],
  ["Le garde-manger : ce que tu as déjà est cuisiné en priorité", "The pantry: what you already have is cooked first"],
  ["Des remplacements de repas illimités", "Unlimited meal replacements"],
  ["Le coach : il répond à tes questions et adapte ta semaine", "The coach: it answers your questions and adapts your week"],
  ["Tes repas reconnus en photo", "Your meals recognised from a photo"],
  ["Un programme sportif guidé, adapté à ton niveau", "A guided workout programme suited to your level"],
  ["Le bilan de chaque semaine et la comparaison des prix entre enseignes", "A weekly review and price comparison between supermarkets"],
];

function trialText(trial: NonNullable<Plan["trial"]>): string {
  const n = trial.count;
  if (trial.unit === "DAY") return tn(n, ["Essai gratuit d'un jour, puis", "Essai gratuit de {0} jours, puis"], ["1-day free trial, then", "{0}-day free trial, then"], [n]);
  if (trial.unit === "WEEK") return tn(n, ["Essai gratuit d'une semaine, puis", "Essai gratuit de {0} semaines, puis"], ["1-week free trial, then", "{0}-week free trial, then"], [n]);
  if (trial.unit === "MONTH") return tn(n, ["Essai gratuit d'un mois, puis", "Essai gratuit de {0} mois, puis"], ["1-month free trial, then", "{0}-month free trial, then"], [n]);
  return tn(n, ["Essai gratuit d'un an, puis", "Essai gratuit de {0} ans, puis"], ["1-year free trial, then", "{0}-year free trial, then"], [n]);
}

export default function PremiumScreen() {
  const c = useColors();
  const { me, reload } = useMe();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<Plan["key"]>("yearly");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);

  useEffect(() => {
    loadPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  const done = async () => {
    await reload();
    Alert.alert(t("Bienvenue dans Premium !", "Welcome to Premium!"), t("Toutes les fonctions de Sorloo sont maintenant ouvertes.", "All of Sorloo's features are now unlocked."));
    router.back();
  };

  const purchase = async () => {
    const plan = plans?.find((p) => p.key === selected);
    if (!plan) return;
    setBusy("buy");
    try {
      const res = await buy(plan);
      if (res === "premium") await done();
      else if (res === "pending")
        Alert.alert(t("Paiement en cours", "Payment pending"), t("Ton achat est en attente de validation par le store. Premium s'activera dès qu'il sera confirmé.", "Your purchase is waiting for the store's approval. Premium will turn on as soon as it's confirmed."));
    } catch {
      Alert.alert(t("Achat impossible", "Purchase failed"), t("Le paiement n'a pas abouti. Tu n'as pas été débité·e. Réessaie dans un instant.", "The payment didn't go through. You haven't been charged. Please try again in a moment."));
    }
    setBusy(null);
  };

  const restorePurchases = async () => {
    setBusy("restore");
    try {
      if (await restore()) await done();
      else Alert.alert(t("Aucun achat trouvé", "No purchase found"), t("Aucun abonnement Sorloo actif n'est lié à ce compte Apple ou Google.", "No active Sorloo subscription is linked to this Apple or Google account."));
    } catch {
      Alert.alert(t("Restauration impossible", "Restore failed"), t("Vérifie ta connexion et réessaie.", "Check your connection and try again."));
    }
    setBusy(null);
  };

  if (me.premium) {
    return (
      <Screen padTop={false}>
        <Notice tone="basilic">{t("Tu as déjà Sorloo Premium. Merci !", "You already have Sorloo Premium. Thank you!")}</Notice>
      </Screen>
    );
  }
  if (!purchasesAvailable()) {
    return (
      <Screen padTop={false}>
        <Notice>{t("L'abonnement n'est pas disponible sur cet appareil pour le moment.", "Subscriptions aren't available on this device for now.")}</Notice>
      </Screen>
    );
  }
  if (!plans) return <Loading />;

  const monthly = plans.find((p) => p.key === "monthly");
  const yearly = plans.find((p) => p.key === "yearly");
  const saving = monthly && yearly && monthly.amount > 0 ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : 0;
  const store = Platform.OS === "ios" ? "Apple" : "Google Play";

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.sm }}>
        <T variant="title">Sorloo Premium</T>
        <T>{t("Tout Sorloo, pour toi et ton foyer.", "All of Sorloo, for you and your household.")}</T>
      </View>

      <Card>
        {BENEFITS.map(([fr, en]) => (
          <View key={fr} style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
            <Check size={18} color={c.basilic} style={{ marginTop: 2 }} />
            <T style={{ flex: 1 }}>{t(fr, en)}</T>
          </View>
        ))}
      </Card>

      {plans.length === 0 ? (
        <Notice>{t("Les offres n'ont pas pu être chargées. Vérifie ta connexion et réessaie.", "The offers couldn't be loaded. Check your connection and try again.")}</Notice>
      ) : (
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          {plans.map((p) => {
            const on = p.key === selected;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSelected(p.key)}
                style={{ borderWidth: 2, borderColor: on ? c.basilic : c.line, backgroundColor: on ? c.basilicSoft : c.surface, borderRadius: radius.lg, padding: space.lg, gap: 4 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <T variant="h3">{p.key === "yearly" ? t("Annuel", "Yearly") : t("Mensuel", "Monthly")}</T>
                  {p.key === "yearly" && saving > 0 && <Badge tone="abricot">{t("-{0} %", "-{0}%", [saving])}</Badge>}
                </View>
                <T>
                  {p.trial ? `${trialText(p.trial)} ` : ""}
                  {p.key === "yearly" ? t("{0} par an", "{0} per year", [p.price]) : t("{0} par mois", "{0} per month", [p.price])}
                </T>
                {p.perMonth && <T variant="small">{t("soit {0} par mois", "that's {0} a month", [p.perMonth])}</T>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Button variant="accent" onPress={purchase} loading={busy === "buy"} disabled={!plans.length || busy !== null}>
        {t("S'abonner", "Subscribe")}
      </Button>
      <Button variant="ghost" onPress={restorePurchases} loading={busy === "restore"} disabled={busy !== null}>
        {t("Restaurer mes achats", "Restore purchases")}
      </Button>

      <T variant="small">
        {t(
          "L'abonnement se renouvelle automatiquement à la fin de chaque période, au même prix, sauf si tu le résilies au moins 24 h avant. Le paiement est débité sur ton compte {0}. Tu peux gérer ou résilier ton abonnement à tout moment dans les réglages de ton compte {0}.",
          "The subscription renews automatically at the end of each period, at the same price, unless you cancel at least 24 hours before. Payment is charged to your {0} account. You can manage or cancel your subscription at any time in your {0} account settings.",
          [store],
        )}
      </T>
      <View style={{ flexDirection: "row", gap: space.lg, flexWrap: "wrap" }}>
        <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(sitePage("/legal/terms"))}>
          <T variant="small" style={{ color: c.basilic, fontWeight: "700" }}>{t("Conditions d'utilisation", "Terms of use")}</T>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(sitePage("/legal/privacy"))}>
          <T variant="small" style={{ color: c.basilic, fontWeight: "700" }}>{t("Confidentialité", "Privacy")}</T>
        </Pressable>
      </View>
    </Screen>
  );
}
