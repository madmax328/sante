import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from "react-native";
import { Button, Field, Notice, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { sitePage } from "@/lib/config";
import { space, useColors } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function Signup() {
  const c = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!terms) return setError(t("Accepte les conditions pour continuer.", "Accept the terms to continue."));
    if (password.length < 10) return setError(t("Le mot de passe doit faire au moins 10 caractères.", "The password must be at least 10 characters long."));
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
    setPending(false);
    if (error) setError(error.code === "USER_ALREADY_EXISTS" || error.status === 422 ? t("Un compte existe déjà avec cet e-mail.", "An account already exists with this email.") : `${t("L'inscription n'a pas abouti.", "Sign-up failed.")} (${error.code ?? error.status})`);
  };

  const legal = (doc: string) => WebBrowser.openBrowserAsync(sitePage(`/legal/${doc}`));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <T variant="small" tone="basilic" style={{ fontWeight: "600" }}>{t("← Retour", "← Back")}</T>
        </Pressable>
        <T variant="title">{t("Créer mon compte", "Create my account")}</T>
        <T variant="small">{t("Gratuit pour commencer, sans carte bancaire.", "Free to start, no card needed.")}</T>
        <View style={{ gap: space.md }}>
          <Field label={t("Prénom", "First name")} value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" />
          <Field label={t("E-mail", "Email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label={t("Mot de passe (10 caractères minimum)", "Password (at least 10 characters)")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <Switch value={terms} onValueChange={setTerms} trackColor={{ true: c.basilic }} accessibilityLabel={t("J'accepte les conditions", "I accept the terms")} />
            <T variant="small" style={{ flex: 1 }}>{t("J'accepte les conditions d'utilisation et la politique de confidentialité.", "I accept the terms of use and the privacy policy.")}</T>
          </View>
          <View style={{ flexDirection: "row", gap: space.lg }}>
            <Pressable onPress={() => legal("terms")}><T variant="small" tone="basilic">{t("Lire les conditions", "Read the terms")}</T></Pressable>
            <Pressable onPress={() => legal("privacy")}><T variant="small" tone="basilic">{t("Lire la confidentialité", "Read the privacy policy")}</T></Pressable>
          </View>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button variant="accent" onPress={submit} loading={pending} disabled={!name || !email || !password}>{t("Créer mon compte", "Create my account")}</Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
