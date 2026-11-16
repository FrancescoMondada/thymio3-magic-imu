import React, { useEffect, useRef, useState } from 'react';
import { RobotTop } from '../icons.jsx';
import { NUMBERS, PLATE, platePoint, plateAngle } from '../spec.js';

// The virtual robot, to rehearse without a robot: how it is held (upright at a number, or flat on the table), a hand under it, the middle
// button; and the plate with the robot on it, which drives to its number. What the person does here is what the robot's sensors would say.
const VIEW = 200;                              // the plate seen in a square of 2 x 200 mm around its centre

function PlateView({ robot, t }) {
  const [pose, setPose] = useState({ x: 0, y: 0, h: 180 });
  const raf = useRef(0);
  useEffect(() => {
    const loop = () => {
      const b = robot.body;
      setPose((p) => (Math.abs(p.x - b.x) < 0.05 && Math.abs(p.y - b.y) < 0.05 && Math.abs(p.h - b.headingDeg) < 0.1 ? p : { x: b.x, y: b.y, h: b.headingDeg }));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [robot]);
  const k = 144 / 100;                         // the robot's drawing is 100 units for 144 mm
  return (
    <svg className="plate" viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`} role="img" aria-label={t.sim.plate}>
      <rect className="plate-paper" x={-VIEW} y={-VIEW} width={2 * VIEW} height={2 * VIEW} rx="8" />
      {NUMBERS.map((n) => {
        const a = platePoint(n, PLATE.stemFrom);
        const b = platePoint(n, PLATE.reach);
        const phi = (plateAngle(n) * Math.PI) / 180;
        const px = Math.cos(phi) * PLATE.bar / 2;
        const py = Math.sin(phi) * PLATE.bar / 2;
        const l = platePoint(n, PLATE.reach + 28);
        return (
          <g key={n} className="plate-t">
            <line className="stem" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line className="bar" x1={b.x - px} y1={b.y - py} x2={b.x + px} y2={b.y + py} />
            <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central">{n}</text>
          </g>
        );
      })}
      <circle className="plate-dot" r="2.5" />
      <g transform={`translate(${pose.x} ${-pose.y}) rotate(${-pose.h})`}>
        <g transform={`scale(${k})`} className="plate-robot"><RobotTop size={100} x="-50" y="-50" /></g>
      </g>
    </svg>
  );
}

export default function Simulator({ t, sim, speed, onSpeed, epoch }) {
  const [held, setHeld] = useState(null);          // the number it is held at, or null (flat)
  const [hand, setHand] = useState(false);
  const robot = sim.robot;

  // a new run of the virtual robot: flat on the plate facing 0, no hand
  useEffect(() => {
    setHeld(null);
    setHand(false);
  }, [epoch, sim]);

  const hold = (n) => { robot.hold(n); setHeld(n); };
  const lay = () => { robot.lay(); setHeld(null); };
  const flip = () => { robot.flip(); setHeld(null); };
  const toggleHand = () => { robot.hand(!hand); setHand(!hand); };

  return (
    <details className="card sim">
      <summary><h2>{t.sim.title}</h2><span className="muted small">{t.sim.hint}</span></summary>
      <div className="sim-body">
        <div className="sim-controls">
          <div className="sim-row">
            <span className="row-label">{t.sim.hold}</span>
            <div className="chips">
              {NUMBERS.map((n) => <button key={n} type="button" className="chip-btn num" aria-pressed={held === n} onClick={() => hold(n)}>{n}</button>)}
            </div>
          </div>
          <div className="btn-row tight">
            <button type="button" className={`btn small ${held == null ? 'on' : ''}`} aria-pressed={held == null} onClick={lay}>{t.sim.lay}</button>
            <button type="button" className={`btn small ${hand ? 'on' : ''}`} aria-pressed={hand} onClick={toggleHand}>{hand ? t.sim.handOn : t.sim.handOff}</button>
            <button type="button" className="btn small" onClick={flip}>{t.sim.flip}</button>
            <button type="button" className="btn small" onClick={() => robot.press()}>{t.sim.press}</button>
          </div>
          <div className="sim-row">
            <span className="row-label">{t.sim.speed}</span>
            <div className="seg">
              {[1, 2, 5, 10].map((s) => <button key={s} type="button" className={speed === s ? 'on' : ''} aria-pressed={speed === s} onClick={() => onSpeed(s)}>×{s}</button>)}
            </div>
          </div>
        </div>
        <div className="sim-plate"><PlateView robot={robot} t={t} /></div>
      </div>
    </details>
  );
}
