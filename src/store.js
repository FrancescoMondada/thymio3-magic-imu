// What the page knows about the robot, built from the events of a backend (robot or virtual): the state of the trick, the number it reads, the
// number it has frozen, what its sensors say. Plain JavaScript with no React: React reads it with useSyncExternalStore (see App.jsx) and Node
// can test it.
//
// Everything the page needs is in "@@n" (said ten times a second); the other lines (@@lock, @@placed, @@go, @@end...) add what happened and
// are not relied on: a burst of lines is cut short on its way from a real robot (thymio3-draw's journal), so a lost "@@end" must not hide the
// end of the show (see setState).
import { FLAG, SHOWING } from './spec.js';

// The steps of the trick, in order: what the page tells the magician (the line to say, the explanation). They follow the robot, nothing else:
// the magician's hands are busy with it and the page is only to be looked at.
export const STEPS = ['intro', 'show', 'place', 'press', 'perform', 'secret'];

// The step in progress, from what the robot says: lying flat, nothing has happened yet (the presentation and the volunteer); held upright (the
// robot reads, the hand comes); locked (put it down); ready (the button); the show; and once it is over, the secret, until the robot is picked up
// again for the next volunteer.
export function currentStep(s) {
  if (!s.running) return 0;
  switch (s.state) {
    case 'wait': return s.after ? 5 : s.vertical ? 1 : 0;
    case 'locked': return 2;
    case 'ready': return 3;
    default: return 4;                                            // spin, drive, finale
  }
}

// The five icons of the big part: reading (held upright), the hand (then the lock), put down, the button, the show. Each is '' (not yet),
// 'active' (now) or 'done'.
export const PROGRESS = ['read', 'hand', 'placed', 'button', 'show'];
export function progress(s) {
  const upTo = (n, active) => PROGRESS.map((_, i) => (i < n ? 'done' : i === active ? 'active' : ''));
  if (!s.running) return upTo(0, -1);
  switch (s.state) {
    case 'wait':
      if (s.after) return upTo(5, -1);
      return PROGRESS.map((_, i) => (i === 0 && s.vertical ? 'active' : i === 1 && s.vertical && s.hand ? 'active' : ''));
    case 'locked': return upTo(2, s.flat ? 2 : -1);
    case 'ready': return upTo(3, 3);
    default: return upTo(4, 4);                                   // spin, drive, finale
  }
}

function fresh() {
  return {
    version: 0,
    link: { status: 'idle', device: '', firmware: null, error: '' },
    running: false,                       // the mode has said hello and not goodbye
    state: 'wait',                        // see STATES
    lock: -1,                             // the number it has frozen, -1: none
    forced: false,                        // ... told by the page, not read
    num: -1,                              // the number it reads now, -1: it is not held upright
    vertical: false, flat: false, hand: false, steady: false, button: false,
    acc: { x: 0, y: 0, z: 0 },
    ground: [0, 0],
    cfg: null,                            // what the mode runs with (@@cfg)
    battery: 0,
    shows: 0,                             // shows that went to the end
    result: -1,                           // the number of the last show that went to the end
    after: false,                         // a show has just ended: the secret is told
    notice: null,                         // { kind, at }: something that did nothing, said for a few seconds (ignored button, hand too early, picked up)
    events: 0,                            // counts lines other than @@n (for the tests and the journal)
    t: 0,
    error: '',
  };
}

export class Telemetry {
  constructor() {
    this.s = fresh();
    this.listeners = new Set();
    this.snap = { ...this.s };
    this.subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
    this.getSnapshot = () => this.snap;
    this.lastLock = -1;
  }

  // Forget everything but the link (a new run, the other robot).
  clear() {
    const { link } = this.s;
    this.s = fresh();
    this.s.link = link;
    this.lastLock = -1;
    this.publish();
  }

  setLink(link) { this.s.link = { ...this.s.link, ...link }; this.publish(); }

  publish() {
    this.s.version += 1;
    this.snap = { ...this.s };
    for (const fn of this.listeners) fn();
  }

  flags(flags) {
    const s = this.s;
    s.vertical = !!(flags & FLAG.VERT);
    s.flat = !!(flags & FLAG.FLAT);
    s.hand = !!(flags & FLAG.HAND);
    s.steady = !!(flags & FLAG.STEADY);
    s.button = !!(flags & FLAG.BTN);
  }

  setState(state) {
    const s = this.s;
    if (state === s.state) return;
    const before = s.state;
    s.state = state;
    if (state === 'locked' && before === 'wait') s.after = false;
    // the show ends in "wait" (the finale is its last state): even if "@@end" was lost the show is over, with the number that was locked
    if (state === 'wait' && SHOWING.includes(before)) {
      s.shows += 1;
      s.result = this.lastLock;
      s.after = true;
    }
  }

  notice(kind, at) { this.s.notice = { kind, at: at ?? Date.now() }; }

  // ---- what the robot says -----------------------------------------------------------------------
  push(ev) {
    const s = this.s;
    if (ev.t != null && ev.t > 0) s.t = ev.t;
    if (ev.type !== 'n' && ev.type !== 'conn') s.events += 1;
    switch (ev.type) {
      case 'conn':
        s.link = { ...s.link, status: ev.status, device: ev.device ?? s.link.device, firmware: ev.firmware ?? s.link.firmware, error: ev.error ?? (ev.status === 'connected' ? '' : s.link.error) };
        if (ev.status === 'disconnected' || ev.status === 'reconnect') { s.running = false; s.state = 'wait'; }
        break;
      case 'hello': s.running = true; s.error = ''; break;
      case 'battery': s.battery = ev.volts; break;
      case 'cfg': s.cfg = { theta4: ev.theta4, dirn: ev.dirn, dist: ev.dist, hand: ev.hand, force: ev.force, sound: ev.sound }; break;
      case 'n':
        s.running = true;                                   // (the mode that talks is running, whatever "@@hello" did)
        this.setState(ev.state);
        s.lock = ev.lock;
        if (ev.lock >= 0) this.lastLock = ev.lock;
        else if (s.state === 'wait') s.forced = false;
        s.num = ev.num;
        this.flags(ev.flags);
        if (s.after && s.state === 'wait' && s.vertical) s.after = false;      // picked up and held upright: the next volunteer, the secret goes away
        s.acc = ev.acc;
        s.ground = ev.ground;
        break;
      case 'phase': this.setState(ev.state); break;
      case 'lock':
        s.lock = ev.n;
        this.lastLock = ev.n;
        s.forced = ev.forced;
        s.after = false;
        s.notice = null;
        break;
      case 'end': s.result = ev.n; break;
      case 'abort': this.notice(`abort-${ev.why}`, ev.at); break;
      case 'ignored': this.notice(ev.why, ev.at); break;
      case 'bye': case 'script-ended': s.running = false; s.state = 'wait'; break;
      case 'error': s.error = ev.message; break;
      default: break;
    }
    this.publish();
  }
}
