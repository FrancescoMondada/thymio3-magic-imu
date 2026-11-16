// The words from the mode that runs on the robot (src/py/magic_mode.py). Pure helpers: no import of the browser, Node tests them.
import { STATES } from './spec.js';

// stdout arrives in BLE notifications cut anywhere: rebuild complete lines. A line ends with a newline, or with \x1e (record
// separator): the mode pads its lines to 100 bytes and ends them that way so that the firmware sends them at once (see say()).
export class LineAssembler {
  constructor() { this.rest = ''; }
  push(text) {
    const parts = (this.rest + text).split(/[\r\n\x1e]+/);
    this.rest = parts.pop();
    return parts.filter((l) => l.trim());           // blank lines go; the others keep their indentation (a Traceback has some)
  }
}

const ints = (a, n) => a.slice(0, n).map(Number);
const finite = (a) => a.every(Number.isFinite);

// One line of stdout -> an event, or null for anything else (print() of other scripts, noise).
//   @@n ms state lock num flags ax ay az gl gr   every 100 ms (state 0..5 as in STATES, lock the frozen number or -1, num the number read now or
//                                                 -1, flags: see FLAG, the filtered accelerometer, the two ground sensors)
//   @@lock n [forced]      the number is frozen        @@placed / @@lifted   the robot lies flat for 0.5 s / is lifted again
//   @@go n                 the show starts             @@phase name          the state changes
//   @@end n                the show is over            @@abort why           the robot was picked up during the show
//   @@reset                the robot was turned on its back: the number is forgotten
//   @@ignored why          a press of the button that did nothing: nolock, notflat; a hand that came too early: unsteady
//   @@cfg theta4 dirn dist hand force sound            what the mode runs with
//   @@hello 1, @@bat mV, @@bye
export function parseRobotLine(line) {
  const l = line.trim();
  // (a Traceback is several lines: the robot backend reads it as a whole)
  if (/^\w*(Error|Exception)\b/.test(l)) return { type: 'error', message: l };
  const m = /^@@(\w+)\s*(.*)$/.exec(l);
  if (!m) return null;
  const [, word, rest] = m;
  const a = rest.split(/\s+/).filter(Boolean);
  switch (word) {
    case 'hello': return { type: 'hello', version: Number(a[0]) || 1 };
    case 'bat': { const v = Number(a[0]); return { type: 'battery', volts: v > 100 ? v / 1000 : v }; }
    case 'cfg': {
      const v = ints(a, 6);
      return v.length === 6 && finite(v) ? { type: 'cfg', theta4: v[0], dirn: v[1], dist: v[2], hand: v[3], force: v[4], sound: v[5] } : null;
    }
    case 'n': {
      const v = ints(a, 10);
      if (v.length < 10 || !finite(v) || !STATES[v[1]]) return null;
      return {
        type: 'n', ms: v[0], state: STATES[v[1]], lock: v[2], num: v[3], flags: v[4],
        acc: { x: v[5], y: v[6], z: v[7] }, ground: [v[8], v[9]],
      };
    }
    case 'lock': { const n = Number(a[0]); return Number.isInteger(n) && n >= 0 && n <= 7 ? { type: 'lock', n, forced: a[1] === 'forced' } : null; }
    case 'placed': return { type: 'placed' };
    case 'lifted': return { type: 'lifted' };
    case 'go': { const n = Number(a[0]); return Number.isInteger(n) ? { type: 'go', n } : null; }
    case 'phase': return STATES.includes(a[0]) ? { type: 'phase', state: a[0] } : null;
    case 'end': { const n = Number(a[0]); return { type: 'end', n: Number.isInteger(n) ? n : -1 }; }
    case 'abort': return { type: 'abort', why: a[0] || '' };
    case 'reset': return { type: 'reset' };
    case 'ignored': return { type: 'ignored', why: a[0] || '' };
    case 'bye': return { type: 'bye' };
    default: return null;
  }
}
