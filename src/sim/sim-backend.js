import { VirtualRobot } from './virtual-robot.js';
import { parseRobotLine } from '../protocol.js';
import { TICK_MS } from './magic-mode.js';

// The virtual robot as the page sees it: the same events as the real one (see robot/robot-backend-core.js). The page calls advance() with the
// real time that has passed; `speed` of the simulation says how much robot time a real second is worth.
export class SimBackend {
  constructor(emit, { robot = new VirtualRobot({ noise: 90 }), speed = 1 } = {}) {
    this.emit = emit;
    this.robot = robot;
    this.speed = speed;
    this.acc = 0;
    this.kind = 'virtual';
  }

  get connected() { return this.robot.running; }

  // The mode starts with these settings (the virtual robot reads its own accelerometer the way the model says: the calibration of a real
  // robot is not applied to it).
  start(init = {}) {
    this.robot.lay();                               // a new run: flat on the plate facing 0 (the bottom of the plate), nobody's hand under it
    this.robot.hand(false);
    this.robot.place(0, 0, 180);
    const out = this.robot.start({ ...init, theta4: 0, dirn: -1 });
    this.emitOut(out);
  }

  stop() {
    if (!this.robot.running) return;
    this.emitOut(this.robot.stop());
  }

  emitOut(out) {
    const t = this.robot.clock;
    for (const line of out.lines) {
      const ev = parseRobotLine(line);
      if (ev) this.emit({ ...ev, t });
    }
    for (const [, freq, tenths] of out.tones) this.emit({ type: 'tone', freq, tenths, t });
  }

  advance(realMs) {
    if (!this.robot.running) return;
    this.acc = Math.min(this.acc + realMs * this.speed, 2000);
    while (this.acc >= TICK_MS && this.robot.running) {
      this.acc -= TICK_MS;
      const out = this.robot.tick();
      if (out) this.emitOut(out);
    }
  }
}
