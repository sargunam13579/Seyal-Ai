import React, { useState, useRef } from 'react';
import {
  Zap,
  RotateCcw,
  RotateCw,
  Check,
  X,
  ArrowLeftRight,
  Move,
  Info,
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import appLogo from '../../assets/app-logo.png';
import {
  RADIAL_ACTIONS_CATALOG,
  DEFAULT_RADIAL_ORDER,
  RADIAL_SLOTS,
} from '../../config/radialActionsConfig';

export const FrequentTaskShortcutsManager: React.FC = () => {
  const { radialButtonOrder, setRadialButtonOrder, addActivity } = useNexus();

  // Local editing layout state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftOrder, setDraftOrder] = useState<string[]>(radialButtonOrder);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Wheel stage ref & drag-and-drop state directly on wheel
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    fromSlotIdx: number;
    currentX: number;
    currentY: number;
    targetSlotIdx: number | null;
  } | null>(null);

  // Sync draft with global order when entering edit mode
  const handleStartEdit = () => {
    setDraftOrder([...radialButtonOrder]);
    setSelectedSlotIdx(null);
    setDragState(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftOrder([...radialButtonOrder]);
    setSelectedSlotIdx(null);
    setDragState(null);
    setIsEditing(false);
  };

  const handleSaveLayout = () => {
    setRadialButtonOrder(draftOrder);
    setIsEditing(false);
    setSelectedSlotIdx(null);
    setDragState(null);
    setSaveToast('Shortcuts layout saved successfully!');
    addActivity({
      type: 'system',
      title: 'Frequent Task Shortcuts Realigned',
      detail: 'Custom 8-button radial layout updated and synchronized with live action popup',
      status: 'success',
    });
    setTimeout(() => {
      setSaveToast(null);
    }, 3200);
  };

  const handleResetDefault = () => {
    setDraftOrder([...DEFAULT_RADIAL_ORDER]);
    setSelectedSlotIdx(null);
    setDragState(null);
  };

  // Direct click-to-swap logic: select button A -> click button B to swap
  const handleButtonClick = (slotIdx: number) => {
    if (!isEditing) return;

    if (selectedSlotIdx === null) {
      setSelectedSlotIdx(slotIdx);
    } else if (selectedSlotIdx === slotIdx) {
      setSelectedSlotIdx(null);
    } else {
      // Swap positions directly on wheel
      const newOrder = [...draftOrder];
      const temp = newOrder[selectedSlotIdx];
      newOrder[selectedSlotIdx] = newOrder[slotIdx];
      newOrder[slotIdx] = temp;
      setDraftOrder(newOrder);
      setSelectedSlotIdx(null);
    }
  };

  // Quick Nudge: Move selected button 1 slot Clockwise or Counter-Clockwise
  const handleNudge = (direction: 'cw' | 'ccw') => {
    if (selectedSlotIdx === null) return;
    // Clockwise order around circle:
    // Slot 7 (12:00) -> 6 (1:30) -> 5 (3:00) -> 4 (4:30) -> 3 (6:00) -> 2 (7:30) -> 1 (9:00) -> 0 (10:30)
    const targetIdx =
      direction === 'cw'
        ? (selectedSlotIdx - 1 + 8) % 8
        : (selectedSlotIdx + 1) % 8;

    const newOrder = [...draftOrder];
    const temp = newOrder[selectedSlotIdx];
    newOrder[selectedSlotIdx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setDraftOrder(newOrder);
    setSelectedSlotIdx(targetIdx);
  };

  // Drag and Drop pointer tracking directly on the circular wheel
  const handlePointerDown = (e: React.PointerEvent, slotIdx: number) => {
    if (!isEditing) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMovedFar = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      const dist = Math.hypot(moveEv.clientX - startClientX, moveEv.clientY - startClientY);
      if (dist > 7) {
        hasMovedFar = true;
        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const relX = moveEv.clientX - centerX;
        const relY = moveEv.clientY - centerY;

        // Compute angle from center
        const rad = Math.atan2(relX, -relY);
        let deg = (rad * 180) / Math.PI;
        if (deg < 0) deg += 360;

        // Find nearest slot
        let closestSlot = 0;
        let minDiff = 999;
        RADIAL_SLOTS.forEach((slot, idx) => {
          const diff = Math.abs(((deg - slot.angle + 180) % 360) - 180);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlot = idx;
          }
        });

        setDragState({
          isDragging: true,
          fromSlotIdx: slotIdx,
          currentX: relX,
          currentY: relY,
          targetSlotIdx: closestSlot,
        });
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      try {
        target.releasePointerCapture(upEv.pointerId);
      } catch {
        // pointer may have already been released
      }

      if (hasMovedFar) {
        setDragState((prev) => {
          if (prev && prev.targetSlotIdx !== null && prev.targetSlotIdx !== prev.fromSlotIdx) {
            const newOrder = [...draftOrder];
            const temp = newOrder[prev.fromSlotIdx];
            newOrder[prev.fromSlotIdx] = newOrder[prev.targetSlotIdx];
            newOrder[prev.targetSlotIdx] = temp;
            setDraftOrder(newOrder);
            setSelectedSlotIdx(null);
          }
          return null;
        });
      } else {
        // Pure click without dragging
        handleButtonClick(slotIdx);
      }
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
  };

  const activeDisplayOrder = isEditing ? draftOrder : radialButtonOrder;

  // Wheel geometry: Radius 138px for comfortable fit
  const WHEEL_RADIUS = 138;

  // Selected action details for live HUD
  const selectedAction =
    selectedSlotIdx !== null ? RADIAL_ACTIONS_CATALOG[activeDisplayOrder[selectedSlotIdx]] : null;

  return (
    <div className="space-y-4 relative isolate z-0">
      {/* Toast feedback */}
      {saveToast && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-medium shadow-lg shadow-emerald-950/50 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/70 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Frequent Task Shortcuts
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                  isEditing
                    ? 'bg-amber-950/80 border border-amber-400/50 text-amber-300 animate-pulse'
                    : 'bg-cyan-950/80 border border-cyan-400/40 text-cyan-300'
                }`}
              >
                {isEditing ? 'REALIGN MODE' : 'LIVE LAYOUT'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing
                ? 'Drag any button to a new slot or click two buttons to swap directly on the wheel.'
                : 'Customizable 8-action wheel synchronized with the live chat Action Popup.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset to default Seyal AI factory layout"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-slate-950" />
                Save Layout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-950/30 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
              Realign Shortcuts
            </button>
          )}
        </div>
      </div>

      {/* Main Wheel Viewport - 100% Self-Contained Realign Experience */}
      <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#060a16]/90 border border-cyan-500/20 relative shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        {/* 420x420 Circular Interactive Stage */}
        <div
          ref={stageRef}
          className="relative isolate w-[380px] h-[380px] sm:w-[420px] sm:h-[420px] flex items-center justify-center my-2 select-none"
        >
          {/* Circular Orbit Guide Track */}
          <div
            className="absolute rounded-full border border-dashed border-cyan-500/30 pointer-events-none"
            style={{
              width: `${WHEEL_RADIUS * 2}px`,
              height: `${WHEEL_RADIUS * 2}px`,
            }}
          />

          {/* Secondary Outer Guide Ring */}
          <div
            className="absolute rounded-full border border-cyan-500/15 pointer-events-none"
            style={{
              width: `${(WHEEL_RADIUS + 38) * 2}px`,
              height: `${(WHEEL_RADIUS + 38) * 2}px`,
            }}
          />

          {/* 8 Magnetic Docking Slot Targets (Visible when editing) */}
          {RADIAL_SLOTS.map((slot, idx) => {
            const rad = (slot.angle * Math.PI) / 180;
            const sx = Math.round(WHEEL_RADIUS * Math.sin(rad));
            const sy = Math.round(-WHEEL_RADIUS * Math.cos(rad));
            const isTargetedByDrag =
              dragState?.isDragging && dragState?.targetSlotIdx === idx;
            const isOriginOfDrag =
              dragState?.isDragging && dragState?.fromSlotIdx === idx;
            const isCurrentSelected = isEditing && selectedSlotIdx === idx;

            return (
              <div
                key={`dock-slot-${idx}`}
                className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none"
                style={{ transform: `translate(${sx}px, ${sy}px)` }}
              >
                {/* Docking ring halo */}
                <div
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full border transition-all duration-200 ${
                    isTargetedByDrag
                      ? 'border-2 border-cyan-400 bg-cyan-500/20 scale-125 shadow-[0_0_25px_rgba(34,211,238,0.8)]'
                      : isOriginOfDrag
                      ? 'border-dashed border-cyan-400/40 bg-slate-900/40 scale-90'
                      : isCurrentSelected
                      ? 'border-2 border-cyan-400/80 bg-cyan-500/15 scale-110 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                      : isEditing
                      ? 'border-dashed border-slate-700/60 bg-slate-900/20'
                      : 'border-transparent'
                  }`}
                />
              </div>
            );
          })}

          {/* Center Seyal AI Hero Logo Disc with Interactive HUD */}
          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-cyan-400/80 shadow-[0_0_35px_rgba(0,240,255,0.45)] bg-slate-950 flex items-center justify-center pointer-events-none">
            <img
              src={appLogo}
              alt="Seyal AI Center Hub"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Holographic Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-white/20" />
          </div>

          {/* 8 Glowing Action Buttons around the Circle */}
          {activeDisplayOrder.map((actionId, slotIdx) => {
            const action = RADIAL_ACTIONS_CATALOG[actionId];
            if (!action) return null;

            const slotMeta = RADIAL_SLOTS[slotIdx];
            const angle = slotMeta.angle;
            const rad = (angle * Math.PI) / 180;
            const x = Math.round(WHEEL_RADIUS * Math.sin(rad));
            const y = Math.round(-WHEEL_RADIUS * Math.cos(rad));

            const isSelected = isEditing && selectedSlotIdx === slotIdx;
            const isHovered = hoveredSlotIdx === slotIdx;
            const isBeingDragged =
              dragState?.isDragging && dragState?.fromSlotIdx === slotIdx;
            const isTargetedByOther =
              dragState?.isDragging &&
              dragState?.targetSlotIdx === slotIdx &&
              dragState?.fromSlotIdx !== slotIdx;

            const IconComp = action.icon;

            // When dragging this button, position at cursor
            const renderX = isBeingDragged ? dragState.currentX : x;
            const renderY = isBeingDragged ? dragState.currentY : y;

            return (
              <div
                key={`${actionId}-slot-${slotIdx}`}
                className={`absolute top-1/2 left-1/2 w-0 h-0 ${
                  isBeingDragged ? 'z-30' : isSelected ? 'z-20' : 'z-10'
                }`}
                style={{
                  transform: `translate(${renderX}px, ${renderY}px)`,
                  transition: isBeingDragged
                    ? 'none'
                    : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div
                  onPointerDown={(e) => handlePointerDown(e, slotIdx)}
                  onMouseEnter={() => setHoveredSlotIdx(slotIdx)}
                  onMouseLeave={() => setHoveredSlotIdx(null)}
                  className={`relative -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 bg-gradient-to-br ${
                    action.color
                  } ${action.border} ${action.glow} backdrop-blur-xl shadow-2xl transition-all duration-200 ${
                    isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  } ${
                    isBeingDragged
                      ? 'scale-125 ring-4 ring-cyan-300 ring-offset-2 ring-offset-slate-950 shadow-[0_0_35px_rgba(34,211,238,1)] opacity-90'
                      : isTargetedByOther
                      ? 'scale-110 ring-2 ring-emerald-400 animate-pulse'
                      : isSelected
                      ? 'scale-125 ring-4 ring-cyan-300 ring-offset-2 ring-offset-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.9)] animate-pulse'
                      : isHovered
                      ? 'scale-115'
                      : 'scale-100 hover:scale-110'
                  }`}
                  title={`${action.label} • Slot ${slotIdx + 1} (${slotMeta.clock})`}
                >
                  {/* Glowing border ring */}
                  <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />

                  {/* Drag Grip Icon Indicator in Editing Mode */}
                  {isEditing && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-950/90 border border-cyan-400/60 text-cyan-300 flex items-center justify-center pointer-events-none">
                      <Move className="w-2.5 h-2.5" />
                    </div>
                  )}

                  {/* Slot Number Badge */}
                  <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-cyan-400 text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-center shadow-md pointer-events-none">
                    {slotIdx + 1}
                  </span>

                  {/* Icon */}
                  <IconComp className={`w-5 h-5 sm:w-6 sm:h-6 ${action.text} transition-transform pointer-events-none`} />
                </div>

                {/* Floating label on hover or when selected */}
                {(isHovered || isSelected || isBeingDragged) && (
                  <div
                    className="absolute whitespace-nowrap pointer-events-none flex flex-col items-center z-40"
                    style={{
                      top: renderY < 0 ? '-38px' : '32px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/95 border border-cyan-400/60 text-[11px] font-mono text-cyan-200 shadow-xl shadow-cyan-950/80 font-bold">
                      {isBeingDragged && dragState?.targetSlotIdx !== null
                        ? `Swap with Slot ${dragState.targetSlotIdx + 1}`
                        : `${action.label} (${slotMeta.clock})`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Real-time Interactive Guidance HUD directly beneath wheel */}
        <div className="flex flex-col items-center gap-2 max-w-lg mt-1 select-none">
          {isEditing ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-xs text-slate-200 shadow-lg animate-fadeIn">
              {selectedSlotIdx !== null ? (
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-cyan-300">
                    {selectedAction?.label} (Slot {selectedSlotIdx + 1})
                  </span>
                  <span className="text-slate-400">• Click another button to swap, or nudge:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNudge('ccw')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                      title="Nudge Counter-Clockwise"
                    >
                      <RotateCcw className="w-3 h-3" />
                      ↶ Left
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge('cw')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                      title="Nudge Clockwise"
                    >
                      ↷ Right
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : dragState?.isDragging ? (
                <span className="text-cyan-300 font-medium">
                  Release pointer over any slot to swap positions!
                </span>
              ) : (
                <div className="flex items-center gap-2 text-slate-300">
                  <Move className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong className="text-cyan-300">Drag & Drop</strong> any button around the circle, or <strong className="text-cyan-300">click two buttons</strong> to swap.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                This layout syncs in real-time with the floating Action Popup on the chat page.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
