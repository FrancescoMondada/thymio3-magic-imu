import React from 'react';
import { BRAIN_PATHS } from './assets/brain.js';

// Icons: 24 x 24, drawn with the colour of the text (currentColor), so that they follow the theme.
const Svg = ({ size = 24, children, sw = 1.8, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p}>{children}</svg>
);

export const BrainIcon = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 53 53" fill="currentColor" aria-hidden="true" focusable="false" {...p}>{BRAIN_PATHS.map((d, i) => <path key={i} d={d} />)}</svg>
);
export const BluetoothIcon = (p) => <Svg {...p}><path d="M7 7l10 10-5 5V2l5 5L7 17" /></Svg>;
export const CloseIcon = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const RestartIcon = (p) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.6-5.9" /><path d="M4 4v4.5h4.5" /></Svg>;
export const ChevronLeftIcon = (p) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRightIcon = (p) => <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const CheckIcon = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>;
export const WarnIcon = (p) => <Svg {...p}><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.5v.2" /></Svg>;
export const InfoIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.2" /></Svg>;
export const BatteryIcon = (p) => <Svg {...p}><rect x="2.5" y="8" width="17" height="9" rx="2" /><path d="M22 11v3" /></Svg>;
export const LockIcon = (p) => <Svg {...p}><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
export const UnlockIcon = (p) => <Svg {...p}><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></Svg>;
// a hand seen from the palm side, fingers up
export const HandIcon = (p) => <Svg {...p}><path d="M8 13.5V6.2a1.5 1.5 0 0 1 3 0V11" /><path d="M11 11V4.7a1.5 1.5 0 0 1 3 0V11" /><path d="M14 11V6.2a1.5 1.5 0 0 1 3 0V15c0 3.6-2.4 6-6 6-2.6 0-4.200-1.200-5.500-3.500L3.500 13.500a1.500 1.500 0 0 1 2.600-1.500L8 14.500" /></Svg>;
// the robot held upright, seen from its underside: a portrait body with its front marked at the top
export const RobotUprightIcon = (p) => <Svg {...p}><rect x="6.5" y="3" width="11" height="18" rx="3" /><path d="M12 6.8V5M10 8.2h4" /><circle cx="12" cy="14" r="2" /></Svg>;
// the robot lying flat on the table, seen from the side
export const RobotFlatIcon = (p) => <Svg {...p}><rect x="3" y="9" width="18" height="7" rx="2.5" /><circle cx="8" cy="17.5" r="2" /><circle cx="16" cy="17.5" r="2" /><path d="M2 21.500h20" /></Svg>;
export const SteadyIcon = (p) => <Svg {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3v3.500l4 5.500 4-5.500V3M8 21v-3.500l4-5.500 4 5.500V21" /></Svg>;
export const ButtonIcon = (p) => <Svg {...p}><rect x="3.500" y="3.500" width="17" height="17" rx="4" /><circle cx="12" cy="12" r="4.200" /></Svg>;
export const SpinIcon = (p) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.400-5.700" /><path d="M20.200 3.500v5h-5" /></Svg>;
export const AimIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="5.500" /><path d="M12 2.500v4M12 17.500v4M2.500 12h4M17.500 12h4" /></Svg>;
export const DriveIcon = (p) => <Svg {...p}><path d="M3.500 12h14" /><path d="M13 6.500l5.500 5.500-5.500 5.500" /><path d="M3 20h18" strokeDasharray="1 3" /></Svg>;
export const MusicIcon = (p) => <Svg {...p}><path d="M9 18V5.500l11-2V16" /><circle cx="6.500" cy="18" r="2.500" /><circle cx="17.500" cy="16" r="2.500" /></Svg>;
export const GravityIcon = (p) => <Svg {...p}><path d="M12 3.500v15" /><path d="M6.500 13.500l5.500 6 5.500-6" /></Svg>;
export const ArrowIcon = (p) => <Svg {...p}><path d="M12 20V5" /><path d="M6 11l6-6 6 6" /></Svg>;

// The robot seen from above, its front up: a rounded body, two wheels, the sensors at the front. `size` is the width in pixels.
export function RobotTop({ size = 80, className = '', ...p }) {
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className} aria-hidden="true" focusable="false" {...p}>
      <rect className="rt-wheel" x="-46" y="-6" width="9" height="30" rx="3" />
      <rect className="rt-wheel" x="37" y="-6" width="9" height="30" rx="3" />
      <rect className="rt-body" x="-38" y="-40" width="76" height="80" rx="20" />
      <path className="rt-front" d="M-14 -31h28" />
      <circle className="rt-led" cx="-22" cy="-24" r="2.600" /><circle className="rt-led" cx="-11" cy="-30" r="2.600" /><circle className="rt-led" cx="0" cy="-32" r="2.600" /><circle className="rt-led" cx="11" cy="-30" r="2.600" /><circle className="rt-led" cx="22" cy="-24" r="2.600" />
      <circle className="rt-pen" cx="0" cy="8" r="7" />
      <path className="rt-arrow" d="M0 -8v-12M-6 -14l6 -6 6 6" />
    </svg>
  );
}

export const CopyIcon = (p) => <Svg {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></Svg>;
// a QR code: three finders and a few modules
export const QrIcon = (p) => <Svg {...p}><rect x="3.500" y="3.500" width="7" height="7" rx="1.200" /><rect x="13.500" y="3.500" width="7" height="7" rx="1.200" /><rect x="3.500" y="13.500" width="7" height="7" rx="1.200" /><path d="M6 6h2v2H6M16 6h2v2h-2M6 16h2v2H6M13.500 14h2.500M19 14v3M13.500 17.500v3M16.500 20.500h4M19 20.500v.2" /></Svg>;
export const DownloadIcon = (p) => <Svg {...p}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Svg>;
