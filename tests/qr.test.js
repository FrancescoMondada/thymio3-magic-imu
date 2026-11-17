// The QR code of the application: what is shown is read back by a scanner, is small enough to be read from across a room, and the README gives
// the same address.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsQR from 'jsqr';
import { qrMatrix, qrPath } from '../src/qr.js';
import { APP_URL, APP_LINKS } from '../src/share.js';
import { I18N, LANGS } from '../src/i18n.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// What a camera sees: the code on white, a quiet zone of four modules around it, each module `scale` pixels
function picture({ size, dark }, scale = 4, quiet = 4) {
  const side = (size + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const r = Math.floor(y / scale) - quiet, c = Math.floor(x / scale) - quiet;
    if (r >= 0 && c >= 0 && r < size && c < size && dark(r, c)) { const i = (y * side + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0; }
  }
  return { data, width: side, height: side };
}
const read = (m) => { const p = picture(m); const found = jsQR(p.data, p.width, p.height, { inversionAttempts: 'dontInvert' }); return found && found.data; };

test('the address of the page: a small code that is read back, and the one the README gives', () => {
  assert.match(APP_URL, /^https:\/\/[a-z0-9-]+\.github\.io\/thymio3-magic-imu\/$/, 'the GitHub page of this application, no query');
  const m = qrMatrix(APP_URL);
  assert.ok(m.size <= 33, `${m.size} modules: big squares, read from the back of the room`);
  assert.equal(read(m), APP_URL);
  assert.ok(fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes(`<${APP_URL}>`), 'the README links the same page');
});

test('the links by browser: the plain address and Bluefy on iOS; each one is a code that is read back, and none is an intent link', () => {
  assert.deepEqual(Object.keys(APP_LINKS), ['web', 'ios']);
  assert.equal(APP_LINKS.web, APP_URL);
  const ios = new URL(APP_LINKS.ios);
  assert.equal(ios.protocol, 'bluefy:');
  assert.equal(ios.searchParams.get('url'), APP_URL, 'the address is the url of the link, encoded');
  assert.ok(!APP_LINKS.ios.slice('bluefy://open?url='.length).includes('/'), 'encoded: no slash left in it');
  for (const [kind, link] of Object.entries(APP_LINKS)) {
    assert.ok(!link.startsWith('intent:'), `${kind}: the camera of a Samsung does not open intent links`);
    const m = qrMatrix(link);
    assert.ok(m && m.size <= 45, `${kind}: ${m && m.size} modules, still big squares across a room`);
    assert.equal(read(m), link, kind);
  }
});

test('the drawing of the code: one path of rectangles inside the matrix, and a text that is too long gives none', () => {
  const m = qrMatrix(APP_URL);
  const d = qrPath(m);
  assert.match(d, /^(M\d+ \d+h\d+v1h-\d+z)+$/);
  let cells = 0;
  for (let r = 0; r < m.size; r++) for (let c = 0; c < m.size; c++) if (m.dark(r, c)) cells++;
  let area = 0;
  for (const [, w] of d.matchAll(/h(\d+)v1h-\d+z/g)) area += Number(w);
  assert.equal(area, cells, 'every dark module is drawn once');
  assert.equal(qrMatrix('x'.repeat(5000)), null);
});

test('the texts of the link, in the four languages', () => {
  for (const { id } of LANGS) {
    const q = I18N[id].qr;
    for (const key of ['close', 'tooBig', 'linkRow', 'linkButton', 'linkIos', 'linkHint']) assert.ok(q[key] && q[key].length > 2, `${id} ${key}`);
    assert.match(q.linkHint, /Bluefy/, id);
  }
  for (const id of ['en', 'it', 'de']) assert.notEqual(I18N[id].qr.linkRow, I18N.fr.qr.linkRow, `${id} is not a copy of the French`);
});
