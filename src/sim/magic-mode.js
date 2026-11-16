// The mind-reading mode for the virtual robot: a port of src/py/magic_mode.py, statement by statement, so that it prints the same lines at the
// same times and moves the same wheels. tests/magic.test.js checks it against what the Python mode did on the Python virtual robot
// (tests/golden-magic.json); keep the two in step.
//
// tick(input) runs one tick of the mode (20 ms of the robot's life). input: { acc: [ax, ay, az] (raw accelerometer), ground: [left, right]
// (the two ground sensors) or null (a robot without them), buttons: [back, left, centre, forward, right] }. What the mode says goes to
// `say(text)`, its tones to `tone(freq, tenths)`, its sounds to `sound(id)` and its lights to `lights({ circle, body })`.
import { TICK_MS } from '../spec.js';

export { TICK_MS };
const G = 16384;
const VERT_AZ = 7000, FLAT_AZ = 15000, FLAT_XY = 5000, LIFT_AZ = 10000, LIFT_TICKS = 10;
const STABLE_TICKS = 25, KEEP_TICKS = 100, HAND_TICKS = 10, HAND_OFF_PCT = 60, FLAT_TICKS = 25, UNREADY_TICKS = 10;
const HYST = 0.15, FILTER = 0.4;
const SPIN_SPEED = 500, DRIVE_SPEED = 200;
const TICKS_PER_S = 5000000, TAU300_S = 0.115, GUARD_TICKS = 150000, STOP_MS = 500, PAUSE_TICKS = 15, SLIP_PAUSE_TICKS = 40, TURN_TIMEOUT = 750;
const UPSIDE_AZ = -13000, UPSIDE_TICKS = 25;
const S_KP = 0.1, S_KI = 0.2, S_MAX_I = 1000, S_LIMIT = 600;
const MAXB = 16, NET_TICKS = 5, BLINK_TICKS = 15, BLINKS = 12, SND_END = 11;
const JINGLE = [[523, 2], [659, 2], [784, 2], [1047, 5], [784, 2], [880, 2], [988, 2], [1175, 5], [1047, 2], [1175, 2], [1319, 10]];
const ST = { wait: 0, locked: 1, ready: 2, spin: 3, drive: 4, finale: 5 };
const STATE_NAMES = ['wait', 'locked', 'ready', 'spin', 'drive', 'finale'];
const F_VERT = 1, F_FLAT = 2, F_HAND = 4, F_STEADY = 8, F_BTN = 16;
export const JINGLE_NOTES = JINGLE;

const tdiv = (a, b) => Math.trunc(a / b);
const clamp = (v, l) => Math.max(-Math.abs(l), Math.min(Math.abs(l), v));
const rnd = (v) => (v < 0 ? Math.trunc(v - 0.5) : Math.trunc(v + 0.5));
// Python's % on floats: the sign of the divisor
const pmod = (a, m) => { let r = a % m; if (r !== 0 && (r < 0) !== (m < 0)) r += m; return r; };
const imod8 = (v) => ((v % 8) + 8) % 8;

export function atan1(z) { return 57.29578 * (0.7853982 * z - z * (z - 1.0) * (0.2447 + 0.0663 * z)); }
export function atan2Deg(y, x) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax === 0 && ay === 0) return 0.0;
  let a = ax >= ay ? atan1(ay / ax) : 90.0 - atan1(ax / ay);
  if (x < 0) a = 180.0 - a;
  if (y < 0) a = -a;
  return a;
}
export const wrap180 = (a) => pmod(a + 180.0, 360.0) - 180.0;

export function driveTicks(distMm, speed, dur15) {
  const secs15 = dur15 / TICKS_PER_S;
  let run = secs15 - TAU300_S;
  if (run < 0.2) run = 0.2;
  const k = 150.0 / (300.0 * run);
  const t = distMm / (speed * k) + (TAU300_S * speed) / 300.0;
  return Math.trunc(t * TICKS_PER_S);
}

class Edge {
  constructor() { this.prev = 0; }
  call(cond) {
    const c = cond ? 1 : 0;
    const r = c && !this.prev;
    this.prev = c;
    return !!r;
  }
}

export class MagicMode {
  constructor(robot, { theta4 = 0, dirn = -1, dist = 90, hand = 300, force = -1, sound = 1, slip = true, say = () => {}, tone = () => true, playSound = () => {}, lights = () => {} } = {}) {
    this.r = robot;
    this.say = (...parts) => say(`@@${parts.join(' ')}`);
    this.toneOut = tone;
    this.soundOut = playSound;
    this.lightsOut = lights;
    this.args = { theta4, dirn, dist, hand, force, sound };
    this.theta4 = theta4;
    this.dirn = dirn > 0 ? 1 : -1;
    this.dist = dist;
    this.handOn = hand;
    this.sound = sound;
    this.state = ST.wait;
    this.ticks = 0;
    this.t0 = robot.nowMs;
    this.rot90 = robot.rot90;
    this.dur15 = robot.dur[0];
    // the senses
    this.fx = 0.0; this.fy = 0.0; this.fz = G; this.first = true;
    this.cur = null; this.cand = null; this.same = 0;
    this.steady = null; this.steadyAge = KEEP_TICKS + 1;
    this.vertical = false; this.flat = false; this.handSeen = false;
    this.handN = 0; this.flatN = 0; this.unreadyN = 0; this.liftN = 0; this.upsideN = 0;
    this.gl = 0; this.gr = 0; this.pressed = 0;
    this.ax = 0; this.ay = 0; this.az = 0;
    this.lock = -1; this.anim = 0;
    // the show
    this.heading = 0; this.delay = 0; this.waitN = 0;
    this.slipLeft = !!slip;        // the first show since the mode started goes one number too far (until the audience has seen it)
    this.slipping = false; this.phase = 0; this.final = 0;
    this.motionInProgress = false; this.motionRunning = false;
    this.tStop = 0; this.alarm = 0; this.lastEl = 0; this.tMove = 0;
    this.sOn = false; this.sTarget = 0; this.sBase = 0; this.sMaxCorr = 0.0; this.sInt = 0.0; this.sLastUs = 0;
    this.noteI = 0; this.noteAt = 0; this.toneOk = true; this.blinks = 0; this.blinkN = 0;
    // lights
    this.lit = -1; this.glow = null;
    this.circleNow = 0; this.bodyNow = [0, 0, 0];
    this.eCentre = new Edge();
    this.quit = false;
    this.input = { acc: [0, 0, G], ground: null, buttons: [0, 0, 0, 0, 0] };
    this.hasGround = true;
    this.force = force;
  }

  // run(): the lines it says at its start
  start() {
    if (this.force >= 0 && this.force <= 7) {
      this.lock = this.force;
      this.state = ST.locked;
      this.say('lock', this.force, 'forced');
    }
    this.say('hello', 1);
    this.say('cfg', this.args.theta4, this.dirn, this.dist, this.handOn, this.force, this.sound);
    this.say('bat', 4012);
  }

  // cleanup(): stop everything, switch the lights off
  stop() {
    const r = this.r;
    r.timerPause();
    r.setSpeed(0, 0);
    r.cancelRotation();
    r.setSpeed(0, 0);
    this.setBody(0, 0, 0);
    this.setCircle(0);
    this.say('bye');
  }

  // ---- lights ----
  setBody(r, g, b) { this.bodyNow = [r, g, b]; this.lightsOut({ circle: this.circleNow, body: this.bodyNow }); }
  setCircle(v) { this.circleNow = v ? 8 : 0; this.lightsOut({ circle: this.circleNow, body: this.bodyNow }); }
  setCircleCount(n) { this.circleNow = n; this.lightsOut({ circle: this.circleNow, body: this.bodyNow }); }

  // ---- the senses ----
  sector(ax, ay) {
    const th = atan2Deg(ay, ax);
    const kf = (this.dirn * wrap180(th - this.theta4)) / 45.0;
    if (this.cur !== null) {
      const d = pmod(kf - (this.cur - 4) + 4.0, 8.0) - 4.0;
      if (Math.abs(d) <= 0.5 + HYST) return this.cur;
    }
    return imod8(4 + Math.trunc(kf + 8.5) - 8);
  }

  readSenses() {
    const acc = this.input.acc;
    if (this.first) {
      this.fx = acc[0]; this.fy = acc[1]; this.fz = acc[2];
      this.first = false;
    } else {
      this.fx += (acc[0] - this.fx) * FILTER;
      this.fy += (acc[1] - this.fy) * FILTER;
      this.fz += (acc[2] - this.fz) * FILTER;
    }
    const ax = Math.trunc(this.fx);
    const ay = Math.trunc(this.fy);
    const az = Math.trunc(this.fz);
    this.ax = ax; this.ay = ay; this.az = az;
    this.vertical = Math.abs(az) < VERT_AZ;
    this.flat = az > FLAT_AZ && Math.abs(ax) < FLAT_XY && Math.abs(ay) < FLAT_XY;
    if (this.vertical) {
      const n = this.sector(ax, ay);
      this.cur = n;
      if (n === this.cand) this.same += 1;
      else { this.cand = n; this.same = 1; }
    } else {
      this.cur = null; this.cand = null; this.same = 0;
    }
    if (this.same >= STABLE_TICKS) {
      this.steady = this.cur;
      this.steadyAge = 0;
    } else if (this.steadyAge <= KEEP_TICKS) {
      this.steadyAge += 1;
    }
    const ground = this.input.ground;
    if (ground) { this.gl = ground[0]; this.gr = ground[1]; }
    const level = this.gl > this.gr ? this.gl : this.gr;
    if (level >= this.handOn) this.handSeen = true;
    else if (level * 100 < this.handOn * HAND_OFF_PCT) this.handSeen = false;
    if (this.handSeen) this.handN += 1; else this.handN = 0;
    if (this.flat) this.flatN += 1; else this.flatN = 0;
    if (az <= UPSIDE_AZ) this.upsideN += 1; else this.upsideN = 0;
  }

  usable() { return this.steady !== null && this.steadyAge <= KEEP_TICKS ? this.steady : null; }

  flags() {
    let f = 0;
    if (this.vertical) f |= F_VERT;
    if (this.flat) f |= F_FLAT;
    if (this.handSeen) f |= F_HAND;
    if (this.same >= STABLE_TICKS) f |= F_STEADY;
    if (this.pressed) f |= F_BTN;
    return f;
  }

  // ---- the states ----
  setState(state) {
    this.state = state;
    this.waitN = 0;
    this.delay = 0;
    this.say('phase', STATE_NAMES[state]);
  }

  doWait(press) {
    if (this.vertical && this.handN >= HAND_TICKS) {
      const n = this.usable();
      if (n === null) {
        if (this.handN === HAND_TICKS) this.say('ignored', 'unsteady');
        return;
      }
      this.freeze(n);
    } else if (press) {
      this.say('ignored', 'nolock');
    }
  }

  freeze(n) {
    this.lock = n;
    this.anim = 0;
    this.say('lock', n);
    this.setState(ST.locked);
    if (this.sound) this.toneOut(1175, 2);
  }

  doLocked(press) {
    this.anim += 1;
    if (this.upsideN >= UPSIDE_TICKS) { this.forget(); return; }
    if (press) this.say('ignored', 'notflat');
    if (this.flatN >= FLAT_TICKS) {
      this.unreadyN = 0;
      this.say('placed');
      this.setState(ST.ready);
    }
  }

  doReady(press) {
    this.anim += 1;
    if (this.upsideN >= UPSIDE_TICKS) { this.forget(); return; }
    if (this.flat) {
      this.unreadyN = 0;
    } else {
      this.unreadyN += 1;
      if (this.unreadyN >= UNREADY_TICKS) {
        this.say('lifted');
        this.setState(ST.locked);
        return;
      }
    }
    if (press) this.beginShow();
  }

  forget() {
    this.say('reset');
    if (this.sound) this.toneOut(440, 3);
    this.reset();
  }

  reset() {
    this.lock = -1;
    this.steady = null;
    this.steadyAge = KEEP_TICKS + 1;
    this.handN = 0;
    this.setState(ST.wait);
  }

  // ---- the show ----
  beginShow() {
    this.say('go', this.lock);
    this.r.resetAngle();
    // one rotation, clockwise: a full turn and on to the number
    this.final = -(360 + 45 * this.lock);
    this.slipping = this.slipLeft;
    this.phase = 0;
    // the first time it "makes a mistake": on to the next number (the one after 7 is 0, one more lap)
    this.heading = this.slipping ? -(360 + 45 * (this.lock + 1)) : this.final;
    this.r.rotateAbsolute(this.heading, SPIN_SPEED);
    this.liftN = 0;
    this.setState(ST.spin);
  }

  stopMotion() {
    const r = this.r;
    r.timerPause();
    r.setSpeed(0, 0);
    r.cancelRotation();
    r.setSpeed(0, 0);
    this.sOn = false;
    this.motionRunning = false;
    this.motionInProgress = false;
  }

  abortShow(why) {
    this.stopMotion();
    this.say('abort', why);
    this.anim = 100;
    this.flatN = 0;
    this.setState(ST.locked);
  }

  doShow() {
    const st = this.state;
    if (this.az < LIFT_AZ) {
      this.liftN += 1;
      if (this.liftN >= LIFT_TICKS) { this.abortShow('lifted'); return; }
    } else {
      this.liftN = 0;
    }
    this.waitN += 1;
    if (st === ST.spin) {
      if (this.phase === 1) {
        // it has gone one number too far and stays there a moment
        this.delay += 1;
        if (this.delay >= SLIP_PAUSE_TICKS) {
          // then back, the short way (anticlockwise), to the right number
          this.heading = this.final;
          this.r.rotateAbsolute(this.heading, SPIN_SPEED);
          this.phase = 2;
          this.waitN = 0;
          this.delay = 0;
        }
        return;
      }
      let done = this.r.rotationCompleted();
      if (!done && this.waitN > TURN_TIMEOUT) {
        this.r.cancelRotation();
        done = true;
      }
      if (done && this.waitN > 1) {
        if (this.phase === 0 && this.slipping) {
          // the mistake has been made, and seen: it will not be made again until the mode is started again
          this.slipLeft = false;
          this.phase = 1;
          this.delay = 0;
        } else {
          this.delay += 1;
          if (this.delay >= PAUSE_TICKS) this.drive();
        }
      }
    } else if (st === ST.drive) {
      if (!this.motionInProgress) this.finale();
    }
  }

  drive() {
    this.setState(ST.drive);
    this.startMove(driveTicks(this.dist, DRIVE_SPEED, this.dur15));
  }

  finale() {
    this.setState(ST.finale);
    this.noteI = 0;
    this.noteAt = this.r.nowMs;
    this.toneOk = true;
    this.blinks = 0;
    this.blinkN = 0;
    this.setCircle(MAXB);
    this.setBody(MAXB, MAXB, MAXB);
    this.lit = -1;
    this.glow = null;
  }

  doFinale() {
    const now = this.r.nowMs;
    if (this.sound && this.noteI < JINGLE.length && now - this.noteAt >= 0) {
      const [freq, tenths] = JINGLE[this.noteI];
      if (this.toneOk && !this.toneOut(freq, tenths)) {
        this.toneOk = false;
        this.soundOut(SND_END);
      }
      this.noteI += 1;
      this.noteAt = now + tenths * 100;
    }
    this.blinkN += 1;
    if (this.blinkN >= BLINK_TICKS && this.blinks < BLINKS) {
      this.blinkN = 0;
      this.blinks += 1;
      const on = (this.blinks & 1) === 0;
      this.setCircle(on ? MAXB : 0);
      if (on) this.setBody(MAXB, MAXB / 2, 0); else this.setBody(0, MAXB / 2, MAXB);
    }
    const soundDone = !this.sound || (this.noteI >= JINGLE.length && now - this.noteAt >= 300);
    if (this.blinks >= BLINKS && soundDone) {
      this.setCircle(0);
      this.setBody(0, 0, 0);
      this.say('end', this.lock);
      this.reset();
    }
  }

  // ---- straight controller ----
  straightStart(headingDeg, speed) {
    this.sTarget = tdiv(headingDeg * this.rot90, 90);
    this.sBase = speed;
    this.sMaxCorr = Math.abs(speed);
    this.sInt = 0.0;
    this.sLastUs = this.r.tUs;
    this.sOn = true;
  }

  applySpeeds(base, corr) {
    let left = base - corr;
    let right = base + corr;
    const over = (left > right ? left : right) - S_LIMIT;
    if (over > 0) { left -= over; right -= over; }
    const under = -S_LIMIT - (left < right ? left : right);
    if (under > 0) { left += under; right += under; }
    this.r.setSpeed(rnd(left), rnd(right));
  }

  straightUpdate() {
    if (!this.sOn) return;
    if (!this.motionRunning) { this.sOn = false; return; }
    const el = this.r.timerGet();
    const late = this.r.nowMs - this.tMove > Math.floor(this.alarm / 5000) + 150;
    const done = el >= this.alarm || el < this.lastEl || late;
    this.lastEl = el;
    if (done) { this.endMove(); return; }
    if (el >= this.alarm - GUARD_TICKS) return;
    const now = this.r.tUs;
    let dt = (now - this.sLastUs) / 1000000.0;
    this.sLastUs = now;
    if (dt <= 0.0 || dt > 0.1) dt = 0.02;
    const err = this.sTarget - this.r.angleRaw();
    this.sInt = clamp(this.sInt + err * dt, S_MAX_I);
    const corr = clamp(S_KP * err + S_KI * this.sInt, this.sMaxCorr);
    this.applySpeeds(this.sBase, corr);
  }

  startMove(dur) {
    const r = this.r;
    r.timerSet(dur);
    r.timerReset();
    r.timerStart();
    this.alarm = dur;
    this.lastEl = 0;
    this.tMove = r.nowMs;
    this.motionInProgress = true;
    this.motionRunning = true;
    this.straightStart(this.heading, DRIVE_SPEED);
    this.straightUpdate();
  }

  endMove() {
    this.motionRunning = false;
    this.sOn = false;
    this.r.setSpeed(0, 0);
    this.r.timerPause();
    this.tStop = this.r.nowMs;
  }

  // ---- lights ----
  lightsTick() {
    const st = this.state;
    let glow;
    if (st === ST.locked || st === ST.ready) {
      const a = this.anim;
      const n = a < 32 ? Math.floor(a / 4) + 1 : a < 52 ? 8 : 0;
      if (n !== this.lit) { this.lit = n; this.setCircleCount(n); }
      glow = st === ST.locked ? [0, 0, 3] : [0, 4, 0];
    } else if (st === ST.finale) {
      return;
    } else {
      if (this.lit !== 0) { this.lit = 0; this.setCircle(0); }
      glow = [0, 0, 0];
    }
    if (!this.glow || glow[0] !== this.glow[0] || glow[1] !== this.glow[1] || glow[2] !== this.glow[2]) {
      this.glow = glow;
      this.setBody(glow[0], glow[1], glow[2]);
    }
  }

  // ---- one tick ----
  tick(input) {
    this.input = { acc: input.acc ?? this.input.acc, ground: input.ground ?? null, buttons: input.buttons ?? [0, 0, 0, 0, 0] };
    const status = this.input.buttons;
    this.pressed = status[2] ? 1 : 0;
    const press = this.eCentre.call(status[2]);
    this.readSenses();
    const st = this.state;
    if (st === ST.wait) this.doWait(press);
    else if (st === ST.locked) this.doLocked(press);
    else if (st === ST.ready) this.doReady(press);
    else if (st === ST.finale) this.doFinale();
    else this.doShow();
    this.lightsTick();
    this.straightUpdate();
    if (this.motionInProgress && !this.motionRunning) {
      if (this.r.nowMs - this.tStop >= STOP_MS) this.motionInProgress = false;
    }
    this.ticks += 1;
    if (this.ticks % NET_TICKS === 0) this.reportN();
  }

  reportN() {
    const num = this.cur !== null ? this.cur : -1;
    this.say('n', this.r.nowMs - this.t0, this.state, this.lock, num, this.flags(), this.ax, this.ay, this.az, this.gl, this.gr);
  }
}
