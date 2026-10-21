import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Field, SectionTitle, T } from "@/components/ui";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { space } from "@/lib/theme";

const ERRORS: Record<string, [string, string]> = {
  invalid: ["Ce code n'existe pas.", "This code doesn't exist."],
  too_late: ["Il est trop tard pour ajouter un code à ce compte.", "It's too late to add a code to this account."],
  already: ["Un code est déjà enregistré sur ce compte.", "A code is already saved on this account."],
  self: ["Tu ne peux pas utiliser ton propre code.", "You can't use your own code."],
};

/**
 * "A creator told me about Sorloo": the affiliate's code, typed in the first
 * 30 days. It only records who recommended the app; it unlocks nothing.
 */
export function ReferralCard() {
  const { me, reload } = useMe();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (!me.referral && !me.referralOpen) return null;

  const send = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(undefined);
    const res = await api.action<{ ok: boolean; error?: string }>("referralCode", { code }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (res.ok) return reload();
    const [fr, en] = ERRORS[res.error ?? ""] ?? ["Vérifie ta connexion et réessaie.", "Check your connection and try again."];
    setError(t(fr, en));
  };

  return (
    <Card>
      <SectionTitle>{t("Un créateur t'a parlé de Sorloo ?", "Did a creator tell you about Sorloo?")}</SectionTitle>
      {me.referral ? (
        <T variant="small">{t("Merci ! Tu es arrivé·e grâce à {0}.", "Thank you! You came thanks to {0}.", [me.referral])}</T>
      ) : (
        <View style={{ gap: space.sm }}>
          <T variant="small">{t("Saisis son code pour le remercier. Ça ne change rien pour toi.", "Enter their code to thank them. It changes nothing for you.")}</T>
          <Field label={t("Code du créateur", "Creator's code")} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={20} />
          {error && <T variant="small" tone="danger">{error}</T>}
          <Button variant="secondary" onPress={send} loading={busy} disabled={!code.trim()}>{t("Valider", "Confirm")}</Button>
        </View>
      )}
    </Card>
  );
}
