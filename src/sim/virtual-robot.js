// The virtual Thymio: the physics (sim/physics.js) with the JavaScript twin of the mode in it (sim/magic-mode.js). One tick() is 20 ms of the
// robot's life: the mode decides, then the physics moves the body in ten steps of 2 ms.
//
// What the person (or a test) drives: how the robot is held (`hold(n)`: upright at number n, `lay()`: flat on the table), whether a hand is
// under it (`hand(on)`), and the centre button (`press()`). The accelerometer is what that pose would read (accFor, the model of the mode's
// comment), with a little noise if asked.
import { VirtualThymio } from './physics.js';
import { MagicMode, TICK_MS } from './magic-mode.js';
import { accFor, G } from '../spec.js';

const STEPS_PER_TICK = (TICK_MS * 1000) / 2000;
const HAND_READING = [900, 850];

export class VirtualRobot {
  constructor(options = {}) {
    this.body = new VirtualThymio(options);
    this.noise = options.noise ?? 0;                  // raw accelerometer units of noise (a hand-held robot is not still)
    this.rng = options.rng ?? Math.random;
    this.mode = null;
    this.buttons = [0, 0, 0, 0, 0];
    this.acc = [0, 0, G];
    this.groundReading = [0, 0];
    this.hasGround = options.ground !== false;
    this.held = null;                                 // the number the robot is held at, or null (flat)
    this.tilt = 0;
    this.lines = [];
    this.tones = [];
    this.sounds = [];
    this.lights = { circle: 0, body: [0, 0, 0] };
    this.pressUntil = 0;
  }

  get running() { return !!this.mode; }
  get clock() { return this.body.nowMs; }

  // Start the mode: returns what it says at once. `init`: { theta4, dirn, dist, hand, force, sound }.
  start(init = {}) {
    this.body.setSpeed(0, 0);
    this.body.timerPause();
    this.body.cancelRotation();
    this.mode = new MagicMode(this.body, {
      theta4: init.theta4 ?? 0,
      dirn: init.dirn ?? -1,
      dist: init.dist ?? 90,
      hand: init.hand ?? 300,
      force: init.force ?? -1,
      sound: init.sound ?? 1,
      say: (text) => this.lines.push(text),
      tone: (freq, tenths) => { this.tones.push([this.body.nowMs, freq, tenths]); return true; },
      playSound: (id) => this.sounds.push([this.body.nowMs, id]),
      lights: (l) => { this.lights = { circle: l.circle, body: [...l.body] }; },
    });
    this.mode.start();
    return this.take();
  }

  stop() {
    if (this.mode) this.mode.stop();
    this.mode = null;
    return this.take();
  }

  // ---- how the robot is held ----
  hold(n, tilt = 0) { this.held = n; this.tilt = tilt; this.acc = accFor(n, { tilt }); }
  lay() { this.held = null; this.tilt = 0; this.acc = [0, 0, G]; }
  // somewhere between, on its way down or up (the underside turned towards the table by `deg` degrees from the vertical)
  lean(deg) { this.held = null; const a = (deg * Math.PI) / 180; this.acc = [Math.round(Math.sin(a) * 4000), 0, Math.round(G * Math.sin(a))]; }
  // on its back: the underside up (the way to make the robot forget the number)
  flip() { this.held = null; this.tilt = 0; this.acc = [0, 0, -G]; }
  hand(on) { this.groundReading = on && this.hasGround ? HAND_READING : [0, 0]; }
  press(ms = 100) { this.buttons[2] = 1; this.pressUntil = this.body.nowMs + ms; }

  // Put the robot down somewhere (mm, degrees counter-clockwise from "up").
  place(x, y, deg) { this.body.place(x, y, deg); }

  take() {
    const out = { lines: this.lines, tones: this.tones, sounds: this.sounds };
    this.lines = [];
    this.tones = [];
    this.sounds = [];
    return out;
  }

  tick() {
    let out = null;
    if (this.mode) {
      if (this.buttons[2] && this.body.nowMs >= this.pressUntil) this.buttons[2] = 0;
      const n = this.noise;
      const acc = n ? this.acc.map((v) => Math.round(v + (this.rng() * 2 - 1) * n)) : this.acc;
      this.mode.tick({ acc, ground: this.hasGround ? this.groundReading : null, buttons: this.buttons });
      out = this.take();
    }
    for (let i = 0; i < STEPS_PER_TICK; i++) this.body.step();
    return out;
  }
}
