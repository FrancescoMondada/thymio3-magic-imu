import test from 'node:test';
import assert from 'node:assert/strict';
import { Telemetry, currentStep, progress, STEPS, PROGRESS } from '../src/store.js';
import { VirtualRobot } from '../src/sim/virtual-robot.js';
import { SimBackend } from '../src/sim/sim-backend.js';
import { FLAG } from '../src/spec.js';

const n = (state, o = {}) => ({ type: 'n', ms: 0, state, lock: -1, num: -1, flags: 0, acc: { x: 0, y: 0, z: 16384 }, ground: [0, 0], ...o });

test('@@n gives the page everything', () => {
  const t = new Telemetry();
  t.push({ type: 'hello' });
  t.push(n('wait', { num: 5, flags: FLAG.VERT | FLAG.STEADY, acc: { x: 11000, y: -11000, z: 100 }, ground: [3, 4] }));
  const s = t.getSnapshot();
  assert.equal(s.running, true);
  assert.equal(s.num, 5);
  assert.equal(s.vertical, true);
  assert.equal(s.steady, true);
  assert.equal(s.hand, false);
  assert.deepEqual(s.ground, [3, 4]);
  t.push(n('locked', { lock: 5, num: 2, flags: FLAG.VERT | FLAG.HAND }));
  assert.equal(t.getSnapshot().lock, 5);
  assert.equal(t.getSnapshot().state, 'locked');
  assert.equal(t.getSnapshot().hand, true);
});

test('subscribers are told, and the snapshot is a new object each time', () => {
  const t = new Telemetry();
  let calls = 0;
  const off = t.subscribe(() => { calls += 1; });
  const a = t.getSnapshot();
  t.push(n('wait'));
  assert.equal(calls, 1);
  assert.notEqual(t.getSnapshot(), a);
  off();
  t.push(n('wait'));
  assert.equal(calls, 1);
});

test('a show that ends is counted once, with its number, even when "@@end" is lost', () => {
  const t = new Telemetry();
  for (const s of ['wait', 'locked', 'ready', 'spin', 'drive', 'finale']) t.push(n(s, { lock: 4 }));
  t.push(n('wait'));                                             // no @@end: the state went back to wait
  const s = t.getSnapshot();
  assert.equal(s.shows, 1);
  assert.equal(s.result, 4);
  assert.equal(s.after, true);
  t.push({ type: 'end', n: 4 });
  assert.equal(t.getSnapshot().shows, 1);
  t.push(n('wait'));
  assert.equal(t.getSnapshot().shows, 1);
});

test('picked up during the show: back to locked, not a finished show', () => {
  const t = new Telemetry();
  for (const s of ['wait', 'locked', 'ready', 'spin']) t.push(n(s, { lock: 2 }));
  t.push({ type: 'abort', why: 'lifted', at: 1000 });
  t.push(n('locked', { lock: 2 }));
  const s = t.getSnapshot();
  assert.equal(s.shows, 0);
  assert.equal(s.after, false);
  assert.equal(s.lock, 2);
  assert.deepEqual(s.notice, { kind: 'abort-lifted', at: 1000 });
});

test('notices: a button or a hand that did nothing', () => {
  const t = new Telemetry();
  t.push({ type: 'ignored', why: 'notflat', at: 5 });
  assert.deepEqual(t.getSnapshot().notice, { kind: 'notflat', at: 5 });
  t.push({ type: 'lock', n: 3, forced: false });
  assert.equal(t.getSnapshot().notice, null);
});

test('the secret stays until the robot is picked up and held upright for the next volunteer', () => {
  const t = new Telemetry();
  for (const s of ['wait', 'locked', 'ready', 'spin', 'finale', 'wait']) t.push(n(s, { lock: 1 }));
  assert.equal(t.getSnapshot().after, true);
  t.push(n('wait', { flags: FLAG.FLAT }));                       // still on the plate
  assert.equal(t.getSnapshot().after, true);
  t.push(n('wait', { flags: 0 }));                               // carried: neither flat nor upright
  assert.equal(t.getSnapshot().after, true);
  t.push(n('wait', { flags: FLAG.VERT, num: 3 }));               // held upright
  assert.equal(t.getSnapshot().after, false);
});

test('disconnection and clearing', () => {
  const t = new Telemetry();
  t.push({ type: 'conn', status: 'connected', device: 'THYMIO3-X' });
  t.push(n('ready', { lock: 3 }));
  t.push({ type: 'conn', status: 'disconnected' });
  assert.equal(t.getSnapshot().running, false);
  assert.equal(t.getSnapshot().link.status, 'disconnected');
  t.clear();
  assert.equal(t.getSnapshot().lock, -1);
  assert.equal(t.getSnapshot().link.status, 'disconnected');
});

test('the step in progress follows the robot, and nothing else', () => {
  const base = { running: true, state: 'wait', after: false, vertical: false, hand: false, num: -1 };
  const name = (s) => STEPS[currentStep(s)];
  assert.equal(name({ ...base, running: false }), 'intro');
  assert.equal(name(base), 'intro');                                           // lying flat: the presentation and the volunteer
  assert.equal(name({ ...base, vertical: true, num: 4 }), 'show');
  assert.equal(name({ ...base, vertical: true, num: 4, hand: true }), 'show');
  assert.equal(name({ ...base, hand: true }), 'intro');                        // a hand but not held upright: nothing yet
  assert.equal(name({ ...base, state: 'locked' }), 'place');
  assert.equal(name({ ...base, state: 'ready' }), 'press');
  for (const state of ['spin', 'drive', 'finale']) assert.equal(name({ ...base, state }), 'perform');
  assert.equal(name({ ...base, after: true }), 'secret');
  assert.equal(currentStep.length, 1, 'no cursor: the page is not to be handled');
});

test('the five icons: reading, the hand then the lock, put down, the button, the show', () => {
  const base = { running: true, state: 'wait', after: false, vertical: false, hand: false, flat: false };
  assert.deepEqual(PROGRESS, ['read', 'hand', 'placed', 'button', 'show']);
  assert.deepEqual(progress({ ...base, running: false }), ['', '', '', '', '']);
  assert.deepEqual(progress(base), ['', '', '', '', '']);
  assert.deepEqual(progress({ ...base, vertical: true }), ['active', '', '', '', '']);
  assert.deepEqual(progress({ ...base, vertical: true, hand: true }), ['active', 'active', '', '', '']);
  assert.deepEqual(progress({ ...base, state: 'locked' }), ['done', 'done', '', '', '']);
  assert.deepEqual(progress({ ...base, state: 'locked', flat: true }), ['done', 'done', 'active', '', '']);
  assert.deepEqual(progress({ ...base, state: 'ready' }), ['done', 'done', 'done', 'active', '']);
  for (const state of ['spin', 'drive', 'finale']) assert.deepEqual(progress({ ...base, state }), ['done', 'done', 'done', 'done', 'active']);
  assert.deepEqual(progress({ ...base, after: true }), ['done', 'done', 'done', 'done', 'done']);
});

test('the virtual robot through SimBackend, into the store: a whole trick', () => {
  const t = new Telemetry();
  const rng = (() => { let x = 3; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
  const sim = new SimBackend((ev) => t.push(ev), { robot: new VirtualRobot({ noise: 120, rng }) });
  const run = (sec) => { for (let i = 0; i < sec * 50; i++) sim.advance(20); };
  sim.start({});
  run(0.5);
  assert.equal(t.getSnapshot().running, true);
  assert.equal(t.getSnapshot().state, 'wait');
  sim.robot.hold(6);
  run(1.5);
  assert.equal(t.getSnapshot().num, 6);
  assert.equal(STEPS[currentStep(t.getSnapshot())], 'show');
  sim.robot.hand(true);
  run(0.8);
  assert.equal(t.getSnapshot().lock, 6);
  assert.equal(t.getSnapshot().state, 'locked');
  sim.robot.hand(false);
  sim.robot.lay();
  run(1.0);
  assert.equal(t.getSnapshot().state, 'ready');
  sim.robot.press();
  run(1.0);
  assert.equal(t.getSnapshot().state, 'spin');
  run(16);
  const s = t.getSnapshot();
  assert.equal(s.state, 'wait');
  assert.equal(s.shows, 1);
  assert.equal(s.result, 6);
  assert.equal(s.after, true);
  // the robot ended up 90 mm from its start, towards 6: to the right of the plate as seen from above (the robot started facing 0, down)
  assert.ok(Math.abs(Math.hypot(sim.robot.body.x, sim.robot.body.y) - 90) < 12);
});

test('the virtual robot is read with the model, whatever calibration a real robot has', () => {
  const t = new Telemetry();
  const sim = new SimBackend((ev) => t.push(ev), { robot: new VirtualRobot() });
  sim.start({ theta4: 120, dirn: 1 });
  sim.robot.hold(2);
  for (let i = 0; i < 100; i++) sim.advance(20);
  assert.equal(t.getSnapshot().num, 2);
  assert.deepEqual([t.getSnapshot().cfg.theta4, t.getSnapshot().cfg.dirn], [0, -1]);
});

test('the virtual robot: turned on its back, it forgets the number and the page goes back to the start', () => {
  const t = new Telemetry();
  const sim = new SimBackend((ev) => t.push(ev), { robot: new VirtualRobot() });
  const run = (sec) => { for (let i = 0; i < sec * 50; i++) sim.advance(20); };
  sim.start({});
  sim.robot.hold(4);
  run(1.5);
  sim.robot.hand(true);
  run(0.8);
  assert.equal(t.getSnapshot().lock, 4);
  assert.equal(STEPS[currentStep(t.getSnapshot())], 'place');
  sim.robot.hand(false);
  sim.robot.flip();
  run(1.0);
  const s = t.getSnapshot();
  assert.equal(s.state, 'wait');
  assert.equal(s.lock, -1);
  assert.equal(STEPS[currentStep(s)], 'intro');
  assert.ok(t.getSnapshot().events > 0);
});
