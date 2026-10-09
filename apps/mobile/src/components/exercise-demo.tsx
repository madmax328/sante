import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Image } from "expo-image";
import { drawMotion, exerciseVideo, motions, MOTION_VIEW, type Shape, type Tone } from "@weeko/catalog/demos";
import { WEBSITE_URL } from "@/lib/config";
import { radius, useColors } from "@/lib/theme";

/** About 30 images per second: smooth enough for these simple figures. */
const FRAME_MS = 33;

function Shapes({ shapes }: { shapes: Shape[] }) {
  const c = useColors();
  const color: Record<Tone, string> = { body: c.basilic, far: c.basilic, prop: c.muted, gear: c.abricot, floor: c.line };
  return shapes.map((s, i) => {
    const opacity = s.tone === "far" ? 0.45 : 1;
    if (s.kind === "line") return <Line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={color[s.tone]} strokeOpacity={opacity} strokeWidth={s.w} strokeLinecap="round" />;
    if (s.kind === "path") return <Path key={i} d={s.d} stroke={color[s.tone]} strokeOpacity={opacity} strokeWidth={s.w} strokeLinecap="round" fill="none" />;
    if (s.kind === "circle")
      return s.stroke ? <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={color[s.tone]} strokeWidth={2} /> : <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={color[s.tone]} fillOpacity={opacity} />;
    return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={color[s.tone]} />;
  });
}

/**
 * Demo of an exercise: the real video (an animated image served by the
 * website) when there is one, the drawn animation otherwise or on error.
 */
export function ExerciseDemo(props: { exerciseId: string; label: string; style?: StyleProp<ViewStyle>; background?: string }) {
  const video = exerciseVideo(props.exerciseId);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const c = useColors();
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);
  if (!video || failed) return <AnimatedDemo {...props} />;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={props.label} style={[{ width: "100%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: props.background ?? c.riz, overflow: "hidden" }, props.style]}>
      <Image
        source={{ uri: `${WEBSITE_URL}${reduced ? video.poster : video.webp}` }}
        placeholder={{ uri: `${WEBSITE_URL}${video.poster}` }}
        contentFit="cover"
        cachePolicy="disk"
        style={{ width: "100%", height: "100%" }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/**
 * Looping animated drawing of an exercise (same drawings as the website).
 * Shows the key position only when "Reduce motion" is on, and stops while
 * the screen is not visible.
 */
function AnimatedDemo({ exerciseId, label, style, background }: { exerciseId: string; label: string; style?: StyleProp<ViewStyle>; background?: string }) {
  const c = useColors();
  const motion = motions[exerciseId];
  const [phase, setPhase] = useState(0.5 / Math.max(2, motion?.frames.length ?? 2));
  const [reduced, setReduced] = useState(false);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!motion || reduced || !focused) return;
    const start = Date.now();
    const id = setInterval(() => setPhase(((Date.now() - start) / 1000 / motion.cycle) % 1), FRAME_MS);
    return () => clearInterval(id);
  }, [motion, reduced, focused]);

  const shapes = useMemo(() => (motion ? drawMotion(motion, phase) : []), [motion, phase]);
  if (!motion) return null;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: "100%", aspectRatio: MOTION_VIEW.width / MOTION_VIEW.height, borderRadius: radius.md, backgroundColor: background ?? c.riz, overflow: "hidden" }, style]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${MOTION_VIEW.width} ${MOTION_VIEW.height}`}>
        <Shapes shapes={shapes} />
      </Svg>
    </View>
  );
}
