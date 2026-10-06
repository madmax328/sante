import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from "react-native";
import { Button, Field, Notice, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { WEBSITE_URL } from "@/lib/config";
import { space, useColors } from "@/lib/theme";

export default function Signup() {
  const c = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!terms) return setError("Accepte les conditions pour continuer.");
    if (password.length < 10) return setError("Le mot de passe doit faire au moins 10 caractères.");
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
    setPending(false);
    if (error) setError(error.code === "USER_ALREADY_EXISTS" || error.status === 422 ? "Un compte existe déjà avec cet e-mail." : `L'inscription n'a pas abouti. (${error.code ?? error.status})`);
  };

  const legal = (doc: string) => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/legal/${doc}`);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <T variant="small" tone="basilic" style={{ fontWeight: "600" }}>← Retour</T>
        </Pressable>
        <T variant="title">Créer mon compte</T>
        <T variant="small">Gratuit pour commencer, sans carte bancaire.</T>
        <View style={{ gap: space.md }}>
          <Field label="Prénom" value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" />
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Mot de passe (10 caractères minimum)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <Switch value={terms} onValueChange={setTerms} trackColor={{ true: c.basilic }} accessibilityLabel="J'accepte les conditions" />
            <T variant="small" style={{ flex: 1 }}>J'accepte les conditions d'utilisation et la politique de confidentialité.</T>
          </View>
          <View style={{ flexDirection: "row", gap: space.lg }}>
            <Pressable onPress={() => legal("terms")}><T variant="small" tone="basilic">Lire les conditions</T></Pressable>
            <Pressable onPress={() => legal("privacy")}><T variant="small" tone="basilic">Lire la confidentialité</T></Pressable>
          </View>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button variant="accent" onPress={submit} loading={pending} disabled={!name || !email || !password}>Créer mon compte</Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
