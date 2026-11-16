import React from 'react';
import { WarnIcon } from '../icons.jsx';

// The explanation of the step in progress, short: what Thymio does and senses, and why. Under the title, what went wrong a moment ago (a button
// that did nothing, a robot that was lifted) or a lost link.
export default function Explain({ t, step, count, notice, error, linkLost }) {
  const alerts = [];
  if (linkLost) alerts.push(['link', t.notice.reconnect]);
  if (notice) alerts.push([notice.kind, t.notice[notice.kind] || notice.kind]);
  if (error) alerts.push(['error', `${t.notice.error} ${error}`]);
  return (
    <section className="card explain" aria-label={t.explain.title}>
      <h2>{t.explain.title} <span className="muted">· {step + 1}/{count} · {t.steps.names[step]}</span></h2>
      {alerts.map(([kind, text]) => <p key={kind} className="warn" role="alert"><WarnIcon size={16} /> {text}</p>)}
      <p className="explain-text">{t.steps.explain[step]}</p>
    </section>
  );
}
