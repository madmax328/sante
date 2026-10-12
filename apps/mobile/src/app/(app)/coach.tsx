import { Stack } from "expo-router";
import { Send, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, EmptyState, Notice, T } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { radius, space, useColors } from "@/lib/theme";
import { t } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: unknown[];
  labels?: string[];
  applied?: boolean;
}

interface Proposal {
  reply: string;
  actions: unknown[];
  labels: string[];
  aiLeft?: number;
  aiExhausted?: boolean;
}

const SUGGESTIONS = [t("Une idée de dîner rapide ce soir ?", "A quick dinner idea for tonight?"), t("Comment manger plus de protéines ?", "How can I eat more protein?"), t("Je n'ai plus d'œufs pour demain", "I'm out of eggs for tomorrow"), t("Remplace le dîner de jeudi", "Replace Thursday's dinner")];

export default function CoachScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { reload: reloadMe } = useMe();
  const [messages, setMessages] = useState<Message[]>();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [locked, setLocked] = useState(false);
  const [note, setNote] = useState<string>();
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    api.action<Message[]>("coachHistory").then((m) => setMessages(m ?? []), () => setMessages([]));
  }, []);

  const send = async (value: string) => {
    const content = value.trim();
    if (!content || pending) return;
    setText("");
    setError(undefined);
    setMessages((m) => [...(m ?? []), { role: "user", content }]);
    setPending(true);
    const res = await api.action<{ ok: boolean; proposal?: Proposal; error?: string }>("coachSend", { text: content }).catch(() => null);
    setPending(false);
    if (res?.error === "premium") return setLocked(true);
    if (res?.error === "quota") return setError(t("Tu as envoyé beaucoup de messages aujourd'hui. Le coach sera de nouveau disponible demain.", "You've sent a lot of messages today. The coach will be available again tomorrow."));
    if (!res?.ok || !res.proposal) return setError(t("Le coach n'a pas pu répondre. Réessaie dans un instant.", "The coach couldn't answer. Try again in a moment."));
    const p = res.proposal;
    setMessages((m) => [...(m ?? []), { role: "assistant", content: p.reply, actions: p.actions, labels: p.labels }]);
    if (p.aiExhausted) setNote(t("Tes 150 messages IA du mois sont utilisés : le coach répond en mode simplifié jusqu'au 1er du mois.", "Your 150 AI messages for the month are used up: the coach answers in simple mode until the 1st."));
    else if (p.aiLeft !== undefined && p.aiLeft <= 20) setNote(t("Il te reste {0} messages IA ce mois-ci.", "You have {0} AI messages left this month.", [p.aiLeft]));
    void reloadMe();
  };

  const apply = async (index: number) => {
    const msg = messages?.[index];
    if (!msg?.actions?.length) return;
    setPending(true);
    const res = await api.action<{ ok: boolean }>("planActions", { actions: msg.actions }).catch(() => null);
    setPending(false);
    if (!res?.ok) return setError(t("La modification n'a pas pu être appliquée.", "The change couldn't be applied."));
    setMessages((m) => m?.map((x, i) => (i === index ? { ...x, applied: true } : x)));
  };

  const clear = () =>
    Alert.alert(t("Effacer la conversation ?", "Clear the conversation?"), t("Le coach repartira de zéro.", "The coach will start from scratch."), [
      { text: t("Annuler", "Cancel"), style: "cancel" },
      { text: t("Effacer", "Clear"), style: "destructive", onPress: async () => { await api.action("coachClear").catch(() => undefined); setMessages([]); } },
    ]);

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.riz, padding: space.lg }}>
        <EmptyState title={t("Ton coach personnel", "Your personal coach")} text={t("Avec Sorloo Premium, le coach répond à tes questions et adapte ta semaine (restaurant, invités, ingrédient manquant…).", "With Sorloo Premium, the coach answers your questions and adapts your week (eating out, guests, a missing ingredient…).")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.riz }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <Stack.Screen
        options={{
          headerRight: () =>
            messages?.length ? (
              <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel={t("Effacer la conversation", "Clear the conversation")} hitSlop={8}>
                <Trash2 size={20} color={c.muted} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.md }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {!messages ? (
          <ActivityIndicator color={c.basilic} />
        ) : messages.length === 0 ? (
          <View style={{ gap: space.md }}>
            <T>{t("Pose-moi une question sur tes repas, tes courses ou ton sport. Je peux aussi modifier ta semaine.", "Ask me about your meals, groceries or workouts. I can also change your week.")}</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {SUGGESTIONS.map((s) => <Chip key={s} label={s} active={false} onPress={() => send(s)} />)}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                backgroundColor: m.role === "user" ? c.basilic : c.surface,
                borderColor: c.line,
                borderWidth: m.role === "user" ? 0 : 1,
                borderRadius: radius.md,
                padding: space.md,
                gap: space.sm,
              }}
            >
              <T style={m.role === "user" ? { color: c.surface } : undefined}>{m.content}</T>
              {m.labels?.map((l, k) => <T key={k} variant="small">✓ {l}</T>)}
              {m.role === "assistant" && !!m.actions?.length && m.labels && (
                m.applied ? <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>{t("Modification appliquée ✓", "Change applied ✓")}</T> : <Button small style={{ alignSelf: "flex-start" }} onPress={() => apply(i)} loading={pending}>{t("Appliquer à ma semaine", "Apply to my week")}</Button>
              )}
            </View>
          ))
        )}
        {pending && <ActivityIndicator color={c.basilic} style={{ alignSelf: "flex-start" }} />}
        {error && <Notice tone="danger">{error}</Notice>}
        {note && <Notice>{note}</Notice>}
        <T variant="small">{t("Le coach ne remplace pas un avis médical. Les chiffres sont toujours recalculés par le moteur Sorloo.", "The coach doesn't replace medical advice. Numbers are always recalculated by the Sorloo engine.")}</T>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("Écris ton message…", "Write your message…")}
          placeholderTextColor={c.muted}
          maxLength={1000}
          multiline
          style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.md, paddingTop: 11, paddingBottom: 11, color: c.encre, backgroundColor: c.riz, fontSize: 16 }}
        />
        <Button onPress={() => send(text)} disabled={!text.trim() || pending} icon={<Send size={18} color={c.surface} />} accessibilityLabel={t("Envoyer", "Send")} />
      </View>
    </KeyboardAvoidingView>
  );
}
