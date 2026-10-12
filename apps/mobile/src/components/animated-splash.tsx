import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * Takes over from the native splash screen (same green, same logo at the same
 * size and place), turns the orange slice once around the wheel, then fades
 * out. Stays until the app is ready (`ready`), then calls `onDone`.
 */

const SIZE = 120; // imageWidth of the expo-splash-screen plugin
const GREEN = "#1E6B52";
const ORANGE = "#FF8A5B";
const R = 50;
const INNER = 18;
const GAP = 0.07;

const p = (rad: number, a: number) => `${50 + rad * Math.cos(a)},${50 + rad * Math.sin(a)}`;
function slice(i: number) {
  const a0 = (i / 7) * Math.PI * 2 - Math.PI / 2 + GAP / 2;
  const a1 = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2 - GAP / 2;
  return `M${p(INNER, a0)} L${p(R, a0)} A${R},${R} 0 0 1 ${p(R, a1)} L${p(INNER, a1)} A${INNER},${INNER} 0 0 0 ${p(INNER, a0)} Z`;
}

export function AnimatedSplash({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const [turn] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        if (reduce) return setTurned(true);
        Animated.timing(turn, { toValue: 1, duration: 1100, delay: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => live && setTurned(true));
      });
    return () => {
      live = false;
    };
  }, [turn]);

  useEffect(() => {
    if (!ready || !turned) return;
    Animated.timing(fade, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
  }, [ready, turned, fade, onDone]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] });

  return (
    <Animated.View pointerEvents="none" onLayout={onShown} style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ scale }] }}>
        <Svg viewBox="0 0 100 100" width={SIZE} height={SIZE}>
          {Array.from({ length: 7 }, (_, i) => (
            <Path key={i} d={slice(i)} fill="#FFFFFF" />
          ))}
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <Svg viewBox="0 0 100 100" width={SIZE} height={SIZE}>
            <Path d={slice(0)} fill={ORANGE} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: GREEN, alignItems: "center", justifyContent: "center", zIndex: 1000 },
});
