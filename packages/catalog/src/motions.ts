import type { Motion, Pose } from "./motion";

/**
 * One looping demo per exercise (see motion.ts for the angle convention).
 * Side view unless the movement happens sideways.
 */

const STAND: Pose = { t: 180, an: [6, 4], af: [-6, -4], ln: [2, 0], lf: [-2, 0] };
const FRONT: Pose = { t: 180, an: [8, 4], ln: [4, 0] };
const with_ = (p: Pose, q: Partial<Pose>): Pose => ({ ...p, ...q });

// Lying on the back, head on the right, knees bent and feet flat.
const SUPINE_BENT: Pose = { t: 90, an: [-92, -90], ln: [-147, 0], fn: -90 };
// On all fours, head on the right.
const FOURS: Pose = { t: 90, h: 10, an: [0, 0], af: [0, 0], ln: [0, -90], lf: [0, -90], fn: -90 };
// High plank on the hands.
const PLANK: Pose = { t: 100, h: 5, an: [2, 0], af: [-2, 0], ln: [-78, -78], fn: 175 };

export const motions: Record<string, Motion> = {
  // ---------------------------------------------------------- Lower body
  squat: {
    view: "side",
    cycle: 3,
    anchor: "foot",
    frames: [STAND, { t: 140, an: [85, 90], af: [80, 90], ln: [78, -22], lf: [74, -22] }],
  },
  "squat-chaise": {
    view: "side",
    cycle: 3.6,
    anchor: "foot",
    props: [{ type: "chair", x: 36 }],
    frames: [
      { t: 172, an: [70, 85], af: [65, 85], ln: [90, 0], lf: [88, 0] },
      { t: 135, an: [80, 90], af: [75, 90], ln: [70, -10], lf: [68, -10] },
      with_(STAND, { an: [20, 15], af: [15, 15] }),
    ],
  },
  fentes: {
    view: "side",
    cycle: 5,
    frames: [
      STAND,
      { t: 180, an: [10, 2], af: [-10, -2], ln: [80, 0], lf: [-20, -85], ff: 60 },
      STAND,
      { t: 180, an: [-10, -2], af: [10, 2], ln: [-20, -85], fn: 60, lf: [80, 0] },
    ],
  },
  "pont-fessier": {
    view: "side",
    cycle: 3.4,
    anchor: "foot",
    props: [{ type: "mat" }],
    frames: [SUPINE_BENT, { t: 70, h: 20, an: [-100, -90], ln: [-112, 0], fn: -90 }],
  },
  "pont-une-jambe": {
    view: "side",
    cycle: 3.4,
    anchor: "foot",
    props: [{ type: "mat" }],
    frames: [
      { ...SUPINE_BENT, af: [-92, -90], lf: [-128, -128], ff: -128 },
      { t: 70, h: 20, an: [-100, -90], ln: [-112, 0], fn: -90, lf: [-106, -106], ff: -106 },
    ],
  },
  "squat-saute": {
    view: "side",
    cycle: 2.4,
    anchor: "foot",
    frames: [
      { t: 140, an: [-20, -10], af: [-24, -10], ln: [78, -22], lf: [74, -22] },
      { t: 180, an: [160, 170], af: [155, 170], ln: [-2, 0], lf: [-6, 0], fn: 30, ff: 30, lift: 14, d: 0.6 },
      { ...STAND, d: 0.5 },
    ],
  },
  "squat-goblet": {
    view: "side",
    cycle: 3.2,
    anchor: "foot",
    props: [{ type: "kettlebell" }],
    frames: [
      { ...STAND, an: [25, 170], af: [20, 170] },
      { t: 145, an: [60, 175], af: [55, 175], ln: [78, -22], lf: [74, -22] },
    ],
  },
  "souleve-de-terre-halteres": {
    view: "side",
    cycle: 3.6,
    anchor: "foot",
    props: [{ type: "dumbbells" }],
    frames: [
      { ...STAND, an: [4, 2], af: [0, 0] },
      { t: 105, h: -10, an: [-4, -4], af: [-8, -6], ln: [15, -8], lf: [13, -8] },
    ],
  },
  "chaise-murale": {
    view: "side",
    cycle: 4,
    anchor: "foot",
    props: [{ type: "wall", x: 63 }],
    frames: [
      { t: 180, an: [10, 10], af: [5, 8], ln: [90, 0], lf: [88, 0] },
      { t: 180, an: [14, 12], af: [9, 10], ln: [90, 0], lf: [88, 0] },
    ],
  },
  mollets: {
    view: "side",
    cycle: 2.4,
    anchor: "foot",
    props: [{ type: "wall", x: 150 }],
    frames: [
      { ...STAND, an: [80, 85], af: [75, 85] },
      { ...STAND, an: [80, 85], af: [75, 85], fn: 30, ff: 30 },
    ],
  },
  "swing-kettlebell": {
    view: "side",
    cycle: 2.2,
    anchor: "foot",
    props: [{ type: "kettlebell" }],
    frames: [
      { t: 118, h: -10, an: [-8, -10], af: [-10, -10], ln: [30, -15], lf: [26, -15] },
      { t: 182, an: [92, 92], af: [90, 90], ln: [2, 0], lf: [-2, 0] },
    ],
  },

  // ---------------------------------------------------------- Upper body
  "pompes-murales": {
    view: "side",
    cycle: 3,
    anchor: "hand",
    props: [{ type: "wall", x: 152 }],
    frames: [
      { t: 150, an: [90, 90], af: [88, 88], ln: [-30, -30], fn: 120, dx: 48 },
      { t: 144, an: [-25, 110], af: [-27, 110], ln: [-36, -36], fn: 125, dx: 48 },
    ],
  },
  "pompes-genoux": {
    view: "side",
    cycle: 3,
    anchor: "hand",
    props: [{ type: "mat" }],
    frames: [
      { t: 112, h: 5, an: [8, 0], af: [6, 0], ln: [-68, -95], fn: 175, dx: 40 },
      { t: 96, h: 5, an: [-55, 25], af: [-57, 25], ln: [-84, -95], fn: 175, dx: 40 },
    ],
  },
  pompes: {
    view: "side",
    cycle: 3,
    anchor: "hand",
    frames: [
      { ...PLANK, dx: 40 },
      { t: 93, h: 5, an: [-60, 20], af: [-62, 20], ln: [-87, -87], fn: 175, dx: 40 },
    ],
  },
  "dips-chaise": {
    view: "side",
    cycle: 3,
    anchor: "hand",
    props: [{ type: "chair", x: 47 }],
    frames: [
      { t: 175, an: [-15, -15], af: [-17, -15], ln: [85, 5], lf: [83, 5], dx: -25 },
      { t: 175, an: [-60, 24], af: [-62, 24], ln: [68, 15], lf: [66, 15], dx: -25 },
    ],
  },
  "rowing-halteres": {
    view: "side",
    cycle: 2.8,
    anchor: "foot",
    props: [{ type: "dumbbells" }],
    frames: [
      { t: 115, h: -10, an: [0, 0], af: [-2, 0], ln: [20, -8], lf: [18, -8] },
      { t: 115, h: -10, an: [-70, 5], af: [-72, 5], ln: [20, -8], lf: [18, -8] },
    ],
  },
  "rowing-elastique": {
    view: "side",
    cycle: 3,
    anchor: "foot",
    props: [{ type: "mat" }, { type: "band", to: "feet" }],
    frames: [
      { t: 170, an: [85, 88], af: [83, 88], ln: [90, 90], fn: 170 },
      { t: 180, an: [-45, 90], af: [-47, 90], ln: [90, 90], fn: 170 },
    ],
  },
  superman: {
    view: "side",
    cycle: 3.4,
    props: [{ type: "mat" }],
    frames: [
      { t: 90, h: 0, an: [90, 90], af: [88, 88], ln: [-90, -90], fn: -180 },
      { t: 103, h: -5, an: [110, 112], af: [108, 110], ln: [-102, -104], fn: -190 },
    ],
  },
  tractions: {
    view: "side",
    cycle: 3.4,
    anchor: "hand",
    hang: true,
    props: [{ type: "bar" }],
    frames: [
      { t: 180, an: [178, 178], af: [176, 176], ln: [10, -20], lf: [8, -20], fn: 60 },
      { t: 178, an: [40, 172], af: [38, 172], ln: [20, -20], lf: [18, -20], fn: 60 },
    ],
  },
  "developpe-epaules": {
    view: "front",
    cycle: 3,
    props: [{ type: "dumbbells" }],
    frames: [
      { ...FRONT, an: [85, 175] },
      { ...FRONT, an: [165, 178] },
    ],
  },
  "elevations-laterales": {
    view: "front",
    cycle: 3,
    props: [{ type: "dumbbells" }],
    frames: [
      { ...FRONT, an: [12, 10] },
      { ...FRONT, an: [88, 92] },
    ],
  },
  "curl-biceps": {
    view: "side",
    cycle: 2.6,
    props: [{ type: "dumbbells" }],
    frames: [
      { ...STAND, an: [2, 2], af: [-2, -2] },
      { ...STAND, an: [4, 160], af: [0, 160] },
    ],
  },
  "developpe-couche": {
    view: "side",
    cycle: 3,
    anchor: "hip",
    props: [{ type: "mat" }, { type: "dumbbells" }],
    frames: [
      { ...SUPINE_BENT, an: [178, 180], af: [176, 180] },
      { ...SUPINE_BENT, an: [-30, 175], af: [-32, 175] },
    ],
  },
  "elastique-ecartes": {
    view: "front",
    cycle: 3,
    props: [{ type: "band", to: "hands" }],
    frames: [
      { ...FRONT, an: [80, 40] },
      { ...FRONT, an: [92, 95] },
    ],
  },

  // ---------------------------------------------------------- Core
  planche: {
    view: "side",
    cycle: 4,
    props: [{ type: "mat" }],
    frames: [
      { t: 95, h: 5, an: [2, 92], af: [0, 92], ln: [-84, -84], fn: 175 },
      { t: 96, h: 5, an: [2, 92], af: [0, 92], ln: [-83, -83], fn: 175 },
    ],
  },
  "planche-laterale": {
    view: "front",
    cycle: 4,
    anchor: "foot",
    props: [{ type: "mat" }],
    frames: [
      { t: 112, narrow: true, an: [0, 0], af: [-180, -180], ln: [-68, -68], lf: [68, 68], dx: -40 },
      { t: 108, narrow: true, an: [0, 0], af: [-178, -178], ln: [-72, -72], lf: [72, 72], dx: -40 },
    ],
  },
  "dead-bug": {
    view: "side",
    cycle: 4,
    props: [{ type: "mat" }],
    frames: [
      { t: 90, an: [180, 180], ln: [180, -90], fn: -90 },
      { t: 90, an: [100, 95], af: [180, 180], ln: [180, -90], lf: [-95, -92], ff: -92 },
      { t: 90, an: [180, 180], ln: [180, -90], fn: -90 },
      { t: 90, an: [180, 180], af: [100, 95], ln: [-95, -92], fn: -92, lf: [180, -90] },
    ],
  },
  "crunch-velo": {
    view: "side",
    cycle: 2.6,
    props: [{ type: "mat" }],
    frames: [
      { t: 118, an: [160, 100], af: [155, 100], ln: [150, -92], fn: -92, lf: [-100, -96], ff: -96 },
      { t: 118, an: [160, 100], af: [155, 100], ln: [-100, -96], fn: -96, lf: [150, -92], ff: -92 },
    ],
  },
  "bird-dog": {
    view: "side",
    cycle: 4.4,
    props: [{ type: "mat" }],
    frames: [
      FOURS,
      { ...FOURS, an: [95, 95], lf: [-92, -92], ff: -92, d: 1.2 },
      { ...FOURS, an: [95, 95], lf: [-92, -92], ff: -92, d: 0.8 },
      FOURS,
      { ...FOURS, af: [95, 95], ln: [-92, -92], fn: -92, d: 1.2 },
      { ...FOURS, af: [95, 95], ln: [-92, -92], fn: -92, d: 0.8 },
    ],
  },
  "mountain-climbers": {
    view: "side",
    cycle: 1.4,
    anchor: "hand",
    frames: [
      { ...PLANK, ln: [40, -40], fn: 120, lf: [-78, -78], ff: 175, dx: 40 },
      { ...PLANK, ln: [-78, -78], fn: 175, lf: [40, -40], ff: 120, dx: 40 },
    ],
  },

  // ---------------------------------------------------------- Cardio
  "marche-sur-place": {
    view: "side",
    cycle: 1.6,
    frames: [
      { ...STAND, an: [-25, -10], af: [25, 45], ln: [55, -15], lf: [-2, 0] },
      { ...STAND, an: [25, 45], af: [-25, -10], ln: [-2, 0], lf: [55, -15] },
    ],
  },
  "rotations-bras": {
    view: "side",
    cycle: 2.4,
    wrap: true,
    frames: [
      { ...STAND, an: [0, 0], af: [180, 180] },
      { ...STAND, an: [90, 90], af: [270, 270] },
      { ...STAND, an: [180, 180], af: [360, 360] },
      { ...STAND, an: [270, 270], af: [450, 450] },
    ],
  },
  "jumping-jacks": {
    view: "front",
    cycle: 1.2,
    frames: [
      { ...FRONT, an: [10, 6], ln: [3, 0] },
      { ...FRONT, an: [160, 175], ln: [22, 18], lift: 8, d: 0.6 },
      { ...FRONT, an: [165, 178], ln: [22, 18], d: 0.4 },
    ],
  },
  "jacks-sans-saut": {
    view: "front",
    cycle: 2.6,
    frames: [
      { ...FRONT, an: [10, 6], ln: [3, 0] },
      { ...FRONT, an: [160, 175], ln: [28, 24], lf: [3, 0] },
      { ...FRONT, an: [10, 6], ln: [3, 0] },
      { ...FRONT, an: [160, 175], ln: [3, 0], lf: [28, 24] },
    ],
  },
  "montees-genoux": {
    view: "side",
    cycle: 1,
    frames: [
      { ...STAND, an: [-30, -10], af: [40, 100], ln: [95, -5], lf: [-4, 0], fn: 60, ff: 60, lift: 4 },
      { ...STAND, an: [40, 100], af: [-30, -10], ln: [-4, 0], lf: [95, -5], fn: 60, ff: 60, lift: 4 },
    ],
  },
  "talons-fesses": {
    view: "side",
    cycle: 1,
    frames: [
      { ...STAND, an: [-30, -10], af: [30, 90], ln: [-12, -160], fn: -170, lf: [2, 0], ff: 60, lift: 4 },
      { ...STAND, an: [30, 90], af: [-30, -10], ln: [2, 0], fn: 60, lf: [-12, -160], ff: -170, lift: 4 },
    ],
  },
  burpees: {
    view: "side",
    cycle: 4,
    anchor: "hand",
    frames: [
      { ...STAND, an: [8, 4], af: [4, 4], d: 0.8 },
      { t: 110, h: 10, an: [0, 0], af: [-2, 0], ln: [75, -40], lf: [72, -40], fn: 90 },
      { ...PLANK, d: 0.8 },
      { t: 110, h: 10, an: [0, 0], af: [-2, 0], ln: [75, -40], lf: [72, -40], fn: 90, d: 0.8 },
      { t: 180, an: [165, 175], af: [160, 175], ln: [-2, 0], lf: [-6, 0], fn: 30, ff: 30, lift: 12, d: 0.7 },
    ],
  },
  "pas-chasses": {
    view: "front",
    cycle: 2.4,
    frames: [
      { t: 180, an: [30, 80], ln: [18, -6], dx: -26 },
      { t: 180, an: [30, 80], ln: [6, -4], dx: -8, lift: 6, d: 0.6 },
      { t: 180, an: [30, 80], ln: [18, -6], dx: 10, d: 0.6 },
      { t: 180, an: [30, 80], ln: [18, -6], dx: 26 },
      { t: 180, an: [30, 80], ln: [6, -4], dx: 8, lift: 6, d: 0.6 },
      { t: 180, an: [30, 80], ln: [18, -6], dx: -10, d: 0.6 },
    ],
  },
  "boxe-air": {
    view: "side",
    cycle: 1.4,
    frames: [
      { t: 178, an: [92, 90], af: [20, 160], ln: [18, 0], lf: [-18, 0] },
      { t: 178, an: [20, 160], af: [92, 90], ln: [18, 0], lf: [-18, 0] },
    ],
  },
  "step-marche": {
    view: "side",
    cycle: 3.2,
    anchor: "foot",
    props: [{ type: "step", x: 104 }],
    frames: [
      STAND,
      { ...STAND, an: [-20, 10], af: [25, 60], ln: [60, -10], lf: [-2, 0] },
      { ...STAND, an: [6, 4], af: [-6, -4], ln: [55, -15], lf: [-30, -30], ff: 40 },
      { ...STAND, an: [-20, 10], af: [25, 60], ln: [60, -10], lf: [-2, 0] },
    ],
  },
  "corde-a-sauter": {
    view: "side",
    cycle: 0.9,
    props: [{ type: "rope" }],
    frames: [
      { ...STAND, an: [20, 70], af: [16, 70], ln: [2, -4], lf: [0, -4], fn: 50, ff: 50, lift: 9 },
      { ...STAND, an: [22, 72], af: [18, 72], ln: [6, -6], lf: [4, -6] },
    ],
  },
  patineur: {
    view: "front",
    cycle: 2,
    frames: [
      { t: 165, an: [40, 20], af: [30, 10], ln: [8, -12], lf: [-30, -60], dx: -30 },
      { t: 180, an: [20, 10], ln: [6, 0], lift: 14, dx: 0, d: 0.7 },
      { t: 195, an: [30, 10], af: [40, 20], ln: [-30, -60], lf: [8, -12], dx: 30, d: 0.8 },
      { t: 180, an: [20, 10], ln: [6, 0], lift: 14, dx: 0, d: 0.7 },
    ],
  },

  // ---------------------------------------------------------- Mobility
  "chat-vache": {
    view: "side",
    cycle: 5,
    props: [{ type: "mat" }],
    frames: [
      { ...FOURS, h: 45, bend: 9 },
      { ...FOURS, h: -25, bend: -7 },
    ],
  },
  "etirement-ischios": {
    view: "side",
    cycle: 5,
    props: [{ type: "mat" }],
    frames: [
      { t: 175, an: [60, 80], af: [58, 80], ln: [90, 90], fn: 170 },
      { t: 120, h: 15, an: [95, 95], af: [93, 95], ln: [90, 90], fn: 170 },
    ],
  },
  "fente-flechisseurs": {
    view: "side",
    cycle: 5,
    props: [{ type: "mat" }],
    frames: [
      { t: 178, an: [35, 60], af: [33, 60], ln: [85, 0], lf: [-10, -90], ff: -175 },
      { t: 182, an: [40, 60], af: [38, 60], ln: [92, -10], lf: [-25, -90], ff: -175, dx: 6 },
    ],
  },
  "posture-enfant": {
    view: "side",
    cycle: 5,
    props: [{ type: "mat" }],
    frames: [
      { t: 72, h: 25, an: [92, 92], af: [90, 92], ln: [48, -92], fn: -175 },
      { t: 78, h: 25, an: [94, 92], af: [92, 92], ln: [50, -92], fn: -175 },
    ],
  },
  "rotation-thoracique": {
    view: "side",
    cycle: 4.4,
    props: [{ type: "mat" }],
    frames: [
      { ...FOURS, an: [-60, 20] },
      { ...FOURS, h: -20, an: [180, 180] },
    ],
  },
  "etirement-pectoraux": {
    view: "side",
    cycle: 5,
    props: [{ type: "wall", x: 58 }],
    frames: [
      { ...STAND, an: [-92, -95], af: [-4, -2], ln: [8, 0], lf: [-4, 0] },
      { ...STAND, t: 176, an: [-100, -102], af: [-4, -2], ln: [12, 0], lf: [-4, 0] },
    ],
  },
  papillon: {
    view: "front",
    cycle: 2.4,
    props: [{ type: "mat" }],
    frames: [
      { t: 180, an: [8, -12], ln: [115, -64] },
      { t: 180, an: [10, -14], ln: [92, -85] },
    ],
  },
};
