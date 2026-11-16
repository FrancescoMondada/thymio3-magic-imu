import test from 'node:test';
import assert from 'node:assert/strict';
import { LineAssembler, parseRobotLine } from '../src/protocol.js';

test('lines are rebuilt from notifications cut anywhere', () => {
  const a = new LineAssembler();
  const pad = (s) => s + ' '.repeat(99 - s.length) + '\x1e';
  assert.deepEqual(a.push(pad('@@lock 3').slice(0, 20)), []);
  assert.deepEqual(a.push(pad('@@lock 3').slice(20) + pad('@@placed').slice(0, 10)), ['@@lock 3' + ' '.repeat(91)]);
  assert.deepEqual(a.push(pad('@@placed').slice(10)).map((l) => l.trim()), ['@@placed']);
  assert.deepEqual(a.push('@@bye\r\n').map((l) => l.trim()), ['@@bye']);
});

test('@@n carries everything the page shows', () => {
  const ev = parseRobotLine('@@n 12340 1 6 6 25 -20 -16380 310 12 34');
  assert.deepEqual(ev, { type: 'n', ms: 12340, state: 'locked', lock: 6, num: 6, flags: 25, acc: { x: -20, y: -16380, z: 310 }, ground: [12, 34] });
  assert.equal(parseRobotLine('@@n 1 9 -1 -1 0 0 0 0 0 0'), null);        // no such state
  assert.equal(parseRobotLine('@@n 1 0 -1'), null);                      // cut short
  assert.equal(parseRobotLine('@@n a b c d e f g h i j'), null);
});

test('the events', () => {
  assert.deepEqual(parseRobotLine('@@hello 1'), { type: 'hello', version: 1 });
  assert.deepEqual(parseRobotLine('@@cfg 37 1 120 250 -1 1'), { type: 'cfg', theta4: 37, dirn: 1, dist: 120, hand: 250, force: -1, sound: 1 });
  assert.equal(parseRobotLine('@@cfg 37 1 120'), null);
  assert.deepEqual(parseRobotLine('@@bat 4012'), { type: 'battery', volts: 4.012 });
  assert.deepEqual(parseRobotLine('@@bat 3.9'), { type: 'battery', volts: 3.9 });
  assert.deepEqual(parseRobotLine('@@lock 5'), { type: 'lock', n: 5, forced: false });
  assert.deepEqual(parseRobotLine('@@lock 5 forced'), { type: 'lock', n: 5, forced: true });
  assert.equal(parseRobotLine('@@lock 9'), null);
  assert.deepEqual(parseRobotLine('@@placed'), { type: 'placed' });
  assert.deepEqual(parseRobotLine('@@lifted'), { type: 'lifted' });
  assert.deepEqual(parseRobotLine('@@go 2'), { type: 'go', n: 2 });
  assert.deepEqual(parseRobotLine('@@phase finale'), { type: 'phase', state: 'finale' });
  assert.equal(parseRobotLine('@@phase dancing'), null);
  assert.deepEqual(parseRobotLine('@@end 4'), { type: 'end', n: 4 });
  assert.deepEqual(parseRobotLine('@@abort lifted'), { type: 'abort', why: 'lifted' });
  assert.deepEqual(parseRobotLine('@@ignored notflat'), { type: 'ignored', why: 'notflat' });
  assert.deepEqual(parseRobotLine('@@bye'), { type: 'bye' });
});

test('anything else is ignored, an error is an error', () => {
  assert.equal(parseRobotLine('hello world'), null);
  assert.equal(parseRobotLine('@@unknown 1'), null);
  assert.equal(parseRobotLine(''), null);
  assert.equal(parseRobotLine('KeyboardInterrupt: '), null);               // how a script that is stopped ends: the robot backend reads it
  assert.equal(parseRobotLine('ImportError: no module named x').type, 'error');
});
