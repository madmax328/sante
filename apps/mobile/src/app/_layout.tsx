import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "@/components/animated-splash";
import { authClient } from "@/lib/auth";
import { useColors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const { data: session, isPending } = authClient.useSession();

  // The native splash gives way to the animated one as soon as it is drawn.
  const [splash, setSplash] = useState(true);
  const shown = useCallback(() => void SplashScreen.hideAsync(), []);
  const done = useCallback(() => setSplash(false), []);

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      {!isPending && (
        <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.basilic, background: c.riz, card: c.surface, text: c.encre, border: c.line } }}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      )}
      {splash && <AnimatedSplash ready={!isPending} onShown={shown} onDone={done} />}
    </SafeAreaProvider>
  );
}
