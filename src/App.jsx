import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Say from './components/Say.jsx';
import Live from './components/Live.jsx';
import Explain from './components/Explain.jsx';
import Simulator from './components/Simulator.jsx';
import Settings from './components/Settings.jsx';
import LinkInfo from './components/LinkInfo.jsx';
import QrShow from './components/QrShow.jsx';
import { APP_LINKS } from './share.js';
import { BluetoothIcon, BrainIcon, CloseIcon } from './icons.jsx';
import { I18N, detectLang } from './i18n.js';
import { Telemetry, STEPS, currentStep } from './store.js';
import { SimBackend } from './sim/sim-backend.js';
import { RobotBackend } from './robot/robot-backend.js';
import { supportsBluetooth } from './api.js';
import { DEFAULTS, REAL_TILT, clampDist, clampHand, clampTheta, clampDirn, runConfig } from './spec.js';
import { playTone, unlockAudio } from './audio.js';

const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

// What the person chose and the robot's mode runs with. Kept on the device.
const PREFS_KEY = 'magic.prefs';
const DEFAULT_PREFS = { hide: false, sound: 1, dist: DEFAULTS.dist, hand: DEFAULTS.hand, theta4: REAL_TILT.theta4, dirn: REAL_TILT.dirn };
const TILT_VERSION = 2;                          // 1: the model's (0, -1) was kept as a setting before the first test on a real robot: it is not a calibration
function loadPrefs() {
  try {
    const p = JSON.parse(load(PREFS_KEY, '{}'));
    const kept = p.tilt === TILT_VERSION;
    return {
      hide: !!p.hide, sound: p.sound === 0 ? 0 : 1, dist: clampDist(p.dist ?? DEFAULT_PREFS.dist), hand: clampHand(p.hand ?? DEFAULT_PREFS.hand),
      theta4: kept ? clampTheta(p.theta4 ?? DEFAULT_PREFS.theta4) : DEFAULT_PREFS.theta4, dirn: kept ? clampDirn(p.dirn ?? DEFAULT_PREFS.dirn) : DEFAULT_PREFS.dirn,
    };
  } catch { return { ...DEFAULT_PREFS }; }
}
const RUN_KEYS = ['dist', 'hand', 'sound', 'theta4', 'dirn'];            // what the mode is started with (the number hidden is the page's own)
const runInit = (prefs, extra = {}) => ({ theta4: prefs.theta4, dirn: prefs.dirn, dist: prefs.dist, hand: prefs.hand, sound: prefs.sound, ...extra });

export default function App() {
  const [lang, setLang] = useState(detectLang);
  const t = I18N[lang] || I18N.fr;
  const [theme, setTheme] = useState(() => load('magic.theme', 'auto'));
  const [prefs, setPrefs] = useState(loadPrefs);
  const [source, setSource] = useState('virtual');                  // 'virtual' | 'robot'
  const [simSpeed, setSimSpeed] = useState(1);
  const [settings, setSettings] = useState(false);
  const [qr, setQr] = useState(null);                               // null | 'web' | 'ios': the QR code of the application, over the page
  const closeQr = useCallback(() => setQr(null), []);
  const [log, setLog] = useState([]);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState('');
  const [epoch, setEpoch] = useState(0);                            // counts the times the trick is started over (the virtual robot's controls start over too)
  const [restarting, setRestarting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const bluetooth = supportsBluetooth();

  const tele = useRef(null);
  if (!tele.current) tele.current = new Telemetry();
  const snap = useSyncExternalStore(tele.current.subscribe, tele.current.getSnapshot);

  const sim = useRef(null);
  const robot = useRef(null);
  const sourceRef = useRef('virtual');
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const started = useRef(false);                                    // the mode was started on the current connection
  const connecting = useRef(false);
  if (!sim.current) {
    sim.current = new SimBackend((ev) => {
      if (ev.type === 'tone') { if (prefsRef.current.sound) playTone(ev.freq, ev.tenths); return; }
      tele.current.push(ev);
    });
  }

  // (a handle for the console and the tests: window.__magic.sim.robot.hold(3) holds the virtual robot at 3)
  useEffect(() => {
    if (import.meta.env?.DEV) window.__magic = { tele: tele.current, sim: sim.current, get robot() { return robot.current; } };
  }, []);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // ---- theme, language, prefs ---------------------------------------------------------------------
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    save('magic.theme', theme);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; save('magic.lang', lang); document.title = t.app.title; }, [lang, t.app.title]);
  useEffect(() => { save(PREFS_KEY, JSON.stringify({ ...prefs, tilt: TILT_VERSION })); }, [prefs]);
  const patchPrefs = useCallback((patch) => setPrefs((p) => ({ ...p, ...patch })), []);

  // ---- the virtual robot's clock ---------------------------------------------------------------------
  useEffect(() => { sim.current.speed = simSpeed; }, [simSpeed]);
  useEffect(() => {
    sim.current.start(runInit(prefsRef.current));
    let raf = 0;
    let last = performance.now();
    const loop = (t0) => {
      const dt = Math.min(100, t0 - last);
      last = t0;
      if (sourceRef.current === 'virtual') sim.current.advance(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); sim.current.stop(); };
  }, []);

  // ---- the real robot ------------------------------------------------------------------------------------
  const onLog = useCallback((kind, text) => setLog((l) => [...l.slice(-500), { at: Date.now(), kind, text }]), []);

  const startRobot = useCallback((extra = {}) => {
    started.current = true;
    const init = runInit(prefsRef.current, extra);
    // what the page asks the robot to run with: the dial turns with it even if the robot's @@cfg line (said once, at the start) never arrives
    tele.current.push({ type: 'cfg', ...runConfig(init) });
    return robot.current.start(init).catch((err) => {
      started.current = false;
      tele.current.push({ type: 'error', message: err?.message || String(err) });
    });
  }, []);

  const backToVirtual = useCallback((reason = '') => {
    sourceRef.current = 'virtual';
    setSource('virtual');
    started.current = false;
    connecting.current = false;
    tele.current.clear();
    tele.current.setLink({ status: 'idle', device: '', firmware: null });
    sim.current.start(runInit(prefsRef.current));
    setEpoch((e) => e + 1);
    setNotice(reason);
  }, []);

  const onRobotEvent = useCallback((ev) => {
    if (sourceRef.current !== 'robot') return;
    tele.current.push(ev);
    if (ev.type === 'conn') {
      if (ev.status === 'connected' && !started.current) startRobot();
      if (ev.status === 'disconnected' || ev.status === 'reconnect') {
        started.current = false;
        if (connecting.current && ev.error) backToVirtual(ev.error);
      }
    }
  }, [backToVirtual, startRobot]);

  const connect = useCallback(async () => {
    if (!bluetooth) { setSettings(true); return; }
    setNotice('');
    if (!robot.current) {
      robot.current = new RobotBackend((ev) => onRobotEvent(ev), { onLog });
      robot.current.attach();
    }
    sim.current.stop();
    sourceRef.current = 'robot';
    setSource('robot');
    started.current = false;
    connecting.current = true;
    tele.current.clear();
    tele.current.setLink({ status: 'connecting' });
    try { await robot.current.connect(); } finally { connecting.current = false; }
  }, [bluetooth, onLog, onRobotEvent]);

  const disconnect = useCallback(async () => {
    try { await robot.current?.disconnect(); } catch { /* ignore */ }
    backToVirtual('');
  }, [backToVirtual]);

  // ---- starting over: the trick from the beginning (what the robot held is forgotten) ------------------
  const restart = useCallback(async (extra = {}) => {
    setEpoch((e) => e + 1);
    if (sourceRef.current === 'robot') {
      if (!robot.current?.connected) return;
      tele.current.clear();
      setRestarting(true);
      try { await startRobot(extra); } finally { setRestarting(false); }
    } else {
      tele.current.clear();
      sim.current.start(runInit(prefsRef.current, extra));
    }
  }, [startRobot]);

  // a change of what the mode runs with: the mode starts again with it (a moment after the last change: a slider goes through many values)
  const runKey = RUN_KEYS.map((k) => prefs[k]).join(',');
  const startedWith = useRef(runKey);                           // (compared, not counted: React runs an effect twice at the start in development)
  useEffect(() => {
    if (startedWith.current === runKey) return undefined;
    const timer = setTimeout(() => { startedWith.current = runKey; restart(); }, 700);
    return () => clearTimeout(timer);
  }, [runKey, restart]);

  const force = useCallback((n) => { setSettings(false); restart({ force: n }); }, [restart]);
  const calibrate = useCallback((r) => patchPrefs({ theta4: r.theta4, dirn: r.dirn }), [patchPrefs]);
  const resetCalibration = useCallback(() => patchPrefs({ theta4: REAL_TILT.theta4, dirn: REAL_TILT.dirn }), [patchPrefs]);

  const selfTest = useCallback(async () => {
    if (!robot.current) return;
    setTesting(true);
    try { await robot.current.selfTest(); } finally { setTesting(false); }
  }, []);

  // ---- the lines to say: the step follows the robot, nothing here is to be handled during the trick ------------------
  const step = currentStep(snap);

  // what went wrong a moment ago is shown for a few seconds
  useEffect(() => {
    if (!snap.notice) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [snap.notice]);
  const fresh = snap.notice && now - snap.notice.at < 9000 ? snap.notice : null;

  const live = source === 'robot';
  const linked = live && snap.link.status === 'connected';
  const linkLost = live && !connecting.current && (snap.link.status === 'disconnected' || snap.link.status === 'reconnect');
  const ready = live ? linked && snap.running : true;

  return (
    <div className="app">
      <header className="topbar">
        <div className="top">
          <button type="button" className="app-icon" onClick={() => setSettings(true)} aria-label={t.head.settings} title={t.head.settings}><BrainIcon size={28} /></button>
          <div className="brand">
            <h1>{t.app.title}</h1>
            <p>{t.app.subtitle}</p>
          </div>
          <div className="top-mid">
            {live ? <LinkInfo t={{ head: t.head, real: { device: t.head.device, battery: t.head.battery } }} link={snap.link} battery={snap.battery} /> : <span className="link-info virtual" role="status"><i aria-hidden="true" /><span className="link-name">{t.head.demo}</span></span>}
            {live
              ? <button type="button" className="btn small" onClick={disconnect}>{t.head.disconnect}</button>
              : <button type="button" className="btn small primary" onClick={connect}><BluetoothIcon size={16} />{t.head.connect}</button>}
          </div>
        </div>
      </header>
      {notice && (
        <div className="banner" role="alert">
          <span>{notice}</span>
          <button type="button" className="icon-btn small" onClick={() => setNotice('')} aria-label={t.set.close}><CloseIcon size={18} /></button>
        </div>
      )}
      <main className="stage">
        <Say t={t} step={step} />
        <Live t={t} snap={ready ? snap : { ...snap, running: false }} hide={prefs.hide} />
        <Explain t={t} step={step} count={STEPS.length} notice={fresh} error={snap.error} linkLost={linkLost} />
        {!live && <Simulator t={t} sim={sim.current} speed={simSpeed} onSpeed={setSimSpeed} epoch={epoch} />}
      </main>
      {settings && (
        <Settings
          t={t} lang={lang} onLang={setLang} theme={theme} onTheme={setTheme} prefs={prefs} onPrefs={patchPrefs} snap={snap} source={source} live={linked && snap.running}
          onRestart={() => { setSettings(false); restart(); }} restarting={restarting} onForce={force} onCalibrate={calibrate} onResetCalibration={resetCalibration} log={log} onClearLog={() => setLog([])} onTest={selfTest} testing={testing}
          canTest={linked} onShowLink={(kind) => { setSettings(false); setQr(kind); }} onClose={() => setSettings(false)} bluetooth={bluetooth}
        />
      )}
      {qr && <QrShow text={APP_LINKS[qr]} t={t} label={qr === 'ios' ? t.qr.linkIos : t.qr.linkButton} onClose={closeQr} />}
    </div>
  );
}
