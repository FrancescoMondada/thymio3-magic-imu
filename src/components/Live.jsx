import React from 'react';
import Dial from './Dial.jsx';
import { RobotUprightIcon, HandIcon, LockIcon, RobotFlatIcon, ButtonIcon, SpinIcon, CheckIcon, BrainIcon } from '../icons.jsx';
import { progress } from '../store.js';
import { SHOWING } from '../spec.js';

// The caption under the number: what Thymio is doing, from what it says.
function captionOf(snap, t) {
  const c = t.live.caption;
  if (!snap.running) return c.idle;
  switch (snap.state) {
    case 'wait':
      if (snap.after) return c.after;
      if (!snap.vertical) return c.notUpright;
      if (snap.hand) return c.handWait;
      return snap.steady ? c.steady : c.unsteady;
    case 'locked': return c.locked;
    case 'ready': return c.ready;
    case 'spin': return c.spin;
    case 'drive': return c.drive;
    default: return c.finale;
  }
}

// The big part of the page: what Thymio reads, in real time, and nothing to touch. The dial is the plate with the robot's tilt on it, the big number is
// what it reads (then what it has kept, then the result), and five icons follow the trick: reading, the hand (which becomes a lock when the number is
// kept), put down, the button, the show. Each one lights when it is happening and turns green when it is done.
export default function Live({ t, snap, hide }) {
  const { running, state, lock, num, vertical } = snap;
  const locked = lock >= 0;
  const showing = SHOWING.includes(state);
  const done = snap.after && state === 'wait';
  const live = running && state === 'wait' && !snap.after;
  const status = progress(snap);

  let digit = '–';
  let label = t.live.reads;
  let Mark = null;
  if (hide) {
    digit = '?';
    label = locked || showing ? t.live.lockedLabel : done ? t.live.resultLabel : t.live.hiddenLabel;
    if (locked || showing) Mark = LockIcon;
  } else if (done && snap.result >= 0) {
    digit = String(snap.result);
    label = t.live.resultLabel;
    Mark = CheckIcon;
  } else if (locked) {
    digit = String(lock);
    label = t.live.lockedLabel;
    Mark = LockIcon;
  } else if (live && vertical && num >= 0) {
    digit = String(num);
  }

  const icons = [
    { id: 'read', Icon: RobotUprightIcon, label: t.live.progress.read },
    status[1] === 'done' ? { id: 'hand', Icon: LockIcon, label: t.live.progress.locked } : { id: 'hand', Icon: HandIcon, label: t.live.progress.hand },
    { id: 'placed', Icon: RobotFlatIcon, label: t.live.progress.placed },
    { id: 'button', Icon: ButtonIcon, label: t.live.progress.button },
    { id: 'show', Icon: SpinIcon, label: t.live.progress.show },
  ];

  return (
    <section className={`card live ${locked ? 'is-locked' : ''}`} aria-label={t.live.title}>
      <h2><BrainIcon size={20} className="head-brain" /> {t.live.title}</h2>
      <div className="live-main">
        <div className="dial-wrap"><Dial snap={snap} hide={hide} t={t} /></div>
        <div className="readout" aria-live="polite">
          <span className="readout-label">{Mark && <Mark size={18} />}{label}</span>
          <span className={`digit ${digit === '–' ? 'none' : ''} ${locked || done ? 'fixed' : snap.steady && vertical ? 'steady' : ''}`}>{digit}</span>
          <span className="readout-caption">{captionOf(snap, t)}</span>
        </div>
      </div>
      <ol className="progress" aria-label={t.live.title}>
        {icons.map(({ id, Icon, label: text }, i) => (
          <li key={id} className={`tile ${status[i]}`} aria-current={status[i] === 'active' ? 'step' : undefined}>
            <span className="tile-icon"><Icon size={40} /></span>
            <span className="tile-label">{text}</span>
            {status[i] === 'done' && <span className="tile-check"><CheckIcon size={16} /></span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
