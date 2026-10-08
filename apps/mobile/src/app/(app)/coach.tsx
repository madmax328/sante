import { Stack } from "expo-router";
import { Send, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, EmptyState, Notice, T } from "@/components/ui";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { radius, space, useColors } from "@/lib/theme";

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

const SUGGESTIONS = ["Une idée de dîner rapide ce soir ?", "Comment manger plus de protéines ?", "Je n'ai plus d'œufs pour demain", "Remplace le dîner de jeudi"];

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
    if (res?.error === "quota") return setError("Tu as envoyé beaucoup de messages aujourd'hui. Le coach sera de nouveau disponible demain.");
    if (!res?.ok || !res.proposal) return setError("Le coach n'a pas pu répondre. Réessaie dans un instant.");
    const p = res.proposal;
    setMessages((m) => [...(m ?? []), { role: "assistant", content: p.reply, actions: p.actions, labels: p.labels }]);
    if (p.aiExhausted) setNote("Tes 150 messages IA du mois sont utilisés : le coach répond en mode simplifié jusqu'au 1er du mois.");
    else if (p.aiLeft !== undefined && p.aiLeft <= 20) setNote(`Il te reste ${p.aiLeft} messages IA ce mois-ci.`);
    void reloadMe();
  };

  const apply = async (index: number) => {
    const msg = messages?.[index];
    if (!msg?.actions?.length) return;
    setPending(true);
    const res = await api.action<{ ok: boolean }>("planActions", { actions: msg.actions }).catch(() => null);
    setPending(false);
    if (!res?.ok) return setError("La modification n'a pas pu être appliquée.");
    setMessages((m) => m?.map((x, i) => (i === index ? { ...x, applied: true } : x)));
  };

  const clear = () =>
    Alert.alert("Effacer la conversation ?", "Le coach repartira de zéro.", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: async () => { await api.action("coachClear").catch(() => undefined); setMessages([]); } },
    ]);

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.riz, padding: space.lg }}>
        <EmptyState title="Ton coach personnel" text="Avec Sorloo Premium, le coach répond à tes questions et adapte ta semaine (restaurant, invités, ingrédient manquant…)." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.riz }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <Stack.Screen
        options={{
          headerRight: () =>
            messages?.length ? (
              <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel="Effacer la conversation" hitSlop={8}>
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
            <T>Pose-moi une question sur tes repas, tes courses ou ton sport. Je peux aussi modifier ta semaine.</T>
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
                m.applied ? <T variant="small" tone="basilic" style={{ fontWeight: "700" }}>Modification appliquée ✓</T> : <Button small style={{ alignSelf: "flex-start" }} onPress={() => apply(i)} loading={pending}>Appliquer à ma semaine</Button>
              )}
            </View>
          ))
        )}
        {pending && <ActivityIndicator color={c.basilic} style={{ alignSelf: "flex-start" }} />}
        {error && <Notice tone="danger">{error}</Notice>}
        {note && <Notice>{note}</Notice>}
        <T variant="small">Le coach ne remplace pas un avis médical. Les chiffres sont toujours recalculés par le moteur Sorloo.</T>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écris ton message…"
          placeholderTextColor={c.muted}
          maxLength={1000}
          multiline
          style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.md, paddingTop: 11, paddingBottom: 11, color: c.encre, backgroundColor: c.riz, fontSize: 16 }}
        />
        <Button onPress={() => send(text)} disabled={!text.trim() || pending} icon={<Send size={18} color={c.surface} />} accessibilityLabel="Envoyer" />
      </View>
    </KeyboardAvoidingView>
  );
}
