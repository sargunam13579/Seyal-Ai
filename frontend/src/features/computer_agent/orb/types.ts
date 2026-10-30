export interface HeroAgentLogoOrbProps {
  onDismiss?: () => void;
  onClick?: () => void;
  isClosing?: boolean;
}

export const RADIUS = 158;

export const SLOT_ANGLES = [-90, -45, 0, 45, 90, 135, 180, 225];

export const getSectorPath = (centerAngleDeg: number, rInner = 92, rOuter = 196) => {
  const startDeg = centerAngleDeg - 22.5;
  const endDeg = centerAngleDeg + 22.5;
  const a1 = (startDeg * Math.PI) / 180;
  const a2 = (endDeg * Math.PI) / 180;
  const x1 = +(rInner * Math.cos(a1)).toFixed(2);
  const y1 = +(rInner * Math.sin(a1)).toFixed(2);
  const x2 = +(rOuter * Math.cos(a1)).toFixed(2);
  const y2 = +(rOuter * Math.sin(a1)).toFixed(2);
  const x3 = +(rOuter * Math.cos(a2)).toFixed(2);
  const y3 = +(rOuter * Math.sin(a2)).toFixed(2);
  const x4 = +(rInner * Math.cos(a2)).toFixed(2);
  const y4 = +(rInner * Math.sin(a2)).toFixed(2);
  return `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;
};
