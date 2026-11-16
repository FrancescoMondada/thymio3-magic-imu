// The link to a real robot, without Bluetooth: RobotBackendCore talks to the demonstration robot (src/dev/fake-thymio.js), which runs the
// JavaScript twin of the mode on the virtual robot. What the "robot" prints goes back through the stdout notifications.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// the browser the fake robot expects
globalThis.document = new EventTarget();
globalThis.window = globalThis;
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };

const fake = await import('../src/dev/fake-thymio.js');
const { RobotBackendCore } = await import('../src/robot/robot-backend-core.js');
const { buildModuleFrom, moduleNameFor, minify } = await import('../src/script-core.js');
const { Telemetry, STEPS, currentStep } = await import('../src/store.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(here, '..', 'src', 'py', 'magic_mode.py'), 'utf8');
const MODULE_TEXT = buildModuleFrom(SOURCE);
const MODULE = { name: moduleNameFor(MODULE_TEXT), text: MODULE_TEXT };
const EV = { connected: 'thymio-connected', manualReconnect: 'thymio-prompt-manual-reconnection', stdout: 'thymio-std-out-values', pyStatus: 'thymio-python-execution-status', pyLoad: 'thymio-python-load-result' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (cond, ms = 8000) => {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await wait(5); }
};

window.fakeRobot.flags.byteMs = 0.01;       // a module of 15 KB in a tenth of a second
window.fakeRobot.flags.slow = 8;            // the robot's clock goes 8 times faster

function link(options = {}, tele = null) {
  const events = [];
  const log = [];
  const core = new RobotBackendCore((e) => { events.push(e); tele?.push(e); }, {
    thymio: fake, events: EV, module: MODULE, doc: document, win: new EventTarget(), onLog: (kind, text) => log.push([kind, text]),
    helloTimeoutMs: 3000, moduleHelloTimeoutMs: 3000, haltTimeoutMs: 1500, unknownHaltMs: 300, ...options,
  });
  core.attach();
  return { core, events, log, last: (type) => events.filter((e) => e.type === type).at(-1) };
}

async function connected(options, tele) {
  const l = link(options, tele);
  await l.core.connect();
  await until(() => l.events.some((e) => e.type === 'conn' && e.status === 'connected'));
  return l;
}

const done = async (l) => { await l.core.stop(); await fake.stopScriptExecution(); l.core.detach(); };       // (and whatever the link left running on the robot)
const robot = () => window.fakeRobot;

test('the mode fits on the robot: small, and minified it is still Python', () => {
  assert.ok(MODULE_TEXT.length < 20000, `the module is ${MODULE_TEXT.length} bytes`);
  assert.ok(MODULE_TEXT.length < SOURCE.length);
  assert.ok(!/^\s*#/m.test(MODULE_TEXT), 'comments are gone');
  assert.match(MODULE.name, /^magic_[0-9a-f]{8}$/);
  assert.ok(`${MODULE.name}.py`.length <= 30);
  assert.equal(minify('x = 1  # one\n\n# c\nif x:\n    y = "#a"\n'), 'x = 1\nif x:\n y = "#a"\n');
});

test('connect, install the module once, start the mode: the robot says hello and what it runs with', async () => {
  const l = await connected();
  await l.core.start({});
  assert.ok(l.events.some((e) => e.type === 'hello'));
  await until(() => l.last('cfg') && l.last('n'));
  assert.deepEqual(l.last('cfg'), { type: 'cfg', theta4: 0, dirn: -1, dist: 90, hand: 300, force: -1, sound: 1, t: l.last('cfg').t });
  assert.equal(l.last('n').state, 'wait');
  assert.ok(window.fakeRobot.files.includes(`${MODULE.name}.py`), 'the module is on the robot');
  assert.ok(l.log.some(([, t]) => /launcher/.test(t)), 'started by the two-line launcher');
  await done(l);
});

test('a whole trick through the link: held up, a hand, put down, the button, the show, the end', async () => {
  const tele = new Telemetry();
  const l = await connected({}, tele);
  await l.core.start({});
  await until(() => l.last('n'));
  robot().hold(5);
  await until(() => tele.getSnapshot().num === 5 && tele.getSnapshot().steady);
  robot().hand(true);
  await until(() => tele.getSnapshot().lock === 5);
  assert.equal(STEPS[currentStep(tele.getSnapshot(), 0)], 'place');
  robot().hand(false);
  robot().lay();
  await until(() => tele.getSnapshot().state === 'ready');
  robot().press();
  await until(() => tele.getSnapshot().state === 'spin');
  await until(() => tele.getSnapshot().state === 'drive', 12000);
  await until(() => tele.getSnapshot().state === 'finale', 8000);
  await until(() => tele.getSnapshot().shows === 1, 8000);
  const s = tele.getSnapshot();
  assert.equal(s.result, 5);
  assert.equal(s.after, true);
  assert.ok(l.events.some((e) => e.type === 'end' && e.n === 5) || s.shows === 1);
  const phases = l.events.filter((e) => e.type === 'phase').map((e) => e.state);
  assert.deepEqual(phases, ['locked', 'ready', 'spin', 'drive', 'finale', 'wait']);
  await done(l);
});

test('the same module is not sent twice, and the old ones are deleted', async () => {
  fake.deleteFile(`${MODULE.name}.py`);
  await fake.saveFile('magic_deadbeef.py');
  const l = await connected();
  await l.core.start({});
  await until(() => window.fakeRobot.files.includes(`${MODULE.name}.py`));
  assert.ok(!window.fakeRobot.files.includes('magic_deadbeef.py'), 'the old module is gone');
  const sent = l.log.filter(([, t]) => /upload module/.test(t)).length;
  assert.equal(sent, 1);
  await done(l);
  const again = await connected();
  await again.core.start({});
  assert.equal(again.log.filter(([, t]) => /upload module/.test(t)).length, 0, 'already on the robot');
  assert.ok(again.log.some(([, t]) => /is on the robot/.test(t)));
  await done(again);
});

test('starting again with other arguments: the robot stops, starts over and says what it runs with', async () => {
  const l = await connected();
  await l.core.start({});
  robot().hold(2);
  await until(() => l.last('n')?.num === 2);
  await l.core.start({ theta4: 37, dirn: 1, dist: 120, hand: 250, sound: 0 });
  await until(() => l.last('cfg')?.theta4 === 37);
  assert.deepEqual([l.last('cfg').dirn, l.last('cfg').dist, l.last('cfg').hand, l.last('cfg').sound], [1, 120, 250, 0]);
  assert.equal(l.last('n').lock, -1);
  assert.ok(l.events.some((e) => e.type === 'bye'), 'the first run was stopped properly');
  await done(l);
});

test('a number can be forced from the page: the mode starts with it frozen', async () => {
  const tele = new Telemetry();
  const l = await connected({}, tele);
  robot().lay();
  await l.core.start({ force: 6 });
  await until(() => tele.getSnapshot().lock === 6);
  assert.equal(tele.getSnapshot().forced, true);
  await until(() => tele.getSnapshot().state === 'ready');
  robot().press();
  await until(() => tele.getSnapshot().shows === 1, 15000);
  assert.equal(tele.getSnapshot().result, 6);
  await done(l);
});

test('the whole mode is sent when the module cannot be used', async () => {
  const l = await connected({ module: { name: 'magic_missing', text: MODULE_TEXT } });
  await l.core.enqueue('settled', async () => {});          // (the connection installs the module first)
  // the module is "on the robot" (uploaded by the connection), but the launcher cannot import it: take it away
  fake.deleteFile('magic_missing.py');
  l.core.moduleName = 'magic_missing';
  await l.core.start({});
  await until(() => l.last('hello'));
  assert.ok(l.log.some(([, t]) => /sending the whole mode/.test(t)));
  assert.ok(l.log.some(([, t]) => /^upload mode/.test(t)));
  await until(() => l.last('n'));
  await done(l);
});

test('lines that never reach the page do not stop it from following the show', async () => {
  const tele = new Telemetry();
  window.fakeRobot.flags.lose = /^@@(phase|lock|placed|go|end)/;      // every event line is lost, @@n alone carries the trick
  const l = await connected({}, tele);
  await l.core.start({});
  robot().hold(3);
  await until(() => tele.getSnapshot().steady);
  robot().hand(true);
  await until(() => tele.getSnapshot().lock === 3);
  robot().hand(false);
  robot().lay();
  await until(() => tele.getSnapshot().state === 'ready');
  robot().press();
  await until(() => tele.getSnapshot().shows === 1, 15000);
  assert.equal(tele.getSnapshot().result, 3);
  window.fakeRobot.flags.lose = null;
  await done(l);
});

test('a stop gives the robot back and says goodbye; disconnecting stops the mode', async () => {
  const tele = new Telemetry();
  const l = await connected({}, tele);
  await l.core.start({});
  await until(() => tele.getSnapshot().running);
  await l.core.stop();
  await until(() => !tele.getSnapshot().running);
  assert.ok(l.events.some((e) => e.type === 'bye'));
  assert.equal(window.fakeRobot.running, false);
  await l.core.start({});
  await until(() => tele.getSnapshot().running);
  await l.core.disconnect();
  assert.equal(window.fakeRobot.running, false);
  assert.equal(tele.getSnapshot().link.status, 'disconnected');
  l.core.detach();
});

test('the self test of the link works', async () => {
  const l = await connected();
  const report = await l.core.selfTest();
  assert.ok(report.done != null, JSON.stringify(report));
  assert.equal(report.error, '');
  await done(l);
});

console.log('link tests done');
