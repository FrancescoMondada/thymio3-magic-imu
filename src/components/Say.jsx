import React from 'react';
import { STEPS } from '../store.js';

// What to say to the audience: the line for the step in progress, and nothing to touch. The step follows the robot (see currentStep): the
// magician's hands are busy with it, the page is only to be looked at.
export default function Say({ t, step }) {
  return (
    <section className="card say" aria-label={t.say.title}>
      <p className="say-label"><span>{t.say.title}</span><span className="say-step">{step + 1} / {STEPS.length} · {t.steps.names[step]}</span></p>
      <p className="say-line" aria-live="polite">{t.say.lines[step]}</p>
    </section>
  );
}
