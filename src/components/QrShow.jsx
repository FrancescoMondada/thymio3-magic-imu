import React, { useEffect, useMemo } from 'react';
import { CloseIcon, WarnIcon } from '../icons.jsx';
import { qrMatrix, qrPath } from '../qr.js';

// A QR code over the whole page and as large as the screen allows, for the other screens of the room to scan. A touch anywhere (or Esc) puts it
// away. White with a quiet zone of four modules, whatever the theme: a camera reads dark on light.
export default function QrShow({ text, t, label, onClose }) {
  const code = useMemo(() => qrMatrix(text), [text]);
  const quiet = 4;
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="qr-back" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      {code ? (
        <div className="qr-card">
          <svg className="qr-code" viewBox={`${-quiet} ${-quiet} ${code.size + 2 * quiet} ${code.size + 2 * quiet}`} shapeRendering="crispEdges" role="img" aria-label={label}>
            <rect x={-quiet} y={-quiet} width={code.size + 2 * quiet} height={code.size + 2 * quiet} fill="#fff" />
            <path d={qrPath(code)} fill="#000" />
          </svg>
        </div>
      ) : (
        <div className="qr-problem" role="alert"><WarnIcon /><p>{t.qr.tooBig}</p></div>
      )}
      <button type="button" className="qr-close" onClick={onClose} aria-label={t.qr.close}><CloseIcon /></button>
    </div>
  );
}
