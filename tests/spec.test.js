import test from 'node:test';
import assert from 'node:assert/strict';
import {
  G, DEFAULTS, plateNumber, accFor, calibrate, meanReading, runArgs, runConfig, REAL_TILT, platePoint, plateAngle, wrap180, clampDist, clampHand, clampTheta, clampDirn, clampNumber,
} from '../src/spec.js';

test('the documented poses read as the numbers of the plate (front up 4, right 6, down 0, left 2)', () => {
  const read = (ax, ay) => Math.round(plateNumber(ax, ay)) % 8;
  assert.equal(read(G, 0), 4);
  assert.equal(read(0, -G), 6);
  assert.equal(read(-G, 0), 0);
  assert.equal(read(0, G), 2);
  assert.equal(read(11585, -11585), 5);
  assert.equal(read(11585, 11585), 3);
  assert.equal(read(-11585, 11585), 1);
  assert.equal(read(-11585, -11585), 7);
});

test('accFor is the inverse of plateNumber, for any calibration', () => {
  for (const cal of [{}, { theta4: 37, dirn: 1 }, { theta4: -120, dirn: -1 }, { theta4: 170, dirn: 1 }]) {
    for (let n = 0; n < 8; n++) {
      const [ax, ay] = accFor(n, cal);
      assert.ok(Math.abs(plateNumber(ax, ay, cal) - n) < 0.01 || Math.abs(Math.abs(plateNumber(ax, ay, cal) - n) - 8) < 0.01, `${n} ${JSON.stringify(cal)}`);
    }
  }
});

test('the plate: 0 at the bottom, 2 on the left, 4 at the top, 6 on the right (screen, y down)', () => {
  const p = (n) => platePoint(n, 100, 0, 0);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(p(0).x, 0) && near(p(0).y, 100));
  assert.ok(near(p(2).x, -100) && near(p(2).y, 0));
  assert.ok(near(p(4).x, 0) && near(p(4).y, -100));
  assert.ok(near(p(6).x, 100) && near(p(6).y, 0));
  assert.equal(plateAngle(3), 135);
});

test('calibration: the robot held at 4 then at 6 gives the angle of 4 and the sense', () => {
  // the model's own convention: theta4 0, numbers shrink as the angle grows
  const c = calibrate({ ax: G, ay: 0, az: 0 }, { ax: 0, ay: -G, az: 0 });
  assert.deepEqual([c.theta4, c.dirn], [0, -1]);
  // another robot: 4 at 37 degrees, numbers grow with the angle
  for (const [theta4, dirn] of [[37, 1], [-120, -1], [170, 1], [-175, 1], [90, -1]]) {
    const [a4x, a4y] = accFor(4, { theta4, dirn });
    const [a6x, a6y] = accFor(6, { theta4, dirn });
    const r = calibrate({ ax: a4x, ay: a4y, az: 0 }, { ax: a6x, ay: a6y, az: 0 });
    assert.equal(r.dirn, dirn, `${theta4} ${dirn}`);
    assert.ok(Math.abs(wrap180(r.theta4 - theta4)) <= 1, `${theta4} -> ${r.theta4}`);
    // and the mapping it gives reads every number
    for (let n = 0; n < 8; n++) {
      const [ax, ay] = accFor(n, { theta4, dirn });
      assert.equal(Math.round(plateNumber(ax, ay, r)) % 8, n);
    }
  }
});

test('calibration averages a hand that is not exactly at 4 and 6, and refuses what cannot be', () => {
  // held 10 degrees off at 4 and 6 (a quarter turn apart, both off the same way): the average is the middle
  const a = accFor(4, { theta4: 10, dirn: -1 });
  const b = accFor(6, { theta4: 10, dirn: -1 });
  const r = calibrate({ ax: a[0], ay: a[1] }, { ax: b[0], ay: b[1] });
  assert.ok(Math.abs(r.theta4 - 10) <= 1);
  // not vertical (a flat robot reads ax, ay near 0)
  assert.equal(calibrate({ ax: 100, ay: 50, az: G }, { ax: 0, ay: -G }).error, 'vertical');
  assert.equal(calibrate(null, { ax: 0, ay: -G }).error, 'vertical');
  // the same pose twice, or half a turn apart
  assert.equal(calibrate({ ax: G, ay: 0 }, { ax: G, ay: 100 }).error, 'quarter');
  assert.equal(calibrate({ ax: G, ay: 0 }, { ax: -G, ay: 0 }).error, 'quarter');
});

test('meanReading', () => {
  assert.equal(meanReading([]), null);
  assert.deepEqual(meanReading([{ ax: 10, ay: 0, az: 4 }, { ax: 20, ay: 4, az: 8 }]), { ax: 15, ay: 2, az: 6 });
});

test('the arguments of run()', () => {
  assert.equal(runArgs(), '0, -1, 90, 300, -1, 1');
  assert.equal(runArgs({ theta4: 37, dirn: 1, dist: 120, hand: 250, sound: 0 }), '37, 1, 120, 250, -1, 0');
  assert.equal(runArgs({ force: 5 }), '0, -1, 90, 300, 5, 1');
  assert.equal(runArgs({ force: 9 }), '0, -1, 90, 300, -1, 1');
  assert.equal(runArgs({ dist: 5000, hand: 1 }), '0, -1, 200, 80, -1, 1');
  assert.equal(runArgs({ theta4: 200 }), '-160, -1, 90, 300, -1, 1');
});

test('what the page says it runs with is what run() gets (the dial uses it when the robot\'s @@cfg line is lost)', () => {
  for (const s of [{}, { theta4: 37, dirn: 1, dist: 120, hand: 250, sound: 0 }, { force: 5 }, { theta4: 200, dist: 5000 }]) {
    const c = runConfig(s);
    assert.equal(`${c.theta4}, ${c.dirn}, ${c.dist}, ${c.hand}, ${c.force}, ${c.sound}`, runArgs(s));
  }
});

test('after the calibration the poses read right, whichever way the sensor is turned or mirrored', () => {
  const sensors = [
    (ax, ay) => [ax, ay], (ax, ay) => [-ax, -ay], (ax, ay) => [ax, -ay], (ax, ay) => [-ax, ay], (ax, ay) => [ay, ax], (ax, ay) => [-ay, ax],
  ];
  for (const turn of sensors) {
    const at = (n) => { const [x, y, z] = accFor(n); const [ax, ay] = turn(x, y); return { ax, ay, az: z }; };
    const r = calibrate(at(4), at(6));
    assert.ok(!r.error);
    const cfg = runConfig({ theta4: r.theta4, dirn: r.dirn });
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const a = at(n);
      assert.equal(Math.round(plateNumber(a.ax, a.ay, cfg)) % 8, n);
    }
  }
});

test('the first real robot: with the model front up read 0 and the magician\'s left read 2; with REAL_TILT every pose reads right', () => {
  // what that robot gave (front up (-,0), left (0,+), down (+,0), right (0,-)), as reported by the user on 2026-11-16
  const poses = { 4: [-G, 0], 2: [0, G], 0: [G, 0], 6: [0, -G] };
  for (const [n, [ax, ay]] of Object.entries(poses)) {
    assert.equal(Math.round(plateNumber(ax, ay, REAL_TILT)) % 8, Number(n));
  }
  assert.equal(Math.round(plateNumber(-G, 0)) % 8, 0);       // the model: front up read as 0
  assert.equal(Math.round(plateNumber(0, G)) % 8, 2);        // the model: left right (the user saw 2 on the left)
  const r = calibrate({ ax: -G, ay: 0, az: 0 }, { ax: 0, ay: -G, az: 0 });
  assert.deepEqual({ theta4: r.theta4, dirn: r.dirn }, { theta4: REAL_TILT.theta4, dirn: REAL_TILT.dirn });
  assert.equal(clampTheta(REAL_TILT.theta4), REAL_TILT.theta4);   // already in the range the settings keep
});

test('the settings are kept in range', () => {
  assert.equal(clampDist('abc'), DEFAULTS.dist);
  assert.equal(clampDist(10), 30);
  assert.equal(clampHand(2000), 900);
  assert.equal(clampTheta(181), -179);
  assert.equal(clampTheta(-181), 179);
  assert.equal(clampTheta('x'), 0);
  assert.equal(clampDirn(5), 1);
  assert.equal(clampDirn(0), -1);
  assert.equal(clampNumber(7), 7);
  assert.equal(clampNumber(8), -1);
  assert.equal(clampNumber('x'), -1);
});
