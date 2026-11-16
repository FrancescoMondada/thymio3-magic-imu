import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon, CopyIcon, DownloadIcon } from '../icons.jsx';
import { LANGS } from '../i18n.js';
import { SOURCE_TEXT } from '../script.js';
import { REAL_TILT, LIMITS, NUMBERS, calibrate, meanReading } from '../spec.js';

// The settings, from the brain at the top left: the language and the theme, what depends on the room (the number hidden, the sounds, how far the
// robot goes, how close a hand has to be), the calibration of the tilt, the rescue (a number set by the page), and for the adult next to the screen the
// robot, the journal of the link, a test of the link and the Python that runs on the robot.

// The calibration in two poses: the robot held upright, its top towards the magician, at 4 (front up), then at 6 (front to his right). The readings
// are averaged over a second (after half a second to let the robot settle); the robot has to be still. When both are good the calibration is applied
// at once (the page has nothing the magician has to press).
function Calibration({ t, snap, live, current, onApply, onReset }) {
  const [poses, setPoses] = useState({ 4: null, 6: null });
  const [measuring, setMeasuring] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const samples = useRef([]);

  useEffect(() => {
    if (measuring != null) samples.current.push({ ...snap.acc });
  }, [snap.version, measuring]);          // (one reading per "@@n": the version changes at each)

  const measure = (pose) => {
    setError('');
    setDone(false);
    samples.current = [];
    setMeasuring(pose);
    setTimeout(() => {
      const list = samples.current.slice(5);      // (the first half second is the hand putting the robot in place)
      samples.current = [];
      setMeasuring(null);
      const mean = meanReading(list.map((a) => ({ ax: a.x, ay: a.y, az: a.z })));
      const spread = (k) => Math.max(...list.map((a) => a[k])) - Math.min(...list.map((a) => a[k]));
      if (!mean || list.length < 5) { setError('vertical'); return; }
      if (spread('x') > 2500 || spread('y') > 2500) { setError('still'); return; }
      setPoses((p) => ({ ...p, [pose]: mean }));
    }, 1500);
  };

  const result = poses[4] && poses[6] ? calibrate(poses[4], poses[6]) : null;
  const shown = error || (result?.error ?? '');
  const isDefault = current.theta4 === REAL_TILT.theta4 && current.dirn === REAL_TILT.dirn;

  useEffect(() => {
    if (!poses[4] || !poses[6]) return;
    const r = calibrate(poses[4], poses[6]);
    if (r.error) return;
    onApply(r);
    setPoses({ 4: null, 6: null });
    setDone(true);
  }, [poses]);                                // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="calib">
      <p className="muted small">{t.set.calibHint}</p>
      <dl className="facts">
        <dt>{t.set.calibNow}</dt>
        <dd>{isDefault ? t.set.calibDefault : `${t.set.calibAngle} ${current.theta4}° · ${t.set.calibSense} ${current.dirn > 0 ? '+' : '−'}`}</dd>
      </dl>
      {!live && <p className="muted small">{t.set.calibDemo}</p>}
      {live && <p className="muted small">{t.set.calibLive} : x {Math.round(snap.acc.x)} · y {Math.round(snap.acc.y)} · z {Math.round(snap.acc.z)}</p>}
      {[4, 6].map((pose) => (
        <div className="row" key={pose}>
          <span className="row-label">{pose === 4 ? t.set.calibStep4 : t.set.calibStep6}</span>
          <span className="calib-state">
            {poses[pose] && <span className="muted small">{t.set.measured} ({Math.round(poses[pose].ax)}, {Math.round(poses[pose].ay)})</span>}
            <button type="button" className="btn small" disabled={!live || measuring != null} onClick={() => measure(pose)}>{measuring === pose ? t.set.measuring : t.set.measure}</button>
          </span>
        </div>
      ))}
      {shown && <p className="warn" role="alert">{t.set.calibErr[shown] || shown}</p>}
      {done && <p className="calib-result" role="status">{t.set.calibDone}</p>}
      <div className="btn-row tight">
        <button type="button" className="btn small" disabled={isDefault} onClick={() => { onReset(); setPoses({ 4: null, 6: null }); setError(''); setDone(false); }}>{t.set.calibReset}</button>
      </div>
    </div>
  );
}

export default function Settings({
  t, lang, onLang, theme, onTheme, prefs, onPrefs, snap, source, live, onRestart, restarting, onForce, onCalibrate, onResetCalibration, log, onClearLog, onTest, testing, canTest, onClose, bluetooth,
}) {
  const [copied, setCopied] = useState(false);
  const [logCopied, setLogCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const logBox = useRef(null);
  const logText = useMemo(() => {
    const t0 = log.length ? log[0].at : 0;
    const mark = { in: '⇦', out: '⇨', err: '✖', info: '·' };
    return log.map((l) => `+${((l.at - t0) / 1000).toFixed(2).padStart(7)}s ${mark[l.kind] || '·'} ${l.text}`).join('\n');
  }, [log]);
  useEffect(() => { if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight; }, [logText]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const copy = async (text, set) => {
    try { await navigator.clipboard.writeText(text); set(true); setTimeout(() => set(false), 1500); } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([SOURCE_TEXT], { type: 'text/x-python' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'thymio3_magic_mode.py' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const level = Math.max(snap.ground[0], snap.ground[1]);
  const yesNo = (value, onChange, id) => (
    <div className="seg" role="group" aria-labelledby={id}>
      <button type="button" className={value ? 'on' : ''} aria-pressed={!!value} onClick={() => onChange(true)}>{t.set.yes}</button>
      <button type="button" className={!value ? 'on' : ''} aria-pressed={!value} onClick={() => onChange(false)}>{t.set.no}</button>
    </div>
  );

  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={t.set.title}>
        <header className="modal-head">
          <h2>{t.set.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.set.close}><CloseIcon /></button>
        </header>

        {!bluetooth && <p className="warn" role="alert">{t.head.noBluetooth}</p>}

        <div className="rows">
          <div className="row">
            <span className="row-label">{t.set.language}</span>
            <div className="chips">{LANGS.map((l) => <button key={l.id} type="button" className="chip-btn" lang={l.id} aria-pressed={lang === l.id} onClick={() => onLang(l.id)}>{l.label}</button>)}</div>
          </div>
          <div className="row">
            <span className="row-label">{t.set.theme}</span>
            <div className="seg">
              {[['auto', 'Auto'], ['light', t.head.themeLight], ['dark', t.head.themeDark]].map(([id, label]) => <button key={id} type="button" className={theme === id ? 'on' : ''} aria-pressed={theme === id} onClick={() => onTheme(id)}>{label}</button>)}
            </div>
          </div>
        </div>

        <h3>{t.set.show}</h3>
        <div className="rows">
          <div className="row">
            <span className="row-label">{t.set.restart}</span>
            <button type="button" className="btn small" onClick={onRestart} disabled={restarting}>{t.set.restart}</button>
          </div>
          <p className="muted small">{t.set.restartHint}</p>
          <div className="row">
            <span className="row-label" id="hide-label">{t.set.hide}</span>
            {yesNo(prefs.hide, (v) => onPrefs({ hide: v }), 'hide-label')}
          </div>
          <p className="muted small">{t.set.hideHint}</p>
          <div className="row">
            <span className="row-label" id="sound-label">{t.set.sound}</span>
            {yesNo(prefs.sound, (v) => onPrefs({ sound: v ? 1 : 0 }), 'sound-label')}
          </div>
          <p className="muted small">{t.set.soundHint}</p>
          <div className="row">
            <label className="row-label" htmlFor="dist">{t.set.dist}</label>
            <span className="slider"><input id="dist" type="range" min={LIMITS.dist[0]} max={LIMITS.dist[1]} step="5" value={prefs.dist} onChange={(e) => onPrefs({ dist: Number(e.target.value) })} /><output htmlFor="dist">{prefs.dist} {t.set.distUnit}</output></span>
          </div>
          <p className="muted small">{t.set.distHint}</p>
          <div className="row">
            <label className="row-label" htmlFor="hand">{t.set.hand}</label>
            <span className="slider"><input id="hand" type="range" min={LIMITS.hand[0]} max={LIMITS.hand[1]} step="10" value={prefs.hand} onChange={(e) => onPrefs({ hand: Number(e.target.value) })} /><output htmlFor="hand">{prefs.hand}</output></span>
          </div>
          <p className="muted small">{t.set.handHint} {live && <b>{t.set.handNow} : {snap.ground[0]} · {snap.ground[1]} (max {level})</b>}</p>
          {live && <p className="muted small">{t.set.needsRobot}</p>}
        </div>

        <h3>{t.set.calib}</h3>
        <Calibration t={t} snap={snap} live={live} current={prefs} onApply={onCalibrate} onReset={onResetCalibration} />

        <h3>{t.set.force}</h3>
        <p className="muted small">{t.set.forceHint}</p>
        {source === 'virtual' ? <p className="muted small">{t.set.forceDemo}</p> : (
          <div className="chips" role="group" aria-label={t.set.force}>
            {NUMBERS.map((n) => <button key={n} type="button" className="chip-btn num" disabled={!live} onClick={() => onForce(n)} aria-label={`${t.set.forceNumber} ${n}`}>{n}</button>)}
          </div>
        )}

        <h3>{t.set.robot}</h3>
        <dl className="facts">
          <dt>{t.set.device}</dt><dd>{snap.link.device || '—'}</dd>
          {snap.link.firmware && <><dt>{t.set.firmware}</dt><dd>{typeof snap.link.firmware === 'string' ? snap.link.firmware : JSON.stringify(snap.link.firmware)}</dd></>}
          {snap.battery ? <><dt>{t.set.batteryRow}</dt><dd>{snap.battery.toFixed(2)} V</dd></> : null}
          <dt>{t.set.mode}</dt><dd>{snap.running ? t.set.modeUp : t.set.modeDown}</dd>
        </dl>
        {snap.error && <p className="warn"><b>{t.set.lastError}</b><br />{snap.error}</p>}

        <h3>{t.set.log}</h3>
        <p className="muted small">{t.set.logHint}</p>
        <div className="btn-row tight">
          <button type="button" className="btn small" onClick={onTest} disabled={!canTest || testing}>{testing ? t.set.testing : t.set.test}</button>
          <button type="button" className="btn small" onClick={() => copy(logText, setLogCopied)} disabled={!log.length}><CopyIcon size={15} />{logCopied ? t.set.copied : t.set.logCopy}</button>
          <button type="button" className="btn small" onClick={onClearLog} disabled={!log.length}>{t.set.logClear}</button>
        </div>
        {canTest && <p className="muted small">{t.set.testHint}</p>}
        <pre className="code log" ref={logBox} tabIndex={0}>{logText || t.set.logEmpty}</pre>

        <h3>{t.set.script}</h3>
        <p className="muted small">{t.set.scriptHint}</p>
        <div className="btn-row tight">
          <button type="button" className="btn small" onClick={() => setShowScript((v) => !v)}>{showScript ? t.set.hide2 : t.set.show2} magic_mode.py</button>
          {showScript && <button type="button" className="btn small" onClick={() => copy(SOURCE_TEXT, setCopied)}><CopyIcon size={15} />{copied ? t.set.copied : t.set.copy}</button>}
          {showScript && <button type="button" className="btn small" onClick={download}><DownloadIcon size={15} />{t.set.download}</button>}
        </div>
        {showScript && <pre className="code" tabIndex={0}>{SOURCE_TEXT}</pre>}
        <p className="muted small about">{t.set.about}</p>
      </section>
    </div>
  );
}
