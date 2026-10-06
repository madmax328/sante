/**
 * Animated exercise demos: a simple figure whose joints follow keyframed
 * angles. Pure geometry (no DOM), so the web and the mobile apps can both
 * draw the same shapes.
 *
 * Angles are absolute, in degrees: 0 points down, 90 forward (the figure
 * faces right), 180 up, -90 backward. In the front view, 90 means "outward"
 * and the left limbs are mirrored.
 */

export type Limb = [upper: number, lower: number];

export interface Pose {
  /** Torso direction from the hips to the shoulders (180 = upright) */
  t: number;
  /** Head tilt relative to the torso (+ = chin towards the chest in side view) */
  h?: number;
  /** Near and far arm (side view) — right and left arm (front view) */
  an: Limb;
  af?: Limb;
  /** Near and far leg — right and left leg */
  ln: Limb;
  lf?: Limb;
  /** Foot direction (side view), default 90 = flat */
  fn?: number;
  ff?: number;
  /** Spine curve, + arches the back upwards (cat), - hollows it (cow) */
  bend?: number;
  /** Height above the ground (jumps) */
  lift?: number;
  /** Horizontal shift (side steps, lunges) */
  dx?: number;
  /** Front view: shoulders and hips seen edge-on (side plank) */
  narrow?: boolean;
  /** Relative duration of the move towards this frame (default 1) */
  d?: number;
}

export type Prop =
  | { type: "mat" }
  | { type: "wall"; x: number }
  | { type: "chair"; x: number; facing?: "left" | "right" }
  | { type: "step"; x: number }
  | { type: "bar" }
  | { type: "dumbbells" }
  | { type: "kettlebell" }
  | { type: "band"; to: "feet" | "hands" }
  | { type: "rope" };

export interface Motion {
  view: "side" | "front";
  /** Seconds for one full loop */
  cycle: number;
  /** Keyframes, played in a loop (A → B → A for two frames) */
  frames: Pose[];
  /** Point kept still horizontally: hips by default */
  anchor?: "hip" | "foot" | "hand";
  /** Hanging from a bar: hands stay at the bar height */
  hang?: boolean;
  /** Arms keep turning the same way (circles): the loop goes on past 360° */
  wrap?: boolean;
  props?: Prop[];
}

export type Shape =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; w: number; tone: Tone }
  | { kind: "path"; d: string; w: number; tone: Tone; fill?: boolean }
  | { kind: "circle"; cx: number; cy: number; r: number; tone: Tone; stroke?: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx: number; tone: Tone };

/** body = figure, far = limbs behind, prop = furniture, gear = equipment, floor = ground */
export type Tone = "body" | "far" | "prop" | "gear" | "floor";

export const VIEW = { width: 200, height: 180, ground: 170 } as const;

const L = { torso: 40, neck: 4, head: 8, upper: 22, fore: 21, thigh: 31, shin: 30, foot: 8, shoulders: 11, hips: 7 };
const CX = 100;

interface P {
  x: number;
  y: number;
}
const dir = (deg: number): P => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};
const add = (a: P, b: P, k = 1): P => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Skeleton {
  hip: P;
  shoulder: P;
  head: P;
  /** [shoulder/hip, elbow/knee, hand/ankle, toe?] for each limb */
  armN: P[];
  armF: P[];
  legN: P[];
  legF: P[];
  bend: number;
}

/** Joint positions for a pose, before it is placed on the ground. */
function solve(view: Motion["view"], p: Pose): Skeleton {
  const hip = { x: 0, y: 0 };
  const shoulder = add(hip, dir(p.t), L.torso);
  const head = add(shoulder, dir(p.t + (p.h ?? 0)), L.neck + L.head);
  const af = p.af ?? p.an;
  const lf = p.lf ?? p.ln;
  if (view === "side") {
    const limb = (root: P, [a, b]: Limb, l1: number, l2: number, foot?: number) => {
      const j = add(root, dir(a), l1);
      const e = add(j, dir(b), l2);
      return foot === undefined ? [root, j, e] : [root, j, e, add(e, dir(foot), L.foot)];
    };
    return {
      hip,
      shoulder,
      head,
      armN: limb(shoulder, p.an, L.upper, L.fore),
      armF: limb(shoulder, af, L.upper, L.fore),
      legN: limb(hip, p.ln, L.thigh, L.shin, p.fn ?? 90),
      legF: limb(hip, lf, L.thigh, L.shin, p.ff ?? p.fn ?? 90),
      bend: p.bend ?? 0,
    };
  }
  // Front view: limbs hang from both sides of the torso, the left side mirrored.
  const side = add({ x: 0, y: 0 }, dir(p.t - 90), p.narrow ? 0.2 : 1);
  const mirror = (a: number, sign: number) => (sign > 0 ? a : -a);
  const limb = (root: P, [a, b]: Limb, l1: number, l2: number, sign: number, foot: boolean) => {
    const j = add(root, dir(mirror(a, sign)), l1);
    const e = add(j, dir(mirror(b, sign)), l2);
    return foot ? [root, j, e, add(e, { x: sign, y: 0 }, 5)] : [root, j, e];
  };
  return {
    hip,
    shoulder,
    head,
    armN: limb(add(shoulder, side, L.shoulders), p.an, L.upper, L.fore, 1, false),
    armF: limb(add(shoulder, side, -L.shoulders), af, L.upper, L.fore, -1, false),
    legN: limb(add(hip, side, L.hips), p.ln, L.thigh, L.shin, 1, true),
    legF: limb(add(hip, side, -L.hips), lf, L.thigh, L.shin, -1, true),
    bend: p.bend ?? 0,
  };
}

const ease = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpLimb = (a: Limb, b: Limb, k: number): Limb => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** The pose at a point of the loop (phase 0…1). */
export function poseAt(m: Motion, phase: number): Pose {
  const frames = m.frames;
  if (frames.length === 1) return frames[0]!;
  const weights = frames.map((_, i) => frames[(i + 1) % frames.length]!.d ?? 1);
  const total = weights.reduce((s, w) => s + w, 0);
  let at = (((phase % 1) + 1) % 1) * total;
  let i = 0;
  while (at > weights[i]! && i < frames.length - 1) at -= weights[i++]!;
  const a = frames[i]!;
  let b = frames[(i + 1) % frames.length]!;
  if (m.wrap && i === frames.length - 1) {
    const turn = (l: Limb): Limb => [l[0] + 360, l[1] + 360];
    b = { ...b, an: turn(b.an), af: turn(b.af ?? b.an) };
  }
  const k = ease(Math.min(1, at / weights[i]!));
  const num = (x: number | undefined, y: number | undefined, dflt: number) => lerp(x ?? dflt, y ?? dflt, k);
  return {
    t: lerp(a.t, b.t, k),
    h: num(a.h, b.h, 0),
    an: lerpLimb(a.an, b.an, k),
    af: lerpLimb(a.af ?? a.an, b.af ?? b.an, k),
    ln: lerpLimb(a.ln, b.ln, k),
    lf: lerpLimb(a.lf ?? a.ln, b.lf ?? b.ln, k),
    fn: num(a.fn, b.fn, 90),
    ff: lerp(a.ff ?? a.fn ?? 90, b.ff ?? b.fn ?? 90, k),
    bend: num(a.bend, b.bend, 0),
    lift: num(a.lift, b.lift, 0),
    narrow: a.narrow,
    dx: num(a.dx, b.dx, 0),
  };
}

/** Everything to draw for one moment of the demo, in a 200 × 160 box. */
export function drawMotion(m: Motion, phase: number): Shape[] {
  const pose = poseAt(m, phase);
  const s = solve(m.view, pose);
  // Lowest point, counting the thickness of each part.
  const bottom = Math.max(
    s.hip.y + 4.5,
    s.shoulder.y + 4.5,
    s.head.y + L.head,
    ...[...s.armN, ...s.armF, ...s.legN, ...s.legF].map((p) => p.y + 3),
  );

  // Horizontal placement: keep the anchor still.
  const anchor = m.anchor === "foot" ? s.legN[2]! : m.anchor === "hand" ? s.armN[2]! : s.hip;
  const ox = CX + (pose.dx ?? 0) - anchor.x;
  // Vertical placement: lowest point on the ground, or hands on the bar.
  const barY = 18;
  const oy = m.hang ? barY - Math.min(s.armN[2]!.y, s.armF[2]!.y) : VIEW.ground - (pose.lift ?? 0) - bottom;
  const T = (p: P): P => ({ x: r1(p.x + ox), y: r1(p.y + oy) });

  const out: Shape[] = [];
  const props = m.props ?? [];
  const line = (a: P, b: P, w: number, tone: Tone) => out.push({ kind: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, w, tone });

  // Floor and furniture, behind the figure.
  out.push({ kind: "line", x1: 8, y1: VIEW.ground + 1, x2: 192, y2: VIEW.ground + 1, w: 2, tone: "floor" });
  for (const p of props) {
    if (p.type === "mat") out.push({ kind: "rect", x: 14, y: VIEW.ground - 3, w: 172, h: 4, rx: 2, tone: "floor" });
    if (p.type === "wall") line({ x: p.x, y: 8 }, { x: p.x, y: VIEW.ground + 1 }, 4, "prop");
    if (p.type === "step") out.push({ kind: "rect", x: p.x, y: VIEW.ground - 12, w: 36, h: 13, rx: 3, tone: "prop" });
    if (p.type === "chair") {
      const seatY = VIEW.ground - 32;
      const back = p.facing === "left" ? p.x + 30 : p.x;
      line({ x: p.x, y: seatY }, { x: p.x + 30, y: seatY }, 4, "prop");
      line({ x: p.x + 3, y: seatY }, { x: p.x + 3, y: VIEW.ground }, 3, "prop");
      line({ x: p.x + 27, y: seatY }, { x: p.x + 27, y: VIEW.ground }, 3, "prop");
      line({ x: back, y: seatY }, { x: back, y: seatY - 30 }, 4, "prop");
    }
    if (p.type === "bar") line({ x: CX - 40, y: barY - 2 }, { x: CX + 40, y: barY - 2 }, 4, "prop");
  }

  const limb = (pts: P[], tone: Tone) => {
    const q = pts.map(T);
    for (let i = 0; i < q.length - 1; i++) line(q[i]!, q[i + 1]!, i === 2 ? 5 : 7, tone);
  };
  const far = m.view === "side" ? "far" : "body";
  limb(s.armF, far);
  limb(s.legF, far);

  // Torso (curved when the back arches), then head.
  const h = T(s.hip);
  const sh = T(s.shoulder);
  const mid = { x: (h.x + sh.x) / 2, y: (h.y + sh.y) / 2 };
  const nx = -(sh.y - h.y) / L.torso;
  const ny = (sh.x - h.x) / L.torso;
  // The normal points to the back of the figure: arch "up" means towards it.
  const c = { x: r1(mid.x - nx * s.bend), y: r1(mid.y - ny * s.bend) };
  out.push({ kind: "path", d: `M${h.x} ${h.y}Q${c.x} ${c.y} ${sh.x} ${sh.y}`, w: 9, tone: "body" });
  if (m.view === "front") {
    const side = add({ x: 0, y: 0 }, dir(pose.t - 90), pose.narrow ? 0.2 : 1);
    line(T(add(s.shoulder, side, -L.shoulders)), T(add(s.shoulder, side, L.shoulders)), 8, "body");
    line(T(add(s.hip, side, -L.hips)), T(add(s.hip, side, L.hips)), 8, "body");
  }
  limb(s.legN, "body");
  const head = T(s.head);
  out.push({ kind: "circle", cx: head.x, cy: head.y, r: L.head, tone: "body" });
  limb(s.armN, "body");

  // Equipment in the hands.
  const handN = T(s.armN[2]!);
  const handF = T(s.armF[2]!);
  for (const p of props) {
    if (p.type === "dumbbells") {
      for (const hand of m.view === "side" ? [handF, handN] : [handN, handF]) {
        const horizontal = m.view === "side";
        const a = horizontal ? { x: hand.x - 7, y: hand.y } : { x: hand.x, y: hand.y - 7 };
        const b = horizontal ? { x: hand.x + 7, y: hand.y } : { x: hand.x, y: hand.y + 7 };
        line(a, b, 3, "gear");
        out.push({ kind: "circle", cx: a.x, cy: a.y, r: 3.5, tone: "gear" }, { kind: "circle", cx: b.x, cy: b.y, r: 3.5, tone: "gear" });
      }
    }
    if (p.type === "kettlebell") {
      out.push({ kind: "circle", cx: handN.x, cy: r1(handN.y + 8), r: 7, tone: "gear" });
      out.push({ kind: "circle", cx: handN.x, cy: r1(handN.y + 1), r: 4, tone: "gear", stroke: true });
    }
    if (p.type === "band") {
      const target = p.to === "feet" ? T(s.legN[3] ?? s.legN[2]!) : handF;
      out.push({ kind: "path", d: `M${handN.x} ${handN.y}L${target.x} ${target.y}`, w: 2.5, tone: "gear" });
    }
    if (p.type === "rope") {
      // Seen from the side, the rope circles the body: in front, under the feet, behind, overhead.
      const a = phase * Math.PI * 2;
      const top = head.y - L.head - 6;
      const cy = (VIEW.ground + 2 + top) / 2;
      const ry = (VIEW.ground + 2 - top) / 2;
      const pt = { x: r1(h.x + Math.sin(a) * 34), y: r1(cy + Math.cos(a) * ry) };
      const bulge = (hand: P) => ({ x: r1((hand.x + pt.x) / 2 + Math.sin(a) * 10), y: r1((hand.y + pt.y) / 2) });
      const cN = bulge(handN);
      const cF = bulge(handF);
      out.push({ kind: "path", d: `M${handF.x} ${handF.y}Q${cF.x} ${cF.y} ${pt.x} ${pt.y}Q${cN.x} ${cN.y} ${handN.x} ${handN.y}`, w: 2, tone: "gear" });
    }
  }
  return out;
}
