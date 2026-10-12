import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Button, Field, LogoMark, Notice, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { sitePage } from "@/lib/config";
import { space } from "@/lib/theme";
import { t } from "@/lib/i18n";

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
    if (error) setError(error.status === 401 ? t("E-mail ou mot de passe incorrect.", "Incorrect email or password.") : `${t("La connexion n'a pas abouti. Réessaie.", "Sign-in failed. Try again.")} (${error.code ?? error.status})`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ alignItems: "center", gap: space.sm, marginTop: space.xl }}>
          <LogoMark size={56} />
          <T variant="title">Sorloo</T>
          <T variant="small" style={{ textAlign: "center" }}>{t("Ta semaine organisée : menus, courses, budget et sport.", "Your week, organised: meals, groceries, budget and workouts.")}</T>
        </View>
        <View style={{ gap: space.md }}>
          <Field label={t("E-mail", "Email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label={t("Mot de passe", "Password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button onPress={submit} loading={pending} disabled={!email || password.length < 1}>{t("Se connecter", "Sign in")}</Button>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(sitePage(`/forgot-password`))}>
            <T variant="small" tone="basilic" style={{ textAlign: "center", fontWeight: "600" }}>{t("Mot de passe oublié ?", "Forgot your password?")}</T>
          </Pressable>
        </View>
        <View style={{ alignItems: "center", gap: space.sm }}>
          <T variant="small">{t("Pas encore de compte ?", "No account yet?")}</T>
          <Link href="/signup" asChild>
            <Button variant="secondary">{t("Créer mon compte", "Create my account")}</Button>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
