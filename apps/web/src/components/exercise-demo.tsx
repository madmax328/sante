"use client";

import { useEffect, useMemo, useState } from "react";
import { drawMotion, exerciseVideo, motions, MOTION_VIEW, type Shape, type Tone } from "@weeko/catalog/demos";
import { cx } from "./ui";

const COLOR: Record<Tone, string> = {
  body: "var(--basilic)",
  far: "color-mix(in oklab, var(--basilic) 45%, transparent)",
  prop: "var(--muted)",
  gear: "var(--abricot)",
  floor: "var(--line)",
};

function Shapes({ shapes }: { shapes: Shape[] }) {
  return shapes.map((s, i) => {
    if (s.kind === "line") return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={COLOR[s.tone]} strokeWidth={s.w} strokeLinecap="round" />;
    if (s.kind === "path") return <path key={i} d={s.d} stroke={COLOR[s.tone]} strokeWidth={s.w} strokeLinecap="round" fill="none" />;
    if (s.kind === "circle") return s.stroke ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={COLOR[s.tone]} strokeWidth={2} /> : <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={COLOR[s.tone]} />;
    return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={COLOR[s.tone]} />;
  });
}

/**
 * Demo of an exercise: the real video when there is one, the drawn animation
 * otherwise (or if the video can't be played).
 */
export function ExerciseDemo({ exerciseId, label, className }: { exerciseId: string; label: string; className?: string }) {
  const video = exerciseVideo(exerciseId);
  const [failed, setFailed] = useState(false);
  if (video && !failed) return <VideoDemo src={video.mp4} poster={video.poster} label={label} className={className} onError={() => setFailed(true)} />;
  return <AnimatedDemo exerciseId={exerciseId} label={label} className={className} />;
}

/** Silent looping video; the still image only when the user prefers reduced motion. */
function VideoDemo({ src, poster, label, className, onError }: { src: string; poster: string; label: string; className?: string; onError: () => void }) {
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const box = cx("w-full rounded-2xl bg-riz object-cover", className);
  // eslint-disable-next-line @next/next/no-img-element
  if (reduced) return <img src={poster} alt={label} className={box} />;
  return <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label={label} className={box} onError={onError} />;
}

/**
 * Looping animated drawing of an exercise. Static (the key position) when the
 * user prefers reduced motion; pauses while off screen.
 */
function AnimatedDemo({ exerciseId, label, className }: { exerciseId: string; label: string; className?: string }) {
  const motion = motions[exerciseId];
  const [phase, setPhase] = useState(0.5 / Math.max(2, motion?.frames.length ?? 2));
  const [el, setEl] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!motion || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) raf = requestAnimationFrame(tick);
    });
    const tick = (now: number) => {
      if (!visible) return;
      setPhase(((now - start) / 1000 / motion.cycle) % 1);
      raf = requestAnimationFrame(tick);
    };
    io.observe(el);
    raf = requestAnimationFrame(tick);
    return () => {
      visible = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [motion, el]);

  const shapes = useMemo(() => (motion ? drawMotion(motion, phase) : []), [motion, phase]);
  if (!motion) return null;
  return (
    <svg
      ref={setEl}
      viewBox={`0 0 ${MOTION_VIEW.width} ${MOTION_VIEW.height}`}
      role="img"
      aria-label={label}
      className={cx("w-full rounded-2xl bg-riz", className)}
    >
      <Shapes shapes={shapes} />
    </svg>
  );
}
