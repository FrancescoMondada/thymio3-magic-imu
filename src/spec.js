// What the page and the robot's mode (src/py/magic_mode.py) agree on. Pure: no import of the browser, Node tests it.

export const TICK_MS = 20;
export const G = 16384;                           // 1 g on the raw accelerometer

// The states of the mode, in the order of the number it prints (@@n ms STATE ...).
export const STATES = ['wait', 'locked', 'ready', 'spin', 'drive', 'finale'];
export const SHOWING = ['spin', 'drive', 'finale'];     // the robot is performing

// Bits of the "flags" of @@n.
export const FLAG = { VERT: 1, FLAT: 2, HAND: 4, STEADY: 8, BTN: 16 };

// The numbers on the prediction plate: 0 at the bottom, then clockwise (1 bottom-left, 2 left, 3 top-left, 4 top, 5 top-right, 6 right,
// 7 bottom-right). `plateAngle(n)` is clockwise from the bottom, in degrees.
export const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7];
export const plateAngle = (n) => n * 45;
// The place of a number on a screen (y down) around a centre, at radius r: 0 at the bottom, 2 on the left, 4 at the top, 6 on the right.
export function platePoint(n, r, cx = 0, cy = 0) {
  const a = (plateAngle(n) * Math.PI) / 180;
  return { x: cx - r * Math.sin(a), y: cy + r * Math.cos(a) };
}

// ---- the settings the mode takes at its start (run(theta4, dirn, dist, hand, force, sound)) -----------------------------------
export const DEFAULTS = Object.freeze({ theta4: 0, dirn: -1, dist: 90, hand: 300, sound: 1 });
export const LIMITS = Object.freeze({ dist: [30, 200], hand: [80, 900] });
// What the page asks a REAL robot by default. DEFAULTS above is the model (the virtual robot's sensor, the tests); the first test on a real robot
// (2026-11-16) read front up as 0 and front to the magician's left as 2 with the model, i.e. the real (ax, ay) is (-,0) for 4 and (0,+) for 2:
// the angle of 4 is 180 degrees (written -180) and the numbers grow with the angle. The calibration in the settings measures it again.
export const REAL_TILT = Object.freeze({ theta4: -180, dirn: 1 });          // (-180 is 180: the settings wrap to [-180, 180))

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const clampDist = (v) => clamp(Math.round(Number(v) || DEFAULTS.dist), LIMITS.dist[0], LIMITS.dist[1]);
export const clampHand = (v) => clamp(Math.round(Number(v) || DEFAULTS.hand), LIMITS.hand[0], LIMITS.hand[1]);
export const clampTheta = (v) => { const t = Math.round(Number(v)); return Number.isFinite(t) ? ((((t + 180) % 360) + 360) % 360) - 180 : 0; };
export const clampDirn = (v) => (Number(v) > 0 ? 1 : -1);
export const clampNumber = (v) => { const n = Math.trunc(Number(v)); return Number.isInteger(n) && n >= 0 && n <= 7 ? n : -1; };

// The arguments of run(): theta4, dirn, dist, hand, force (a number to freeze at once, or -1), sound.
export function runArgs(s = {}) {
  const c = runConfig(s);
  return `${c.theta4}, ${c.dirn}, ${c.dist}, ${c.hand}, ${c.force}, ${c.sound}`;
}

// What the mode will run with, as the robot reports it in @@cfg. The page knows it too, because it is the one that asks: it uses it to read
// the tilt when that one-shot line is lost on the way (a real robot loses lines at its start).
export function runConfig(s = {}) {
  const f = { ...DEFAULTS, ...s };
  return { theta4: clampTheta(f.theta4), dirn: clampDirn(f.dirn), dist: clampDist(f.dist), hand: clampHand(f.hand), force: s.force == null ? -1 : clampNumber(s.force), sound: f.sound ? 1 : 0 };
}

// ---- reading the accelerometer ---------------------------------------------------------------------------------------------
export const wrap180 = (a) => { let r = (a + 180) % 360; if (r !== 0 && r < 0) r += 360; return r - 180; };
export const angleDeg = (ay, ax) => (Math.atan2(ay, ax) * 180) / Math.PI;

// Where the robot's front points on the plate for a reading (ax, ay), as a continuous number from 0 to 8 (the mode rounds it to 0..7 with a
// margin): 4 + dirn x (angle - theta4) / 45.
export function plateNumber(ax, ay, { theta4 = DEFAULTS.theta4, dirn = DEFAULTS.dirn } = {}) {
  const kf = (dirn * wrap180(angleDeg(ay, ax) - theta4)) / 45;
  return (((4 + kf) % 8) + 8) % 8;
}

// The reading (ax, ay) of a robot held at number n in a vertical plane (the model of the mode's comment), `tilt` degrees out of that plane.
export function accFor(n, { theta4 = DEFAULTS.theta4, dirn = DEFAULTS.dirn, tilt = 0 } = {}) {
  const theta = ((theta4 + dirn * (n - 4) * 45) * Math.PI) / 180;
  const plane = G * Math.cos((tilt * Math.PI) / 180);
  return [Math.round(plane * Math.cos(theta)), Math.round(plane * Math.sin(theta)), Math.round(G * Math.sin((tilt * Math.PI) / 180))];
}

// The two-pose calibration: the robot is held at 4 (front up), then at 6 (front to the audience's right); a = { ax, ay, az } each time.
// Returns { theta4, dirn } for the mode, or { error } (not vertical, or the two poses are not a quarter turn apart).
export function calibrate(a4, a6) {
  const plane = (a) => Math.hypot(a.ax, a.ay);
  for (const a of [a4, a6]) {
    if (!a || !Number.isFinite(a.ax) || !Number.isFinite(a.ay) || plane(a) < 10000) return { error: 'vertical' };
  }
  const t4 = angleDeg(a4.ay, a4.ax);
  const t6 = angleDeg(a6.ay, a6.ax);
  const turn = wrap180(t6 - t4);
  if (Math.abs(turn) < 60 || Math.abs(turn) > 120) return { error: 'quarter', turn: Math.round(turn) };
  const dirn = turn > 0 ? 1 : -1;
  const second = t6 - dirn * 90;                    // the same "4" as seen from the second pose
  const theta4 = clampTheta(t4 + wrap180(second - t4) / 2);
  return { theta4, dirn, turn: Math.round(turn) };
}

// The average of a few readings of {ax, ay, az}.
export function meanReading(list) {
  if (!list.length) return null;
  const sum = list.reduce((s, r) => ({ ax: s.ax + r.ax, ay: s.ay + r.ay, az: s.az + r.az }), { ax: 0, ay: 0, az: 0 });
  return { ax: sum.ax / list.length, ay: sum.ay / list.length, az: sum.az / list.length };
}

// ---- the robot (for the virtual one and the geometry of the plate) ------------------------------------------------------------
export const FACTORY_15CM_TICKS = 9000000;
export const MM_PER_UNIT = 150 / 1.8 / 300;       // a wheel speed unit in mm/s: 0.278
export const WHEEL_BASE = 94;
export const ROT90_NOMINAL = 16384;
// The plate (the A2 sheet of prediction-plate.pdf, 594 x 420 mm): the centre of the T of number n is 139 mm from the centre of the plate.
export const PLATE = { width: 594, height: 420, reach: 139, stemFrom: 39, bar: 48 };
