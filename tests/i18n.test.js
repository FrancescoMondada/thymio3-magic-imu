import test from 'node:test';
import assert from 'node:assert/strict';
import { I18N, LANGS, detectLang } from '../src/i18n.js';
import { STEPS, PROGRESS } from '../src/store.js';
import { STATES } from '../src/spec.js';

// the shape of a language: every key, and the length of every list
function shape(value, path = '') {
  if (Array.isArray(value)) return [[path, `array(${value.length})`], ...value.flatMap((v, i) => (typeof v === 'object' ? shape(v, `${path}[${i}]`) : []))];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [[path, typeof value]];
}
const flat = (value, path = '') => (Array.isArray(value) ? value.flatMap((v, i) => flat(v, `${path}[${i}]`)) : value && typeof value === 'object' ? Object.entries(value).flatMap(([k, v]) => flat(v, path ? `${path}.${k}` : k)) : [[path, value]]);

test('every language has every key, and the same lists', () => {
  const ref = shape(I18N.fr);
  for (const { id } of LANGS) {
    assert.deepEqual(shape(I18N[id]), ref, id);
  }
});

test('no text is empty, and none is left in another language by mistake', () => {
  for (const { id } of LANGS) {
    for (const [path, value] of flat(I18N[id])) {
      assert.equal(typeof value, 'string', `${id} ${path}`);
      assert.ok(value.trim().length > 0, `${id} ${path} is empty`);
    }
  }
  // the languages differ in the script (not copied over)
  const fr = flat(I18N.fr).filter(([p]) => p.startsWith('say.lines') || p.startsWith('steps.'));
  for (const id of ['en', 'it', 'de']) {
    const other = Object.fromEntries(flat(I18N[id]));
    for (const [path, value] of fr) assert.notEqual(value, other[path], `${id} ${path}`);
  }
});

test('the four languages of the page, and a text of each that is really in it', () => {
  assert.deepEqual(LANGS.map((l) => l.id), ['fr', 'en', 'it', 'de']);
  assert.match(I18N.it.say.lines[0], /Ecco Thymio/);
  assert.match(I18N.de.say.lines[0], /Das ist Thymio/);
  assert.equal(I18N.it.app.title, 'Thymio · Magia');
  assert.equal(I18N.de.app.title, 'Thymio · Magie');
});

test('one line, one name, one explanation for every step of the trick', () => {
  for (const { id } of LANGS) {
    const t = I18N[id];
    for (const key of ['names', 'explain']) assert.equal(t.steps[key].length, STEPS.length, `${id} steps.${key}`);
    assert.equal(t.say.lines.length, STEPS.length, `${id} say.lines`);
  }
});

test('the captions and notices the page can ask for exist', () => {
  for (const { id } of LANGS) {
    const t = I18N[id];
    for (const k of ['idle', 'notUpright', 'unsteady', 'steady', 'handWait', 'locked', 'ready', 'spin', 'drive', 'finale', 'after']) assert.ok(t.live.caption[k], `${id} caption ${k}`);
    for (const k of ['unsteady', 'nolock', 'notflat', 'abort-lifted']) assert.ok(t.notice[k], `${id} notice ${k}`);
    for (const k of PROGRESS) assert.ok(t.live.progress[k], `${id} progress ${k}`);
    assert.ok(t.live.progress.locked, `${id} progress locked`);
    for (const k of ['vertical', 'quarter', 'still']) assert.ok(t.set.calibErr[k], `${id} calibration error ${k}`);
  }
  assert.equal(STATES.length, 6);
});

test('the language of the page comes from the browser, French when it is not one of ours', () => {
  const nav = globalThis.navigator;
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  const set = (languages) => Object.defineProperty(globalThis, 'navigator', { value: { languages }, configurable: true });
  set(['en-GB']); assert.equal(detectLang(), 'en');
  set(['de-CH']); assert.equal(detectLang(), 'de');
  set(['it-IT']); assert.equal(detectLang(), 'it');
  set(['es-ES']); assert.equal(detectLang(), 'fr');
  set(['fr-CH']); assert.equal(detectLang(), 'fr');
  store.set('magic.lang', 'en'); set(['fr-CH']); assert.equal(detectLang(), 'en');
  store.set('magic.lang', 'xx'); assert.equal(detectLang(), 'fr');
  if (nav) Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
});
