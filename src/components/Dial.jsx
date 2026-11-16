import React from 'react';
import { RobotTop, LockIcon } from '../icons.jsx';
import { platePoint, plateAngle, plateNumber, DEFAULTS, NUMBERS, SHOWING } from '../spec.js';

// The prediction plate as a dial: the eight numbers where they are on the plate (0 at the bottom, 2 on the left, 4 at the top, 6 on the right),
// seen the way the magician sees the robot when he holds it upright, its top (the buttons) towards him. The robot in the middle points to the number it
// reads: it turns as the magician turns it. The arrow below it is gravity, which is always down: that is what the robot feels.
const C = 160;                 // centre of the 320 x 320 box
const R = 118;                 // radius of the numbers
const BADGE = 23;

export default function Dial({ snap, hide, t }) {
  const { state, running, vertical, num, lock } = snap;
  const cal = snap.cfg || DEFAULTS;
  const locked = lock >= 0;
  const live = running && state === 'wait' && !snap.after;
  const reading = live && vertical && num >= 0 && !hide;
  const phi = reading ? plateNumber(snap.acc.x, snap.acc.y, cal) : null;
  const turn = phi == null ? 0 : plateAngle(phi) + 180;                    // 0: front up (4)
  const showing = SHOWING.includes(state);
  const mark = locked && !hide ? lock : snap.after && snap.result >= 0 && !hide ? snap.result : -1;

  return (
    <svg className={`dial ${locked ? 'locked' : ''} ${showing ? 'showing' : ''} ${reading && snap.steady ? 'steady' : ''}`} viewBox="0 0 320 320" role="img" aria-label={t.live.dial}>
      <circle className="dial-ring" cx={C} cy={C} r={R} />
      {NUMBERS.map((n) => {
        // the T of the plate: a stem and its bar
        const a = platePoint(n, 40, C, C);
        const b = platePoint(n, 80, C, C);
        const c = platePoint(n, 86, C, C);
        const phi = (plateAngle(n) * Math.PI) / 180;
        const px = Math.cos(phi) * 12;
        const py = Math.sin(phi) * 12;
        return (
          <g key={`t${n}`} className="dial-t">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line x1={c.x - px} y1={c.y - py} x2={c.x + px} y2={c.y + py} />
          </g>
        );
      })}
      {NUMBERS.map((n) => {
        const p = platePoint(n, R, C, C);
        const isLive = reading && n === num;
        const isMark = n === mark;
        return (
          <g key={n} className={`dial-n ${isLive ? 'live' : ''} ${isMark ? 'mark' : ''}`} transform={`translate(${p.x} ${p.y})`}>
            <circle r={BADGE} />
            <text y="1" textAnchor="middle" dominantBaseline="central">{n}</text>
          </g>
        );
      })}
      {reading && (
        <g className="dial-g" aria-hidden="true">
          <line x1={C} y1={C + 30} x2={C} y2={C + 58} />
          <path d={`M${C - 6} ${C + 51}L${C} ${C + 60}L${C + 6} ${C + 51}`} />
          <text x={C + 9} y={C + 56}>g</text>
        </g>
      )}
      {locked && !hide && !showing ? (
        <g className="dial-lock" transform={`translate(${C - 22} ${C - 22})`}><LockIcon size={44} /></g>
      ) : hide ? (
        <text className="dial-hide" x={C} y={C} textAnchor="middle" dominantBaseline="central">?</text>
      ) : (
        <g transform={`translate(${C} ${C - 6}) rotate(${turn})`} className={`dial-robot ${reading ? 'on' : ''}`}>
          <RobotTop size={78} x="-39" y="-39" />
        </g>
      )}
    </svg>
  );
}
