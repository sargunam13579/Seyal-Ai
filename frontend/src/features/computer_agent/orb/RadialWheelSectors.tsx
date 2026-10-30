import React from 'react';
import { RADIUS, SLOT_ANGLES, getSectorPath } from './types';

interface RadialWheelSectorsProps {
  isRadialOpen: boolean;
  hoveredSlotIdx: number | null;
  setHoveredSlotIdx: (idx: number | null) => void;
  isAnimationSettled: boolean;
  radialActions: any[];
  sectorRefs: React.MutableRefObject<(SVGPathElement | null)[]>;
  onActionClick: (id: string) => void;
}

export const RadialWheelSectors: React.FC<RadialWheelSectorsProps> = ({
  isRadialOpen,
  hoveredSlotIdx,
  setHoveredSlotIdx,
  isAnimationSettled,
  radialActions,
  sectorRefs,
  onActionClick,
}) => {
  if (!isRadialOpen) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center animate-fadeIn transition-all duration-300">
      <svg
        className="w-[450px] h-[450px] sm:w-[480px] sm:h-[480px] drop-shadow-[0_0_35px_rgba(0,0,0,0.95)]"
        viewBox="-225 -225 450 450"
      >
        {/* Outer Wheel Base */}
        <circle
          r="200"
          fill="rgba(4, 8, 18, 0.88)"
          stroke="rgba(34, 211, 238, 0.4)"
          strokeWidth="2"
        />
        <circle
          r="196"
          fill="none"
          stroke="rgba(34, 211, 238, 0.2)"
          strokeWidth="4"
          strokeDasharray="4 8"
        />

        {/* 8 Annular Wheel Sectors */}
        {SLOT_ANGLES.map((angle, slotIdx) => {
          const isHovered = hoveredSlotIdx === slotIdx;
          const pathD = getSectorPath(angle);
          const currentAction = radialActions[7 - slotIdx];

          return (
            <path
              key={`slot-sector-${slotIdx}`}
              ref={(el) => {
                sectorRefs.current[slotIdx] = el;
              }}
              d={pathD}
              className="cursor-pointer pointer-events-auto"
              fill={
                isHovered
                  ? 'rgba(6, 182, 212, 0.45)'
                  : 'rgba(10, 25, 54, 0.85)'
              }
              stroke={
                isHovered
                  ? 'rgba(103, 232, 249, 0.95)'
                  : 'rgba(34, 211, 238, 0.65)'
              }
              strokeWidth={isHovered ? 2.5 : 1.5}
              style={{
                opacity: isAnimationSettled ? 1 : 0.15,
                transition:
                  'fill 180ms ease-out, stroke 180ms ease-out, stroke-width 180ms ease-out, opacity 250ms ease-out',
              }}
              onMouseEnter={() => setHoveredSlotIdx(slotIdx)}
              onMouseLeave={() => setHoveredSlotIdx(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (currentAction) {
                  onActionClick(currentAction.id);
                }
              }}
            />
          );
        })}

        {/* 8 Sector Radial Divider Spokes at 22.5 deg offsets */}
        {[-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, 202.5].map((ang, i) => {
          const r = (ang * Math.PI) / 180;
          const x1 = Math.round(92 * Math.cos(r));
          const y1 = Math.round(92 * Math.sin(r));
          const x2 = Math.round(198 * Math.cos(r));
          const y2 = Math.round(198 * Math.sin(r));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(34, 211, 238, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Orbit Guide Track */}
        <circle
          r={RADIUS}
          fill="none"
          stroke="rgba(34, 211, 238, 0.25)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* Inner Hub Border Circle */}
        <circle
          r="90"
          fill="rgba(4, 7, 18, 0.95)"
          stroke="rgba(34, 211, 238, 0.65)"
          strokeWidth="2"
        />
        <circle
          r="86"
          fill="none"
          stroke="rgba(34, 211, 238, 0.3)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>
    </div>
  );
};
