// The virtual robot's tones, through the browser's audio (a real robot plays its own). The audio context starts at the first touch of the page.
let ctx = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}

export function playTone(freq, tenths) {
  try {
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const dur = Math.max(0.05, tenths / 10);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch { /* no audio */ }
}
