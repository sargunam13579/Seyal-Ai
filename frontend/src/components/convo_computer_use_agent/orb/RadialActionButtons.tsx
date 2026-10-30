import React from 'react';
import { RADIUS } from './types';

interface RadialActionButtonsProps {
  isRadialOpen: boolean;
  radialKey: number;
  radialActions: any[];
  hoveredSlotIdx: number | null;
  setHoveredSlotIdx: (idx: number | null) => void;
  isAnimationSettled: boolean;
  buttonWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onActionClick: (id: string) => void;
}

export const RadialActionButtons: React.FC<RadialActionButtonsProps> = ({
  isRadialOpen,
  radialKey,
  radialActions,
  hoveredSlotIdx,
  setHoveredSlotIdx,
  isAnimationSettled,
  buttonWrapperRefs,
  onActionClick,
}) => {
  if (!isRadialOpen) return null;

  return (
    <div key={`radial-buttons-${radialKey}`} className="contents">
      {radialActions.map((action, idx) => {
        const slotIdx = 7 - idx; // Target settled slot for hover sync
        const IconComp = action.icon;
        const isHovered = hoveredSlotIdx === slotIdx;
        const finalAngle = 315 - idx * 45;
        const finalRad = (finalAngle * Math.PI) / 180;
        const finalX = Math.round(RADIUS * Math.sin(finalRad));
        const finalY = Math.round(-RADIUS * Math.cos(finalRad));

        return (
          <div
            key={action.id}
            ref={(el) => {
              buttonWrapperRefs.current[idx] = el;
            }}
            className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-30"
            style={
              isAnimationSettled
                ? {
                    transform: `translate(${finalX}px, ${finalY}px)`,
                    opacity: 1,
                    pointerEvents: 'auto',
                  }
                : {
                    willChange: 'transform, opacity',
                    opacity: 0,
                    pointerEvents: 'none',
                  }
            }
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onActionClick(action.id);
              }}
              onMouseEnter={() => setHoveredSlotIdx(slotIdx)}
              onMouseLeave={() => setHoveredSlotIdx(null)}
              style={{
                transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                pointerEvents: 'auto',
              }}
              className={`relative -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 bg-gradient-to-br ${action.color} ${action.border} ${action.glow} backdrop-blur-xl shadow-2xl group focus:outline-none cursor-pointer active:scale-95`}
              title={`${action.label} (${action.sublabel})`}
            >
              {/* Glowing border ring */}
              <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />

              <IconComp
                className={`w-6 h-6 sm:w-7 sm:h-7 ${action.text} transition-transform group-hover:scale-110`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
