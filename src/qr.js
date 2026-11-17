// QR codes: the modules of a code for a text (qrcode-generator). The encoder is in the application itself, not fetched when the code is first
// shown: the code has to appear in a room whose network comes and goes once the page is open.
import qrcode from 'qrcode-generator';

// { size, dark(row, col) } for a text (error correction level M: a screen, a camera, some glare), or null when the text does not fit the
// largest code.
export function qrMatrix(text) {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    return { size: qr.getModuleCount(), dark: (r, c) => qr.isDark(r, c) };
  } catch {
    return null;
  }
}

// The matrix as one SVG path (a run of dark modules in a row is one rectangle), in modules.
export function qrPath({ size, dark }) {
  let d = '';
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!dark(r, c)) { c++; continue; }
      let n = 1;
      while (c + n < size && dark(r, c + n)) n++;
      d += `M${c} ${r}h${n}v1h-${n}z`;
      c += n;
    }
  }
  return d;
}
