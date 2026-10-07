import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Button, Field, LogoMark, Notice, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { WEBSITE_URL } from "@/lib/config";
import { space } from "@/lib/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setPending(false);
    if (error) setError(error.status === 401 ? "E-mail ou mot de passe incorrect." : `La connexion n'a pas abouti. Réessaie. (${error.code ?? error.status})`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ alignItems: "center", gap: space.sm, marginTop: space.xl }}>
          <LogoMark size={56} />
          <T variant="title">Sorloo</T>
          <T variant="small" style={{ textAlign: "center" }}>Ta semaine organisée : menus, courses, budget et sport.</T>
        </View>
        <View style={{ gap: space.md }}>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button onPress={submit} loading={pending} disabled={!email || password.length < 1}>Se connecter</Button>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEBSITE_URL}/forgot-password`)}>
            <T variant="small" tone="basilic" style={{ textAlign: "center", fontWeight: "600" }}>Mot de passe oublié ?</T>
          </Pressable>
        </View>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <T variant="small">Pas encore de compte ?</T>
          <Link href="/signup" asChild>
            <Button variant="secondary">Créer mon compte</Button>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
