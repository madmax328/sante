import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Chip, Notice, T } from "./ui";
import { api } from "@/lib/api";
import { radius, space, useColors } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { PremiumButton } from "@/components/premium-button";

const SUGGESTIONS = [t("Ce soir je mange au restaurant", "I'm eating out tonight"), t("Nous serons 5 à dîner ce soir", "There will be 5 of us for dinner tonight"), t("Je n'ai que 15 minutes ce soir", "I only have 15 minutes tonight"), t("Je n'ai plus de poulet", "I'm out of chicken")];

interface Proposal {
  reply: string;
  actions: unknown[];
  labels: string[];
  aiLeft?: number;
  aiExhausted?: boolean;
}

/** "Un imprévu ?": the coach turns a sentence into changes, the user confirms. */
export function QuickAdjust({ premium, onApplied }: { premium: boolean; onApplied: () => void }) {
  const c = useColors();
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<Proposal>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!premium) return <View style={{ gap: 8 }}><T variant="small">{t("Avec Sorloo Premium, écris ce qui change (« ce soir je mange au restaurant ») : la semaine s'adapte toute seule.", "With Sorloo Premium, write what changes (\"I'm eating out tonight\"): your week adapts by itself.")}</T><PremiumButton /></View>;

  const ask = async (value: string) => {
    setPending(true);
    setError(undefined);
    setProposal(undefined);
    const res = await api.action<{ ok: boolean; proposal?: Proposal; error?: string }>("interpret", { text: value }).catch(() => null);
    setPending(false);
    if (!res?.ok || !res.proposal) return setError(t("Je n'ai pas compris. Essaie avec d'autres mots.", "I didn't understand. Try other words."));
    setProposal(res.proposal);
  };
  const apply = async () => {
    if (!proposal) return;
    setPending(true);
    const res = await api.action("planActions", { actions: proposal.actions }).catch(() => null);
    setPending(false);
    if (!res?.ok) return setError(t("La modification n'a pas pu être appliquée.", "The change couldn't be applied."));
    setProposal(undefined);
    setText("");
    onApplied();
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("Ex. : ce soir je mange au restaurant", "E.g. I'm eating out tonight")}
          placeholderTextColor={c.muted}
          maxLength={400}
          returnKeyType="send"
          onSubmitEditing={() => text.trim().length > 1 && ask(text)}
          style={{ flex: 1, height: 46, borderRadius: radius.full, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.lg, color: c.encre, backgroundColor: c.surface }}
        />
        <Button variant="accent" onPress={() => ask(text)} disabled={text.trim().length < 2} loading={pending && !proposal} icon={<Sparkles size={18} color={c.onAbricot} />} accessibilityLabel={t("Adapter", "Adapt")} />
      </View>
      {!proposal && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {SUGGESTIONS.map((s) => <Chip key={s} label={s} active={false} onPress={() => { setText(s); void ask(s); }} />)}
        </View>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {proposal && (
        <View style={{ gap: space.sm, backgroundColor: c.riz, borderRadius: radius.md, padding: space.md }}>
          <T>{proposal.reply}</T>
          {proposal.labels.map((l, i) => <T key={i} variant="small">✓ {l}</T>)}
          {proposal.aiExhausted ? <T variant="small">{t("Tes 150 messages IA du mois sont utilisés : le coach répond en mode simplifié jusqu'au 1er.", "Your 150 AI messages for the month are used up: the coach answers in simple mode until the 1st.")}</T> : null}
          {proposal.actions.length > 0 ? (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button small onPress={apply} loading={pending}>Appliquer</Button>
              <Button small variant="ghost" onPress={() => setProposal(undefined)}>Annuler</Button>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
