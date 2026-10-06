import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Chip, Notice, T } from "./ui";
import { api } from "@/lib/api";
import { radius, space, useColors } from "@/lib/theme";

const SUGGESTIONS = ["Ce soir je mange au restaurant", "Nous serons 5 à dîner ce soir", "Je n'ai que 15 minutes ce soir", "Je n'ai plus de poulet"];

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

  if (!premium) return <T variant="small">Avec Weeko Premium, écris ce qui change (« ce soir je mange au restaurant ») : la semaine s'adapte toute seule.</T>;

  const ask = async (value: string) => {
    setPending(true);
    setError(undefined);
    setProposal(undefined);
    const res = await api.action<{ ok: boolean; proposal?: Proposal; error?: string }>("interpret", { text: value }).catch(() => null);
    setPending(false);
    if (!res?.ok || !res.proposal) return setError("Je n'ai pas compris. Essaie avec d'autres mots.");
    setProposal(res.proposal);
  };
  const apply = async () => {
    if (!proposal) return;
    setPending(true);
    const res = await api.action("planActions", { actions: proposal.actions }).catch(() => null);
    setPending(false);
    if (!res?.ok) return setError("La modification n'a pas pu être appliquée.");
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
          placeholder="Ex. : ce soir je mange au restaurant"
          placeholderTextColor={c.muted}
          maxLength={400}
          returnKeyType="send"
          onSubmitEditing={() => text.trim().length > 1 && ask(text)}
          style={{ flex: 1, height: 46, borderRadius: radius.full, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.lg, color: c.encre, backgroundColor: c.surface }}
        />
        <Button variant="accent" onPress={() => ask(text)} disabled={text.trim().length < 2} loading={pending && !proposal} icon={<Sparkles size={18} color={c.onAbricot} />} accessibilityLabel="Adapter" />
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
          {proposal.aiExhausted ? <T variant="small">Tes 150 messages IA du mois sont utilisés : le coach répond en mode simplifié jusqu'au 1er.</T> : null}
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
