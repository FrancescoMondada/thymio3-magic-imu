// The JavaScript twin of the mode (src/sim/magic-mode.js) must do exactly what the Python mode does (src/py/magic_mode.py): the same lines at
// the same milliseconds, the same tones, the same final position. tests/golden-magic.json is what the Python mode did on its virtual robot
// (npm run golden writes it again if the Python mode changes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VirtualThymio } from '../src/sim/physics.js';
import { MagicMode, atan2Deg, wrap180, driveTicks } from '../src/sim/magic-mode.js';
import { VirtualRobot } from '../src/sim/virtual-robot.js';
import { G, accFor } from '../src/spec.js';
import { parseRobotLine } from '../src/protocol.js';

const golden = JSON.parse(readFileSync(new URL('./golden-magic.json', import.meta.url), 'utf8'));

const parseArgs = (text) => {
  const v = text.split(',').map((s) => s.trim()).filter(Boolean).map(Number);
  const [theta4 = 0, dirn = -1, dist = 90, hand = 300, force = -1, sound = 1] = v;
  return { theta4, dirn, dist, hand, force, sound };
};

function replay(sc) {
  const body = new VirtualThymio();
  const lines = [], tones = [], sounds = [];
  const mode = new MagicMode(body, {
    ...parseArgs(sc.args),
    slip: !!sc.slip,
    say: (t) => lines.push([body.nowMs, t]),
    tone: (f, d) => { tones.push([body.nowMs, f, d]); return true; },
    playSound: (id) => sounds.push([body.nowMs, id]),
  });
  mode.start();
  let acc = [0, 0, G], ground = [0, 0], centre = 0, next = 0;
  for (let k = 0; k < sc.ticks; k++) {
    while (next < sc.events.length && sc.events[next][0] <= body.nowMs) {
      const c = sc.events[next++][1];
      if (c.acc) acc = c.acc;
      if (c.ground) ground = c.ground;
      if (c.centre != null) centre = c.centre;
    }
    mode.tick({ acc, ground, buttons: [0, 0, centre, 0, 0] });
    for (let i = 0; i < 10; i++) body.step();
  }
  mode.stop();
  return { lines, tones, sounds, body };
}

for (const sc of golden) {
  test(`the twin does what the Python mode did: ${sc.name}`, () => {
    const out = replay(sc);
    assert.equal(out.lines.length, sc.lines.length, 'number of lines');
    for (let i = 0; i < sc.lines.length; i++) {
      assert.deepEqual(out.lines[i], sc.lines[i], `line ${i}`);
    }
    assert.deepEqual(out.tones, sc.tones);
    assert.deepEqual(out.sounds, sc.sounds);
    assert.ok(Math.abs(out.body.x - sc.final[0]) < 0.05 && Math.abs(out.body.y - sc.final[1]) < 0.05, `position ${out.body.x}, ${out.body.y} vs ${sc.final}`);
    assert.ok(Math.abs(out.body.headingDeg - sc.final[2]) < 0.05, `heading ${out.body.headingDeg} vs ${sc.final[2]}`);
  });
}

test('the golden file covers the eight numbers and the awkward cases', () => {
  const names = golden.map((g) => g.name);
  for (let n = 0; n < 8; n++) assert.ok(names.includes(`show-${n}`));
  for (const name of ['calibrated', 'wobble', 'lifted-in-show', 'forced', 'no-sound', 'early-presses', 'reset-on-back', 'slip-0', 'slip-2', 'slip-7', 'slip-then-straight', 'slip-lifted-before-the-mistake']) assert.ok(names.includes(name), name);
  // the Python mode went through the whole show in each of the eight
  for (const g of golden.filter((x) => x.name.startsWith('show-') || /^slip-\d$/.test(x.name))) {
    const words = g.lines.map(([, t]) => t.split(' ')[1]).filter((w) => w);
    assert.ok(g.lines.some(([, t]) => t.startsWith('@@end')), g.name);
    assert.ok(words.includes('finale'), g.name);
  }
});

test('atan2 and the angle wrap are the Python ones', () => {
  let worst = 0;
  for (let deg = -180; deg <= 180; deg++) {
    for (const r of [1, 1000, 16000]) {
      const x = r * Math.cos((deg * Math.PI) / 180), y = r * Math.sin((deg * Math.PI) / 180);
      const want = (Math.atan2(y, x) * 180) / Math.PI;
      worst = Math.max(worst, Math.abs(wrap180(atan2Deg(y, x) - want)));
    }
  }
  assert.ok(worst < 0.2, `worst ${worst}`);
  assert.equal(wrap180(190), -170);
  assert.equal(wrap180(-190), 170);
  assert.equal(wrap180(180), -180);
  assert.equal(wrap180(0), 0);
});

test('drive_ticks: 150 mm at speed 300 is the 15 cm of the calibration', () => {
  assert.ok(Math.abs(driveTicks(150, 300, 9000000) / 5e6 - 1.8) < 0.01);
  assert.ok(driveTicks(60, 200, 9000000) < driveTicks(90, 200, 9000000));
});

// ---- the virtual robot as the page drives it ----------------------------------------------------------------------------------
function runRobot(robot, seconds) {
  const lines = [];
  for (let i = 0; i < (seconds * 1000) / 20; i++) {
    const out = robot.tick();
    if (out) lines.push(...out.lines);
  }
  return lines;
}
const phasesOf = (lines) => lines.map(parseRobotLine).filter((e) => e?.type === 'phase').map((e) => e.state);

test('the virtual robot: a whole show, driven the way the page does it', () => {
  for (let n = 0; n < 8; n++) {
    const robot = new VirtualRobot({ noise: 120, rng: (() => { let s = 7 + n; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })() });
    const lines = [...robot.start({ slip: false }).lines];
    lines.push(...runRobot(robot, 0.5));
    robot.hold(n);
    lines.push(...runRobot(robot, 1.5));
    robot.hand(true);
    lines.push(...runRobot(robot, 1.0));
    robot.hand(false);
    robot.lean(40);
    lines.push(...runRobot(robot, 0.4));
    robot.lay();
    lines.push(...runRobot(robot, 1.5));
    robot.press();
    lines.push(...runRobot(robot, 16));
    assert.deepEqual(phasesOf(lines), ['locked', 'ready', 'spin', 'drive', 'finale', 'wait'], `number ${n}`);
    assert.ok(lines.some((l) => l === `@@lock ${n}`), `locked ${n}`);
    assert.ok(lines.some((l) => l === `@@end ${n}`), `ended ${n}`);
  }
});

test('the virtual robot: the first show goes one number too far and comes back, the second goes straight', () => {
  const robot = new VirtualRobot();
  const lines = [...robot.start({}).lines];                       // (the page sends no `slip`: the mistake is on)
  const headings = [];
  const show = (n) => {
    robot.hold(n); lines.push(...runRobot(robot, 1.5));
    robot.hand(true); lines.push(...runRobot(robot, 1.0));
    robot.hand(false); robot.lean(40); lines.push(...runRobot(robot, 0.4));
    robot.lay(); lines.push(...runRobot(robot, 1.5));
    robot.press();
    const h0 = robot.body.headingDeg;                                // (the robot has turned before: count from where it is)
    const trace = [];
    for (let i = 0; i < (24 * 1000) / 20; i++) { const out = robot.tick(); if (out) lines.push(...out.lines); trace.push(robot.body.headingDeg - h0); }
    return trace;
  };
  lines.push(...runRobot(robot, 0.5));
  const first = show(2);
  // one number past the 2 (-450 -> -495), then back
  assert.ok(Math.min(...first) < -(360 + 135) + 8 && Math.min(...first) > -(360 + 135) - 10, `lowest ${Math.min(...first)}`);
  const second = show(5);
  assert.ok(Math.min(...second) > -(360 + 225) - 10 && Math.min(...second) < -(360 + 225) + 8, `second lowest ${Math.min(...second)}`);
  assert.deepEqual(lines.filter((l) => l.startsWith('@@end')), ['@@end 2', '@@end 5']);
});
