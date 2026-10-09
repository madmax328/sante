import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { radius, space, useColors, type Colors } from "@/lib/theme";

/** Scrolling page with pull-to-refresh and safe-area padding. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padTop = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padTop?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.riz }}
      contentContainerStyle={{ padding: space.lg, paddingTop: padTop ? insets.top + space.md : space.lg, paddingBottom: space.xl * 2, gap: space.lg }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.basilic} /> : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.riz }}>
      <ActivityIndicator color={c.basilic} size="large" />
    </View>
  );
}

export function T({
  children,
  variant = "body",
  tone,
  style,
  numberOfLines,
  onPress,
}: {
  children: ReactNode;
  variant?: "title" | "h2" | "h3" | "body" | "small" | "label" | "big";
  tone?: keyof Colors;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} onPress={onPress} accessibilityRole={onPress ? "link" : undefined} style={[styles[variant], { color: tone ? c[tone] : variant === "small" || variant === "label" ? c.muted : c.encre }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: keyof Colors }) {
  const c = useColors();
  return <View style={[{ backgroundColor: tone ? c[tone] : c.surface, borderColor: c.line, borderWidth: tone ? 0 : 1, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
      <T variant="h2" style={{ flexShrink: 1 }}>{children}</T>
      {action}
    </View>
  );
}

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  small,
  style,
  accessibilityLabel,
}: {
  children?: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = { primary: c.basilic, accent: c.abricot, secondary: c.surface, ghost: "transparent", danger: c.danger }[variant];
  const fg = { primary: c.surface, accent: c.onAbricot, secondary: c.encre, ghost: c.basilic, danger: c.surface }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: variant === "secondary" ? c.line : "transparent",
          borderWidth: 1,
          borderRadius: radius.full,
          paddingHorizontal: small ? space.md : space.lg,
          height: small ? 36 : 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space.sm,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {children ? <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 16 }}>{children}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ borderRadius: radius.full, borderWidth: 1, borderColor: active ? c.basilic : c.line, backgroundColor: active ? c.basilic : c.surface, paddingHorizontal: 14, paddingVertical: 8 }}
    >
      <Text style={{ color: active ? c.surface : c.encre, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ children, tone = "basilic" }: { children: ReactNode; tone?: "basilic" | "abricot" | "miel" | "eau" }) {
  const c = useColors();
  const bg = { basilic: c.basilicSoft, abricot: c.abricotSoft, miel: c.mielSoft, eau: c.eauSoft }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: c.encre, fontSize: 12, fontWeight: "600" }}>{children}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[{ height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, paddingHorizontal: space.md, color: c.encre, fontSize: 16 }, props.style]}
      />
    </View>
  );
}

export function Notice({ children, tone = "miel" }: { children: ReactNode; tone?: "miel" | "basilic" | "danger" | "eau" }) {
  const c = useColors();
  const bg = { miel: c.mielSoft, basilic: c.basilicSoft, danger: c.dangerSoft, eau: c.eauSoft }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: space.md }}>
      <T variant="small" tone={tone === "danger" ? "danger" : "encre"}>{children}</T>
    </View>
  );
}

export function ProgressBar({ value, max, tone = "basilic" }: { value: number; max: number; tone?: "basilic" | "eau" | "miel" | "abricot" }) {
  const c = useColors();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: c[tone], borderRadius: 4 }} />
    </View>
  );
}

export function Ring({ value, max, size = 112, stroke = 11, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.basilic} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - pct)} />
      </Svg>
      {children}
    </View>
  );
}

/** The Sorloo mark: a plate cut in 7 parts, today's part highlighted. */
export function LogoMark({ size = 28, today = 0 }: { size?: number; today?: number }) {
  const c = useColors();
  const R = 50;
  const inner = 18;
  const gap = 0.07;
  const p = (rad: number, a: number) => `${50 + rad * Math.cos(a)},${50 + rad * Math.sin(a)}`;
  return (
    <Svg viewBox="0 0 100 100" width={size} height={size}>
      {Array.from({ length: 7 }, (_, i) => {
        const a0 = (i / 7) * Math.PI * 2 - Math.PI / 2 + gap / 2;
        const a1 = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2 - gap / 2;
        const d = `M${p(inner, a0)} L${p(R, a0)} A${R},${R} 0 0 1 ${p(R, a1)} L${p(inner, a1)} A${inner},${inner} 0 0 0 ${p(inner, a0)} Z`;
        return <Path key={i} d={d} fill={i === today ? c.abricot : c.basilic} />;
      })}
    </Svg>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: space.xl }}>
      <LogoMark size={40} />
      <T variant="h2" style={{ textAlign: "center" }}>{title}</T>
      {text ? <T variant="small" style={{ textAlign: "center" }}>{text}</T> : null}
      {action}
    </Card>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Screen>
      <EmptyState title="Oups" text={message} action={onRetry ? <Button variant="secondary" onPress={onRetry}>Réessayer</Button> : undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: "700" },
  h3: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  big: { fontSize: 32, fontWeight: "800", fontVariant: ["tabular-nums"] },
});

/** A row of mutually exclusive choices (meal, tab…). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius.full, padding: 3 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.full, backgroundColor: active ? c.basilic : "transparent" }}
          >
            <Text numberOfLines={1} style={{ color: active ? c.surface : c.muted, fontWeight: "700", fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Round icon button (header actions). */
export function IconButton({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
    >
      {icon}
    </Pressable>
  );
}
